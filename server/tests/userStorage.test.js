const { 
  registerUser, 
  authenticateUser, 
  getUserById, 
  updateUserProfile,
  clearUsersDbForTesting,
  hashPassword,
  verifyPassword,
  validatePasswordComplexity,
  generateUserKey,
  sanitizeInput,
  changePassword,
  listAllUsers,
  createUserByAdmin,
  updateUserRole,
  deleteUser
} = require('../storage/userStorage');

describe('User Storage, RBAC Roles (Admin, IT, User) & Password Management', () => {
  beforeEach(() => {
    clearUsersDbForTesting();
  });

  describe('Password Complexity Validation', () => {
    test('rejects passwords shorter than 8 characters', () => {
      expect(() => validatePasswordComplexity('Short1!')).toThrow(/al menos 8 caracteres/i);
    });

    test('rejects passwords missing uppercase letters', () => {
      expect(() => validatePasswordComplexity('lowercase123!')).toThrow(/al menos una letra mayúscula/i);
    });

    test('rejects passwords missing lowercase letters', () => {
      expect(() => validatePasswordComplexity('UPPERCASE123!')).toThrow(/al menos una letra minúscula/i);
    });

    test('rejects passwords missing numeric digits', () => {
      expect(() => validatePasswordComplexity('NoNumbersHere!#')).toThrow(/al menos un número/i);
    });

    test('rejects passwords missing special symbols', () => {
      expect(() => validatePasswordComplexity('NoSymbols12345')).toThrow(/al menos un símbolo/i);
    });

    test('accepts strong passwords meeting all 5 criteria', () => {
      expect(validatePasswordComplexity('SuperSecret#2026!')).toBe(true);
    });
  });

  describe('Sovereign User Key Generation & Master Admin Seed', () => {
    test('generateUserKey generates a PTAH-XXXX-XXXX-XXXX-XXXX key bound to email', () => {
      const key = generateUserKey('marcmr_88@hotmail.com', 'unique_salt_123');
      expect(key).toBeDefined();
      expect(key).toMatch(/^PTAH-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/);
    });

    test('marcmr_88@hotmail.com is assigned role: admin automatically', () => {
      const admin = registerUser({
        email: 'marcmr_88@hotmail.com',
        username: 'Azgael',
        password: 'Earthian#00'
      });

      expect(admin.role).toBe('admin');
      expect(admin.email).toBe('marcmr_88@hotmail.com');
      expect(admin.username).toBe('Azgael');
    });

    test('standard user registration is assigned role: user by default', () => {
      const user = registerUser({
        email: 'player1@ptahn.local',
        username: 'PlayerOne',
        password: 'Password123@#'
      });

      expect(user.role).toBe('user');
    });

    test('guest role registration is assigned role: guest', () => {
      const guest = registerUser({
        email: 'guest1@ptahn.local',
        username: 'GuestOne',
        password: 'Password123@#',
        role: 'guest'
      });

      expect(guest.role).toBe('guest');
    });
  });


  describe('Change Password Feature', () => {
    test('allows user to change password by verifying current password', () => {
      const user = registerUser({
        email: 'user_change@ptahn.local',
        username: 'UserChange',
        password: 'OldPassword123@#'
      });

      const res = changePassword(user.id, 'OldPassword123@#', 'NewPassword2026!#');
      expect(res.success).toBe(true);

      // Verify authentication with new password succeeds
      const authNew = authenticateUser({
        identifier: 'user_change@ptahn.local',
        password: 'NewPassword2026!#'
      });
      expect(authNew).toBeDefined();
      expect(authNew.id).toBe(user.id);

      // Verify old password fails
      expect(() => {
        authenticateUser({
          identifier: 'user_change@ptahn.local',
          password: 'OldPassword123@#'
        });
      }).toThrow(/contraseña incorrecta/i);
    });

    test('rejects password change if current password is incorrect', () => {
      const user = registerUser({
        email: 'user_wrong@ptahn.local',
        username: 'UserWrong',
        password: 'OldPassword123@#'
      });

      expect(() => {
        changePassword(user.id, 'WrongOldPass123@#', 'NewPassword2026!#');
      }).toThrow(/contraseña actual es incorrecta/i);
    });
  });

  describe('User Management by Admin and IT', () => {
    let adminUser;
    let itUser;
    let standardUser;

    beforeEach(() => {
      adminUser = registerUser({
        email: 'marcmr_88@hotmail.com',
        username: 'Azgael',
        password: 'Earthian#00'
      });

      itUser = registerUser({
        email: 'it_tech@ptahn.local',
        username: 'ITTech',
        password: 'TechPassword123@#',
        role: 'it'
      });

      standardUser = registerUser({
        email: 'regular@ptahn.local',
        username: 'RegularUser',
        password: 'UserPassword123@#'
      });
    });

    test('Admin can list all registered users', () => {
      const users = listAllUsers(adminUser);
      expect(users.length).toBeGreaterThanOrEqual(3);
      expect(users.some(u => u.username === 'Azgael')).toBe(true);
    });

    test('Admin can create IT and User accounts', () => {
      const newIt = createUserByAdmin(adminUser, {
        email: 'new_it@ptahn.local',
        username: 'NewITStaff',
        password: 'Password123@#',
        role: 'it'
      });
      expect(newIt.role).toBe('it');
    });

    test('IT can create User and IT accounts, but cannot create Admin accounts', () => {
      const createdUser = createUserByAdmin(itUser, {
        email: 'user_by_it@ptahn.local',
        username: 'UserByIT',
        password: 'Password123@#',
        role: 'user'
      });
      expect(createdUser.role).toBe('user');

      expect(() => {
        createUserByAdmin(itUser, {
          email: 'admin_by_it@ptahn.local',
          username: 'FakeAdmin',
          password: 'Password123@#',
          role: 'admin'
        });
      }).toThrow(/no tiene permiso para crear cuentas de administrador/i);
    });

    test('Admin can update roles and delete accounts', () => {
      const updated = updateUserRole(adminUser, standardUser.id, 'it');
      expect(updated.role).toBe('it');

      const delRes = deleteUser(adminUser, standardUser.id);
      expect(delRes.success).toBe(true);
      expect(getUserById(standardUser.id)).toBeNull();
    });

    test('Master Admin cannot be deleted', () => {
      expect(() => {
        deleteUser(adminUser, adminUser.id);
      }).toThrow(/no se puede eliminar al Administrador Principal/i);
    });
  });
});
