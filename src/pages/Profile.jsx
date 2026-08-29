import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faEdit,
  faUserPlus,
  faHeart,
  faLayerGroup,
  faSignInAlt,
  faSignOutAlt,
  faShieldAlt,
  faCheck,
  faKey,
  faLock,
  faEye,
  faEyeSlash,
  faCrown,
  faWrench,
  faUsersCog,
  faTrash,
  faTimes,
  faSpinner,
  faTimesCircle,
  faCamera,
  faImage,
  faLink
} from '@fortawesome/free-solid-svg-icons';

import ASSET_LIBRARY from '../data/assets';
import {
  changeUserPassword,
  fetchAllUsersAdmin,
  createUserAdmin,
  updateUserRoleAdmin,
  deleteUserAdmin,
  validatePasswordRule
} from '../utils/authApi';
import { relinkAllCreationsToUser } from '../utils/storage';
import MediaPickerModal from '../components/MediaPickerModal';
import './profile.css';

export default function Profile({
  appData = {},
  currentUser = null,
  onOpenAuthModal,
  onLogout,
  onUpdateUser,
  onUpdateAppData,
  onNavigate,
  onOpenChat,
  onOpenScenario
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [profileName, setProfileName] = useState(currentUser?.username || 'Creador Ptah');
  const [profileBio, setProfileBio] = useState(currentUser?.bio || 'Escritor y creador de mundos interactivos de rol.');
  const [coverUrl, setCoverUrl] = useState(currentUser?.coverUrl || ASSET_LIBRARY.fantasia[0].url);
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar || '');

  // Media Picker Modal State (Avatar / Cover)
  const [mediaModal, setMediaModal] = useState({
    isOpen: false,
    type: 'avatar',
    title: 'Personalizar Imagen',
    currentValue: ''
  });

  // Relink status feedback
  const [relinkStatus, setRelinkStatus] = useState('');

  // Password Change State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmNewPass, setShowConfirmNewPass] = useState(false);
  const [passChangeLoading, setPassChangeLoading] = useState(false);
  const [passChangeError, setPassChangeError] = useState('');
  const [passChangeSuccess, setPassChangeSuccess] = useState('');

  // User Management State (Admin / IT)
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userMgmtError, setUserMgmtError] = useState('');
  const [userMgmtSuccess, setUserMgmtSuccess] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAccountEmail, setNewAccountEmail] = useState('');
  const [newAccountUsername, setNewAccountUsername] = useState('');
  const [newAccountPassword, setNewAccountPassword] = useState('');
  const [newAccountRole, setNewAccountRole] = useState('user');
  const [showNewAccountPass, setShowNewAccountPass] = useState(false);
  const [createAccountLoading, setCreateAccountLoading] = useState(false);

  const isAdminOrIt = currentUser && (currentUser.role === 'admin' || currentUser.role === 'it');

  useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.username || 'Creador Ptah');
      setProfileBio(currentUser.bio || 'Escritor y creador de mundos interactivos de rol.');
      if (currentUser.coverUrl) setCoverUrl(currentUser.coverUrl);
      if (currentUser.avatar) setAvatarUrl(currentUser.avatar);
    } else {
      setProfileName('Creador Ptah');
      setProfileBio('Escritor y creador de mundos interactivos de rol.');
    }
  }, [currentUser]);

  const loadAdminUsers = async () => {
    if (!isAdminOrIt) return;
    setLoadingUsers(true);
    setUserMgmtError('');
    try {
      const res = await fetchAllUsersAdmin();
      if (res.success && Array.isArray(res.users)) {
        setUsersList(res.users);
      } else {
        setUserMgmtError(res.error || 'Error al cargar usuarios');
      }
    } catch (e) {
      setUserMgmtError(e.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isAdminOrIt) {
      loadAdminUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminOrIt, currentUser?.id]);

  const handleSaveProfile = () => {
    setIsEditing(false);
    if (onUpdateUser) {
      onUpdateUser({
        username: profileName,
        bio: profileBio,
        coverUrl,
        avatar: avatarUrl
      });
    }
  };

  const handleApplyMedia = (newUrl) => {
    if (mediaModal.type === 'avatar') {
      setAvatarUrl(newUrl);
      if (onUpdateUser) {
        onUpdateUser({
          username: profileName,
          bio: profileBio,
          coverUrl,
          avatar: newUrl
        });
      }
    } else {
      setCoverUrl(newUrl);
      if (onUpdateUser) {
        onUpdateUser({
          username: profileName,
          bio: profileBio,
          coverUrl: newUrl,
          avatar: avatarUrl
        });
      }
    }
  };

  const handleRelinkCreations = () => {
    if (!currentUser) return;
    const { data: nextData, modifiedCount } = relinkAllCreationsToUser(appData, currentUser);
    if (typeof onUpdateAppData === 'function') {
      onUpdateAppData(nextData);
    }
    setRelinkStatus(`¡${modifiedCount} creaciones y mundos vinculados con éxito a tu cuenta (${currentUser.username})!`);
    setTimeout(() => setRelinkStatus(''), 4000);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassChangeError('');
    setPassChangeSuccess('');

    if (newPassword !== confirmNewPassword) {
      setPassChangeError('La confirmación de la nueva contraseña no coincide');
      return;
    }

    const { valid, errors } = validatePasswordRule(newPassword);
    if (!valid) {
      setPassChangeError(errors[0]);
      return;
    }

    setPassChangeLoading(true);
    try {
      const res = await changeUserPassword({ currentPassword, newPassword });
      if (res.success) {
        setPassChangeSuccess('¡Contraseña actualizada exitosamente!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setTimeout(() => {
          setShowPasswordModal(false);
          setPassChangeSuccess('');
        }, 1500);
      } else {
        setPassChangeError(res.error || 'No se pudo cambiar la contraseña');
      }
    } catch (err) {
      setPassChangeError(err.message);
    } finally {
      setPassChangeLoading(false);
    }
  };

  const handleCreateUserSubmit = async (e) => {
    e.preventDefault();
    setUserMgmtError('');
    setUserMgmtSuccess('');

    const { valid, errors } = validatePasswordRule(newAccountPassword);
    if (!valid) {
      setUserMgmtError(`Contraseña inválida: ${errors[0]}`);
      return;
    }

    setCreateAccountLoading(true);
    try {
      const res = await createUserAdmin({
        email: newAccountEmail,
        username: newAccountUsername,
        password: newAccountPassword,
        role: newAccountRole
      });
      if (res.success) {
        setUserMgmtSuccess(`Cuenta "${newAccountUsername}" creada exitosamente como ${newAccountRole.toUpperCase()}`);
        setNewAccountEmail('');
        setNewAccountUsername('');
        setNewAccountPassword('');
        setNewAccountRole('user');
        setShowCreateModal(false);
        loadAdminUsers();
      } else {
        setUserMgmtError(res.error || 'Error al crear cuenta');
      }
    } catch (err) {
      setUserMgmtError(err.message);
    } finally {
      setCreateAccountLoading(false);
    }
  };

  const handleRoleChange = async (userId, targetRole) => {
    setUserMgmtError('');
    setUserMgmtSuccess('');
    try {
      const res = await updateUserRoleAdmin(userId, targetRole);
      if (res.success) {
        setUserMgmtSuccess('Rol actualizado correctamente');
        loadAdminUsers();
      } else {
        setUserMgmtError(res.error || 'Error al actualizar rol');
      }
    } catch (err) {
      setUserMgmtError(err.message);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente la cuenta de "${username}"?`)) {
      return;
    }
    setUserMgmtError('');
    setUserMgmtSuccess('');
    try {
      const res = await deleteUserAdmin(userId);
      if (res.success) {
        setUserMgmtSuccess(`Cuenta "${username}" eliminada correctamente`);
        loadAdminUsers();
      } else {
        setUserMgmtError(res.error || 'Error al eliminar usuario');
      }
    } catch (err) {
      setUserMgmtError(err.message);
    }
  };

  // Live password validation flags for modal
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSymbol = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`§±]/.test(newPassword);

  const getRoleBadge = (role) => {
    if (role === 'admin') {
      return (
        <span style={{ fontSize: '0.74rem', background: 'linear-gradient(135deg, rgba(255, 211, 107, 0.25), rgba(217, 119, 6, 0.25))', color: '#ffd36b', padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(255, 211, 107, 0.5)', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <FontAwesomeIcon icon={faCrown} /> Administrador
        </span>
      );
    }
    if (role === 'it') {
      return (
        <span style={{ fontSize: '0.74rem', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.2))', color: '#93c5fd', padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.4)', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <FontAwesomeIcon icon={faWrench} /> Técnico IT
        </span>
      );
    }
    if (role === 'guest') {
      return (
        <span style={{ fontSize: '0.74rem', background: 'rgba(255, 255, 255, 0.08)', color: 'rgba(255,255,255,0.7)', padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.2)', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          🎟️ Invitado (Solo Chats)
        </span>
      );
    }
    return (
      <span style={{ fontSize: '0.74rem', background: 'rgba(110, 231, 183, 0.15)', color: '#6ee7b7', padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(110, 231, 183, 0.35)', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
        <FontAwesomeIcon icon={faUser} /> Usuario (Creador)
      </span>
    );
  };

  // Combinar escenarios del estado appData con las tarjetas, historias y narradores
  const allUserCreations = [
    ...(appData.scenarios || []),
    ...(appData.cards || []),
    ...(appData.narrators || []),
    ...(appData.tools || [])
  ];

  const userScenarios = currentUser
    ? allUserCreations.filter(item =>
      !item.creatorId ||
      item.creatorId === currentUser.id ||
      item.creatorId === 'usr-master-admin' ||
      item.creatorName?.toLowerCase() === currentUser.username?.toLowerCase() ||
      item.creatorName === 'Creador Ptah' ||
      item.creatorName === 'Azgael' ||
      currentUser.role === 'admin'
    )
    : allUserCreations;
  const scenariosCount = userScenarios.length;


  const mockFavorites = (appData.scenarios || []).slice(0, 5);
  const mockAuthors = [];

  return (
    <div className="profile-page-redesigned">
      {/* 1. Portada como cabecera con avatar e info */}
      <div
        className="profile-cover-banner"
        style={{ backgroundImage: `linear-gradient(180deg, rgba(13, 14, 22, 0.4) 0%, rgba(13, 14, 22, 0.95) 100%), url(${coverUrl})` }}
      >
        <div className="banner-top-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {/* Botón cambiar fondo de cabecera */}
          <button
            type="button"
            className="cover-edit-floating-btn"
            onClick={() => setMediaModal({
              isOpen: true,
              type: 'cover',
              title: 'Personalizar Fondo de Cabecera',
              currentValue: coverUrl
            })}
            title="Cambiar fondo de cabecera (Subir, Link o IA)"
          >
            <FontAwesomeIcon icon={faImage} /> Cambiar Fondo
          </button>

          {currentUser ? (
            <>
              <button
                type="button"
                className="edit-profile-btn"
                style={{ background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)', color: '#93c5fd' }}
                onClick={() => setShowPasswordModal(true)}
              >
                <FontAwesomeIcon icon={faKey} /> Cambiar Contraseña
              </button>
              <button
                type="button"
                className="edit-profile-btn"
                style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5' }}
                onClick={onLogout}
              >
                <FontAwesomeIcon icon={faSignOutAlt} /> Cerrar Sesión
              </button>
            </>
          ) : (
            <button
              type="button"
              className="edit-profile-btn"
              style={{ background: 'rgba(255, 211, 107, 0.25)', borderColor: '#ffd36b', color: '#ffd36b' }}
              onClick={() => onOpenAuthModal && onOpenAuthModal('login')}
            >
              <FontAwesomeIcon icon={faSignInAlt} /> Iniciar Sesión / Registro
            </button>
          )}

          <button
            type="button"
            className="edit-profile-btn"
            onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
          >
            <FontAwesomeIcon icon={isEditing ? faCheck : faEdit} /> {isEditing ? 'Guardar Cambios' : 'Editar Perfil'}
          </button>
        </div>

        <div className="profile-banner-bottom">
          {/* Avatar con botón interactivo de cámara para personalizar */}
          <div
            className="avatar-container"
            onClick={() => setMediaModal({
              isOpen: true,
              type: 'avatar',
              title: 'Personalizar Avatar de Perfil',
              currentValue: avatarUrl
            })}
            title="Haz clic para cambiar avatar (Subir, Link o IA)"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="avatar-img" />
            ) : (
              <div className="avatar-placeholder"><FontAwesomeIcon icon={faUser} /></div>
            )}
            <div className="avatar-edit-overlay">
              <FontAwesomeIcon icon={faCamera} />
              <span>Cambiar</span>
            </div>
          </div>

          <div className="profile-names">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2>{profileName}</h2>
              {currentUser ? getRoleBadge(currentUser.role) : (
                <span style={{ fontSize: '0.74rem', background: 'rgba(255, 255, 255, 0.08)', color: 'rgba(255,255,255,0.7)', padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.2)', fontWeight: 'bold' }}>
                  🎟️ Modo Invitado / Sin Iniciar Sesión
                </span>
              )}
            </div>
            <p>{profileBio}</p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
              {currentUser?.email && (
                <small style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>📧 {currentUser.email}</small>
              )}
              {currentUser?.userKey && (
                <small style={{ color: '#ffd36b', fontSize: '0.75rem', fontWeight: '600' }}>🔑 Key Soberana: {currentUser.userKey}</small>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Editor de Perfil si está activado */}
      {isEditing && (
        <div className="profile-edit-box">
          <div className="edit-field">
            <label>Nombre de Creador</label>
            <input value={profileName} onChange={(e) => setProfileName(e.target.value)} />
          </div>
          <div className="edit-field">
            <label>Biografía</label>
            <input value={profileBio} onChange={(e) => setProfileBio(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '6px' }}>
            <button
              type="button"
              onClick={() => setMediaModal({
                isOpen: true,
                type: 'avatar',
                title: 'Personalizar Avatar de Perfil',
                currentValue: avatarUrl
              })}
              style={{
                background: 'rgba(255, 211, 107, 0.15)',
                border: '1px solid rgba(255, 211, 107, 0.35)',
                color: '#ffd36b',
                padding: '8px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <FontAwesomeIcon icon={faCamera} /> Cambiar Avatar (Subir / Link / IA)
            </button>
            <button
              type="button"
              onClick={() => setMediaModal({
                isOpen: true,
                type: 'cover',
                title: 'Personalizar Fondo de Cabecera',
                currentValue: coverUrl
              })}
              style={{
                background: 'rgba(255, 211, 107, 0.15)',
                border: '1px solid rgba(255, 211, 107, 0.35)',
                color: '#ffd36b',
                padding: '8px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <FontAwesomeIcon icon={faImage} /> Cambiar Fondo de Cabecera (Subir / Link / IA)
            </button>
          </div>
        </div>
      )}

      {/* Modal de Cambio de Contraseña */}
      {showPasswordModal && (
        <div className="auth-modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="auth-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="auth-modal-header">
              <div className="auth-modal-title">
                <FontAwesomeIcon icon={faLock} style={{ color: '#ffd36b' }} />
                <h3>Cambiar Contraseña</h3>
              </div>
              <button type="button" className="auth-modal-close" onClick={() => setShowPasswordModal(false)}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            {passChangeError && <div className="auth-alert error">{passChangeError}</div>}
            {passChangeSuccess && <div className="auth-alert success">{passChangeSuccess}</div>}

            <form onSubmit={handleChangePassword} className="auth-form" style={{ marginTop: '12px' }}>
              <div className="auth-input-group">
                <label><FontAwesomeIcon icon={faLock} /> Contraseña Actual</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    placeholder="Tu contraseña actual"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    style={{ width: '100%', paddingRight: '38px' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.65)', cursor: 'pointer', padding: '4px' }}
                  >
                    <FontAwesomeIcon icon={showCurrentPass ? faEyeSlash : faEye} />
                  </button>
                </div>
              </div>

              <div className="auth-input-group">
                <label><FontAwesomeIcon icon={faKey} /> Nueva Contraseña</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    placeholder="Mínimo 8 car., Mayús, Minús, Núm, Símbolo"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{ width: '100%', paddingRight: '38px' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.65)', cursor: 'pointer', padding: '4px' }}
                  >
                    <FontAwesomeIcon icon={showNewPass ? faEyeSlash : faEye} />
                  </button>
                </div>
              </div>

              <div className="auth-input-group">
                <label><FontAwesomeIcon icon={faLock} /> Confirmar Nueva Contraseña</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showConfirmNewPass ? 'text' : 'password'}
                    placeholder="Repite la nueva contraseña"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    style={{ width: '100%', paddingRight: '38px' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmNewPass(!showConfirmNewPass)}
                    style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.65)', cursor: 'pointer', padding: '4px' }}
                  >
                    <FontAwesomeIcon icon={showConfirmNewPass ? faEyeSlash : faEye} />
                  </button>
                </div>
              </div>

              {/* Password complexity checklist */}
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
                  <FontAwesomeIcon icon={hasUpper ? faCheck : faTimesCircle} /> 1 Mayúscula
                </span>
                <span style={{ color: hasLower ? '#6ee7b7' : 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FontAwesomeIcon icon={hasLower ? faCheck : faTimesCircle} /> 1 Minúscula
                </span>
                <span style={{ color: hasNumber ? '#6ee7b7' : 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FontAwesomeIcon icon={hasNumber ? faCheck : faTimesCircle} /> 1 Número
                </span>
                <span style={{ color: hasSymbol ? '#6ee7b7' : 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: '4px', gridColumn: 'span 2' }}>
                  <FontAwesomeIcon icon={hasSymbol ? faCheck : faTimesCircle} /> 1 Símbolo especial (!@#$%^&*...)
                </span>
              </div>

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={passChangeLoading}
                style={{ marginTop: '8px' }}
              >
                {passChangeLoading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faCheck} />}
                <span>{passChangeLoading ? 'Actualizando...' : 'Guardar Nueva Contraseña'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Metadatos */}
      <div className="profile-meta-row">
        <div className="meta-item">
          <strong>{scenariosCount}</strong>
          <span>Escenarios y Creaciones</span>
        </div>
        <div className="meta-item">
          <strong>{mockFavorites.length}</strong>
          <span>Favoritos</span>
        </div>
        <div className="meta-item">
          <strong>{currentUser?.role ? currentUser.role.toUpperCase() : 'INVITADO'}</strong>
          <span>Nivel de Acceso</span>
        </div>
      </div>

      {/* Banner de Identificación para Visitantes e Invitados */}
      {(!currentUser || currentUser.role === 'guest') && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(255, 211, 107, 0.08) 0%, rgba(20, 21, 33, 0.8) 100%)',
          border: '1px solid rgba(255, 211, 107, 0.3)',
          borderRadius: '12px',
          padding: '16px 20px',
          margin: '16px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(255, 211, 107, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffd36b', fontSize: '1.2rem' }}>
              <FontAwesomeIcon icon={faShieldAlt} />
            </div>
            <div>
              <h4 style={{ margin: 0, color: '#ffd36b', fontSize: '0.95rem' }}>Identificación de Usuario & Modo Creador</h4>
              <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>
                Como invitado puedes iniciar y usar todos los chats. Inicia sesión o crea una cuenta para crear mundos, personajes y sincronizar tus creaciones en disco.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => onOpenAuthModal && onOpenAuthModal('login')}
              style={{ background: '#ffd36b', color: '#000', border: 'none', borderRadius: '6px', padding: '8px 16px', fontWeight: '700', fontSize: '0.82rem', cursor: 'pointer' }}
            >
              <FontAwesomeIcon icon={faSignInAlt} /> Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => onOpenAuthModal && onOpenAuthModal('register')}
              style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', padding: '8px 14px', fontWeight: '600', fontSize: '0.82rem', cursor: 'pointer' }}
            >
              <FontAwesomeIcon icon={faUserPlus} /> Crear Cuenta
            </button>
          </div>
        </div>
      )}

      {/* 3. Panel de Administración y Gestión de Usuarios (Exclusivo Administrador / IT) */}
      {isAdminOrIt && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(20, 21, 35, 0.95) 0%, rgba(13, 14, 24, 0.98) 100%)',
          border: '1px solid rgba(255, 211, 107, 0.25)',
          borderRadius: '14px',
          padding: '20px 24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FontAwesomeIcon icon={faUsersCog} style={{ color: '#ffd36b', fontSize: '1.3rem' }} />
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.15rem' }}>Panel de Control de Usuarios</h3>
                <small style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem' }}>
                  {currentUser.role === 'admin' ? 'Administrador Dueño (Acceso Total y Gestión de Cuentas)' : 'Operador Técnico IT (Gestión de Cuentas y Servidor)'}
                </small>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              style={{
                background: 'linear-gradient(135deg, #ffd36b, #d97706)',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <FontAwesomeIcon icon={faUserPlus} /> Crear Nueva Cuenta
            </button>
          </div>

          {userMgmtError && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '6px', padding: '8px 12px', color: '#fca5a5', fontSize: '0.8rem', marginBottom: '12px' }}>
              ⚠️ {userMgmtError}
            </div>
          )}

          {userMgmtSuccess && (
            <div style={{ background: 'rgba(110, 231, 183, 0.15)', border: '1px solid rgba(110, 231, 183, 0.4)', borderRadius: '6px', padding: '8px 12px', color: '#6ee7b7', fontSize: '0.8rem', marginBottom: '12px' }}>
              ✅ {userMgmtSuccess}
            </div>
          )}

          {loadingUsers ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
              <FontAwesomeIcon icon={faSpinner} spin /> Cargando lista de cuentas...
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.12)', color: '#ffd36b' }}>
                    <th style={{ padding: '10px 8px' }}>Usuario</th>
                    <th style={{ padding: '10px 8px' }}>Correo</th>
                    <th style={{ padding: '10px 8px' }}>Rol Actual</th>
                    <th style={{ padding: '10px 8px' }}>Key Soberana</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map(u => {
                    const isMasterAdmin = u.email.toLowerCase() === 'marcmr_88@hotmail.com';
                    const isCurrent = u.id === currentUser.id;
                    const canEditThis = (currentUser.role === 'admin' && !isMasterAdmin) || (currentUser.role === 'it' && u.role !== 'admin');

                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <td style={{ padding: '10px 8px', fontWeight: '600', color: '#fff' }}>
                          {u.username} {isCurrent && <span style={{ color: '#ffd36b', fontSize: '0.72rem' }}>(Tú)</span>}
                        </td>
                        <td style={{ padding: '10px 8px', color: 'rgba(255,255,255,0.7)' }}>{u.email}</td>
                        <td style={{ padding: '10px 8px' }}>
                          {canEditThis ? (
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              style={{ background: '#1e1e2f', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', padding: '4px 8px', fontSize: '0.78rem' }}
                            >
                              <option value="user">Usuario (Creador)</option>
                              <option value="guest">Invitado (Solo Chats)</option>
                              <option value="it">Técnico IT</option>
                              {currentUser.role === 'admin' && <option value="admin">Administrador</option>}
                            </select>
                          ) : (
                            getRoleBadge(u.role)
                          )}
                        </td>
                        <td style={{ padding: '10px 8px', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {u.userKey}
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                          {canEditThis && !isMasterAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5', borderRadius: '6px', padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer' }}
                              title="Eliminar usuario"
                            >
                              <FontAwesomeIcon icon={faTrash} /> Eliminar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal de Creación de Usuario por Administrador / IT */}
      {showCreateModal && (
        <div className="auth-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="auth-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="auth-modal-header">
              <div className="auth-modal-title">
                <FontAwesomeIcon icon={faUserPlus} style={{ color: '#ffd36b' }} />
                <h3>Crear Nueva Cuenta</h3>
              </div>
              <button type="button" className="auth-modal-close" onClick={() => setShowCreateModal(false)}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="auth-form" style={{ marginTop: '12px' }}>
              <div className="auth-input-group">
                <label>Correo Electrónico</label>
                <input
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  value={newAccountEmail}
                  onChange={(e) => setNewAccountEmail(e.target.value)}
                  required
                />
              </div>

              <div className="auth-input-group">
                <label>Nombre de Usuario</label>
                <input
                  type="text"
                  placeholder="Nombre de Creador / Técnico"
                  value={newAccountUsername}
                  onChange={(e) => setNewAccountUsername(e.target.value)}
                  required
                />
              </div>

              <div className="auth-input-group">
                <label>Rol de la Cuenta</label>
                <select
                  value={newAccountRole}
                  onChange={(e) => setNewAccountRole(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', background: '#1a1b2b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
                >
                  <option value="user">Usuario (Creador / Estándar)</option>
                  <option value="guest">Invitado (Solo Chats)</option>
                  <option value="it">Técnico IT (Gestor de Servidor)</option>
                  {currentUser.role === 'admin' && <option value="admin">Administrador (Control Total)</option>}
                </select>
              </div>

              <div className="auth-input-group">
                <label>Contraseña Temporal / Asignada</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showNewAccountPass ? 'text' : 'password'}
                    placeholder="Mínimo 8 car., Mayús, Minús, Núm, Símbolo"
                    value={newAccountPassword}
                    onChange={(e) => setNewAccountPassword(e.target.value)}
                    style={{ width: '100%', paddingRight: '38px' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewAccountPass(!showNewAccountPass)}
                    style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.65)', cursor: 'pointer', padding: '4px' }}
                  >
                    <FontAwesomeIcon icon={showNewAccountPass ? faEyeSlash : faEye} />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={createAccountLoading}
                style={{ marginTop: '8px' }}
              >
                {createAccountLoading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faCheck} />}
                <span>{createAccountLoading ? 'Creando...' : 'Crear Usuario'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. Lista horizontal de sus Creaciones */}
      <div className="profile-carousel-section">
        <div className="psection-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <h3><FontAwesomeIcon icon={faLayerGroup} /> Mis Creaciones Modulares ({userScenarios.length})</h3>
          {currentUser && (
            <button
              type="button"
              onClick={handleRelinkCreations}
              style={{
                background: 'rgba(255, 211, 107, 0.12)',
                border: '1px solid rgba(255, 211, 107, 0.35)',
                color: '#ffd36b',
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '0.76rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Escanear y vincular todas las creaciones del ordenador a mi cuenta"
            >
              <FontAwesomeIcon icon={faLink} /> Vincular Creaciones Previas a mi Cuenta
            </button>
          )}
        </div>

        {relinkStatus && (
          <div style={{ background: 'rgba(110, 231, 183, 0.15)', border: '1px solid rgba(110, 231, 183, 0.4)', borderRadius: '6px', padding: '8px 12px', color: '#6ee7b7', fontSize: '0.8rem', margin: '8px 0' }}>
            ✅ {relinkStatus}
          </div>
        )}

        <div className="pcarousel-row">
          {userScenarios.length === 0 ? (
            <div className="empty-pcarousel">
              No tienes creaciones vinculadas aún. Puedes pulsar "Vincular Creaciones Previas a mi Cuenta" si creaste mundos previamente.
            </div>
          ) : (
            userScenarios.map(sc => {
              const itemImage = sc.cover || sc.avatar || sc.image || (sc.personality ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80' : 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80');
              const itemTitle = sc.title || sc.name || 'Sin título';
              const itemType = sc.category || sc.type || (sc.personality ? 'Personaje' : 'Escenario');
              return (
                <div key={sc.id} className="pcard-item" onClick={() => onOpenScenario && onOpenScenario(sc)}>
                  <div className="pcard-cover" style={{ backgroundImage: `url(${itemImage})` }} />
                  <div className="pcard-info">
                    <h4>{itemTitle}</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      <small>{itemType}</small>
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: '700',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: sc.public ? 'rgba(255, 211, 107, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        color: sc.public ? '#ffd36b' : 'rgba(255,255,255,0.4)',
                        border: sc.public ? '1px solid rgba(255, 211, 107, 0.25)' : '1px solid rgba(255,255,255,0.08)'
                      }}>
                        {sc.public ? 'Público' : 'Privado'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })

          )}
        </div>
      </div>

      {/* 5. Lista horizontal de Favoritos */}
      <div className="profile-carousel-section">
        <div className="psection-header">
          <h3><FontAwesomeIcon icon={faHeart} /> Escenarios Favoritos</h3>
        </div>
        <div className="pcarousel-row">
          {mockFavorites.length === 0 ? (
            <div className="empty-pcarousel">No tienes escenarios marcados como favoritos.</div>
          ) : (
            mockFavorites.map(sc => (
              <div key={sc.id} className="pcard-item" onClick={() => onOpenScenario && onOpenScenario(sc)}>
                <div className="pcard-cover" style={{ backgroundImage: `url(${sc.cover || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80'})` }} />
                <div className="pcard-info">
                  <h4>{sc.title}</h4>
                  <small>{sc.category}</small>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 6. Lista horizontal de Autores Seguidos */}
      <div className="profile-carousel-section">
        <div className="psection-header">
          <h3><FontAwesomeIcon icon={faUserPlus} /> Autores Seguidos</h3>
        </div>
        <div className="pcarousel-row">
          {mockAuthors.map((auth, i) => (
            <div key={i} className="pauthor-item">
              <div className="pauthor-avatar"><FontAwesomeIcon icon={faUser} /></div>
              <div className="pauthor-info">
                <h4>{auth.name}</h4>
                <small>{auth.role}</small>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Reutilizable de Medios (Avatar / Portada) */}
      <MediaPickerModal
        isOpen={mediaModal.isOpen}
        onClose={() => setMediaModal({ ...mediaModal, isOpen: false })}
        title={mediaModal.title}
        type={mediaModal.type}
        currentValue={mediaModal.currentValue}
        onSave={handleApplyMedia}
      />
    </div>
  );
}
