// Centralized server-side env access. Do not import in client code.
export function getServerEnv() {
  return {
    MUSIC_AI_API_KEY: process.env.MUSIC_AI_API_KEY ?? '',
    MUSIC_AI_WORKFLOW_ANALYZE: process.env.MUSIC_AI_WORKFLOW_ANALYZE ?? '',
    LLM_API_KEY: process.env.LLM_API_KEY ?? '',
    LLM_MODEL: process.env.LLM_MODEL ?? '',
    LLM_SYSTEM_PROMPT: process.env.LLM_SYSTEM_PROMPT ?? '',
  } as const;
}

// Back-compat snapshot (avoid if you need dynamic values in tests)
export const serverEnv = getServerEnv();

export function assertServerEnv() {
  const env = getServerEnv();
  const missing: string[] = [];
  if (!env.MUSIC_AI_API_KEY) missing.push('MUSIC_AI_API_KEY');
  if (!env.MUSIC_AI_WORKFLOW_ANALYZE) missing.push('MUSIC_AI_WORKFLOW_ANALYZE');
  if (missing.length) {
    const msg = `Missing required env vars: ${missing.join(', ')}`;
    throw Object.assign(new Error(msg), { code: 'ENV_MISSING' });
  }
}
