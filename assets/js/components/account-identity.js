import {
  UIORI_PROFILE_BUCKET,
  getProfileAvatarUrl,
  uiOriSupabase,
} from "../lib/supabase-client.js";

const DEFAULT_AVATAR = "/assets/img/default-avatar.svg";
const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PROFILE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export function setMemberState({ name, avatarUrl, state = "pending" } = {}) {
  const safeName = (name || "UIORI member").trim() || "UIORI member";
  const safeAvatar = avatarUrl || DEFAULT_AVATAR;
  const normalizedState = ["active", "inactive", "restricted", "pending"].includes(state)
    ? state
    : "pending";

  document.querySelectorAll("[data-uiori-member-name]").forEach((element) => {
    element.textContent = normalizedState === "pending" ? "" : safeName;
  });

  document.querySelectorAll("[data-uiori-avatar]").forEach((image) => {
    image.src = safeAvatar;
  });

  document.querySelectorAll("[data-uiori-member-badge]").forEach((badge) => {
    badge.classList.toggle("is-active", normalizedState === "active");
    badge.classList.toggle("is-inactive", normalizedState === "inactive");
    badge.classList.toggle("is-restricted", normalizedState === "restricted");
  });

  document.querySelectorAll("[data-uiori-member-status]").forEach((element) => {
    if (normalizedState === "active") element.textContent = "Active member";
    else if (normalizedState === "inactive") element.textContent = "Inactive member";
    else if (normalizedState === "restricted") element.textContent = "Account restricted";
    else element.textContent = "";
  });

  document.querySelectorAll("[data-uiori-member-state]").forEach((element) => {
    element.dataset.uioriMemberState = normalizedState;
  });
}

function extensionFor(file) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

function setPhotoStatus(status, message, isError = false) {
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("is-error", isError);
}

export function setupProfilePhotoUpload() {
  const input = document.querySelector("#profile-photo-input");
  const button = document.querySelector("#profile-photo-button");
  const status = document.querySelector("#profile-photo-status");

  if (!input || !button || input.dataset.uioriUploadReady === "true") return;
  input.dataset.uioriUploadReady = "true";

  button.addEventListener("click", () => input.click());

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;

    if (!ALLOWED_PROFILE_TYPES.has(file.type)) {
      setPhotoStatus(status, "Choose a PNG, JPG, or WebP image.", true);
      input.value = "";
      return;
    }

    if (file.size > MAX_PROFILE_PHOTO_BYTES) {
      setPhotoStatus(status, "Image must be 5 MB or smaller.", true);
      input.value = "";
      return;
    }

    const localPreview = URL.createObjectURL(file);
    document.querySelectorAll("[data-uiori-avatar]").forEach((image) => {
      image.src = localPreview;
    });

    button.disabled = true;
    setPhotoStatus(status, "Uploading photo…");

    try {
      const {
        data: { user },
        error: userError,
      } = await uiOriSupabase.auth.getUser();
      if (userError || !user) throw userError || new Error("Not signed in.");

      const objectPath = `${user.id}/avatar.${extensionFor(file)}`;
      const { error: uploadError } = await uiOriSupabase.storage
        .from(UIORI_PROFILE_BUCKET)
        .upload(objectPath, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: "3600",
        });
      if (uploadError) throw uploadError;

      const { error: profileError } = await uiOriSupabase
        .from("profiles")
        .update({ avatar_path: objectPath })
        .eq("id", user.id);
      if (profileError) throw profileError;

      const avatarUrl = await getProfileAvatarUrl(objectPath);
      document.querySelectorAll("[data-uiori-avatar]").forEach((image) => {
        image.src = avatarUrl || DEFAULT_AVATAR;
      });
      setPhotoStatus(status, "Photo updated.");

      document.dispatchEvent(
        new CustomEvent("uiori:avatar-updated", {
          detail: { avatarPath: objectPath, avatarUrl },
        }),
      );
    } catch (error) {
      console.error("[UIORI] profile photo upload failed", error);
      setPhotoStatus(status, "We couldn't save this photo. Please try again.", true);
    } finally {
      button.disabled = false;
      input.value = "";
      URL.revokeObjectURL(localPreview);
    }
  });
}
