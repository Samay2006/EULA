import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { motion } from "framer-motion";

export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // Loading Screen (Gen-Z version)
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-primary/5 to-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center gap-3"
        >
          <Loader2 className="h-10 w-10 animate-spin text-primary drop-shadow-[0_0_6px_rgba(99,102,241,0.5)]" />
          <p className="text-sm text-muted-foreground animate-pulse">
            Hold up… loading your vibes ✨
          </p>
        </motion.div>
      </div>
    );
  }

  // Block unauthenticated users
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Authenticated — render content with soft fade-in
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {children}
    </motion.div>
  );
};
