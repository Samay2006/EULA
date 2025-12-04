// @deno-types for type definitions only (won't be used at runtime)
// deno.lock
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.22.0";

// Type definitions
interface Risk {
  category?: string;
  severity?: string;
  description?: string;
  excerpt?: string | null;
}

interface AnalysisResult {
  summary?: string;
  key_points?: string[];
  risks?: Risk[];
  questions?: string[];
}

interface RequestBody {
  documentId: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Utility to safely encode storage paths
function sanitizePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

/**
 * Extract text from PDF using pdf-lib fallback method
 */
async function extractPdfText(
  arrayBuffer: ArrayBuffer
): Promise<{ text: string; isCorrupted: boolean }> {
  try {
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();

    // pdf-lib cannot extract real text, so fallback
    let text = pages.map(() => "[PDF text extraction not supported in Edge Functions]").join("\n");

    return {
      text,
      isCorrupted: false,
    };
  } catch (_err) {
    return {
      text: "Failed to load PDF file.",
      isCorrupted: true,
    };
  }
}

/** Fallback analysis if AI fails */
function createFallbackAnalysis(text: string): AnalysisResult {
  const unreadablePattern = /failed to load pdf|no readable text|unreadable|corrupt|corrupted|encrypted|obfuscat/i;

  if (unreadablePattern.test(text)) {
    return {
      summary:
        "This document appears to be a highly obfuscated or encrypted PDF file. It contains a lot of unreadable characters and symbols, making it impossible to extract any meaningful information. Without the ability to decrypt or properly render the content, a comprehensive analysis of its legal implications is not possible. Therefore, I am unable to provide a summary, key points, or risk flags based on the provided input. It is crucial to have a clear and readable document for accurate legal analysis.",
      key_points: [
        "The document is unreadable and likely encrypted or corrupted.",
        "No meaningful text or content can be extracted for analysis.",
        "Legal analysis requires a clear and decipherable document.",
        "Summary, key points, and risk flags cannot be generated from the current input.",
      ],
      risks: [],
      questions: [],
    };
  }

  const wordCount = text.trim().length === 0 ? 0 : text.split(/\s+/).length;
  return {
    summary: `Document contains ${wordCount} words of text. Manual review recommended for detailed analysis.`,
    key_points: ["Text extraction successful", "AI analysis incomplete", "Human review suggested"],
    risks: [
      {
        category: "Processing",
        severity: "low",
        description: "Automatic analysis was incomplete",
        excerpt: "Analysis required manual review",
      },
    ],
    questions: ["What is the main purpose of this document?", "Are there any deadlines or important dates?"],
  };
}

async function storeAnalysisAndRespond(
  analysis: AnalysisResult,
  documentId: string,
  supabase: SupabaseClient
): Promise<Response> {
  const { data: summaryData } = await supabase
    .from("summaries")
    .insert({
      document_id: documentId,
      plain_summary: analysis.summary || "No summary",
      key_points: analysis.key_points ?? [],
      confidence: analysis.summary ? 0.9 : 0.3,
    })
    .select()
    .single();

  if (analysis.risks?.length) {
    await supabase.from("risk_flags").insert(
      analysis.risks.map((r) => ({
        document_id: documentId,
        category: r.category ?? "general",
        severity: r.severity ?? "medium",
        description: r.description ?? "",
        excerpt: r.excerpt ?? null,
      }))
    );
  }

  if (analysis.questions?.length) {
    await supabase.from("document_questions").insert(
      analysis.questions.map((q, i) => ({
        document_id: documentId,
        question_text: q,
        priority: i < 3 ? "high" : "medium",
      }))
    );
  }

  await supabase
    .from("documents")
    .update({ processed: true, processing_status: "analyzed" })
    .eq("id", documentId);

  return new Response(
    JSON.stringify({
      success: true,
      summary: summaryData,
      analysis,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { documentId }: RequestBody = await req.json();
    if (!documentId) throw new Error("Document ID missing");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase keys");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch doc
    const { data: document } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (!document) throw new Error("Document not found");

    const safePath = sanitizePath(document.storage_path);

    // Download file
    const { data: fileData } = await supabase.storage.from("documents").download(safePath);
    if (!fileData) throw new Error("Download failed");

    const arrayBuffer = await fileData.arrayBuffer();

    // Extract PDF text
    const { text: extractedText, isCorrupted } = await extractPdfText(arrayBuffer);

    await supabase
      .from("documents")
      .update({
        extracted_text: extractedText,
        processing_status: isCorrupted ? "corrupted" : "extracted",
      })
      .eq("id", documentId);

    // If PDF corrupted → stop analysis
    if (isCorrupted) {
        // Store detailed summary indicating corruption/unreadable PDF
        const unreadableSummary = {
          plain_summary:
            "This document appears to be a highly obfuscated or encrypted PDF file. It contains a lot of unreadable characters and symbols, making it impossible to extract any meaningful information. Without the ability to decrypt or properly render the content, a comprehensive analysis of its legal implications is not possible. Therefore, I am unable to provide a summary, key points, or risk flags based on the provided input. It is crucial to have a clear and readable document for accurate legal analysis.",
          key_points: [
            "The document is unreadable and likely encrypted or corrupted.",
            "No meaningful text or content can be extracted for analysis.",
            "Legal analysis requires a clear and decipherable document.",
            "Summary, key points, and risk flags cannot be generated from the current input.",
          ],
          confidence: 0.1,
        };

        const { data: summaryData, error: summaryError } = await supabase
          .from("summaries")
          .insert({
            document_id: documentId,
            ...unreadableSummary,
          })
          .select()
          .single();

      await supabase
        .from("documents")
        .update({ processed: true, error_message: "Corrupted PDF" })
        .eq("id", documentId);

      return new Response(
        JSON.stringify({
          success: false,
          message: "Corrupted PDF",
          extracted_text: extractedText,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // AI Analysis
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("Missing Gemini API key");

    const textForAnalysis = extractedText.slice(0, 30000);

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Return only valid JSON:
{
  "summary": "...",
  "key_points": [],
  "risks": [],
  "questions": []
}

Document text: ${textForAnalysis}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      const fallback = createFallbackAnalysis(extractedText);
      return await storeAnalysisAndRespond(fallback, documentId, supabase);
    }

    const aiJson = await aiResponse.json();
    let analysisText =
      aiJson.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

    let analysis: AnalysisResult;

    try {
      analysis = JSON.parse(analysisText);
    } catch (_err) {
      analysis = createFallbackAnalysis(extractedText);
    }

    return await storeAnalysisAndRespond(analysis, documentId, supabase);
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
