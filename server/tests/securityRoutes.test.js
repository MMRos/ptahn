const http = require('http');
const { createApp } = require('../index');
const { clearUsersDbForTesting, registerUser, generateSessionToken } = require('../storage/userStorage');

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
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

describe('Server Security and Input Validation Tests (/api)', () => {
  let app;
  let server;
  let baseUrl;
  let guestToken;
  let userToken;
  let adminToken;

  beforeAll(async () => {
    clearUsersDbForTesting();

    const admin = registerUser({ username: 'SecAdmin', email: 'secadmin@ptahn.local', password: 'AdminPassword123!#', role: 'admin' });
    adminToken = generateSessionToken(admin.id);

    const normalUser = registerUser({ username: 'SecUser', email: 'secuser@ptahn.local', password: 'UserPassword123!#', role: 'user' });
    userToken = generateSessionToken(normalUser.id);

    const guest = registerUser({ username: 'SecGuest', email: 'secguest@ptahn.local', password: 'GuestPassword123!#', role: 'guest' });
    guestToken = generateSessionToken(guest.id);

    await new Promise((resolve) => {
      app = createApp();
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        const { port } = server.address();
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  afterAll((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  describe('Path Traversal Defense (/api/images/files)', () => {
    test('BLOCKS path traversal with ../ in URL parameter', async () => {
      const res = await makeRequest(`${baseUrl}/api/images/files/..%2f..%2fconfig.js`);
      expect(res.status).toBe(400);
      expect(res.data.success).toBe(false);
    });

    test('BLOCKS path traversal with backslashes ..\\', async () => {
      const res = await makeRequest(`${baseUrl}/api/images/files/..%5c..%5cconfig.js`);
      expect(res.status).toBe(400);
      expect(res.data.success).toBe(false);
    });

    test('BLOCKS null bytes injection in filenames', async () => {
      const res = await makeRequest(`${baseUrl}/api/images/files/image.png%00.jpg`);
      expect(res.status).toBe(400);
      expect(res.data.success).toBe(false);
    });
  });

  describe('Authentication Route Security (/api/auth)', () => {
    test('REJECTS SQL/NoSQL Injection style object payloads in login', async () => {
      const res = await makeRequest(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        body: {
          usernameOrEmail: { $gt: '' },
          password: { $gt: '' }
        }
      });
      // Debería rechazar credenciales inválidas sin crashear
      expect([400, 401]).toContain(res.status);
      expect(res.data.success).toBe(false);
    });

    test('REJECTS registration with prototype pollution keys and self-assigned admin role', async () => {
      const res = await makeRequest(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        body: {
          username: 'EvilHacker',
          email: 'evil@ptahn.local',
          password: 'Password123!#',
          confirmPassword: 'Password123!#',
          __proto__: { isAdmin: true },
          role: 'admin' // No debe permitir auto-asignarse rol admin en registro abierto
        }
      });

      if (res.status === 200 || res.status === 201) {
        expect(res.data.user.role).not.toBe('admin');
        expect(Object.prototype.isAdmin).toBeUndefined();
      }
    });
  });

  describe('RBAC Privilege Escalation Defense', () => {
    test('GUEST USER is blocked from admin management routes', async () => {
      const res = await makeRequest(`${baseUrl}/api/auth/admin/users`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${guestToken}`
        }
      });
      expect([401, 403]).toContain(res.status);
    });

    test('STANDARD USER cannot access admin user list', async () => {
      const res = await makeRequest(`${baseUrl}/api/auth/admin/users`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      });
      expect([401, 403]).toContain(res.status);
    });

    test('ADMIN USER can access management routes', async () => {
      const res = await makeRequest(`${baseUrl}/api/auth/admin/users`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      });
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
    });
  });
});
