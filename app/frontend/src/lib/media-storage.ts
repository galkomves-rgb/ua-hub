import { getAPIBaseURL } from "@/lib/config";

type StorageBucketInfo = {
  bucket_name: string;
  visibility: "public" | "private";
};

type ListBucketsResponse = {
  buckets: StorageBucketInfo[];
};

type UploadUrlResponse = {
  upload_url: string;
  access_url?: string;
  expires_at: string;
};

type StorageRequestError = {
  detail?: unknown;
  message?: unknown;
};

export type UploadedMediaAsset = {
  bucketName: string;
  objectKey: string;
  accessUrl: string;
  fileName: string;
  size: number;
};

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const PREFERRED_BUCKET_NAMES = [
  "ua-hub-media",
  "uahub-media",
  "ua-hub-public",
  "public-media",
  "media",
  "images",
  "public",
];

let cachedBucketPromise: Promise<string> | null = null;

function getAuthToken() {
  return localStorage.getItem("auth_token");
}

function getStorageHeaders(additionalHeaders?: HeadersInit): HeadersInit {
  const token = getAuthToken();

  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(additionalHeaders ?? {}),
  };
}

function extractStorageErrorMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") {
    return fallback;
  }

  const typedData = data as StorageRequestError;
  const detail = typedData.detail;

  if (typeof detail === "string" && detail.trim()) {
    return detail.trim();
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const location = Array.isArray((item as { loc?: unknown }).loc)
          ? ((item as { loc: unknown[] }).loc
              .filter((part) => part !== "body")
              .map((part) => String(part))
              .join(" → ") || null)
          : null;
        const message = typeof (item as { msg?: unknown }).msg === "string"
          ? (item as { msg: string }).msg.trim()
          : null;

        if (!message) {
          return null;
        }

        return location ? `${location}: ${message}` : message;
      })
      .filter((item): item is string => Boolean(item));

    if (messages.length > 0) {
      return messages.join("; ");
    }
  }

  if (detail && typeof detail === "object" && typeof (detail as { message?: unknown }).message === "string") {
    const nestedMessage = (detail as { message: string }).message.trim();
    if (nestedMessage) {
      return nestedMessage;
    }
  }

  if (typeof typedData.message === "string" && typedData.message.trim()) {
    return typedData.message.trim();
  }

  return fallback;
}

async function storageFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getAPIBaseURL()}${path}`, {
    ...init,
    headers: getStorageHeaders(init?.headers),
  });

  if (!response.ok) {
    let message = "Не вдалося звернутися до сервісу завантаження";

    try {
      const parsed = (await response.json()) as StorageRequestError;
      message = extractStorageErrorMessage(parsed, message);
    } catch {
      // Ignore JSON parsing issues and keep fallback message.
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

function scoreBucket(bucket: StorageBucketInfo) {
  const normalizedName = bucket.bucket_name.toLowerCase();
  let score = bucket.visibility === "public" ? 100 : 0;

  const exactMatchIndex = PREFERRED_BUCKET_NAMES.indexOf(normalizedName);
  if (exactMatchIndex >= 0) {
    score += 50 - exactMatchIndex;
  }

  if (normalizedName.includes("media")) {
    score += 20;
  }

  if (normalizedName.includes("image") || normalizedName.includes("avatar") || normalizedName.includes("listing")) {
    score += 10;
  }

  return score;
}

async function getMediaBucketName() {
  if (!cachedBucketPromise) {
    cachedBucketPromise = (async () => {
      const response = await storageFetch<ListBucketsResponse>("/api/v1/storage/list-buckets");
      const buckets = Array.isArray(response.buckets) ? response.buckets : [];

      if (buckets.length === 0) {
        throw new Error("Сховище зображень ще не налаштоване. Зверніться до адміністратора.");
      }

      return [...buckets].sort((left, right) => scoreBucket(right) - scoreBucket(left))[0].bucket_name;
    })().catch((error) => {
      cachedBucketPromise = null;
      throw error;
    });
  }

  return cachedBucketPromise;
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

export async function uploadImageFile(file: File, purpose: "avatar" | "listing"):
Promise<UploadedMediaAsset> {
  validateImageFile(file);

  const bucketName = await getMediaBucketName();
  const objectKey = buildMediaObjectKey(file, purpose);
  const presigned = await storageFetch<UploadUrlResponse>("/api/v1/storage/upload-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getStorageHeaders(),
    },
    body: JSON.stringify({
      bucket_name: bucketName,
      object_key: objectKey,
    }),
  });

  const uploadResponse = await fetch(presigned.upload_url, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
  });

  if (!uploadResponse.ok) {
    throw new Error(`Не вдалося завантажити ${file.name}.`);
  }

  if (!presigned.access_url) {
    throw new Error("Сервіс зображень не повернув публічне посилання на файл.");
  }

  return {
    bucketName,
    objectKey,
    accessUrl: presigned.access_url,
    fileName: file.name,
    size: file.size,
  };
}