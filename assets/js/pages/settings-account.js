import "../components/password-toggle.js";
import { setupProfilePhotoUpload } from "../components/account-identity.js";
import { getProfileAvatarUrl, uiOriSupabase } from "../lib/supabase-client.js";

const DEFAULT_AVATAR = "/assets/img/default-avatar.svg";

function setText(selector, value) {
  document.querySelectorAll(selector).forEach((el) => { el.textContent = value; });
}
function status(selector, message, error=false) {
  const el=document.querySelector(selector); if(!el) return;
  el.textContent=message||""; el.classList.toggle("is-error",error);
}
function redirectToLogin() {
  const next = window.location.pathname + window.location.search;
  const url = new URL("/login/", window.location.origin);
  url.searchParams.set("next", next);
  window.location.replace(url.toString());
}
function safeName(user, profile) {
  return profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "UIORI advertiser";
}
function formatMemberSince(value) {
  if(!value) return "—"; const d=new Date(value); if(Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined,{month:"short",year:"numeric"}).format(d);
}
function setIdentity(user, profile, avatarUrl) {
  setText("[data-uiori-member-name]", safeName(user,profile));
  setText("[data-uiori-member-status]", "Advertiser");
  setText("[data-uiori-member-since]", formatMemberSince(profile?.created_at || user?.created_at));
  document.querySelectorAll("[data-uiori-avatar]").forEach(img=>{img.src=avatarUrl||DEFAULT_AVATAR;});
  document.querySelectorAll("[data-uiori-member-state]").forEach(el=>{el.dataset.uioriMemberState="active";});
}
function wireLogout() {
  document.querySelectorAll("[data-uiori-logout]").forEach(control=>{
    control.addEventListener("click",async(e)=>{e.preventDefault(); try{await uiOriSupabase.auth.signOut({scope:"local"});}finally{window.location.replace("/login/");}});
  });
}
function recoveryMode() {
  const q=new URLSearchParams(window.location.search);
  const h=new URLSearchParams(window.location.hash.replace(/^#/,""));
  return q.get("recovery")==="1" || h.get("type")==="recovery";
}
function cleanRecoveryUrl() {
  const q=new URLSearchParams(window.location.search); q.delete("recovery");
  window.history.replaceState({},"",window.location.pathname+(q.toString()?"?"+q.toString():""));
}
function setupPasswordChange() {
  const form=document.querySelector("#settings-password-form");
  const password=document.querySelector("#settings-new-password");
  const confirm=document.querySelector("#settings-confirm-password");
  const save=document.querySelector("#settings-password-save");
  if(!form||!password||!confirm||!save) return;
  if(recoveryMode()) status("#settings-security-status","Reset link verified. Choose a new password.");
  form.addEventListener("submit",async(e)=>{
    e.preventDefault();
    if(password.value.length<8){status("#settings-security-status","Use at least 8 characters.",true);return;}
    if(password.value!==confirm.value){status("#settings-security-status","The two passwords do not match.",true);return;}
    save.disabled=true; status("#settings-security-status","Saving password…");
    try{const {error}=await uiOriSupabase.auth.updateUser({password:password.value}); if(error) throw error; form.reset(); cleanRecoveryUrl(); status("#settings-security-status","Password changed successfully.");}
    catch(err){console.error("[UIORI] password update failed",err);status("#settings-security-status",err?.message||"We couldn't change the password.",true);}
    finally{save.disabled=false;}
  });
}
function setupDeleteAccount() {
  const open=document.querySelector("#settings-delete-account-button"), dialog=document.querySelector("#settings-delete-dialog"), input=document.querySelector("#settings-delete-confirmation"), cancel=document.querySelector("#settings-delete-cancel"), confirm=document.querySelector("#settings-delete-confirm-button");
  if(!open||!dialog||!input||!cancel||!confirm)return;
  const reset=()=>{input.value="";confirm.disabled=true;status("#settings-delete-status","");};
  open.addEventListener("click",()=>{reset();dialog.showModal();});
  cancel.addEventListener("click",()=>dialog.close());
  input.addEventListener("input",()=>{confirm.disabled=input.value.trim()!=="DELETE";});
  dialog.addEventListener("close",reset);
  confirm.addEventListener("click",async()=>{
    if(input.value.trim()!=="DELETE")return;
    confirm.disabled=true; cancel.disabled=true; input.disabled=true; status("#settings-delete-status","Deleting your account…");
    try{
      const {data,error}=await uiOriSupabase.functions.invoke("delete-account",{body:{confirm:"DELETE"}});
      if(error||!data?.ok) throw new Error(data?.error||error?.message||"delete_failed");
      try{await uiOriSupabase.auth.signOut({scope:"local"});}catch{}
      window.location.replace("/?account=deleted");
    }catch(err){
      console.error("[UIORI] account deletion failed",err);
      status("#settings-delete-status","This account cannot be deleted automatically right now. Contact UIORI Support if you need help.",true);
      confirm.disabled=input.value.trim()!=="DELETE"; cancel.disabled=false; input.disabled=false;
    }
  });
}
async function load() {
  const {data:{user},error:userError}=await uiOriSupabase.auth.getUser();
  if(userError||!user){redirectToLogin();return;}
  const {data:profile,error:profileError}=await uiOriSupabase.from("profiles").select("full_name, avatar_path, created_at").eq("id",user.id).maybeSingle();
  if(profileError) console.warn("[UIORI] profile load failed",profileError);
  const avatarUrl=profile?.avatar_path?await getProfileAvatarUrl(profile.avatar_path):"";
  setIdentity(user,profile,avatarUrl);
  const name=document.querySelector("#settings-name"), email=document.querySelector("#settings-email");
  if(name) name.value=safeName(user,profile); if(email) email.value=user.email||"";
  document.querySelector("#settings-save-button")?.removeAttribute("disabled");
  document.querySelector("#settings-delete-account-button")?.removeAttribute("disabled");
  setupProfilePhotoUpload();
  document.body.classList.remove("app-auth-loading");
}
document.querySelector("#settings-profile-form")?.addEventListener("submit",async(e)=>{
  e.preventDefault();
  const save=document.querySelector("#settings-save-button"), name=document.querySelector("#settings-name")?.value.trim()||"", email=document.querySelector("#settings-email")?.value.trim()||"";
  if(!name||!email){status("#settings-save-status","Name and email are required.",true);return;}
  save.disabled=true; status("#settings-save-status","Saving…");
  try{
    const {data:{user},error:userError}=await uiOriSupabase.auth.getUser(); if(userError||!user) throw userError||new Error("Not signed in.");
    const {error:profileError}=await uiOriSupabase.from("profiles").update({full_name:name}).eq("id",user.id); if(profileError) throw profileError;
    if(email.toLowerCase()!==String(user.email||"").toLowerCase()){const {error}=await uiOriSupabase.auth.updateUser({email});if(error)throw error;status("#settings-save-status","Name saved. Check your email to confirm the address change.");}
    else status("#settings-save-status","Changes saved.");
    setText("[data-uiori-member-name]",name);
  }catch(err){console.error("[UIORI] settings save failed",err);status("#settings-save-status","We couldn't save these changes. Please try again.",true);}
  finally{save.disabled=false;}
});
wireLogout(); setupPasswordChange(); setupDeleteAccount(); load().catch(err=>{console.error("[UIORI] settings load failed",err);document.body.classList.remove("app-auth-loading");});
uiOriSupabase.auth.onAuthStateChange((event)=>{if(event==="SIGNED_OUT") redirectToLogin(); if(event==="PASSWORD_RECOVERY") status("#settings-security-status","Reset link verified. Choose a new password.");});
