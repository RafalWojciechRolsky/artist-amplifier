import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { generateDescription as llmGenerateDescription } from "@/lib/server/llm";
import type { AnalyzedTrack, AnalysisResult } from "@/lib/types/analysis";
import { transformMusicAiRawToAnalyzedTrack } from "@/lib/server/musicaiTransform";

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

// NOTE: Generation no longer accepts files; it uses prior analysis results.

type ApiError = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
    requestId: string;
  };
};

function apiError(status: number, code: string, message: string, details: Record<string, unknown> | undefined, requestId: string) {
  const body: ApiError = {
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      requestId,
    },
  };
  return NextResponse.json(body, { status });
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = (forwarded?.split(",")[0] || req.headers.get("x-real-ip") || "unknown").toString();
  return String(ip);
}

type GeneratePayload = {
  artistName: string;
  songTitle: string;
  artistDescription: string;
  language?: string;
  template?: string;
  analysis: AnalysisResult;
};

type ParsedJsonOk = {
  ok: true;
  data: {
    artistName: string;
    songTitle: string;
    artistDescription: string;
    language: string;
    template?: string;
    analysis: GeneratePayload['analysis'];
  };
};

type ParsedJsonErr = { ok: false; res: NextResponse };

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

async function parseAndValidateJson(req: NextRequest, requestId: string): Promise<ParsedJsonOk | ParsedJsonErr> {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return { ok: false, res: apiError(400, "BAD_CONTENT_TYPE", "Expected application/json", undefined, requestId) };
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { ok: false, res: apiError(400, "BAD_REQUEST", "Invalid JSON body", undefined, requestId) };
  }
  if (!isRecord(body)) {
    return { ok: false, res: apiError(400, "BAD_REQUEST", "Invalid JSON body", undefined, requestId) };
  }

  const artistName = String((body.artistName ?? '').toString()).trim();
  const songTitleRaw = String((body.songTitle ?? '').toString());
  const songTitle = songTitleRaw.trim().slice(0, 200);
  const artistDescription = String((body.artistDescription ?? '').toString()).trim();
  const language = ((body.language ?? 'pl').toString().trim() || 'pl').slice(0, 8);
  const templateRaw = typeof body.template === 'string' ? body.template : '';
  const template = templateRaw ? templateRaw.trim().slice(0, 5000) : undefined;
  const analysis = body.analysis as GeneratePayload['analysis'] | undefined;

  if (!artistName) {
    return { ok: false, res: apiError(400, "INVALID_ARTIST_NAME", "artistName is required", undefined, requestId) };
  }
  if (!songTitle) {
    return { ok: false, res: apiError(400, "INVALID_SONG_TITLE", "songTitle is required", undefined, requestId) };
  }
  if (artistDescription.length < 50 || artistDescription.length > 1000) {
    return {
      ok: false,
      res: apiError(400, "INVALID_ARTIST_DESCRIPTION", "artistDescription must be 50-1000 characters", {
        min: 50,
        max: 1000,
        length: artistDescription.length,
      }, requestId),
    };
  }
  if (!analysis || !isRecord(analysis) || !isRecord(analysis.data)) {
    return { ok: false, res: apiError(400, "MISSING_ANALYSIS", "Missing prior analysis result in request body", undefined, requestId) };
  }

  return { ok: true, data: { artistName, songTitle, artistDescription, language, template, analysis } };
}

function successResponse({ language, text, outline, modelName, tokensUsed }: { language: string; text: string; outline: string[]; modelName?: string; tokensUsed?: number }) {
  return NextResponse.json(
    {
      language,
      text,
      outline,
      modelName,
      tokensUsed,
    },
    { status: 200 }
  );
}

// Mood mapper consistent with analyze route
function determineMood(energy: number | string | undefined): string {
  if (energy === undefined) return 'unknown';
  if (typeof energy === 'number') {
    if (energy >= 0.8) return 'energetic';
    if (energy >= 0.6) return 'uplifting';
    if (energy >= 0.4) return 'balanced';
    if (energy >= 0.2) return 'relaxed';
    return 'melancholic';
  }
  const s = String(energy).toLowerCase();
  if (s.includes('very high') || s === 'high' || s.includes('strong')) return 'energetic';
  if (s === 'medium' || s.includes('moderate') || s.includes('balanced')) return 'uplifting';
  if (s === 'low' || s.includes('calm') || s.includes('soft')) return 'relaxed';
  return 'unknown';
}

export async function POST(req: NextRequest) {
  const requestId = randomUUID();
  // Rate limit
  const ip = getClientIp(req);
  if (!rateLimit(String(ip))) {
    return apiError(429, "RATE_LIMIT", "Too many requests. Please try again later.", undefined, requestId);
  }

  // Parse and validate JSON
  const parsed = await parseAndValidateJson(req, requestId);
  if (!parsed.ok) return parsed.res;
  const { artistName, songTitle, artistDescription, language, template, analysis } = parsed.data;

  // Extract AnalyzedTrack for LLM; if missing in payload, attempt to transform raw data
  const data = analysis.data as Record<string, unknown>;
  let analyzed: AnalyzedTrack | null = null;
  const maybeAnalyzed = isRecord(data.analyzedTrack) ? (data.analyzedTrack as Record<string, unknown>) : null;
  if (maybeAnalyzed) {
    analyzed = maybeAnalyzed as unknown as AnalyzedTrack;
  } else {
    try {
      analyzed = await transformMusicAiRawToAnalyzedTrack(data);
    } catch {
      analyzed = null;
    }
  }

  if (!analyzed) {
    return apiError(400, "INVALID_ANALYSIS", "Unable to derive analyzed track from payload.", undefined, requestId);
  }

  // Extract helpful hints for outline (UX), independent of LLM
  const tempo = typeof (data as Record<string, unknown>).tempo === 'number' ? (data as Record<string, number>).tempo : undefined;
  const energyHint = analyzed.energyLevel;
  const mood = determineMood(energyHint);

  try {
    if (!process.env.JEST_WORKER_ID) {
      console.debug('[audio/generate]', requestId, 'received analysis ->', data);
      console.debug('[audio/generate]', requestId, 'derived mood <-', energyHint, '=>', mood);
    }
  } catch {
    // ignore logging errors
  }

  // Keep outline for UX context while switching text to real LLM output
  const outline = [
    "Hook: Kim jest artysta i klimat utworu",
    `Sygnały z analizy: tempo=${tempo ?? '—'}` + (mood ? `, nastrój=${mood}` : ''),
    "Propozycje wykorzystania / playlisty",
  ];

  try {
    const lang = language === 'en' ? 'en' as const : 'pl' as const;
    const llm = await llmGenerateDescription({
      artistName,
      songTitle,
      artistDescription,
      analysis: analyzed,
      language: lang,
      template,
    });
    return successResponse({ language: lang, text: llm.text, outline, modelName: llm.modelName, tokensUsed: llm.tokensUsed });
  } catch (e: unknown) {
    const err = e as { status?: number; code?: string; message?: string; details?: Record<string, unknown> } | undefined;
    if (err?.code === 'ENV_MISSING') {
      return apiError(500, 'ENV_MISSING', err?.message || 'Missing environment configuration', err?.details, requestId);
    }
    if (err?.status === 429) {
      return apiError(429, 'RATE_LIMIT', 'Too many requests to LLM. Please try again later.', { upstream: 'LLM' }, requestId);
    }
    const message = err?.message || 'Upstream LLM error';
    return apiError(502, 'LLM_ERROR', message, err?.details, requestId);
  }
}
