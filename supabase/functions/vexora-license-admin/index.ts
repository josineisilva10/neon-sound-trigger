import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-admin-token",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value.trim());
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!["GET", "POST", "PATCH"].includes(req.method)) return response({ error: "Method not allowed" }, 405);

  const adminToken = Deno.env.get("VEXORA_ADMIN_TOKEN");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!adminToken || !supabaseUrl || !serviceRoleKey) {
    return response({ error: "Admin endpoint is not configured. Add VEXORA_ADMIN_TOKEN in Lovable Cloud Secrets." }, 503);
  }
  const suppliedToken = req.headers.get("x-admin-token") || "";
  if (suppliedToken.length < 24 || suppliedToken !== adminToken) {
    return response({ error: "Acesso administrativo não autorizado." }, 401);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("vexora_licenses")
      .select("id,email,status,max_activations,expires_at,created_at,revoked_at,vexora_license_activations(count)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return response({ error: "Não foi possível carregar as licenças." }, 500);
    return response({ licenses: data ?? [] });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return response({ error: "Corpo da solicitação inválido." }, 400);
  }

  if (req.method === "POST") {
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const licenseKey = typeof body.licenseKey === "string" ? body.licenseKey.trim() : "";
    const maxActivations = Number(body.maxActivations);
    const expiresAt = body.expiresAt === null || body.expiresAt === "" ? null : String(body.expiresAt);
    if (!email.includes("@") || licenseKey.length < 16 || !Number.isInteger(maxActivations) || maxActivations < 1 || maxActivations > 20) {
      return response({ error: "Informe e-mail válido, chave com pelo menos 16 caracteres e limite de 1 a 20 dispositivos." }, 400);
    }
    if (expiresAt && Number.isNaN(Date.parse(expiresAt))) return response({ error: "Data de validade inválida." }, 400);
    const { data, error } = await supabase.from("vexora_licenses").insert({
      email,
      key_hash: await sha256(licenseKey),
      max_activations: maxActivations,
      expires_at: expiresAt,
      status: "active",
    }).select("id,email,status,max_activations,expires_at,created_at,revoked_at").single();
    if (error) {
      if (error.code === "23505") return response({ error: "Essa chave já está cadastrada. Gere outra chave." }, 409);
      return response({ error: "Não foi possível criar a licença." }, 500);
    }
    return response({ license: data }, 201);
  }

  if (req.method === "PATCH") {
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return response({ error: "ID da licença obrigatório." }, 400);
    const { data, error } = await supabase.from("vexora_licenses")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("id", id)
      .select("id,email,status,max_activations,expires_at,created_at,revoked_at")
      .maybeSingle();
    if (error) return response({ error: "Não foi possível revogar a licença." }, 500);
    if (!data) return response({ error: "Licença não encontrada." }, 404);
    return response({ license: data });
  }

  return response({ error: "Method not allowed" }, 405);
});
