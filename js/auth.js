/* ==========================================================================
   AeroGlass ERP Authentication & RBAC Engine
   ========================================================================== */

class AuthService {
  constructor() {}

  /**
   * Stub login always returning Admin
   */
  async login(username, password) {
    return { username: 'admin', role: 'Admin' };
  }

  /**
   * Stub logout
   */
  logout() {}

  /**
   * Always return root Admin session
   */
  getCurrentUser() {
    return { username: 'admin', role: 'Admin' };
  }

  /**
   * Always permit access
   */
  hasAccess(allowedRoles) {
    return true;
  }

  getViewPermissions() {
    return {};
  }

  /**
   * Always authorize views
   */
  canAccessView(viewName) {
    return true;
  }
}

export const auth = new AuthService();
