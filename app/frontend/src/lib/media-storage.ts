import { getSupabaseClient } from "@/lib/supabase";

export type UploadedMediaAsset = {
  bucketName: string;
  objectKey: string;
  accessUrl: string;
  fileName: string;
  size: number;
};

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const STORAGE_BUCKETS = {
  avatar: "avatars",
  listing: "listing-images",
} as const;

function normalizeStorageError(message: string, bucketName: string) {
  const normalizedMessage = message.trim();

  if (/bucket/i.test(normalizedMessage) && /not found|does not exist/i.test(normalizedMessage)) {
    return `У Supabase Storage не знайдено bucket "${bucketName}". Створіть його в Supabase → Storage.`;
  }

  if (/row level security|policy|unauthorized|permission/i.test(normalizedMessage)) {
    return `Supabase Storage відхилив завантаження. Перевірте policies для bucket "${bucketName}".`;
  }

  return normalizedMessage || "Не вдалося завантажити файл у Supabase Storage.";
}

function getFileExtension(fileName: string) {
  const segments = fileName.split(".");
  if (segments.length < 2) {
    return "bin";
  }

  return segments.pop()?.replace(/[^A-Za-z0-9]/g, "").toLowerCase() || "bin";
}

function sanitizeObjectKeyPart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "media";
}

export function validateImageFile(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error(`Файл ${file.name} не є зображенням.`);
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`Файл ${file.name} перевищує 5 МБ.`);
  }
}

export function buildMediaObjectKey(file: File, purpose: string) {
  const prefix = sanitizeObjectKeyPart(purpose);
  const extension = getFileExtension(file.name);
  const uuid = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `${prefix}-${uuid}.${extension}`;
}

async function getAuthenticatedSupabaseUserId() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase Storage не налаштований у frontend environment.");
  }

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw new Error(error.message || "Не вдалося отримати Supabase-сесію.");
  }

  const userId = data.user?.id;
  if (!userId) {
    throw new Error("Щоб завантажити фото, потрібно увійти в акаунт.");
  }

  return { supabase, userId };
}

export async function uploadImageFile(file: File, purpose: "avatar" | "listing"):
Promise<UploadedMediaAsset> {
  validateImageFile(file);

  const { supabase, userId } = await getAuthenticatedSupabaseUserId();
  const bucketName = STORAGE_BUCKETS[purpose];
  const objectKey = `${userId}/${buildMediaObjectKey(file, purpose)}`;
  const { error: uploadError } = await supabase.storage.from(bucketName).upload(objectKey, file, {
    cacheControl: "3600",
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (uploadError) {
    throw new Error(normalizeStorageError(uploadError.message, bucketName));
  }

  const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(objectKey);
  const accessUrl = publicUrlData.publicUrl;

  if (!accessUrl) {
    throw new Error(`Supabase Storage не повернув публічне посилання для ${file.name}.`);
  }

  return {
    bucketName,
    objectKey,
    accessUrl,
    fileName: file.name,
    size: file.size,
  };
}