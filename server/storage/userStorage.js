const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DATA_DIR } = require('../config');

const USERS_DIR = path.join(DATA_DIR, 'users');
const USERS_FILE = path.join(USERS_DIR, 'users.json');

const MASTER_ADMIN_EMAIL = 'marcmr_88@hotmail.com';
const MASTER_ADMIN_USERNAME = 'Azgael';

// In-memory token cache for active sessions
const activeSessions = new Map();

function ensureUsersDir() {
  if (!fs.existsSync(USERS_DIR)) {
    fs.mkdirSync(USERS_DIR, { recursive: true });
  }
}

function sanitizeInput(val) {
  if (val === null || val === undefined) return '';
  let str = String(val);
  // Neutralize prototype pollution keywords
  str = str.replace(/__proto__|constructor|prototype/gi, '');
  // Strip dangerous script and html tags
  str = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  str = str.replace(/<\/?[^>]+(>|$)/g, '');
  return str.trim();
}

function validatePasswordComplexity(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('La contraseña no puede estar vacía');
  }
  if (password.length < 8) {
    throw new Error('La contraseña debe tener al menos 8 caracteres');
  }
  if (!/[A-Z]/.test(password)) {
    throw new Error('La contraseña debe incluir al menos una letra mayúscula');
  }
  if (!/[a-z]/.test(password)) {
    throw new Error('La contraseña debe incluir al menos una letra minúscula');
  }
  if (!/[0-9]/.test(password)) {
    throw new Error('La contraseña debe incluir al menos un número');
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`§±]/.test(password)) {
    throw new Error('La contraseña debe incluir al menos un símbolo o caracter especial (!@#$%^&*...)');
  }

  return true;
}

function generateUserKey(email, salt) {
  const hmac = crypto.createHmac('sha256', salt || 'ptah_secret_key_salt')
    .update(email.toLowerCase().trim())
    .digest('hex')
    .toUpperCase();

  const c1 = hmac.slice(0, 4);
  const c2 = hmac.slice(4, 8);
  const c3 = hmac.slice(8, 12);
  const c4 = hmac.slice(12, 16);

  return `PTAH-${c1}-${c2}-${c3}-${c4}`;
}

function loadUsersFromDisk() {
  ensureUsersDir();
  if (!fs.existsSync(USERS_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf-8');
    const users = JSON.parse(raw);
    return Array.isArray(users) ? users : [];
  } catch (error) {
    console.warn('[UserStorage]: Error loading users from disk:', error.message);
    return [];
  }
}

function saveUsersToDisk(users) {
  ensureUsersDir();
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (error) {
    console.error('[UserStorage]: Error saving users to disk:', error);
    throw error;
  }
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, storedHash, salt) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
}

function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, salt, ...safeUser } = user;
  return safeUser;
}

function registerUser({ email, username, password, bio = '', avatar = '', coverUrl = '', preferences = {}, role = null }) {
  const cleanEmail = sanitizeInput(email).toLowerCase();
  const cleanUsername = sanitizeInput(username);
  const cleanBio = sanitizeInput(bio);
  const cleanAvatar = sanitizeInput(avatar);
  const cleanCoverUrl = sanitizeInput(coverUrl);

  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Correo electrónico inválido');
  }
  if (!cleanUsername || cleanUsername.length < 2) {
    throw new Error('El nombre de usuario debe tener al menos 2 caracteres');
  }

  // Validate strict password complexity
  validatePasswordComplexity(password);

  const users = loadUsersFromDisk();

  const emailExists = users.some(u => u.email.toLowerCase() === cleanEmail);
  if (emailExists) {
    throw new Error('Este correo ya está registrado en el sistema');
  }

  const usernameExists = users.some(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
  if (usernameExists) {
    throw new Error('Este nombre de usuario ya está en uso');
  }

  const { hash, salt } = hashPassword(password);
  const userKey = generateUserKey(cleanEmail, salt);

  // Determine role: Master Admin gets 'admin', others default to 'user' unless specified valid role
  let assignedRole = 'user';
  if (cleanEmail === MASTER_ADMIN_EMAIL.toLowerCase()) {
    assignedRole = 'admin';
  } else if (role && ['admin', 'it', 'user', 'guest'].includes(role)) {
    assignedRole = role;
  }


  const newUser = {
    id: `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    email: cleanEmail,
    username: cleanUsername,
    role: assignedRole,
    userKey,
    passwordHash: hash,
    salt,
    bio: cleanBio || 'Escritor y creador de mundos interactivos de rol.',
    avatar: cleanAvatar || '',
    coverUrl: cleanCoverUrl || '',
    preferences: preferences || { chatSettings: {} },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsersToDisk(users);

  return sanitizeUser(newUser);
}

function authenticateUser({ identifier, password }) {
  const cleanIdentifier = sanitizeInput(identifier).toLowerCase();
  if (!cleanIdentifier || !password) {
    throw new Error('Identificador y contraseña requeridos');
  }

  const users = loadUsersFromDisk();
  const user = users.find(u => u.email.toLowerCase() === cleanIdentifier || u.username.toLowerCase() === cleanIdentifier);

  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  const isValid = verifyPassword(password, user.passwordHash, user.salt);
  if (!isValid) {
    throw new Error('Contraseña incorrecta');
  }

  // Ensure legacy or existing user has userKey, role and preferences
  let modified = false;
  if (!user.userKey) {
    user.userKey = generateUserKey(user.email, user.salt);
    modified = true;
  }
  if (!user.role) {
    user.role = (user.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) ? 'admin' : 'user';
    modified = true;
  }
  if (!user.preferences) {
    user.preferences = { chatSettings: {} };
    modified = true;
  }
  if (modified) {
    saveUsersToDisk(users);
  }

  return sanitizeUser(user);
}

function getUserById(userId) {
  const users = loadUsersFromDisk();
  const user = users.find(u => u.id === userId);
  return sanitizeUser(user);
}

function updateUserProfile(userId, updates = {}) {
  const users = loadUsersFromDisk();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) {
    throw new Error('Usuario no encontrado para actualizar');
  }

  const allowed = ['username', 'bio', 'avatar', 'coverUrl'];
  allowed.forEach(field => {
    if (updates[field] !== undefined) {
      users[idx][field] = sanitizeInput(updates[field]);
    }
  });

  if (updates.preferences !== undefined) {
    users[idx].preferences = {
      ...(users[idx].preferences || {}),
      ...(updates.preferences || {})
    };
  }

  users[idx].updatedAt = new Date().toISOString();

  saveUsersToDisk(users);
  return sanitizeUser(users[idx]);
}

function changePassword(userId, currentPassword, newPassword) {
  const users = loadUsersFromDisk();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) {
    throw new Error('Usuario no encontrado');
  }

  const user = users[idx];
  const isValid = verifyPassword(currentPassword, user.passwordHash, user.salt);
  if (!isValid) {
    throw new Error('La contraseña actual es incorrecta');
  }

  validatePasswordComplexity(newPassword);

  const { hash, salt } = hashPassword(newPassword);
  users[idx].passwordHash = hash;
  users[idx].salt = salt;
  users[idx].updatedAt = new Date().toISOString();

  saveUsersToDisk(users);
  return { success: true, message: 'Contraseña modificada exitosamente' };
}

function listAllUsers(requester) {
  if (!requester || (requester.role !== 'admin' && requester.role !== 'it')) {
    throw new Error('Permisos insuficientes para listar usuarios');
  }
  const users = loadUsersFromDisk();
  return users.map(sanitizeUser);
}

function createUserByAdmin(requester, { email, username, password, role = 'user', bio = '' }) {
  if (!requester || (requester.role !== 'admin' && requester.role !== 'it')) {
    throw new Error('Permisos insuficientes para crear cuentas de usuario');
  }

  if (requester.role === 'it' && role === 'admin') {
    throw new Error('El rol IT no tiene permiso para crear cuentas de administrador');
  }

  return registerUser({
    email,
    username,
    password,
    role,
    bio
  });
}

function updateUserRole(requester, targetUserId, newRole) {
  if (!requester || (requester.role !== 'admin' && requester.role !== 'it')) {
    throw new Error('Permisos insuficientes para modificar roles');
  }

  if (!['admin', 'it', 'user', 'guest'].includes(newRole)) {
    throw new Error('Rol inválido');
  }


  if (requester.role === 'it' && newRole === 'admin') {
    throw new Error('El rol IT no puede asignar el rol de Administrador');
  }

  const users = loadUsersFromDisk();
  const idx = users.findIndex(u => u.id === targetUserId);
  if (idx === -1) {
    throw new Error('Usuario objetivo no encontrado');
  }

  const target = users[idx];
  if (target.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase() && newRole !== 'admin') {
    throw new Error('No se puede cambiar el rol del Administrador Principal');
  }

  if (requester.role === 'it' && target.role === 'admin') {
    throw new Error('El rol IT no puede modificar cuentas de Administrador');
  }

  users[idx].role = newRole;
  users[idx].updatedAt = new Date().toISOString();

  saveUsersToDisk(users);
  return sanitizeUser(users[idx]);
}

function deleteUser(requester, targetUserId) {
  if (!requester || (requester.role !== 'admin' && requester.role !== 'it')) {
    throw new Error('Permisos insuficientes para eliminar cuentas');
  }

  const users = loadUsersFromDisk();
  const idx = users.findIndex(u => u.id === targetUserId);
  if (idx === -1) {
    throw new Error('Usuario no encontrado');
  }

  const target = users[idx];
  if (target.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
    throw new Error('No se puede eliminar al Administrador Principal');
  }

  if (requester.role === 'it' && target.role === 'admin') {
    throw new Error('El rol IT no puede eliminar administradores');
  }

  users.splice(idx, 1);
  saveUsersToDisk(users);

  return { success: true, message: 'Usuario eliminado exitosamente' };
}

function generateSessionToken(userId, rememberMe = true) {
  const token = `ptah_tok_${crypto.randomBytes(24).toString('hex')}`;
  const ttlMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const expiresAt = Date.now() + ttlMs;

  activeSessions.set(token, { userId, expiresAt });
  return token;
}

function verifySessionToken(token) {
  if (!token) return null;
  const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
  const session = activeSessions.get(cleanToken);

  if (!session) {
    return null;
  }
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(cleanToken);
    return null;
  }
  return getUserById(session.userId);
}

function getOrCreateMasterAdmin() {
  const users = loadUsersFromDisk();
  let admin = users.find(u => u.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase());
  if (!admin) {
    const { hash, salt } = hashPassword('Earthian#00');
    admin = {
      id: 'usr-master-admin',
      email: MASTER_ADMIN_EMAIL.toLowerCase(),
      username: MASTER_ADMIN_USERNAME,
      role: 'admin',
      userKey: generateUserKey(MASTER_ADMIN_EMAIL, salt),
      passwordHash: hash,
      salt: salt,
      bio: 'Dueño y Creador Soberano de Ptahn.',
      avatar: '',
      coverUrl: '',
      preferences: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    users.unshift(admin);
    saveUsersToDisk(users);
  }
  return sanitizeUser(admin);
}

function clearUsersDbForTesting() {
  activeSessions.clear();
  ensureUsersDir();
  if (fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, '[]', 'utf-8');
  }
}

module.exports = {
  MASTER_ADMIN_EMAIL,
  MASTER_ADMIN_USERNAME,
  getOrCreateMasterAdmin,
  hashPassword,
  verifyPassword,
  validatePasswordComplexity,
  generateUserKey,
  sanitizeInput,
  registerUser,
  authenticateUser,
  getUserById,
  updateUserProfile,
  changePassword,
  listAllUsers,
  createUserByAdmin,
  updateUserRole,
  deleteUser,
  generateSessionToken,
  verifySessionToken,
  clearUsersDbForTesting
};

