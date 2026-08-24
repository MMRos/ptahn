import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUser, 
  faEnvelope, 
  faLock, 
  faTimes, 
  faSpinner, 
  faCheckCircle, 
  faShieldAlt,
  faSignInAlt,
  faUserPlus,
  faKey,
  faCheck,
  faTimesCircle,
  faEye,
  faEyeSlash
} from '@fortawesome/free-solid-svg-icons';
import { loginUser, registerUser, validatePasswordRule, sanitizeClientInput } from '../utils/authApi';
import './authModal.css';

export default function AuthModal({ isOpen, onClose, initialMode = 'login', onAuthSuccess }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [createdUserKey, setCreatedUserKey] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMsg('');
      setSuccessMsg('');
      setCreatedUserKey('');
      setShowPassword(false);
      setShowConfirmPassword(false);
    }
  }, [isOpen, initialMode]);


  if (!isOpen) return null;

  // Password rules validation for live checklist
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`§±]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;


  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setCreatedUserKey('');

    const cleanEmail = sanitizeClientInput(email);
    const cleanUsername = sanitizeClientInput(username);

    if (mode === 'register') {
      if (!cleanEmail || !cleanUsername || !password) {
        setErrorMsg('Por favor completa todos los campos requeridos.');
        return;
      }

      const passCheck = validatePasswordRule(password);
      if (!passCheck.valid) {
        setErrorMsg(`La contraseña no cumple los requisitos: ${passCheck.errors.join(' ')}`);
        return;
      }

      if (password !== confirmPassword) {
        setErrorMsg('Las contraseñas no coinciden. Por favor verifícalas.');
        return;
      }

      setLoading(true);
      const res = await registerUser({
        email: cleanEmail,
        username: cleanUsername,
        password,
        confirmPassword,
        rememberMe
      });
      setLoading(false);

      if (res.success && res.user) {
        setSuccessMsg(res.offlineNotice || '¡Cuenta creada e identificada con éxito!');
        if (res.user.userKey) {
          setCreatedUserKey(res.user.userKey);
        }
        if (onAuthSuccess) onAuthSuccess(res.user);
        setTimeout(() => onClose(), 1600);
      } else {
        setErrorMsg(res.error || 'Error al crear la cuenta');
      }
    } else {
      if (!cleanEmail || !password) {
        setErrorMsg('Por favor ingresa tu correo o nombre de usuario y tu contraseña.');
        return;
      }

      setLoading(true);
      const res = await loginUser({
        identifier: cleanEmail,
        password,
        rememberMe
      });
      setLoading(false);

      if (res.success && res.user) {
        setSuccessMsg('¡Sesión iniciada con éxito!');
        if (onAuthSuccess) onAuthSuccess(res.user);
        setTimeout(() => onClose(), 800);
      } else {
        setErrorMsg(res.error || 'Credenciales inválidas');
      }
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="auth-modal-header">
          <div className="auth-modal-title">
            <FontAwesomeIcon icon={faShieldAlt} />
            <span>Identificación & Seguridad Ptahn</span>
          </div>
          <button type="button" className="auth-modal-close-btn" onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className="auth-tabs-row">
          <button 
            type="button"
            className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setErrorMsg(''); }}
          >
            <FontAwesomeIcon icon={faSignInAlt} /> Iniciar Sesión
          </button>
          <button 
            type="button"
            className={`auth-tab-btn ${mode === 'register' ? 'active' : ''}`}
            onClick={() => { setMode('register'); setErrorMsg(''); }}
          >
            <FontAwesomeIcon icon={faUserPlus} /> Crear Cuenta
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-input-group">
            <label>
              <FontAwesomeIcon icon={faEnvelope} /> {mode === 'register' ? 'Correo Electrónico (Asignación de Key)' : 'Correo o Nombre de Usuario'}
            </label>
            <input 
              type={mode === 'register' ? 'email' : 'text'}
              placeholder={mode === 'register' ? 'tu-correo@ejemplo.com' : 'correo@ejemplo.com o tu usuario'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {mode === 'register' && (
            <div className="auth-input-group">
              <label><FontAwesomeIcon icon={faUser} /> Nombre de Usuario Único</label>
              <input 
                type="text" 
                placeholder="Nombre de Creador o Jugador"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          )}

          <div className="auth-input-group">
            <label><FontAwesomeIcon icon={faLock} /> Contraseña</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                type={showPassword ? 'text' : 'password'} 
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', paddingRight: '38px' }}
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.65)',
                  cursor: 'pointer',
                  padding: '4px',
                  fontSize: '0.9rem'
                }}
                title={showPassword ? 'Ocultar contraseña' : 'Hacer visible la contraseña'}
              >
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <>
              <div className="auth-input-group">
                <label><FontAwesomeIcon icon={faLock} /> Confirmar Contraseña</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input 
                    type={showConfirmPassword ? 'text' : 'password'} 
                    placeholder="Repite tu contraseña exactamente"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{ width: '100%', paddingRight: '38px' }}
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      background: 'transparent',
                      border: 'none',
                      color: 'rgba(255, 255, 255, 0.65)',
                      cursor: 'pointer',
                      padding: '4px',
                      fontSize: '0.9rem'
                    }}
                    title={showConfirmPassword ? 'Ocultar contraseña' : 'Hacer visible la contraseña'}
                  >
                    <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
                  </button>
                </div>
              </div>


              {/* Password complexity live checklist */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '10px',
                fontSize: '0.74rem',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '6px'
              }}>
                <span style={{ color: hasMinLength ? '#6ee7b7' : 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FontAwesomeIcon icon={hasMinLength ? faCheck : faTimesCircle} /> Mínimo 8 caracteres
                </span>
                <span style={{ color: hasUpper ? '#6ee7b7' : 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FontAwesomeIcon icon={hasUpper ? faCheck : faTimesCircle} /> Mayúscula (A-Z)
                </span>
                <span style={{ color: hasLower ? '#6ee7b7' : 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FontAwesomeIcon icon={hasLower ? faCheck : faTimesCircle} /> Minúscula (a-z)
                </span>
                <span style={{ color: hasNumber ? '#6ee7b7' : 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FontAwesomeIcon icon={hasNumber ? faCheck : faTimesCircle} /> Número (0-9)
                </span>
                <span style={{ color: hasSymbol ? '#6ee7b7' : 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FontAwesomeIcon icon={hasSymbol ? faCheck : faTimesCircle} /> Símbolo (!@#$...)
                </span>
                <span style={{ color: passwordsMatch ? '#6ee7b7' : 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FontAwesomeIcon icon={passwordsMatch ? faCheck : faTimesCircle} /> Coinciden
                </span>
              </div>
            </>
          )}

          <label className="auth-checkbox-label">
            <input 
              type="checkbox" 
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Permanecer conectado en este equipo</span>
          </label>

          {errorMsg && (
            <div className="auth-error-msg">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div style={{ background: 'rgba(110, 231, 183, 0.15)', border: '1px solid rgba(110, 231, 183, 0.4)', color: '#6ee7b7', padding: '10px 12px', borderRadius: '8px', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
                <FontAwesomeIcon icon={faCheckCircle} /> {successMsg}
              </div>
              {createdUserKey && (
                <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#ffd36b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FontAwesomeIcon icon={faKey} /> Key Intransferible: <strong>{createdUserKey}</strong>
                </div>
              )}
            </div>
          )}

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin />
                <span>Verificando y Encriptando...</span>
              </>
            ) : (
              <span>{mode === 'register' ? 'Crear Cuenta & Asignar Key' : 'Iniciar Sesión'}</span>
            )}
          </button>
        </form>

        <div className="auth-switch-prompt">
          {mode === 'login' ? (
            <>
              ¿No tienes una cuenta aún?{' '}
              <button type="button" className="auth-switch-link" onClick={() => { setMode('register'); setErrorMsg(''); }}>
                Crear cuenta
              </button>
            </>
          ) : (
            <>
              ¿Ya tienes cuenta registrada?{' '}
              <button type="button" className="auth-switch-link" onClick={() => { setMode('login'); setErrorMsg(''); }}>
                Inicia sesión
              </button>
            </>
          )}
        </div>

        <div style={{ marginTop: '12px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
          <button
            type="button"
            onClick={() => {
              if (onClose) onClose();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.55)',
              fontSize: '0.78rem',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            🎟️ Continuar como Invitado (Solo Chats)
          </button>
        </div>
      </div>
    </div>
  );
}

