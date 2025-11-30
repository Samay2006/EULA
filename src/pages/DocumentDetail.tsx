import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, FileText, AlertTriangle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface Document {
  id: string;
  filename: string;
  uploaded_at: string;
  processed: boolean;
  extracted_text: string | null;
}

interface Summary {
  plain_summary: string | null;
  key_points: string[] | null;
}

interface RiskFlag {
  id: string;
  category: string;
  excerpt: string | null;
  severity: string;
  description: string | null;
}

const DocumentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState<Document | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [riskFlags, setRiskFlags] = useState<RiskFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchDocumentData();
  }, [id]);

  const fetchDocumentData = async () => {
    if (!id) return;

    try {
      // Fetch document
      const { data: doc, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .single();

      if (docError) throw docError;
      setDocument(doc);

      // Fetch summary
      const { data: summaryData } = await supabase
        .from('summaries')
        .select('*')
        .eq('document_id', id)
        .single();

      setSummary(summaryData);

      // Fetch risk flags
      const { data: risks } = await supabase
        .from('risk_flags')
        .select('*')
        .eq('document_id', id)
        .order('severity', { ascending: false });

      setRiskFlags(risks || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!document || !id) return;

    setProcessing(true);
    try {
      const { error } = await supabase.functions.invoke('analyze-document', {
        body: { documentId: id }
      });

      if (error) throw error;

      toast.success('Document analyzed successfully!');
      fetchDocumentData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to analyze document');
    } finally {
      setProcessing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-destructive text-destructive-foreground';
      case 'high':
        return 'bg-warning text-warning-foreground';
      case 'medium':
        return 'bg-yellow-500 text-white';
      case 'low':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p>Document not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-soft">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{document.filename}</h1>
              <p className="text-sm text-muted-foreground">
                Uploaded {new Date(document.uploaded_at).toLocaleDateString()}
              </p>
            </div>
            {!document.processed && (
              <Button onClick={handleAnalyze} disabled={processing} className="gap-2">
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Analyze with AI
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Summary */}
            {summary && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    AI Summary
                  </CardTitle>
                  <CardDescription>Plain language summary of the document</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground leading-relaxed mb-6">
                    {summary.plain_summary}
                  </p>
                  
                  {summary.key_points && summary.key_points.length > 0 && (
                    <>
                      <Separator className="my-6" />
                      <h3 className="font-semibold mb-3">Key Points</h3>
                      <ul className="space-y-2">
                        {summary.key_points.map((point, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                            <span className="text-sm">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {!summary && document.processed && (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No summary available</p>
                </CardContent>
              </Card>
            )}

            {!document.processed && (
              <Card className="border-2 border-dashed">
                <CardContent className="py-12 text-center">
                  <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Ready to analyze</h3>
                  <p className="text-muted-foreground mb-4">
                    Click "Analyze with AI" to get your summary and risk analysis
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Risk Flags */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Risk Flags
                </CardTitle>
                <CardDescription>Potential issues detected in this document</CardDescription>
              </CardHeader>
              <CardContent>
                {riskFlags.length > 0 ? (
                  <div className="space-y-4">
                    {riskFlags.map((risk) => (
                      <div key={risk.id} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className={getSeverityColor(risk.severity)}>
                            {risk.severity}
                          </Badge>
                          <span className="font-medium text-sm">{risk.category}</span>
                        </div>
                        {risk.description && (
                          <p className="text-sm text-muted-foreground">{risk.description}</p>
                        )}
                        {risk.excerpt && (
                          <p className="text-xs bg-muted p-2 rounded italic">
                            "{risk.excerpt}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {document.processed
                      ? 'No risks detected in this document'
                      : 'Risk analysis pending'}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DocumentDetail;