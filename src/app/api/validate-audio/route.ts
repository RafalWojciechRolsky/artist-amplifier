import { NextRequest, NextResponse } from "next/server";

// In-memory rate limiter: max 10 requests per 5 minutes per IP
const WINDOW_MS = 5 * 60 * 1000;
const MAX_REQ = 10;
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

// Allowed formats and limits (keep in sync with client constants)
const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const ACCEPT_MIME = new Set(["audio/mpeg", "audio/wav"]);

// Simple file signature checks
async function readHead(file: File, n = 12): Promise<Uint8Array> {
  const slice = file.slice(0, n);
  const buf = await slice.arrayBuffer();
  return new Uint8Array(buf);
}

function looksLikeMP3(head: Uint8Array): boolean {
  // MP3 may start with ID3 tag ("ID3") or MPEG frame sync 0xFF 0xFB (or 0xF3/0xF2)
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
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = (forwarded?.split(",")[0] || req.headers.get("x-real-ip") || "unknown").toString();
  if (!rateLimit(String(ip))) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  // Expect form-data with field "file"
  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
  }

  // Basic MIME and size validation
  if (!ACCEPT_MIME.has(file.type)) {
    return NextResponse.json({ ok: false, error: "INVALID_FORMAT" }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ ok: false, error: "FILE_TOO_LARGE" }, { status: 400 });
  }

  // Content sniffing
  try {
    const head = await readHead(file);
    const isMp3 = file.type === "audio/mpeg" && looksLikeMP3(head);
    const isWav = file.type === "audio/wav" && looksLikeWAV(head);
    if (!isMp3 && !isWav) {
      return NextResponse.json({ ok: false, error: "INVALID_CONTENT" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ ok: false, error: "READ_ERROR" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
