/* ==========================================================================
   AeroGlass ERP Authentication & RBAC Engine
   ========================================================================== */

import { db } from './db.js';
import { sync } from './sync.js';

class AuthService {
  constructor() {
    this.currentUser = null;
  }

  /**
   * Attempts online verification via Supabase first, falling back to local IndexedDB
   */
  async login(username, password) {
    const isOnline = navigator.onLine;
    const supaConfig = sync.getConfig();

    // 1. Online Authentication Check
    if (isOnline && supaConfig && supaConfig.url && supaConfig.url.includes('supabase.co')) {
      try {
        const response = await fetch(`${supaConfig.url}/rest/v1/users?username=eq.${encodeURIComponent(username)}&password=eq.${encodeURIComponent(password)}`, {
          method: 'GET',
          headers: {
            'apikey': supaConfig.key,
            'Authorization': `Bearer ${supaConfig.key}`
          }
        });

        if (response.ok) {
          const users = await response.json();
          if (users && users.length > 0) {
            const user = users[0];
            if (user.status === 'Inactive') {
              throw new Error('This operator profile is currently inactive.');
            }
            this.currentUser = {
              username: user.username,
              role: user.role,
              initials: this.getInitials(user.username)
            };
            // Cache user record in local IndexedDB for future offline access
            await db.putDirectly('users', user);
            return this.currentUser;
          }
        }
      } catch (err) {
        console.warn('Online credentials check failed. Attempting local offline verification...', err.message);
      }
    }

    // 2. Offline / Fallback Authentication Check
    const localUser = await db.get('users', username);
    if (localUser) {
      if (localUser.password === password) {
        if (localUser.status === 'Inactive') {
          throw new Error('This operator profile is currently inactive.');
        }
        this.currentUser = {
          username: localUser.username,
          role: localUser.role,
          initials: this.getInitials(localUser.username)
        };
        return this.currentUser;
      } else {
        throw new Error('Invalid credentials provided.');
      }
    }

    throw new Error('Operator profile not found. Please check your credentials.');
  }

  getInitials(username) {
    const parts = username.split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : username.slice(0, 2).toUpperCase();
  }

  logout() {
    this.currentUser = null;
    sessionStorage.removeItem('aeroglass_user');
  }

  /**
   * Check if current session user has access
   */
  getCurrentUser() {
    if (this.currentUser) return this.currentUser;
    const savedUser = sessionStorage.getItem('aeroglass_user');
    if (savedUser) {
      this.currentUser = JSON.parse(savedUser);
      return this.currentUser;
    }
    return null;
  }

  /**
   * General role permission helper
   */
  hasAccess(allowedRoles) {
    const user = this.getCurrentUser();
    if (!user) return false;
    if (user.role === 'Admin') return true; // Admins bypass all gates
    return allowedRoles.includes(user.role);
  }

  /**
   * Determines if a user can access a specific major view module
   */
  canAccessView(viewName) {
    const user = this.getCurrentUser();
    if (!user) return false;
    if (user.role === 'Admin') return true; // Full access

    // Define Role Access Matrix
    const roleAccess = {
      'Manager': ['dashboard', 'projects', 'inventory', 'gatepass', 'tools', 'settings'],
      'HR': ['dashboard', 'hr', 'settings'],
      'Store Keeper': ['dashboard', 'inventory', 'gatepass', 'tools', 'settings'],
      'Employee': ['dashboard', 'projects']
    };

    const allowedViews = roleAccess[user.role] || [];
    return allowedViews.includes(viewName);
  }
}

export const auth = new AuthService();
