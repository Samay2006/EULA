import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { LogOut, Upload, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DocumentUpload } from '@/components/DocumentUpload';
import { DocumentList } from '@/components/DocumentList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const navigate = useNavigate();

  const fetchDocuments = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error fetching documents:', error);
    } else {
      setDocuments(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDocuments();
  }, [user]);

  const handleDocumentClick = (documentId) => {
    navigate(`/document/${documentId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-soft">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-primary">LegalSimplify</h1>
            </div>
            <Button variant="ghost" onClick={signOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Your Documents</h2>
          <p className="text-muted-foreground">
            Upload legal documents to get AI-powered summaries and risk analysis
          </p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Documents</CardDescription>
              <CardTitle className="text-4xl">{documents.length}</CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Processed</CardDescription>
              <CardTitle className="text-4xl">{documents.filter(d => d.processed).length}</CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Processing</CardDescription>
              <CardTitle className="text-4xl">{documents.filter(d => !d.processed).length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Upload section */}
        {!showUpload && documents.length === 0 && (
          <Card className="mb-8 border-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No documents yet</h3>
              <p className="text-muted-foreground mb-4 text-center max-w-md">
                Upload your first legal document to get started with AI-powered analysis
              </p>
              <Button onClick={() => setShowUpload(true)} className="gap-2">
                <Upload className="h-4 w-4" />
                Upload Document
              </Button>
            </CardContent>
          </Card>
        )}

        {!showUpload && documents.length > 0 && (
          <div className="mb-6">
            <Button onClick={() => setShowUpload(true)} className="gap-2">
              <Upload className="h-4 w-4" />
              Upload New Document
            </Button>
          </div>
        )}

        {showUpload && (
          <div className="mb-8">
            <DocumentUpload
              onUploadComplete={() => {
                setShowUpload(false);
                fetchDocuments();
              }}
              onCancel={() => setShowUpload(false)}
            />
          </div>
        )}

        {/* Documents list */}
        {!loading && documents.length > 0 && (
          <DocumentList documents={documents} onDocumentClick={handleDocumentClick} />
        )}
      </main>
    </div>
  );
};

export default Dashboard;
