/** @jest-environment node */
import { POST } from '../route';
import { NextRequest } from 'next/server';
import { analyzeAudioRaw } from '@/lib/server/musicai';
import { transformMusicAiRawToAnalyzedTrack } from '@/lib/server/musicaiTransform';

// Mock dependencies
jest.mock('@/lib/server/musicai');
jest.mock('@/lib/server/musicaiTransform');
jest.mock('node:fs/promises');
jest.mock('node:crypto', () => ({
	...jest.requireActual('node:crypto'),
	randomUUID: () => 'test-uuid-123',
}));

// Mock fetch for URL downloads
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockAnalyzeAudioRaw = analyzeAudioRaw as jest.MockedFunction<typeof analyzeAudioRaw>;
const mockTransform = transformMusicAiRawToAnalyzedTrack as jest.MockedFunction<typeof transformMusicAiRawToAnalyzedTrack>;

describe('/api/audio/analyze - Error Scenarios', () => {
	beforeEach(async () => {
		jest.clearAllMocks();
		// Mock successful file operations by default
		const { writeFile, unlink } = await import('node:fs/promises');
		(writeFile as jest.Mock).mockResolvedValue(undefined);
		(unlink as jest.Mock).mockResolvedValue(undefined);
	});

	describe('Download Failures', () => {
		it('should handle network errors during file download', async () => {
			// Arrange
			mockFetch.mockRejectedValue(new Error('Network error'));

			const request = new NextRequest('http://localhost/api/audio/analyze', {
				method: 'POST',
				body: JSON.stringify({
					url: 'https://example.com/test.mp3',
					fileName: 'test.mp3',
					size: 1000,
					type: 'audio/mpeg',
				}),
				headers: { 'Content-Type': 'application/json' },
			});

			// Act
			const response = await POST(request);
			const result = await response.json();

			// Assert
			expect(response.status).toBe(400);
			expect(result.error.code).toBe('DOWNLOAD_ERROR');
			expect(result.error.message).toBe('Network error while downloading audio URL');
		});

		it('should handle HTTP errors during file download', async () => {
			// Arrange
			mockFetch.mockResolvedValue({
				ok: false,
				status: 404,
			});

			const request = new NextRequest('http://localhost/api/audio/analyze', {
				method: 'POST',
				body: JSON.stringify({
					url: 'https://example.com/test.mp3',
					fileName: 'test.mp3',
					size: 1000,
					type: 'audio/mpeg',
				}),
				headers: { 'Content-Type': 'application/json' },
			});

			// Act
			const response = await POST(request);
			const result = await response.json();

			// Assert
			expect(response.status).toBe(400);
			expect(result.error.code).toBe('DOWNLOAD_FAILED');
			expect(result.error.message).toBe('Unable to download provided audio URL');
		});

		it('should handle size mismatch with retry mechanism', async () => {
			// Arrange - simulate size mismatch on all attempts
			mockFetch.mockResolvedValue({
				ok: true,
				arrayBuffer: () => Promise.resolve(new ArrayBuffer(500)), // Wrong size
			});

			const request = new NextRequest('http://localhost/api/audio/analyze', {
				method: 'POST',
				body: JSON.stringify({
					url: 'https://example.com/test.mp3',
					fileName: 'test.mp3',
					size: 1000, // Expected size
					type: 'audio/mpeg',
				}),
				headers: { 'Content-Type': 'application/json' },
			});

			// Act
			const response = await POST(request);
			const result = await response.json();

			// Assert
			expect(response.status).toBe(422);
			expect(result.error.code).toBe('SIZE_MISMATCH');
			expect(result.error.details).toEqual({ expectedSize: 1000, bytes: 500 });
			expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
		});
	});

	describe('Checksum Validation', () => {
		it('should detect checksum mismatch', async () => {
			// Arrange
			const fileContent = new ArrayBuffer(1000);
			mockFetch.mockResolvedValue({
				ok: true,
				arrayBuffer: () => Promise.resolve(fileContent),
			});

			const request = new NextRequest('http://localhost/api/audio/analyze', {
				method: 'POST',
				body: JSON.stringify({
					url: 'https://example.com/test.mp3',
					fileName: 'test.mp3',
					size: 1000,
					type: 'audio/mpeg',
					checksumSha256: 'expected-checksum-123',
				}),
				headers: { 'Content-Type': 'application/json' },
			});

			// Act
			const response = await POST(request);
			const result = await response.json();

			// Assert
			expect(response.status).toBe(422);
			expect(result.error.code).toBe('CHECKSUM_MISMATCH');
			expect(result.error.details).toHaveProperty('expected', 'expected-checksum-123');
			expect(result.error.details).toHaveProperty('actual');
		});

		it('should proceed without client checksum when not provided', async () => {
			// Arrange
			const fileContent = new ArrayBuffer(1000);
			mockFetch.mockResolvedValue({
				ok: true,
				arrayBuffer: () => Promise.resolve(fileContent),
			});

			mockAnalyzeAudioRaw.mockResolvedValue({ test: 'data' });
			(mockTransform as jest.Mock).mockResolvedValue({});

			const request = new NextRequest('http://localhost/api/audio/analyze', {
				method: 'POST',
				body: JSON.stringify({
					url: 'https://example.com/test.mp3',
					fileName: 'test.mp3',
					size: 1000,
					type: 'audio/mpeg',
					// No checksumSha256 provided
				}),
				headers: { 'Content-Type': 'application/json' },
			});

			// Act
			const response = await POST(request);

			// Assert
			expect(response.status).toBe(200);
			expect(mockAnalyzeAudioRaw).toHaveBeenCalled();
		});
	});

	describe('Input Validation', () => {
		it('should reject unsupported file types', async () => {
			// Arrange
			const request = new NextRequest('http://localhost/api/audio/analyze', {
				method: 'POST',
				body: JSON.stringify({
					url: 'https://example.com/test.pdf',
					fileName: 'test.pdf',
					size: 1000,
					type: 'application/pdf',
				}),
				headers: { 'Content-Type': 'application/json' },
			});

			// Act
			const response = await POST(request);
			const result = await response.json();

			// Assert
			expect(response.status).toBe(415);
			expect(result.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
		});

		it('should reject files that are too large', async () => {
			// Arrange
			const request = new NextRequest('http://localhost/api/audio/analyze', {
				method: 'POST',
				body: JSON.stringify({
					url: 'https://example.com/test.mp3',
					fileName: 'test.mp3',
					size: 100 * 1024 * 1024, // 100MB - exceeds 50MB limit
					type: 'audio/mpeg',
				}),
				headers: { 'Content-Type': 'application/json' },
			});

			// Act
			const response = await POST(request);
			const result = await response.json();

			// Assert
			expect(response.status).toBe(413);
			expect(result.error.code).toBe('PAYLOAD_TOO_LARGE');
		});

		it('should reject missing required fields', async () => {
			// Arrange
			const request = new NextRequest('http://localhost/api/audio/analyze', {
				method: 'POST',
				body: JSON.stringify({
					url: 'https://example.com/test.mp3',
					// Missing fileName, size, type
				}),
				headers: { 'Content-Type': 'application/json' },
			});

			// Act
			const response = await POST(request);
			const result = await response.json();

			// Assert
			expect(response.status).toBe(400);
			expect(result.error.code).toBe('MISSING_FIELDS');
		});
	});
});
