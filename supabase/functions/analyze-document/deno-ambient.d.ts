// Ambient declarations for remote Deno/ESM imports used by this Supabase Function
// These declarations are minimal and intended to quiet TypeScript in an editor
// that doesn't resolve URL imports (e.g., the workspace TS server on Windows).

declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
  export default serve;
}

declare module "https://esm.sh/@supabase/supabase-js@2.39.3" {
  export function createClient(...args: any[]): any;
  export type SupabaseClient = any;
}

declare module "https://esm.sh/pdf-lib@1.22.0" {
  export const PDFDocument: any;
  export const PDFPage: any;
}

// Generic fallback for other URL imports (optional helper)
declare module "https://*" {
  const _: any;
  export default _;
}

// Minimal Deno globals for editor TypeScript server
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};
