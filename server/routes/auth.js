const express = require('express');
const router = express.Router();
const {
  registerUser,
  authenticateUser,
  getOrCreateMasterAdmin,
  getUserById,
  updateUserProfile,
  changePassword,
  listAllUsers,
  createUserByAdmin,
  updateUserRole,
  deleteUser,
  generateSessionToken,
  verifySessionToken
} = require('../storage/userStorage');

/**
  * GET /api/auth/local-owner
  * Returns the sovereign Master Admin user and session token for local machine
  */
router.get('/local-owner', (req, res) => {
  try {
    const adminUser = getOrCreateMasterAdmin();
    const token = generateSessionToken(adminUser.id, true);
    res.json({
      success: true,
      user: adminUser,
      token,
      isLocalOwner: true
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});



/**
 * Middleware to extract token from Authorization header or query
 */
function authenticateMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, error: 'Token de autenticación no proporcionado' });
  }

  const user = verifySessionToken(authHeader);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Sesión expirada o token inválido' });
  }

  req.user = user;
  next();
}

/**
 * Middleware to ensure user is Admin or IT
 */
function requireAdminOrItMiddleware(req, res, next) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'it')) {
    return res.status(403).json({ success: false, error: 'Acceso denegado: Se requiere rol de Administrador o IT' });
  }
  next();
}

/**
 * POST /api/auth/register
 */
router.post('/register', (req, res) => {
  try {
    const { email, username, password, confirmPassword, rememberMe = true, bio, avatar, coverUrl, preferences, role } = req.body;

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({ success: false, error: 'Las contraseñas no coinciden' });
    }

    const user = registerUser({ email, username, password, bio, avatar, coverUrl, preferences, role });
    const token = generateSessionToken(user.id, Boolean(rememberMe));

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      user,
      token
    });
  } catch (error) {
    const isValidationError = error.message.includes('contraseña') || 
      error.message.includes('correo') || 
      error.message.includes('usuario') || 
      error.message.includes('caracteres') || 
      error.message.includes('mayúscula') || 
      error.message.includes('minúscula') || 
      error.message.includes('número') || 
      error.message.includes('símbolo') ||
      error.message.includes('ya está') || 
      error.message.includes('inválid');

    const status = isValidationError ? 400 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', (req, res) => {
  try {
    const { identifier, password, rememberMe = true } = req.body;
    const user = authenticateUser({ identifier, password });
    const token = generateSessionToken(user.id, Boolean(rememberMe));

    res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      user,
      token
    });
  } catch (error) {
    const status = error.message.includes('incorrecta') || error.message.includes('no encontrado') ? 401 : 400;
    res.status(status).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', authenticateMiddleware, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

/**
 * PUT /api/auth/profile
 */
router.put('/profile', authenticateMiddleware, (req, res) => {
  try {
    const updated = updateUserProfile(req.user.id, req.body);
    res.json({
      success: true,
      message: 'Perfil actualizado con éxito',
      user: updated
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/auth/change-password
 */
router.post('/change-password', authenticateMiddleware, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Contraseña actual y nueva requeridas' });
    }
    const result = changePassword(req.user.id, currentPassword, newPassword);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/auth/admin/users
 */
router.get('/admin/users', authenticateMiddleware, requireAdminOrItMiddleware, (req, res) => {
  try {
    const users = listAllUsers(req.user);
    res.json({ success: true, users });
  } catch (error) {
    res.status(403).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/auth/admin/users
 */
router.post('/admin/users', authenticateMiddleware, requireAdminOrItMiddleware, (req, res) => {
  try {
    const newUser = createUserByAdmin(req.user, req.body);
    res.status(201).json({ success: true, user: newUser });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/auth/admin/users/:id
 */
router.put('/admin/users/:id', authenticateMiddleware, requireAdminOrItMiddleware, (req, res) => {
  try {
    const { role } = req.body;
    const updated = updateUserRole(req.user, req.params.id, role);
    res.json({ success: true, user: updated });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/auth/admin/users/:id
 */
router.delete('/admin/users/:id', authenticateMiddleware, requireAdminOrItMiddleware, (req, res) => {
  try {
    const result = deleteUser(req.user, req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Sesión cerrada exitosamente'
  });
});

module.exports = router;
