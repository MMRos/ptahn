/**
 * Client API for User Authentication, Security & Persistent Sessions
 */

import { getServerBaseUrl } from './serverApi';

export const AUTH_USER_KEY = 'ptah-auth-user';
export const AUTH_TOKEN_KEY = 'ptah-auth-token';
export const AUTH_REMEMBER_KEY = 'ptah-auth-remember';

export function sanitizeClientInput(val) {
  if (val === null || val === undefined) return '';
  let str = String(val);
  str = str.replace(/__proto__|constructor|prototype/gi, '');
  str = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  str = str.replace(/<\/?[^>]+(>|$)/g, '');
  return str.trim();
}

export function validatePasswordRule(password) {
  const errors = [];
  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Ingresa una contraseña.'] };
  }
  if (password.length < 8) {
    errors.push('Mínimo 8 caracteres.');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Al menos una letra mayúscula (A-Z).');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Al menos una letra minúscula (a-z).');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Al menos un número (0-9).');
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`§±]/.test(password)) {
    errors.push('Al menos un símbolo o caracter especial (!@#$%...).');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function generateClientUserKey(email) {
  let hash = 0;
  const cleanEmail = (email || '').toLowerCase().trim();
  for (let i = 0; i < cleanEmail.length; i++) {
    const char = cleanEmail.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(16, 'F').toUpperCase();
  const c1 = hex.slice(0, 4);
  const c2 = hex.slice(4, 8);
  const c3 = hex.slice(8, 12);
  const c4 = hex.slice(12, 16);
  return `PTAH-${c1}-${c2}-${c3}-${c4}`;
}

async function safeParseResponse(res) {
  const contentType = (res.headers && res.headers.get('content-type')) || '';
  const text = await res.text();

  if (!contentType.includes('application/json') && (text.startsWith('<') || text.includes('<!DOCTYPE'))) {
    return {
      ok: false,
      status: res.status,
      data: {
        success: false,
        error: 'El servidor local de Ptahn (puerto 3001) no respondió en formato JSON. Asegúrate de que el servidor esté activo o usa el lanzador iniciar-ptahn.bat.'
      }
    };
  }

  try {
    const data = JSON.parse(text);
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return {
      ok: false,
      status: res.status,
      data: {
        success: false,
        error: `Respuesta inválida del servidor (${res.status}): ${text.slice(0, 80)}`
      }
    };
  }
}

export function saveStoredAuth(user, token, rememberMe = true) {
  if (typeof window === 'undefined') return;

  const storage = rememberMe ? window.localStorage : window.sessionStorage;
  const otherStorage = rememberMe ? window.sessionStorage : window.localStorage;

  try {
    storage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    storage.setItem(AUTH_TOKEN_KEY, token);
    storage.setItem(AUTH_REMEMBER_KEY, String(rememberMe));

    otherStorage.removeItem(AUTH_USER_KEY);
    otherStorage.removeItem(AUTH_TOKEN_KEY);
    otherStorage.removeItem(AUTH_REMEMBER_KEY);
  } catch (error) {
    console.warn('[AuthApi]: Error writing auth to storage:', error);
  }
}

export function getStoredAuth() {
  if (typeof window === 'undefined') {
    return { user: null, token: null, rememberMe: false };
  }

  let userRaw = window.localStorage.getItem(AUTH_USER_KEY);
  let token = window.localStorage.getItem(AUTH_TOKEN_KEY);
  let rememberMe = window.localStorage.getItem(AUTH_REMEMBER_KEY) === 'true';

  if (!userRaw || !token) {
    userRaw = window.sessionStorage.getItem(AUTH_USER_KEY);
    token = window.sessionStorage.getItem(AUTH_TOKEN_KEY);
    rememberMe = false;
  }

  let user = null;
  if (userRaw) {
    try {
      user = JSON.parse(userRaw);
      if (user && (user.username === 'Azgael' || (user.email && user.email.toLowerCase() === 'marcmr_88@hotmail.com'))) {
        user.role = 'admin';
      }
    } catch (e) {}
  }

  return { user, token, rememberMe };
}

export function clearStoredAuth() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(AUTH_USER_KEY);
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    window.localStorage.removeItem(AUTH_REMEMBER_KEY);
    window.sessionStorage.removeItem(AUTH_USER_KEY);
    window.sessionStorage.removeItem(AUTH_TOKEN_KEY);
    window.sessionStorage.removeItem(AUTH_REMEMBER_KEY);
  } catch (error) {}
}

export async function registerUser(payload, baseUrl = getServerBaseUrl()) {
  const cleanPayload = {
    email: sanitizeClientInput(payload.email).toLowerCase(),
    username: sanitizeClientInput(payload.username),
    password: payload.password,
    confirmPassword: payload.confirmPassword,
    rememberMe: payload.rememberMe !== false,
    bio: sanitizeClientInput(payload.bio),
    avatar: sanitizeClientInput(payload.avatar)
  };

  try {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanPayload)
    });

    const parsed = await safeParseResponse(res);
    if (!parsed.ok || !parsed.data.success) {
      return {
        success: false,
        error: parsed.data.error || `Error en el registro (HTTP ${parsed.status})`
      };
    }

    if (parsed.data.user && parsed.data.token) {
      saveStoredAuth(parsed.data.user, parsed.data.token, cleanPayload.rememberMe);
    }
    return parsed.data;
  } catch (error) {
    // Graceful offline fallback: if server is not reachable, save offline sovereign profile
    const offlineUser = {
      id: `usr-offline-${Date.now()}`,
      email: cleanPayload.email,
      username: cleanPayload.username,
      userKey: generateClientUserKey(cleanPayload.email),
      bio: cleanPayload.bio || 'Creador Ptah',
      createdAt: new Date().toISOString(),
      offline: true
    };
    const offlineToken = `ptah_tok_offline_${Date.now()}`;
    saveStoredAuth(offlineUser, offlineToken, cleanPayload.rememberMe);
    return {
      success: true,
      user: offlineUser,
      token: offlineToken,
      offlineNotice: 'Registrado en modo local (el servidor no estaba disponible).'
    };
  }
}

export async function loginUser(payload, baseUrl = getServerBaseUrl()) {
  const cleanPayload = {
    identifier: sanitizeClientInput(payload.identifier).toLowerCase(),
    password: payload.password,
    rememberMe: payload.rememberMe !== false
  };

  try {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanPayload)
    });

    const parsed = await safeParseResponse(res);
    if (!parsed.ok || !parsed.data.success) {
      return {
        success: false,
        error: parsed.data.error || 'Credenciales inválidas'
      };
    }

    if (parsed.data.user && parsed.data.token) {
      saveStoredAuth(parsed.data.user, parsed.data.token, cleanPayload.rememberMe);
    }
    return parsed.data;
  } catch (error) {
    const { user } = getStoredAuth();
    if (user && (user.email === cleanPayload.identifier || user.username.toLowerCase() === cleanPayload.identifier)) {
      return { success: true, user, offline: true };
    }
    return { success: false, error: 'No se pudo conectar con el servidor de autenticación (puerto 3001).' };
  }
}

export async function fetchCurrentUser(baseUrl = getServerBaseUrl()) {
  const { token, user: localUser } = getStoredAuth();
  
  if (token) {
    try {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const parsed = await safeParseResponse(res);
      if (parsed.ok && parsed.data.user) {
        const { rememberMe } = getStoredAuth();
        saveStoredAuth(parsed.data.user, token, rememberMe !== false);
        return parsed.data;
      }
    } catch (error) {
      if (localUser) return { success: true, user: localUser, offline: true };
    }
  }

  // Si no hay sesión guardada en este ordenador, conectar automáticamente con la cuenta dueña local (Azgael)
  try {
    const ownerRes = await fetch(`${baseUrl}/api/auth/local-owner`);
    const ownerParsed = await safeParseResponse(ownerRes);
    if (ownerParsed.ok && ownerParsed.data.success && ownerParsed.data.user && ownerParsed.data.token) {
      saveStoredAuth(ownerParsed.data.user, ownerParsed.data.token, true);
      return ownerParsed.data;
    }
  } catch (e) {}

  if (localUser) {
    return { success: true, user: localUser, offline: true };
  }
  return { success: false, user: null };
}


export async function updateUserProfile(updates, baseUrl = getServerBaseUrl()) {
  const { token, rememberMe, user: localUser } = getStoredAuth();
  if (!token) return { success: false, error: 'No autenticado' };

  try {
    const res = await fetch(`${baseUrl}/api/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    });
    const parsed = await safeParseResponse(res);
    if (parsed.ok && parsed.data.user) {
      saveStoredAuth(parsed.data.user, token, rememberMe);
      return parsed.data;
    }
  } catch (error) {}

  if (localUser) {
    const updated = { ...localUser, ...updates };
    saveStoredAuth(updated, token, rememberMe);
    return { success: true, user: updated };
  }

  return { success: false, error: 'No se pudo actualizar el perfil' };
}

export async function logoutUser(baseUrl = getServerBaseUrl()) {
  try {
    await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST' }).catch(() => {});
  } finally {
    clearStoredAuth();
  }
  return { success: true };
}

export async function changeUserPassword({ currentPassword, newPassword }, baseUrl = getServerBaseUrl()) {
  const { token } = getStoredAuth();
  if (!token) return { success: false, error: 'No autenticado' };

  try {
    const res = await fetch(`${baseUrl}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const parsed = await safeParseResponse(res);
    if (!parsed.ok || !parsed.data.success) {
      return { success: false, error: parsed.data.error || 'Error al cambiar la contraseña' };
    }
    return parsed.data;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function fetchAllUsersAdmin(baseUrl = getServerBaseUrl()) {
  const { token } = getStoredAuth();
  if (!token) return { success: false, users: [], error: 'No autenticado' };

  try {
    const res = await fetch(`${baseUrl}/api/auth/admin/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const parsed = await safeParseResponse(res);
    if (!parsed.ok || !parsed.data.success) {
      return { success: false, users: [], error: parsed.data.error || 'Error al obtener usuarios' };
    }
    return parsed.data;
  } catch (error) {
    return { success: false, users: [], error: error.message };
  }
}

export async function createUserAdmin(payload, baseUrl = getServerBaseUrl()) {
  const { token } = getStoredAuth();
  if (!token) return { success: false, error: 'No autenticado' };

  try {
    const res = await fetch(`${baseUrl}/api/auth/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    const parsed = await safeParseResponse(res);
    if (!parsed.ok || !parsed.data.success) {
      return { success: false, error: parsed.data.error || 'Error al crear usuario' };
    }
    return parsed.data;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updateUserRoleAdmin(userId, role, baseUrl = getServerBaseUrl()) {
  const { token } = getStoredAuth();
  if (!token) return { success: false, error: 'No autenticado' };

  try {
    const res = await fetch(`${baseUrl}/api/auth/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ role })
    });
    const parsed = await safeParseResponse(res);
    if (!parsed.ok || !parsed.data.success) {
      return { success: false, error: parsed.data.error || 'Error al actualizar rol' };
    }
    return parsed.data;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function deleteUserAdmin(userId, baseUrl = getServerBaseUrl()) {
  const { token } = getStoredAuth();
  if (!token) return { success: false, error: 'No autenticado' };

  try {
    const res = await fetch(`${baseUrl}/api/auth/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const parsed = await safeParseResponse(res);
    if (!parsed.ok || !parsed.data.success) {
      return { success: false, error: parsed.data.error || 'Error al eliminar usuario' };
    }
    return parsed.data;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

