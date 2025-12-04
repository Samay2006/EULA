import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  FileText,
  FileSpreadsheet,
  FileArchive,
  FileCode,
  File,
  Clock,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion } from "framer-motion";

// Gen-Z styled dynamic icons
const getFileIcon = (filename) => {
  const ext = filename.split(".").pop()?.toLowerCase();

  switch (ext) {
    case "pdf":
      return <FileText className="h-7 w-7 text-red-400 group-hover:scale-110 transition-transform" />;
    case "xlsx":
    case "xls":
      return <FileSpreadsheet className="h-7 w-7 text-green-400 group-hover:scale-110 transition-transform" />;
    case "zip":
    case "rar":
      return <FileArchive className="h-7 w-7 text-yellow-400 group-hover:scale-110 transition-transform" />;
    case "js":
    case "ts":
    case "java":
    case "py":
      return <FileCode className="h-7 w-7 text-blue-400 group-hover:scale-110 transition-transform" />;
    default:
      return <File className="h-7 w-7 text-purple-400 group-hover:scale-110 transition-transform" />;
  }
};

export const DocumentList = ({ documents = [], onDocumentClick }) => {
  return (
    <TooltipProvider>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

        {documents.map((doc, index) => (
          <motion.div
            key={doc.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.4 }}
          >
            <Card
              className="
                group cursor-pointer backdrop-blur-xl border border-white/10 
                bg-gradient-to-br from-white/5 to-white/2 shadow-xl
                hover:shadow-[0_0_25px_rgba(150,100,255,0.3)]
                hover:border-primary/40 transition-all duration-300 rounded-2xl
              "
              onClick={() => onDocumentClick(doc.id)}
            >
              <CardContent className="p-6 flex items-start gap-5">

                {/* ICON */}
                <div className="
                  p-4 rounded-2xl bg-white/5
                  border border-white/10
                  group-hover:bg-white/10
                  transition-all duration-300
                ">
                  {getFileIcon(doc.filename)}
                </div>

                {/* FILE INFO */}
                <div className="flex-1 space-y-2 min-w-0">

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <h3
                        className="
                          font-semibold text-lg truncate 
                          group-hover:text-primary transition-colors
                        "
                      >
                        {doc.filename}
                      </h3>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{doc.filename}</p>
                    </TooltipContent>
                  </Tooltip>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-400">

                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDistanceToNow(new Date(doc.uploaded_at), { addSuffix: true })}
                    </span>

                    <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-xs">
                      {(doc.size_bytes / 1024 / 1024).toFixed(2)} MB
                    </span>

                  </div>

                </div>

                {/* STATUS */}
                <div>
                  {doc.processed ? (
                    <span className="flex items-center gap-2 text-green-400 font-medium text-sm">
                      <CheckCircle2 className="h-5 w-5 drop-shadow-[0_0_5px_rgba(0,255,0,0.5)]" />
                      <span className="hidden md:inline">Done</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-purple-300 font-medium text-sm">
                      <Loader2 className="h-5 w-5 animate-spin drop-shadow-[0_0_5px_rgba(180,90,255,0.6)]" />
                      <span className="hidden md:inline">Processing</span>
                    </span>
                  )}
                </div>

              </CardContent>
            </Card>
          </motion.div>
        ))}

      </div>
    </TooltipProvider>
  );
};
