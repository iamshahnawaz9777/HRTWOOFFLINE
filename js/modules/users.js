/* ==========================================================================
   AeroGlass ERP User Control Module
   ========================================================================== */

import { db } from '../db.js';
import { auth } from '../auth.js';
import { sync } from '../sync.js';

// Resolve circular dependency using a dynamic global window proxy
const app = new Proxy({}, {
  get: (target, prop) => window.app ? window.app[prop] : undefined
});

/**
 * Main Users module entry
 */
export async function renderUsers(container) {
  const users = await db.getAll('users');

  container.innerHTML = `
    <div class="glass-card" style="display:flex; flex-direction:column; gap:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div>
          <h3 style="font-size:16px; font-family:var(--font-heading); font-weight:700;">System Access Accounts</h3>
          <p class="muted-text" style="font-size:12px;">Admin console to manage system login logins, passwords, and security boundaries.</p>
        </div>
        
        <div style="display:flex; gap:10px; align-items:center;">
          <div class="search-input-wrapper">
            <i data-lucide="search"></i>
            <input type="text" id="users-search-input" placeholder="Search by username or role..." class="form-control" style="padding-top:7px; padding-bottom:7px; font-size:12px;">
          </div>
          <button id="add-user-btn" class="btn btn-primary" style="padding: 8px 16px;">
            <i data-lucide="user-plus"></i>
            <span>Create User</span>
          </button>
        </div>
      </div>

      <div class="table-responsive">
        <table class="custom-table" style="font-size:13px;" id="users-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Password Credential</th>
              <th>Access Authority Role</th>
              <th>Status</th>
              <th>Commit Actions</th>
            </tr>
          </thead>
          <tbody id="users-list-body">
            ${users.map(u => `
              <tr>
                <td><strong>${u.username}</strong></td>
                <td><code>${u.password}</code></td>
                <td>
                  <select class="form-control-noicon role-change-select" data-user="${u.username}" style="width:160px; padding:4px 8px; font-size:12px;">
                    <option value="Admin" ${u.role === 'Admin' ? 'selected' : ''}>Admin</option>
                    <option value="Manager" ${u.role === 'Manager' ? 'selected' : ''}>Manager</option>
                    <option value="Store Keeper" ${u.role === 'Store Keeper' ? 'selected' : ''}>Store Keeper</option>
                    <option value="HR" ${u.role === 'HR' ? 'selected' : ''}>HR Manager</option>
                    <option value="Employee" ${u.role === 'Employee' ? 'selected' : ''}>Employee</option>
                  </select>
                </td>
                <td>
                  <span class="badge ${u.status === 'Active' ? 'success' : 'secondary'}">${u.status}</span>
                </td>
                <td style="display:flex; gap:10px;">
                  <button class="btn btn-secondary status-toggle-btn" data-user="${u.username}" style="padding:4px 10px; font-size:11px;">
                    ${u.status === 'Active' ? 'Deactivate' : 'Activate'}
                  </button>
                  ${u.username !== 'admin' ? `
                    <button class="btn btn-danger user-delete-btn" data-user="${u.username}" style="padding:4px 10px; font-size:11px;">Delete</button>
                  ` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  bindUserEvents(container);
  lucide.createIcons();
}

function bindUserEvents(container) {
  // Search Users
  const searchInput = document.getElementById('users-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('#users-list-body tr').forEach(row => {
        const txt = row.innerText.toLowerCase();
        if (txt.includes(q)) {
          row.classList.remove('hidden');
        } else {
          row.classList.add('hidden');
        }
      });
    });
  }

  // 1. Change user role authority select
  container.querySelectorAll('.role-change-select').forEach(select => {
    select.addEventListener('change', async (e) => {
      const username = select.getAttribute('data-user');
      const nextRole = e.target.value;

      const user = await db.get('users', username);
      if (user) {
        user.role = nextRole;
        await db.put('users', user);
        await sync.queueOperation('users', 'update', user);

        app.showToast('Role Configured', `Shifted ${username} access level to ${nextRole}.`, 'success');
        
        // If current logged-in user changed their own role, trigger SPA router reload
        if (username === auth.getCurrentUser()?.username) {
          app.showToast('Session Updated', 'Reloading view layout based on new access levels.', 'info');
          setTimeout(() => location.reload(), 1500);
        }
      }
    });
  });

  // 2. Toggle active/inactive system statuses
  container.querySelectorAll('.status-toggle-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const username = btn.getAttribute('data-user');
      
      if (username === 'admin') {
        app.showToast('Action Terminated', 'Security Guard: The root administrator account cannot be deactivated.', 'danger');
        return;
      }

      const user = await db.get('users', username);
      if (user) {
        user.status = user.status === 'Active' ? 'Inactive' : 'Active';
        await db.put('users', user);
        await sync.queueOperation('users', 'update', user);

        app.showToast('Account Status Changed', `Set ${username} status to ${user.status}.`, 'success');
        await renderUsers(container);
      }
    });
  });

  // 3. Create User Modal Trigger
  document.getElementById('add-user-btn').addEventListener('click', () => {
    const formHTML = `
      <form id="create-user-form" class="login-form" style="padding:0;">
        <div class="input-group">
          <label>Username <span style="color:var(--danger); font-size:11px;">*required</span></label>
          <input type="text" id="new-u-username" class="form-control-noicon" required placeholder="e.g. jdoe">
        </div>
        <div class="input-group">
          <label>Password <span class="muted-text" style="font-size:10px;">(optional)</span></label>
          <input type="text" id="new-u-password" class="form-control-noicon" placeholder="e.g. securePass123 (auto-gen if empty)">
        </div>
        <div class="input-group">
          <label>System Authorization Role</label>
          <select id="new-u-role" class="form-control-noicon">
            <option value="Employee">Employee</option>
            <option value="Manager">Manager</option>
            <option value="Store Keeper">Store Keeper</option>
            <option value="HR">HR Manager</option>
            <option value="Admin">Admin</option>
          </select>
        </div>
        <button type="submit" class="btn btn-primary btn-block">Initialize Login Account</button>
      </form>
    `;

    app.openModal('Create System Access User', formHTML);

    document.getElementById('create-user-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const rawUser = document.getElementById('new-u-username').value.trim();
      const username = rawUser.toLowerCase();
      const password = document.getElementById('new-u-password').value.trim() || 'password123';
      const role = document.getElementById('new-u-role').value || 'Employee';

      // Validate Unique Username
      const existing = await db.get('users', username);
      if (existing) {
        app.showToast('Account Error', `An account with username "${rawUser}" already exists in databases.`, 'danger');
        return;
      }

      const newUser = { username, password, role, status: 'Active' };
      
      await db.put('users', newUser);
      await sync.queueOperation('users', 'insert', newUser);

      app.closeModal();
      app.showToast('User Created', `Login account for "${rawUser}" initialized.`, 'success');
      
      await renderUsers(container);
    });
  });

  // 4. Delete user account Action
  container.querySelectorAll('.user-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const username = btn.getAttribute('data-user');
      
      const confirmDelete = confirm(`Are you absolutely sure you want to delete system user: "${username}"?`);
      if (confirmDelete) {
        await db.delete('users', username);
        await sync.queueOperation('users', 'delete', username);
        
        app.showToast('User Deleted', `Successfully deleted system user account "${username}".`, 'success');
        await renderUsers(container);
      }
    });
  });
}
