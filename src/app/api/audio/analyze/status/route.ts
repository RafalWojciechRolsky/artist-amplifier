import { NextRequest, NextResponse } from 'next/server';
import {
    MusicAiIntegrationError,
    waitForJobRawResult,
} from '@/lib/server/musicai';
import { transformMusicAiRawToAnalyzedTrack } from '@/lib/server/musicaiTransform';

function apiError(
    status: number,
    code: string,
    message: string,
    details?: Record<string, unknown>
) {
    return NextResponse.json(
        {
            error: {
                code,
                message,
                details,
                timestamp: new Date().toISOString(),
            },
        },
        { status }
    );
}

// Unified mood mapper accepting numeric 0..1 or string energy levels
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

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');
    if (!jobId) return apiError(400, 'MISSING_JOB_ID', 'Missing jobId parameter');

    try {
        // Wait a reasonable time window per poll to reduce client churn
        const raw = await waitForJobRawResult(jobId, { waitTimeoutMs: 25000 });
        if (raw === 'TIMEOUT') {
            return NextResponse.json(
                { status: 'processing', jobId },
                { status: 202 }
            );
        }

        // Transform to full analyzed track
        const analyzedTrack = await transformMusicAiRawToAnalyzedTrack(raw as Record<string, unknown>);
        // Derive mood from string or numeric energy
        const energyHint = (analyzedTrack?.energyLevel ?? (raw as Record<string, unknown>)['energy']) as
            | string
            | number
            | undefined;
        const mood = determineMood(energyHint);
        // Attempt to pick tempo from raw payload (bpm/tempo), fallback 120
        const num = (v: unknown): number | undefined => {
            if (typeof v === 'number' && Number.isFinite(v)) return v;
            if (typeof v === 'string' && !Number.isNaN(Number(v))) return Number(v);
            return undefined;
        };
        const tempo = num((raw as Record<string, unknown>)['bpm'] ?? (raw as Record<string, unknown>)['tempo']) ?? 120;
        try {
            if (!process.env.JEST_WORKER_ID) {
                console.debug('[audio/analyze/status] energy ->', energyHint, 'derived mood ->', mood);
            }
        } catch {
            // ignore logging errors
        }

        return NextResponse.json({
            id: `${Date.now()}`,
            provider: 'music.ai',
            data: {
                fileName: undefined,
                size: undefined,
                type: undefined,
                tempo,
                mood,
                analyzedTrack,
            },
        });
    } catch (e: unknown) {
        if (e instanceof MusicAiIntegrationError) {
            return apiError(e.status, e.code, e.message, e.details);
        }
        return apiError(502, 'MUSIC_AI_BAD_GATEWAY', 'Upstream error while checking job status');
    }
}
