import { analysisResultStorage, AudioAnalysisResult } from '../typedSession';
import { SESSION_KEYS } from '../constants';

describe('Typed Session Storage for Analysis Result', () => {
  beforeEach(() => {
    sessionStorage.clear();
    jest.clearAllMocks();
  });

  it('should set and get analysis result from sessionStorage', () => {
        const mockResult: AudioAnalysisResult = { id: 'abc-123', provider: 'test', data: { tempo: 120, key: 'C' } };
    
    analysisResultStorage.set(mockResult);

        const storedItem = sessionStorage.getItem(SESSION_KEYS.ANALYSIS_RESULT);
    expect(storedItem).toBe(JSON.stringify(mockResult));

        const retrievedResult = analysisResultStorage.get();
    expect(retrievedResult).toEqual(mockResult);
  });

  it('should return null if no analysis result is in sessionStorage', () => {
        const retrievedResult = analysisResultStorage.get();
    expect(retrievedResult).toBeNull();
  });

  it('should handle JSON parsing errors gracefully', () => {
        sessionStorage.setItem(SESSION_KEYS.ANALYSIS_RESULT, 'invalid-json');
        const retrievedResult = analysisResultStorage.get();
    expect(retrievedResult).toBeNull();
  });
});
