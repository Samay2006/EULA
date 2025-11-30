import { Card, CardContent } from '@/components/ui/card';
import { FileText, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const DocumentList = ({ documents, onDocumentClick }) => {
  return (
    <div className="grid gap-4">
      {documents.map((doc) => (
        <Card
          key={doc.id}
          className="cursor-pointer hover:shadow-medium transition-all hover:border-primary/50"
          onClick={() => onDocumentClick(doc.id)}
        >
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              
              <div className="p-3 bg-primary/10 rounded-lg">
                <FileText className="h-6 w-6 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg mb-1 truncate">
                  {doc.filename}
                </h3>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(doc.uploaded_at), { addSuffix: true })}
                  </span>

                  <span>{(doc.size_bytes / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              </div>

              <div>
                {doc.processed ? (
                  <div className="flex items-center gap-2 text-accent">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm font-medium">Analyzed</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm font-medium">Processing</span>
                  </div>
                )}
              </div>

            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
