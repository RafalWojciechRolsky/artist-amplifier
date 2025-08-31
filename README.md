This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Environment Variables

Create a `.env.local` file based on `.env.example` and provide the following values:

- `MUSIC_AI_API_KEY` — API key for the Music.ai SDK (required for real analysis)
- `MUSIC_AI_WORKFLOW_ANALYZE` — Workflow ID used by Music.ai for the analyze step (required)
- `MOCK_MUSIC_AI` — optional (`true`/`false`). When `true`, the backend returns a mocked analysis for local development without hitting Music.ai.

Example `.env.local`:

```bash
MUSIC_AI_API_KEY="your-music-ai-api-key-here"
MUSIC_AI_WORKFLOW_ANALYZE="your-music-ai-workflow-id-here"
# Optional for local dev without external calls
MOCK_MUSIC_AI=true
```

## Design System (Neon)

The UI uses a retro neon theme defined in `src/app/globals.css` with utility classes:

- `aa-heading`, `aa-heading-secondary` — neon titles (cyan / magenta)
- `aa-btn-primary` — primary CTA (cyan glow)
- `aa-btn-ghost` — secondary ghost buttons
- `aa-field`, `aa-border`, `aa-dashed` — inputs/textarea styles and dashed borders
- `aa-pulse` — pulse animation for busy state (e.g., Generate button while generating)

Current usage:

- `src/app/page.tsx`: neon headings, Generate button pulses while `status === 'generating'`.
- `src/components/TextEditor.tsx`: textarea uses `aa-field`.
- `src/components/AudioUpload.tsx`: dashed neon border field and helper hint.
- `src/components/ActionButtons.tsx`: copy/download/reset use `aa-btn-ghost`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
