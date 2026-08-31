/* ==========================================================================
   AeroGlass ERP Application Coordinator & Router
   ========================================================================== */

import { auth } from './auth.js';
import { sync } from './sync.js';
import { db } from './db.js';

// Module Import Registrations
import { renderDashboard } from './modules/dashboard.js';
import { renderQuotations } from './modules/quotations.js';
import { renderProjects } from './modules/projects.js';
import { renderHR } from './modules/hr.js';
import { renderInventory } from './modules/inventory.js';
import { renderGatePass } from './modules/gatepass.js';
import { renderTools } from './modules/tools.js';
import { renderUsers } from './modules/users.js';
import { renderSettings } from './modules/settings.js';
import { renderDatabaseExplorer } from './modules/database_explorer.js';

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
    this.currentUser = null;

    this.initEventListeners();
    this.initSyncStatus();
    this.initTheme();
    this.initAuth();

    // Auto-provision Turso cloud schema in the background on startup
    if (navigator.onLine) {
      sync.createTursoTables().catch(e => console.warn('Turso init skipped on startup:', e.message));
    }
  }

  /**
   * Initialize authentication — check session and bind login/logout
   */
  initAuth() {
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');

    // Check for existing session
    const savedUser = sessionStorage.getItem('aeroglass_user');
    if (savedUser) {
      this.currentUser = JSON.parse(savedUser);
      loginContainer.classList.add('hidden');
      appContainer.classList.remove('hidden');
      this.updateProfileWidgets();
    }

    // Login form handler
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const usernameInput = document.getElementById('login-username');
      const passwordInput = document.getElementById('login-password');
      const username = usernameInput.value.trim();
      const password = passwordInput.value;

      if (!username || !password) return;

      const submitBtn = loginForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Verifying operator profile...';

      try {
        const verifiedUser = await auth.login(username, password);
        this.currentUser = verifiedUser;
        sessionStorage.setItem('aeroglass_user', JSON.stringify(this.currentUser));

        // Animated transition: login out → app in
        loginContainer.classList.add('fade-out');
        setTimeout(() => {
          loginContainer.classList.add('hidden');
          loginContainer.classList.remove('fade-out');
          appContainer.classList.remove('hidden');
          appContainer.classList.add('fade-in');
          this.updateProfileWidgets();
          this.handleRoute();
          lucide.createIcons();
        }, 500);
      } catch (err) {
        this.showToast('Login Denied', err.message, 'danger');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Initialize Workspace Session';
      }
    });

    // Logout handler
    logoutBtn.addEventListener('click', () => {
      auth.logout();
      this.currentUser = null;
      window.location.hash = '';
      window.location.reload();
    });
  }

  /**
   * Update sidebar profile widgets with current user info
   */
  updateProfileWidgets() {
    if (!this.currentUser) return;
    document.getElementById('profile-name').textContent = this.currentUser.username;
    document.getElementById('profile-role').textContent = this.currentUser.role;
    document.getElementById('user-avatar').textContent = this.currentUser.initials || 'AD';

    // Hide/Show sidebar links dynamically based on user role
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    navItems.forEach(item => {
      const view = item.getAttribute('data-view');
      if (auth.canAccessView(view)) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });
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

    // Only route if user is logged in
    if (this.currentUser) {
      this.handleRoute();
      window.addEventListener('hashchange', () => this.handleRoute());
    } else {
      // Still listen for hash changes post-login
      window.addEventListener('hashchange', () => {
        if (this.currentUser) this.handleRoute();
      });
    }

    // Google Sheets Automated Failover Sync Loop
    this.startGoogleSheetsSyncLoop();
  }

  /**
   * Google Sheets Automated Background Sync Loop
   */
  startGoogleSheetsSyncLoop() {
    const runHourlySync = async () => {
      const webhookUrl = localStorage.getItem('aeroglass_gsheet_webhook');
      const isAutoSync = localStorage.getItem('aeroglass_gsheet_autosync') !== 'false';
      
      if (!isAutoSync || !webhookUrl) return;

      try {
        const inventory = await db.getAll('inventory');
        const employees = await db.getAll('employees');
        let tools = [];
        try { tools = await db.getAll('tools_tracking'); } catch (e) {}

        await fetch(webhookUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timestamp: new Date().toISOString(),
            inventory,
            hr_employees: employees,
            tools
          })
        });
        console.log("Automated spreadsheet state shadow sync array succeeded.");
      } catch (e) {
        console.error("Hourly automated cloud sheet matrix serialization fail:", e);
      }
    };

    // Run immediately on bootup, then check on hourly intervals (3600000 ms)
    runHourlySync();
    setInterval(runHourlySync, 3600000);
  }

  /**
   * Main Router Handler
   */
  async handleRoute() {
    const appContainer = document.getElementById('app-container');
    appContainer.classList.remove('hidden');

    // Update Profile widgets with session user details
    this.updateProfileWidgets();

    // Extract Route Hash
    let hash = window.location.hash.slice(1) || 'dashboard';
    
    // Split for sub-routes
    const routeParts = hash.split('/');
    const mainView = routeParts[0];

    // Load active layout styling to sidebar
    this.updateSidebarActive(mainView);

    const workspaceView = document.getElementById('view-content');

    // Enforce role-based access check
    if (!auth.canAccessView(mainView)) {
      workspaceView.innerHTML = `
        <div class="glass-card text-center" style="margin: 40px auto; max-width: 500px; padding: 40px;">
          <i data-lucide="shield-alert" class="warning-text" style="width: 48px; height: 48px; margin-bottom: 16px; display:inline-block;"></i>
          <h3 class="warning-text" style="font-family:var(--font-heading); font-weight:700;">Access Denied</h3>
          <p class="muted-text" style="margin-top: 8px; font-size:13px;">Your Operator Profile (${this.currentUser.role}) does not have permission to access the <strong>${mainView}</strong> module.</p>
          <button onclick="window.location.hash='#dashboard'" class="btn btn-primary" style="margin-top: 20px; padding: 8px 16px;">Back to Dashboard</button>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    // Mount Module View
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
        case 'quotations':
          titleEl.textContent = 'Quotation & Invoice Studio';
          await renderQuotations(workspaceView, routeParts);
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
          titleEl.textContent = 'Gate Pass-PI Manager';
          await renderGatePass(workspaceView, routeParts);
          break;
        case 'tools':
          titleEl.textContent = 'Order Tracking Manager';
          await renderTools(workspaceView);
          break;
        case 'users':
          titleEl.textContent = 'User Administration';
          await renderUsers(workspaceView);
          break;
        case 'settings':
          titleEl.textContent = 'System Settings';
          await renderSettings(workspaceView);
          break;
        case 'db_explorer':
          titleEl.textContent = 'Database Explorer';
          await renderDatabaseExplorer(workspaceView);
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

    // 2. Sidebar Collapse Toggle
    const collapseBtn = document.getElementById('sidebar-collapse-btn');
    const appLayout = document.getElementById('app-container');

    if (collapseBtn && appLayout) {
      collapseBtn.addEventListener('click', () => {
        appLayout.classList.toggle('collapsed');
        const isCollapsed = appLayout.classList.contains('collapsed');
        collapseBtn.innerHTML = `<i data-lucide="${isCollapsed ? 'chevron-right' : 'chevron-left'}" id="sidebar-collapse-icon" style="width: 20px; height: 20px;"></i>`;
        lucide.createIcons();
      });
    }

    // 3. Dark/Light Theme Switching
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
      if (indicator) indicator.className = 'sync-indicator ' + status;
      
      switch (status) {
        case 'online':
          if (label) label.textContent = 'Sync Connected';
          break;
        case 'offline':
          if (label) label.textContent = 'Offline Cache';
          break;
        case 'syncing':
          if (label) label.textContent = 'Syncing...';
          break;
        case 'local-only':
          if (label) label.textContent = 'Local Database';
          break;
      }

      // Check local folder visibility & permission
      const folderItem = document.getElementById('sync-item-folder');
      const folderStatusText = document.getElementById('sync-status-folder')?.querySelector('.db-sync-status-text');
      const folderDot = document.getElementById('sync-status-folder')?.querySelector('.db-sync-dot');
      
      if (db.localDirHandle || db.localDirPath) {
        if (folderItem) folderItem.style.display = 'flex';
        db.verifyPermission(true).then(isAuthorized => {
          if (folderStatusText) folderStatusText.textContent = isAuthorized ? 'Authorized' : 'Needs Auth';
          if (folderDot) {
            folderDot.className = `db-sync-dot ${isAuthorized ? 'online' : 'warning'}`;
          }
        });
      } else {
        if (folderItem) folderItem.style.display = 'none';
      }

      // Refresh the triple-database sidebar status dots
      sync.updateSyncWidget();
    });

    // Bind local folder sync row click
    const folderItem = document.getElementById('sync-item-folder');
    if (folderItem) {
      folderItem.addEventListener('click', async () => {
        const success = await db.requestPermission(true);
        if (success) {
          this.showToast('Folder Authorized', 'Granted read/write permissions to the local folder database.', 'success');
          this.initSyncStatus();
        } else {
          this.showToast('Authorization Failed', 'Could not obtain local folder access.', 'danger');
        }
      });
    }

    // Initial widget paint on load
    sync.updateSyncWidget();
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
    if (this._closeModalTimer) {
      clearTimeout(this._closeModalTimer);
      this._closeModalTimer = null;
    }

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
    this.modalOverlay.classList.remove('big-screen-mode');

    if (this._closeModalTimer) {
      clearTimeout(this._closeModalTimer);
    }

    // Re-hide after CSS transition completes (300ms)
    this._closeModalTimer = setTimeout(() => {
      this.modalOverlay.classList.add('hidden');
      this.modalOverlay.classList.remove('big-screen-mode'); // Double safeguard
      this.modalBody.innerHTML = '';
      this.modalContainer.style.maxWidth = '650px';
      this._closeModalTimer = null;
    }, 320);
  }

  /**
   * Visual conflict resolution modal
   * Renders side-by-side local and cloud changes for the user to pick.
   * Returns a Promise that resolves to either the merged record, or null (revert to cloud).
   */
  async showConflictResolver(store, localRecord, cloudRecord) {
    return new Promise((resolve) => {
      // Find keys with conflicting values
      const ignoreKeys = ['updatedAt', 'syncDate', 'id', 'username'];
      const allKeys = Array.from(new Set([...Object.keys(localRecord), ...Object.keys(cloudRecord)]));
      const conflicts = allKeys.filter(k => !ignoreKeys.includes(k) && localRecord[k] !== cloudRecord[k]);

      // If no conflict keys, auto resolve to local
      if (conflicts.length === 0) {
        resolve(localRecord);
        return;
      }

      let contentHtml = `
        <div style="display:flex; flex-direction:column; gap:16px;">
          <p class="muted-text" style="font-size:12px;">A sync collision occurred for database record <code>${localRecord.id || localRecord.username}</code> in store <strong>${store}</strong>. Select the version to preserve.</p>
          
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; max-height:280px; overflow-y:auto; padding:4px;">
            <!-- Local Changes Card -->
            <div class="glass-card" style="padding:12px; border-color:var(--warning); display:flex; flex-direction:column; gap:8px;">
              <h4 style="font-size:13px; font-weight:700; color:var(--warning-color); display:flex; align-items:center; gap:6px;">
                <i data-lucide="smartphone" style="width:14px; height:14px;"></i>
                <span>Local Operator Changes</span>
              </h4>
              <div style="font-size:11px; display:flex; flex-direction:column; gap:6px; color:var(--text-secondary);">
                ${conflicts.map(k => `
                  <div>
                    <strong>${k}:</strong> 
                    <span class="warning-text">${typeof localRecord[k] === 'object' ? JSON.stringify(localRecord[k]) : localRecord[k]}</span>
                  </div>
                `).join('')}
              </div>
              <button id="conflict-keep-local" class="btn btn-primary btn-block" style="margin-top:auto; font-size:11px; padding:6px;">Use Local Changes</button>
            </div>
            
            <!-- Cloud Changes Card -->
            <div class="glass-card" style="padding:12px; border-color:var(--primary-color); display:flex; flex-direction:column; gap:8px;">
              <h4 style="font-size:13px; font-weight:700; color:var(--primary-color); display:flex; align-items:center; gap:6px;">
                <i data-lucide="cloud" style="width:14px; height:14px;"></i>
                <span>Cloud Server State</span>
              </h4>
              <div style="font-size:11px; display:flex; flex-direction:column; gap:6px; color:var(--text-secondary);">
                ${conflicts.map(k => `
                  <div>
                    <strong>${k}:</strong> 
                    <span class="success-text">${typeof cloudRecord[k] === 'object' ? JSON.stringify(cloudRecord[k]) : cloudRecord[k]}</span>
                  </div>
                `).join('')}
              </div>
              <button id="conflict-keep-cloud" class="btn btn-secondary btn-block" style="margin-top:auto; font-size:11px; padding:6px;">Use Cloud State</button>
            </div>
          </div>
          
          <button id="conflict-keep-merge" class="btn btn-accent btn-block" style="padding:10px;">
            <i data-lucide="merge"></i>
            <span>Auto-Merge (Non-Overlapping Fields)</span>
          </button>
        </div>
      `;

      this.openModal('⚠️ Database Sync Conflict', contentHtml, '620px');

      document.getElementById('conflict-keep-local').addEventListener('click', () => {
        this.closeModal();
        resolve(localRecord);
      });

      document.getElementById('conflict-keep-cloud').addEventListener('click', () => {
        this.closeModal();
        resolve(null); // null means "revert to cloud"
      });

      document.getElementById('conflict-keep-merge').addEventListener('click', () => {
        this.closeModal();
        const merged = { ...cloudRecord, ...localRecord, updatedAt: new Date().toISOString() };
        resolve(merged);
      });
    });
  }
}

export const app = new AppCoordinator();
app.start();
