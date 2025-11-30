import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId } = await req.json();
    
    if (!documentId) {
      throw new Error('Document ID is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching document:', documentId);

    // Get document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      throw new Error('Document not found');
    }

    // Download PDF from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.storage_path);

    if (downloadError || !fileData) {
      throw new Error('Failed to download document');
    }

    console.log('Document downloaded, extracting text...');

    // Convert PDF to text (simple extraction - in production you'd use a proper PDF library)
    const arrayBuffer = await fileData.arrayBuffer();
    const text = new TextDecoder().decode(arrayBuffer);
    
    // Extract readable text (this is a simplified version)
    const extractedText = text.slice(0, 50000); // Limit to first 50k chars

    // Update document with extracted text
    await supabase
      .from('documents')
      .update({ extracted_text: extractedText })
      .eq('id', documentId);

    console.log('Text extracted, analyzing with AI...');

    // Call Lovable AI for analysis
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a legal document analyzer. Analyze legal documents and provide:
1. A clear, concise summary in plain language (2-3 paragraphs)
2. Key points (3-5 bullet points)
3. Risk flags with categories, severity levels, and descriptions

Respond in JSON format:
{
  "summary": "plain language summary",
  "key_points": ["point 1", "point 2", "point 3"],
  "risks": [
    {
      "category": "Privacy Concern",
      "severity": "high",
      "description": "Description of the risk",
      "excerpt": "Relevant text excerpt"
    }
  ]
}

Severity levels: low, medium, high, critical
Common categories: Privacy Concern, Auto-Renewal, Liability Clause, Data Collection, Termination Terms, Payment Terms, Jurisdiction Issues`
          },
          {
            role: 'user',
            content: `Analyze this legal document:\n\n${extractedText.slice(0, 10000)}`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'analyze_document',
              description: 'Analyze a legal document and extract summary, key points, and risk flags',
              parameters: {
                type: 'object',
                properties: {
                  summary: {
                    type: 'string',
                    description: 'Plain language summary of the document (2-3 paragraphs)'
                  },
                  key_points: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of 3-5 key points from the document'
                  },
                  risks: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        category: { type: 'string' },
                        severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                        description: { type: 'string' },
                        excerpt: { type: 'string' }
                      },
                      required: ['category', 'severity', 'description']
                    }
                  }
                },
                required: ['summary', 'key_points', 'risks']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'analyze_document' } }
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    console.log('AI analysis complete');

    // Parse AI response
    const toolCall = aiResult.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No analysis result from AI');
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    // Store summary
    const { data: summaryData, error: summaryError } = await supabase
      .from('summaries')
      .insert({
        document_id: documentId,
        plain_summary: analysis.summary,
        key_points: analysis.key_points,
        confidence: 0.9
      })
      .select()
      .single();

    if (summaryError) {
      console.error('Error storing summary:', summaryError);
    }

    // Store risk flags
    if (analysis.risks && analysis.risks.length > 0) {
      const riskRecords = analysis.risks.map((risk: any) => ({
        document_id: documentId,
        category: risk.category,
        severity: risk.severity,
        description: risk.description,
        excerpt: risk.excerpt || null
      }));

      const { error: riskError } = await supabase
        .from('risk_flags')
        .insert(riskRecords);

      if (riskError) {
        console.error('Error storing risks:', riskError);
      }
    }

    // Mark document as processed
    await supabase
      .from('documents')
      .update({ processed: true })
      .eq('id', documentId);

    console.log('Analysis complete and stored');

    return new Response(
      JSON.stringify({ success: true, summary: summaryData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});