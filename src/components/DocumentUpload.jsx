import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export const DocumentUpload = ({ onUploadComplete, onCancel }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.type !== 'application/pdf') {
      toast.error('Only PDF files are supported 😔');
      return;
    }

    if (selectedFile.size > 20 * 1024 * 1024) {
      toast.error('File must be under 20MB 🚫');
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    setUploading(true);

    try {
      const filePath = `${user.id}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          owner_id: user.id,
          filename: file.name,
          storage_path: filePath,
          mime_type: file.type,
          size_bytes: file.size,
        });

      if (dbError) throw dbError;

      toast.success('Uploaded successfully ✨');
      onUploadComplete();
    } catch (error) {
      toast.error(error.message || 'Upload failed 💀');
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Card
        className="
          backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl
          shadow-[0_0_20px_rgba(140,100,255,0.2)]
        "
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                Upload Document
              </CardTitle>
              <CardDescription>
                Drop your PDF and let the AI cook 👨‍🍳🤍
              </CardDescription>
            </div>

            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-5">

            {/* --- No file selected --- */}
            {!file && (
              <motion.label
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="
                  flex flex-col items-center justify-center p-12 rounded-2xl cursor-pointer
                  border-2 border-dashed border-white/10
                  text-muted-foreground
                  transition-all
                  hover:border-purple-400/40 hover:bg-white/5
                  hover:shadow-[0_0_18px_rgba(180,100,255,0.25)]
                "
              >
                <Upload className="h-12 w-12 mb-4 text-purple-300 animate-pulse" />
                <p className="text-sm mb-1">Click to upload / drag & drop</p>
                <p className="text-xs opacity-70">PDF only • max 20MB</p>

                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </motion.label>
            )}

            {/* --- File selected preview --- */}
            {file && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="
                  flex items-center justify-between p-4 rounded-xl
                  bg-white/5 border border-white/10
                "
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-9 w-9 text-purple-400 drop-shadow" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-xs opacity-70">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFile(null)}
                  disabled={uploading}
                >
                  <X className="h-5 w-5" />
                </Button>
              </motion.div>
            )}

            {/* --- Upload button --- */}
            {file && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <Button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="
                    flex-1 gap-2 rounded-xl py-5 text-base
                    bg-gradient-to-r from-primary to-purple-500
                    hover:shadow-[0_0_18px_rgba(180,100,255,0.4)]
                    transition-all duration-300
                  "
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Uploading…
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5" />
                      Upload & Analyze
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
