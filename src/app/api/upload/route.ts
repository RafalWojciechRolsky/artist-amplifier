import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import type { PutBlobResult } from '@vercel/blob';

// This route issues short-lived upload tokens for client-side uploads to Vercel Blob.
// Authentication/authorization can be added in onBeforeGenerateToken.
export async function POST(request: Request): Promise<NextResponse> {
	const body = (await request.json()) as HandleUploadBody;
	try {
		const jsonResponse = await handleUpload({
			body,
			request,
			onBeforeGenerateToken: async (pathname: string /*, clientPayload?: string */) => {
				// TODO: authenticate the user and authorize the upload target/path.
				return {
					allowedContentTypes: ['audio/mpeg', 'audio/wav'],
					maximumSizeInBytes: 50 * 1024 * 1024,
					addRandomSuffix: true,
					// Optional metadata echoed back in onUploadCompleted
					tokenPayload: JSON.stringify({ pathname }),
				};
			},
			onUploadCompleted: async ({
				blob,
				/* tokenPayload */
			}: {
				blob: PutBlobResult;
				tokenPayload?: string | null;
			}) => {
				// On localhost, this callback may not be invoked by Vercel; it's safe to no-op.
				try {
					console.debug('[api/upload] blob upload completed:', blob.url);
				} catch {}
			},
		});
		return NextResponse.json(jsonResponse);
	} catch (error) {
		return NextResponse.json(
			{ error: (error as Error).message },
			{ status: 400 }
		);
	}
}
