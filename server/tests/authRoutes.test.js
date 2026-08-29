const http = require('http');
const { createApp } = require('../index');
const { clearUsersDbForTesting } = require('../storage/userStorage');

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

describe('Auth API Routes (/api/auth)', () => {
  let app;
  let server;
  let baseUrl;

  beforeAll((done) => {
    app = createApp();
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      done();
    });
  });

  afterAll((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  beforeEach(() => {
    clearUsersDbForTesting();
  });

  describe('POST /api/auth/register', () => {
    test('WHEN valid payload is sent THEN registers user, returns user with userKey and token', async () => {
      const res = await makeRequest(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          email: 'hero@ptahn.local',
          username: 'HeroPlayer',
          password: 'Secret123Password!#',
          confirmPassword: 'Secret123Password!#',
          rememberMe: true
        }
      });

      expect(res.status).toBe(201);
      expect(res.data.success).toBe(true);
      expect(res.data.user).toBeDefined();
      expect(res.data.user.username).toBe('HeroPlayer');
      expect(res.data.user.role).toBe('user');
      expect(res.data.user.userKey).toBeDefined();
      expect(res.data.user.userKey).toMatch(/^PTAH-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/);
      expect(res.data.token).toBeDefined();
      expect(res.data.user.passwordHash).toBeUndefined();
    });

    test('WHEN master admin email registers THEN role is admin', async () => {
      const res = await makeRequest(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          email: 'marcmr_88@hotmail.com',
          username: 'Azgael',
          password: 'Earthian#00',
          confirmPassword: 'Earthian#00'
        }
      });

      expect(res.status).toBe(201);
      expect(res.data.user.role).toBe('admin');
      expect(res.data.user.username).toBe('Azgael');
    });
  });

  describe('POST /api/auth/change-password', () => {
    test('WHEN authenticated user provides correct current password and valid new password THEN updates successfully', async () => {
      const reg = await makeRequest(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          email: 'pass_change@ptahn.local',
          username: 'PassChanger',
          password: 'CurrentPass123!#'
        }
      });

      const token = reg.data.token;

      const changeRes = await makeRequest(`${baseUrl}/api/auth/change-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: {
          currentPassword: 'CurrentPass123!#',
          newPassword: 'BrandNewPass2026!#'
        }
      });

      expect(changeRes.status).toBe(200);
      expect(changeRes.data.success).toBe(true);

      // Verify login with new password
      const loginRes = await makeRequest(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          identifier: 'pass_change@ptahn.local',
          password: 'BrandNewPass2026!#'
        }
      });
      expect(loginRes.status).toBe(200);
      expect(loginRes.data.success).toBe(true);
    });
  });

  describe('Admin and IT User Management Endpoints (/api/auth/admin/users)', () => {
    let adminToken;
    let itToken;
    let userToken;
    let standardUserId;

    beforeEach(async () => {
      const localOwnerRes = await makeRequest(`${baseUrl}/api/auth/local-owner`);
      adminToken = localOwnerRes.data.token;

      let userLog = await makeRequest(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { identifier: 'normal@ptahn.local', password: 'Password123@#' }
      });
      if (userLog.status !== 200) {
        userLog = await makeRequest(`${baseUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: {
            email: 'normal@ptahn.local',
            username: 'NormalUser',
            password: 'Password123@#'
          }
        });
      }
      userToken = userLog.data?.token;
      standardUserId = userLog.data?.user?.id;

      // Admin creates an IT user
      const itCreateRes = await makeRequest(`${baseUrl}/api/auth/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: {
          email: 'it_staff@ptahn.local',
          username: 'ITStaff',
          password: 'TechPassword123@#',
          role: 'it'
        }
      });
      itToken = (await makeRequest(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { identifier: 'it_staff@ptahn.local', password: 'TechPassword123@#' }
      })).data.token;
    });

    test('Admin and IT can list users', async () => {
      const res = await makeRequest(`${baseUrl}/api/auth/admin/users`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.users)).toBe(true);
      expect(res.data.users.length).toBeGreaterThanOrEqual(3);
    });

    test('Standard user cannot access admin users list (403)', async () => {
      const res = await makeRequest(`${baseUrl}/api/auth/admin/users`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      expect(res.status).toBe(403);
    });

    test('Admin can update role and delete non-master user', async () => {
      const updateRes = await makeRequest(`${baseUrl}/api/auth/admin/users/${standardUserId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: { role: 'it' }
      });
      expect(updateRes.status).toBe(200);
      expect(updateRes.data.user.role).toBe('it');

      const delRes = await makeRequest(`${baseUrl}/api/auth/admin/users/${standardUserId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      expect(delRes.status).toBe(200);
      expect(delRes.data.success).toBe(true);
    });
  });
});
