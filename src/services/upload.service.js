const crypto = require("crypto");
const path = require("path");
const supabase = require("../utils/supabase");

const BUCKET = "attendo-uploads";

function assertSupabaseClient() {
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }
}

function buildStoragePath(folder, originalName) {
  const safeFolder = String(folder || "general").replace(/^\/+|\/+$/g, "");
  const extension = path.extname(originalName || "").toLowerCase();
  const uniqueName = `${crypto.randomUUID()}${extension}`;
  return `${safeFolder}/${uniqueName}`;
}

async function uploadFile(fileBuffer, originalName, folder, mimeType) {
  assertSupabaseClient();

  const filePath = buildStoragePath(folder, originalName);
  const { error } = await supabase.storage.from(BUCKET).upload(filePath, fileBuffer, {
    contentType: mimeType,
    upsert: false,
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

  return {
    path: filePath,
    publicUrl: data.publicUrl,
  };
}

async function getSignedUrl(filePath, expiresInSeconds = 3600) {
  assertSupabaseClient();

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, expiresInSeconds);

  if (error) {
    throw error;
  }

  return data.signedUrl;
}

async function deleteFile(filePath) {
  assertSupabaseClient();

  const { error } = await supabase.storage.from(BUCKET).remove([filePath]);

  if (error) {
    throw error;
  }

  return true;
}

module.exports = {
  uploadFile,
  getSignedUrl,
  deleteFile,
};
