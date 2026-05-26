/* ==========================================================================
   AeroGlass ERP Application Coordinator & Router
   ========================================================================== */

import { auth } from './auth.js';
import { sync } from './sync.js';
import { db } from './db.js';

// Module Import Registrations
import { renderDashboard } from './modules/dashboard.js';
import { renderProjects } from './modules/projects.js';
import { renderHR } from './modules/hr.js';
import { renderInventory } from './modules/inventory.js';
import { renderGatePass } from './modules/gatepass.js';
import { renderUsers } from './modules/users.js';
import { renderSettings } from './modules/settings.js';

class AppCoordinator {
  constructor() {
    window.app = this; // Attach to global window scope to prevent ES module circular import deadlocks
    this.currentView = null;
    this.toastContainer = document.getElementById('toast-container');
    this.modalOverlay = document.getElementById('global-modal');
    this.modalContainer = document.getElementById('modal-container');
    this.modalTitle = document.getElementById('modal-title');
    this.modalBody = document.getElementById('modal-body');
    this.modalCloseBtn = document.getElementById('modal-close-btn');

    this.initEventListeners();
    this.initSyncStatus();
    this.initTheme();
  }

  /**
   * Boot coordinator
   */
  async start() {
    try {
      await db.init();
      console.log('Database and seed data successfully initialized.');
    } catch (err) {
      console.error('Failed to initialize database:', err);
    }

    this.handleRoute();
    window.addEventListener('hashchange', () => this.handleRoute());
  }

  /**
   * Main Router Handler
   */
  async handleRoute() {
    const appContainer = document.getElementById('app-container');
    appContainer.classList.remove('hidden');

    // Update Profile widgets with static Admin details
    document.getElementById('profile-name').textContent = 'Admin';
    document.getElementById('profile-role').textContent = 'System Admin';
    document.getElementById('user-avatar').textContent = 'AD';

    // Extract Route Hash
    let hash = window.location.hash.slice(1) || 'dashboard';
    
    // Split for sub-routes
    const routeParts = hash.split('/');
    const mainView = routeParts[0];

    // Load active layout styling to sidebar
    this.updateSidebarActive(mainView);

    // Mount Module View
    const workspaceView = document.getElementById('view-content');
    workspaceView.innerHTML = `
      <div class="text-center muted-text" style="padding: 100px 0;">
        <i data-lucide="loader" class="spinning" style="width: 48px; height: 48px; margin-bottom: 16px;"></i>
        <p>Loading module workspace...</p>
      </div>
    `;
    lucide.createIcons();

    // Route mount switcher
    try {
      this.currentView = hash;
      const titleEl = document.getElementById('view-title');

      switch (mainView) {
        case 'dashboard':
          titleEl.textContent = 'Operational Dashboard';
          await renderDashboard(workspaceView);
          break;
        case 'projects':
          titleEl.textContent = 'Projects & Kanban';
          await renderProjects(workspaceView, routeParts);
          break;
        case 'hr':
          titleEl.textContent = 'HR Management';
          await renderHR(workspaceView, routeParts);
          break;
        case 'inventory':
          titleEl.textContent = 'Store & Inventory';
          await renderInventory(workspaceView, routeParts);
          break;
        case 'gatepass':
          titleEl.textContent = 'Gate Pass Manager';
          await renderGatePass(workspaceView, routeParts);
          break;
        case 'users':
          titleEl.textContent = 'User Administration';
          await renderUsers(workspaceView);
          break;
        case 'settings':
          titleEl.textContent = 'System Settings';
          await renderSettings(workspaceView);
          break;
        default:
          window.location.hash = '#dashboard';
          break;
      }
    } catch (routeErr) {
      console.error('Module rendering failure:', routeErr);
      workspaceView.innerHTML = `
        <div class="glass-card text-center" style="margin: 40px auto; max-width: 500px;">
          <i data-lucide="alert-triangle" class="danger-text" style="width: 48px; height: 48px; margin-bottom: 16px;"></i>
          <h3 class="danger-text">Rendering Failure</h3>
          <p class="muted-text" style="margin-top: 8px;">An error occurred while loading this workspace screen.</p>
          <pre style="text-align: left; background: rgba(0,0,0,0.3); padding: 12px; margin-top: 16px; border-radius: 6px; font-size:12px; overflow-x:auto;">${routeErr.message}</pre>
        </div>
      `;
    }

    lucide.createIcons();
  }

  updateSidebarActive(viewName) {
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    navItems.forEach(item => {
      if (item.getAttribute('data-view') === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  /**
   * Hook up UI event listeners
   */
  initEventListeners() {
    // 1. Close Modal global overlays
    this.modalCloseBtn.addEventListener('click', () => this.closeModal());
    this.modalOverlay.addEventListener('click', (e) => {
      if (e.target === this.modalOverlay) this.closeModal();
    });

    // 2. Dark/Light Theme Switching
    const themeBtn = document.getElementById('theme-toggle');
    const sunIcon = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');

    themeBtn.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const nextTheme = isDark ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nextTheme);
      localStorage.setItem('aeroglass_theme', nextTheme);

      if (nextTheme === 'light') {
        sunIcon.classList.remove('hidden');
        moonIcon.classList.add('hidden');
      } else {
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
      }
    });
  }

  /**
   * Monitor Network connection / sync status badge
   */
  initSyncStatus() {
    const indicator = document.getElementById('sync-indicator');
    const label = document.getElementById('sync-label');

    sync.subscribe((status) => {
      indicator.className = 'sync-indicator ' + status;
      
      switch (status) {
        case 'online':
          label.textContent = 'Sync Connected';
          break;
        case 'offline':
          label.textContent = 'Offline Cache';
          break;
        case 'syncing':
          label.textContent = 'Syncing...';
          break;
        case 'local-only':
          label.textContent = 'Local Database';
          break;
      }
    });
  }

  /**
   * Retrieve active theme configuration
   */
  initTheme() {
    const storedTheme = localStorage.getItem('aeroglass_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', storedTheme);
    
    const sunIcon = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');

    if (storedTheme === 'light') {
      sunIcon.classList.remove('hidden');
      moonIcon.classList.add('hidden');
    } else {
      sunIcon.classList.add('hidden');
      moonIcon.classList.remove('hidden');
    }
  }

  /**
   * Trigger slide-in notifications
   */
  showToast(title, message, type = 'info', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'info';
    if (type === 'success') icon = 'check-circle';
    if (type === 'warning') icon = 'alert-triangle';
    if (type === 'danger') icon = 'x-circle';

    toast.innerHTML = `
      <i data-lucide="${icon}"></i>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
    `;

    this.toastContainer.appendChild(toast);
    lucide.createIcons();

    // Trigger visual slide-in
    setTimeout(() => toast.classList.add('show'), 50);

    // Fade out and terminate toast
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, duration);
  }

  /**
   * Open global modal overlay
   * @param {string} title 
   * @param {string|HTMLElement} content 
   * @param {string} customMaxWidth optional max width override (e.g. '800px')
   */
  openModal(title, content, customMaxWidth = '650px') {
    this.modalTitle.textContent = title;
    this.modalContainer.style.maxWidth = customMaxWidth;

    if (typeof content === 'string') {
      this.modalBody.innerHTML = content;
    } else {
      this.modalBody.innerHTML = '';
      this.modalBody.appendChild(content);
    }

    // Remove hidden FIRST, then add show for animation
    this.modalOverlay.classList.remove('hidden');
    // Small tick ensures the browser repaints before transition fires
    requestAnimationFrame(() => {
      this.modalOverlay.classList.add('show');
    });
    lucide.createIcons();
  }

  closeModal() {
    this.modalOverlay.classList.remove('show');
    // Re-hide after CSS transition completes (300ms)
    setTimeout(() => {
      this.modalOverlay.classList.add('hidden');
      this.modalBody.innerHTML = '';
      this.modalContainer.style.maxWidth = '650px';
    }, 320);
  }
}

export const app = new AppCoordinator();
app.start();
