/** @jest-environment node */
import { POST } from '../route';
import { NextRequest } from 'next/server';

// Mock the Vercel Blob client
jest.mock('@vercel/blob/client', () => ({
	handleUpload: jest.fn(),
}));

describe('/api/upload', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should handle valid upload request', async () => {
		// Arrange
		const { handleUpload } = await import('@vercel/blob/client');
		const mockHandleUpload = handleUpload as jest.MockedFunction<typeof handleUpload>;
		
		mockHandleUpload.mockResolvedValue({
			type: 'blob.generate-client-token',
			clientToken: 'mock-token',
		});

		const requestBody = {
			pathname: 'test-audio.mp3',
			contentType: 'audio/mpeg',
		};

		const request = new NextRequest('http://localhost/api/upload', {
			method: 'POST',
			body: JSON.stringify(requestBody),
			headers: {
				'Content-Type': 'application/json',
			},
		});

		// Act
		const response = await POST(request);

		// Assert
		expect(response.status).toBe(200);
		expect(mockHandleUpload).toHaveBeenCalled();
	});

	it('should handle upload service errors', async () => {
		// Arrange
		const { handleUpload } = await import('@vercel/blob/client');
		const mockHandleUpload = handleUpload as jest.MockedFunction<typeof handleUpload>;
		
		const errorMessage = 'Vercel Blob service unavailable';
		mockHandleUpload.mockRejectedValue(new Error(errorMessage));

		const request = new NextRequest('http://localhost/api/upload', {
			method: 'POST',
			body: JSON.stringify({ pathname: 'test-audio.mp3' }),
			headers: { 'Content-Type': 'application/json' },
		});

		// Act
		const response = await POST(request);
		const result = await response.json();

		// Assert
		expect(response.status).toBe(400);
		expect(result).toEqual({ error: errorMessage });
	});

	it('should configure upload constraints correctly', async () => {
		// Arrange
		const { handleUpload } = await import('@vercel/blob/client');
		const mockHandleUpload = handleUpload as jest.MockedFunction<typeof handleUpload>;
		
		let capturedConfig: unknown;
		mockHandleUpload.mockImplementation(async ({ onBeforeGenerateToken }) => {
			if (onBeforeGenerateToken) {
				// Call with a permissive signature to satisfy differing versions
				capturedConfig = await (onBeforeGenerateToken as unknown as (
					pathname: string,
					clientPayload: string | null,
					third?: unknown
				) => Promise<unknown>)(
					'test-audio.mp3',
					null,
					undefined
				);
			}
			return {
				type: 'blob.generate-client-token',
				clientToken: 'mock-token',
			};
		});

		const request = new NextRequest('http://localhost/api/upload', {
			method: 'POST',
			body: JSON.stringify({ pathname: 'test-audio.mp3' }),
			headers: { 'Content-Type': 'application/json' },
		});

		// Act
		await POST(request);

		// Assert
		expect(capturedConfig).toEqual({
			allowedContentTypes: ['audio/mpeg', 'audio/wav'],
			maximumSizeInBytes: 50 * 1024 * 1024, // 50MB
			addRandomSuffix: true,
			tokenPayload: JSON.stringify({ pathname: 'test-audio.mp3' }),
		});
	});
});
