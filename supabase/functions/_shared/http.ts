import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Client errors carry a stable code the frontend can translate. */
export class ApiError extends Error {
  constructor(public code: string, public status = 400, message?: string) {
    super(message ?? code);
  }
}

export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
}

export async function requireUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new ApiError("not_authenticated", 401);
  const anon = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );
  const { data, error } = await anon.auth.getUser(authHeader.replace("Bearer ", ""));
  if (error || !data.user) throw new ApiError("not_authenticated", 401);
  return data.user;
}

/** Cron endpoints (verify_jwt=false) authenticate via the shared secret in app_settings. */
export async function requireCronSecret(req: Request, admin: SupabaseClient) {
  const { data } = await admin.from("app_settings").select("value").eq("key", "cron_secret").single();
  // Fail closed: a missing cron_secret row must block, not bypass, the check.
  const expected = data?.value as string | undefined;
  if (!expected || req.headers.get("x-cron-secret") !== expected) {
    throw new ApiError("forbidden", 403);
  }
}

/** Uniform handler wrapper: OPTIONS/CORS + error mapping. */
export function handler(fn: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    try {
      return await fn(req);
    } catch (err) {
      if (err instanceof ApiError) {
        return json({ error: err.code, message: err.message }, err.status);
      }
      console.error("Unhandled error:", err);
      return json({ error: "internal", message: (err as Error).message }, 500);
    }
  };
}
