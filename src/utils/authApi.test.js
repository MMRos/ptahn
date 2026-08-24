import {
  registerUser,
  loginUser,
  fetchCurrentUser,
  updateUserProfile,
  getStoredAuth,
  saveStoredAuth,
  clearStoredAuth,
  validatePasswordRule,
  sanitizeClientInput
} from './authApi';

describe('Frontend authApi Client Layer & Security', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('validatePasswordRule checks uppercase, lowercase, digit and symbol correctly', () => {
    expect(validatePasswordRule('short').valid).toBe(false);
    expect(validatePasswordRule('alllowercase1!').valid).toBe(false);
    expect(validatePasswordRule('ALLUPPERCASE1!').valid).toBe(false);
    expect(validatePasswordRule('NoNumbers!@#Aa').valid).toBe(false);
    expect(validatePasswordRule('NoSymbols12345Aa').valid).toBe(false);
    expect(validatePasswordRule('Valid123#Pass!').valid).toBe(true);
  });

  test('sanitizeClientInput removes dangerous script tags and trims whitespace', () => {
    expect(sanitizeClientInput('<script>bad()</script>GoodUser')).toBe('GoodUser');
    expect(sanitizeClientInput('  Azgael  ')).toBe('Azgael');
  });

  test('registerUser intercepts HTML error responses and returns friendly message', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: { get: () => 'text/html' },
      text: async () => '<!DOCTYPE html><html><body>Error 404</body></html>',
      json: async () => { throw new Error("Unexpected token '<'"); }
    });

    const result = await registerUser({
      email: 'test@ptahn.local',
      username: 'TestUser',
      password: 'Password123!#',
      confirmPassword: 'Password123!#'
    }, 'http://localhost:3001');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/servidor.*no.*respondió.*JSON|no está disponible/i);
  });

  test('saveStoredAuth and getStoredAuth manage localStorage when rememberMe is true', () => {
    const mockUser = { id: 'u1', username: 'Tester', email: 'test@example.com', userKey: 'PTAH-1234-5678-90AB-CDEF' };
    const mockToken = 'token-123';

    saveStoredAuth(mockUser, mockToken, true);

    const stored = getStoredAuth();
    expect(stored.user).toEqual(mockUser);
    expect(stored.token).toBe(mockToken);
    expect(localStorage.getItem('ptah-auth-user')).toBeDefined();
  });

  test('saveStoredAuth and getStoredAuth manage sessionStorage when rememberMe is false', () => {
    const mockUser = { id: 'u2', username: 'Guesty', email: 'guest@example.com', userKey: 'PTAH-AAAA-BBBB-CCCC-DDDD' };
    const mockToken = 'token-456';

    saveStoredAuth(mockUser, mockToken, false);

    const stored = getStoredAuth();
    expect(stored.user).toEqual(mockUser);
    expect(stored.token).toBe(mockToken);
    expect(sessionStorage.getItem('ptah-auth-user')).toBeDefined();
    expect(localStorage.getItem('ptah-auth-user')).toBeNull();
  });

  test('clearStoredAuth cleans both local and session storage', () => {
    saveStoredAuth({ id: 'u1' }, 'token', true);
    clearStoredAuth();
    const stored = getStoredAuth();
    expect(stored.user).toBeNull();
    expect(stored.token).toBeNull();
  });

  test('registerUser dispatches POST request with credentials and returns user payload', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      text: async () => JSON.stringify({
        success: true,
        user: { id: 'u3', username: 'Newbie', email: 'new@ptahn.local', userKey: 'PTAH-1111-2222-3333-4444' },
        token: 'new-token'
      }),
      json: async () => ({
        success: true,
        user: { id: 'u3', username: 'Newbie', email: 'new@ptahn.local', userKey: 'PTAH-1111-2222-3333-4444' },
        token: 'new-token'
      })
    });

    const result = await registerUser({
      email: 'new@ptahn.local',
      username: 'Newbie',
      password: 'Password123!#',
      confirmPassword: 'Password123!#',
      rememberMe: true
    }, 'http://localhost:3001');

    expect(result.success).toBe(true);
    expect(result.user.username).toBe('Newbie');
    expect(result.user.userKey).toBeDefined();
  });
});
