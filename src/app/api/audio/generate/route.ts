import { NextRequest, NextResponse } from "next/server";

// Basic in-memory rate limiter: max 20 requests per 5 minutes per IP
const WINDOW_MS = 5 * 60 * 1000;
const MAX_REQ = 20;
const buckets = new Map<string, number[]>();

function rateLimit(key: string) {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const arr = buckets.get(key) ?? [];
  const filtered = arr.filter((t) => t > windowStart);
  if (filtered.length >= MAX_REQ) return false;
  filtered.push(now);
  buckets.set(key, filtered);
  return true;
}

// Limits aligned with FE validation
const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const ACCEPT_MIME = new Set(["audio/mpeg", "audio/wav"]);

type ApiError = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
    requestId: string;
  };
};

function apiError(status: number, code: string, message: string, details?: Record<string, unknown>) {
  const body: ApiError = {
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
    },
  };
  return NextResponse.json(body, { status });
}

async function readHead(file: File, n = 12): Promise<Uint8Array> {
  const slice = file.slice(0, n);
  const buf = await slice.arrayBuffer();
  return new Uint8Array(buf);
}

function looksLikeMP3(head: Uint8Array): boolean {
  // MP3 may start with ID3 tag ("ID3") or MPEG frame sync 0xFF 0xE0 mask
  if (head.length >= 3 && head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33) return true; // "ID3"
  if (head.length >= 2 && head[0] === 0xff && (head[1] & 0xe0) === 0xe0) return true; // frame sync
  return false;
}

function looksLikeWAV(head: Uint8Array): boolean {
  // RIFF....WAVE
  if (head.length >= 12) {
    const str = new TextDecoder().decode(head);
    return str.startsWith("RIFF") && str.slice(8, 12) === "WAVE";
  }
  return false;
}

export async function POST(req: NextRequest) {
  // Rate limit
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = (forwarded?.split(",")[0] || req.headers.get("x-real-ip") || "unknown").toString();
  if (!rateLimit(String(ip))) {
    return apiError(429, "RATE_LIMIT", "Too many requests. Please try again later.");
  }

  // Expect multipart/form-data
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return apiError(400, "BAD_CONTENT_TYPE", "Expected multipart/form-data");
  }

  const form = await req.formData();
  const file = form.get("file");
  const artistName = String(form.get("artistName") || "").trim();
  const artistDescription = String(form.get("artistDescription") || "").trim();
  const language = (String(form.get("language") || "pl").trim() || "pl").slice(0, 8);

  if (!(file instanceof File)) {
    return apiError(400, "MISSING_FILE", "Missing file field 'file'");
  }

  // Validate fields
  if (!artistName) {
    return apiError(400, "INVALID_ARTIST_NAME", "artistName is required");
  }
  if (artistDescription.length < 50 || artistDescription.length > 1000) {
    return apiError(400, "INVALID_ARTIST_DESCRIPTION", "artistDescription must be 50-1000 characters", {
      min: 50,
      max: 1000,
      length: artistDescription.length,
    });
  }

  // Validate file
  if (!ACCEPT_MIME.has(file.type)) {
    return apiError(415, "UNSUPPORTED_MEDIA_TYPE", "Only MP3 and WAV files are supported");
  }
  if (file.size > MAX_SIZE_BYTES) {
    return apiError(413, "PAYLOAD_TOO_LARGE", "File too large (max 50MB)");
  }

  try {
    const head = await readHead(file);
    const isMp3 = file.type === "audio/mpeg" && looksLikeMP3(head);
    const isWav = file.type === "audio/wav" && looksLikeWAV(head);
    if (!isMp3 && !isWav) {
      return apiError(400, "INVALID_CONTENT", "File signature does not match declared type");
    }
  } catch {
    return apiError(400, "READ_ERROR", "Unable to read file header");
  }

  // Simulated orchestration (Music.ai + LLM). Replace with real SDK calls.
  // We keep this synchronous and return a concrete JSON per contract.
  await new Promise((r) => setTimeout(r, 1000 + Math.floor(Math.random() * 1000)));

  const outline = [
    "Hook: Kim jest artysta i klimat utworu",
    "Cechy brzmienia i nastrój",
    "Propozycje wykorzystania / playlisty",
  ];

  const text = `${artistName} — ${artistDescription.slice(0, 140)}...`; // naive stub

  return NextResponse.json(
    {
      language,
      text,
      outline,
      modelName: "stub-llm",
      tokensUsed: 512 + Math.floor(Math.random() * 256),
    },
    { status: 200 }
  );
}
