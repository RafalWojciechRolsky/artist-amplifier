import { getSession, setSession } from '@/lib/session';

describe('session helpers', () => {
  const KEY = 'aa:v1:test_key';

  beforeEach(() => {
    // jsdom provides sessionStorage on window
    window.sessionStorage.clear();
    // Clear any mocks from previous tests
    jest.restoreAllMocks();
  });

  test('returns null when key is missing', () => {
    expect(getSession(KEY)).toBeNull();
  });

  test('sets and gets JSON values', () => {
    const value = { a: 1, b: 'x' };
    setSession(KEY, value);
    expect(getSession<typeof value>(KEY)).toEqual(value);
  });

  test('handles invalid JSON gracefully', () => {
    window.sessionStorage.setItem(KEY, '{invalid');
    expect(getSession(KEY)).toBeNull();
  });

  test('handles sessionStorage being unavailable (TC3.3)', () => {
    const error = new Error('SecurityError: Storage is disabled');
    // A more robust way to mock storage in jsdom
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: jest.fn().mockImplementation(() => {
          throw error;
        }),
        setItem: jest.fn().mockImplementation(() => {
          throw error;
        }),
      },
      writable: true,
    });

    // getSession should not crash and should return null
    expect(() => getSession(KEY)).not.toThrow();
    expect(getSession(KEY)).toBeNull();

    // setSession should not crash
    expect(() => setSession(KEY, { a: 1 })).not.toThrow();
  });
});
