import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/+esm";

export const UIORI_SUPABASE_URL = "https://hnqrksegigrgtflswhzw.supabase.co";
export const UIORI_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_5lNxH2yg_rO3R1N9E5kecw_cJqtfjLG";
export const UIORI_SITE_URL = "https://uiori.com";
export const UIORI_PROFILE_BUCKET = "profile-pictures";

function isLocalHost(hostname = window.location.hostname) {
  const host = String(hostname || "").toLowerCase();
  return host === "localhost" || host === "127.0.0.1";
}

export const uiOriSupabase = createClient(
  UIORI_SUPABASE_URL,
  UIORI_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

export function uiOriSiteUrl(path = "/") {
  const normalized = String(path || "/");
  const base = isLocalHost() ? `${window.location.origin}/` : `${UIORI_SITE_URL}/`;
  return new URL(normalized.startsWith("/") ? normalized : `/${normalized}`, base).toString();
}

export async function getProfileAvatarUrl(path, expiresIn = 3600) {
  if (!path) return "";
  const { data, error } = await uiOriSupabase.storage
    .from(UIORI_PROFILE_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.warn("[UIORI] profile photo URL could not be created", error);
    return "";
  }

  return data?.signedUrl || "";
}
