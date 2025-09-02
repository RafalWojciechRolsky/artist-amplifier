/**
 * @jest-environment jsdom
 */

import { analyzeAudio } from '../analysis';

// Mock the Vercel Blob client
jest.mock('@vercel/blob/client', () => ({
	upload: jest.fn(),
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Baseline crypto mock helper
const makeCryptoMock = () => ({
	subtle: {
		digest: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
	},
});

describe('analyzeAudio - Error Handling', () => {
	const mockFile = new File(['test content'], 'test.mp3', { type: 'audio/mpeg' });

	beforeEach(() => {
		jest.clearAllMocks();
		Object.defineProperty(global, 'crypto', {
			value: makeCryptoMock(),
			configurable: true,
		});
		const gw = global as unknown as { window?: { [k: string]: unknown } };
		if (gw.window) {
			Object.defineProperty(gw.window, 'crypto', {
				value: (global as unknown as { crypto: unknown }).crypto,
				configurable: true,
			});
		}
	});

	describe('Upload Failures', () => {
		it('should handle network errors during upload', async () => {
			// Arrange
			const { upload } = await import('@vercel/blob/client');
			const mockUpload = upload as jest.MockedFunction<typeof upload>;
			mockUpload.mockRejectedValue(new Error('Network error'));

			// Act & Assert
			await expect(analyzeAudio(mockFile)).rejects.toThrow(
				'Nie udało się przesłać pliku do magazynu. Spróbuj ponownie.'
			);
		});

		it('should handle abort errors during upload', async () => {
			// Arrange
			const { upload } = await import('@vercel/blob/client');
			const mockUpload = upload as jest.MockedFunction<typeof upload>;
			mockUpload.mockRejectedValue(new DOMException('Aborted', 'AbortError'));

			// Act & Assert
			await expect(analyzeAudio(mockFile)).rejects.toThrow('Aborted');
		});
	});

	describe('Analysis API Failures', () => {
		beforeEach(async () => {
			// Mock successful upload
			const { upload } = await import('@vercel/blob/client');
			const mockUpload = upload as jest.MockedFunction<typeof upload>;
			(mockUpload as jest.Mock).mockResolvedValue({ url: 'https://example.com/test.mp3' });
		});

		it('should handle network errors during analysis request', async () => {
			// Arrange
			mockFetch.mockRejectedValue(new Error('Network error'));

			// Act & Assert
			await expect(analyzeAudio(mockFile)).rejects.toThrow(
				'Problem z połączeniem sieciowym. Spróbuj ponownie.'
			);
		});

		it('should handle analysis API server errors', async () => {
			// Arrange
			mockFetch.mockResolvedValue({
				ok: false,
				status: 500,
				headers: new Headers({ 'content-type': 'application/json' }),
				json: () => Promise.resolve({ error: { message: 'Internal server error' } }),
			});

			// Act & Assert
			await expect(analyzeAudio(mockFile)).rejects.toThrow('Internal server error');
		});

		it('should handle checksum validation errors', async () => {
			// Arrange
			mockFetch.mockResolvedValue({
				ok: false,
				status: 422,
				headers: new Headers({ 'content-type': 'application/json' }),
				json: () => Promise.resolve({
					error: { message: 'Checksum mismatch detected for downloaded file' }
				}),
			});

			// Act & Assert
			await expect(analyzeAudio(mockFile)).rejects.toThrow(
				'Checksum mismatch detected for downloaded file'
			);
		});
	});

	describe('Background Job Polling', () => {
		beforeEach(async () => {
			// Mock successful upload
			const { upload } = await import('@vercel/blob/client');
			const mockUpload = upload as jest.MockedFunction<typeof upload>;
			(mockUpload as jest.Mock).mockResolvedValue({ url: 'https://example.com/test.mp3' });
		});

		it('should handle missing jobId in background processing response', async () => {
			// Arrange
			mockFetch.mockResolvedValue({
				ok: false,
				status: 202,
				json: () => Promise.resolve({ status: 'processing' }), // Missing jobId
			});

			// Act & Assert
			await expect(analyzeAudio(mockFile)).rejects.toThrow(
				'Serwer przetwarza analizę, ale nie zwrócił identyfikatora zadania.'
			);
		});

		it('should handle polling network errors', async () => {
			// Arrange
			mockFetch
				.mockResolvedValueOnce({
					ok: false,
					status: 202,
					json: () => Promise.resolve({ status: 'processing', jobId: 'test-job' }),
				})
				.mockRejectedValue(new Error('Network error'));

			// Act & Assert
			await expect(analyzeAudio(mockFile)).rejects.toThrow(
				'Problem z połączeniem sieciowym podczas sprawdzania statusu.'
			);
		});
	});

	describe('Checksum Validation', () => {
		it('should reject when checksum calculation fails', async () => {
			// Arrange
			const { upload } = await import('@vercel/blob/client');
			const mockUpload = upload as jest.MockedFunction<typeof upload>;
			(mockUpload as jest.Mock).mockResolvedValue({ url: 'https://example.com/test.mp3' });
			
			// Mock crypto.subtle.digest to fail (only once for this test)
			(global.crypto.subtle.digest as jest.Mock).mockRejectedValueOnce(
				new Error('Crypto not available')
			);

			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ id: '123', data: { analyzedTrack: {} } }),
			});

			// Act & Assert - should throw due to mandatory checksum
			await expect(analyzeAudio(mockFile)).rejects.toThrow(
				'Nie udało się obliczyć sumy kontrolnej pliku. Spróbuj ponownie.'
			);
		});
	});
});
