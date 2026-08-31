/* ==========================================================================
   AeroGlass ERP HR Management Module — Robust Staff, Attendance & Payroll Engine
   ========================================================================== */

import { db } from '../db.js';
import { auth } from '../auth.js';
import { sync } from '../sync.js';

// Resolve circular dependency using a dynamic global window proxy
const app = new Proxy({}, {
  get: (target, prop) => window.app ? window.app[prop] : undefined
});

let activeHRTab = 'directory'; // 'directory' | 'attendance' | 'credentials' | 'leaves' | 'payroll'

// Helper to get formatted current local date string YYYY-MM-DD
function getTodayDateStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

let selectedAttendanceDate = getTodayDateStr();

/**
 * Helper to retrieve or provision linked user account for an employee
 */
async function getEmployeeUserAccount(emp) {
  const users = await db.getAll('users');
  let user = null;

  if (emp.username) {
    user = users.find(u => u.username.toLowerCase() === emp.username.toLowerCase());
  }
  if (!user) {
    user = users.find(u => u.employeeId === emp.id);
  }
  if (!user) {
    // Try matching normalized name or common defaults
    const normalized = (emp.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    user = users.find(u => u.username.toLowerCase() === normalized);
  }

  // If no user exists yet, auto-provision one with standard defaults
  if (!user) {
    const defaultUsername = (emp.username || (emp.name || '').toLowerCase().replace(/[^a-z0-9]/g, '') || `emp_${emp.id.toLowerCase().replace(/[^a-z0-9]/g, '')}`).trim();
    user = {
      username: defaultUsername,
      password: 'user123',
      role: emp.role || 'Employee',
      status: 'Active',
      employeeId: emp.id
    };
    await db.put('users', user);
    await sync.queueOperation('users', 'insert', user);

    emp.username = defaultUsername;
    await db.put('employees', emp);
    await sync.queueOperation('employees', 'update', emp);
  } else if (!emp.username) {
    emp.username = user.username;
    await db.put('employees', emp);
  }

  return user;
}

/**
 * Seed initial default employees if database store is empty
 */
async function seedInitialEmployeesIfEmpty() {
  try {
    const existing = await db.getAll('employees');
    if (existing.length === 0) {
      const defaultEmployees = [
        { id: 'EMP-1001', name: 'John Doe', username: 'employee', role: 'Operations Lead', department: 'Operations', contact: 'john.doe@aeglas.com', phone: '+91 9826011223', joiningDate: '2025-01-15', documents: [{ name: 'ID_Passport.pdf' }], leaveBalance: 15, salary: 45000 },
        { id: 'EMP-1002', name: 'Jane Smith', username: 'hr', role: 'HR Manager', department: 'Human Resources', contact: 'jane.smith@aeglas.com', phone: '+91 9826011224', joiningDate: '2024-03-01', documents: [{ name: 'Degree_HR.pdf' }], leaveBalance: 18, salary: 65000 },
        { id: 'EMP-1003', name: 'Bob Miller', username: 'storekeeper', role: 'Store Keeper', department: 'Logistics', contact: 'bob.miller@aeglas.com', phone: '+91 9826011225', joiningDate: '2024-11-10', documents: [{ name: 'Logistics_Cert.pdf' }], leaveBalance: 14, salary: 38000 },
        { id: 'EMP-1004', name: 'Alice Johnson', username: 'alicejohnson', role: 'Structural Engineer', department: 'Projects & Engineering', contact: 'alice.j@aeglas.com', phone: '+91 9826011226', joiningDate: '2025-06-01', documents: [{ name: 'Civil_Degree.pdf' }], leaveBalance: 12, salary: 50000 },
        { id: 'EMP-1005', name: 'Charles Xavier', username: 'manager', role: 'Operations Director', department: 'Operations', contact: 'charles.x@aeglas.com', phone: '+91 9826011227', joiningDate: '2023-05-15', documents: [], leaveBalance: 20, salary: 80000 }
      ];

      for (const emp of defaultEmployees) {
        await db.put('employees', emp);
        await sync.queueOperation('employees', 'insert', emp);
      }
    }
  } catch (err) {
    console.warn('Error verifying employee seed:', err);
  }
}

/**
 * Main HR Module Entry Point
 */
export async function renderHR(container, routeParts = []) {
  await seedInitialEmployeesIfEmpty();

  // Support sub-routes if provided e.g. #hr/credentials
  if (routeParts[1] && ['directory', 'attendance', 'credentials', 'leaves', 'payroll'].includes(routeParts[1])) {
    activeHRTab = routeParts[1];
  }

  // Render main sub-tabs layout skeleton
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:20px; height:100%;">
      <!-- Internal Tab Navigation -->
      <div class="glass-card" style="padding:12px 20px;">
        <div class="tabs-navigation" style="margin-bottom:0; border-bottom:none; padding-bottom:0;">
          <button class="tab-btn ${activeHRTab === 'directory' ? 'active' : ''}" data-tab="directory">
            <i data-lucide="contact" style="width:16px; height:16px; display:inline-block; vertical-align:middle; margin-right:6px;"></i>
            <span>Staff Directory</span>
          </button>
          <button class="tab-btn ${activeHRTab === 'attendance' ? 'active' : ''}" data-tab="attendance">
            <i data-lucide="calendar-check-2" style="width:16px; height:16px; display:inline-block; vertical-align:middle; margin-right:6px;"></i>
            <span>Daily Attendance</span>
          </button>
          <button class="tab-btn ${activeHRTab === 'credentials' ? 'active' : ''}" data-tab="credentials">
            <i data-lucide="key-round" style="width:16px; height:16px; display:inline-block; vertical-align:middle; margin-right:6px;"></i>
            <span>Usernames & Passwords</span>
          </button>
          <button class="tab-btn ${activeHRTab === 'leaves' ? 'active' : ''}" data-tab="leaves">
            <i data-lucide="banknote" style="width:16px; height:16px; display:inline-block; vertical-align:middle; margin-right:6px;"></i>
            <span>Salary Advances</span>
          </button>
          <button class="tab-btn ${activeHRTab === 'payroll' ? 'active' : ''}" data-tab="payroll">
            <i data-lucide="wallet" style="width:16px; height:16px; display:inline-block; vertical-align:middle; margin-right:6px;"></i>
            <span>Departments & Payroll</span>
          </button>
        </div>
      </div>

      <!-- Tab View Content Container -->
      <div id="hr-tab-viewport" style="flex-grow:1;">
        <!-- Injected Dynamically -->
      </div>
    </div>
  `;

  bindTabTriggers(container);
  await renderActiveHRTab();
}

function bindTabTriggers(container) {
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeHRTab = btn.getAttribute('data-tab');
      await renderActiveHRTab();
    });
  });
}

/**
 * Switchboard to render the specific active sub-tab
 */
async function renderActiveHRTab() {
  const viewport = document.getElementById('hr-tab-viewport');
  if (!viewport) return;

  viewport.innerHTML = `
    <div class="text-center muted-text" style="padding: 50px 0;">
      <i data-lucide="loader" class="spinning" style="width: 32px; height: 32px; margin-bottom: 12px;"></i>
      <p>Loading HR Subsystem...</p>
    </div>
  `;
  lucide.createIcons();

  try {
    switch (activeHRTab) {
      case 'directory':
        await renderDirectoryTab(viewport);
        break;
      case 'attendance':
        await renderAttendanceTab(viewport);
        break;
      case 'credentials':
        await renderCredentialsTab(viewport);
        break;
      case 'leaves':
        await renderAdvancesTab(viewport);
        break;
      case 'payroll':
        await renderPayrollTab(viewport);
        break;
      default:
        await renderDirectoryTab(viewport);
        break;
    }
  } catch (hrErr) {
    console.error(`Failed to render HR tab [${activeHRTab}]:`, hrErr);
    viewport.innerHTML = `
      <div class="glass-card text-center" style="margin: 20px auto; max-width: 500px; padding:30px;">
        <i data-lucide="alert-triangle" class="danger-text" style="width: 36px; height: 36px; margin-bottom: 12px;"></i>
        <h3 class="danger-text" style="margin:0 0 8px;">HR View Load Error</h3>
        <p class="muted-text" style="font-size: 13px;">${hrErr.message}</p>
        <button class="btn btn-secondary" onclick="location.reload()" style="margin-top:16px; padding:6px 16px;">
          Reload View
        </button>
      </div>
    `;
  }
  lucide.createIcons();
}

/* ==========================================================================
   Tab 1: Staff Directory & Profile Editing
   ========================================================================== */
async function renderDirectoryTab(container) {
  const employees = await db.getAll('employees');

  container.innerHTML = `
    <div class="glass-card" style="display:flex; flex-direction:column; gap:20px; padding:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div class="search-input-wrapper" style="min-width:280px;">
          <i data-lucide="search"></i>
          <input type="text" id="emp-search" placeholder="Search by name, role, department..." class="form-control" style="padding-top:8px; padding-bottom:8px; font-size:12.5px;">
        </div>
        
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <button id="batch-delete-employees-btn" class="btn btn-danger hidden" style="padding: 8px 16px; display:flex; align-items:center; gap:6px;">
            <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
            <span id="batch-delete-emp-text">Delete Selected (0)</span>
          </button>
          <input type="file" id="hr-csv-upload" accept=".csv" style="display:none;" />
          <button id="import-employees-btn" class="btn btn-secondary" style="padding: 8px 16px; display:flex; align-items:center; gap:6px;">
            <i data-lucide="upload-cloud"></i>
            <span>Import CSV</span>
          </button>
          <button id="add-employee-btn" class="btn btn-primary" style="padding: 8px 16px; display:flex; align-items:center; gap:6px; font-weight:600;">
            <i data-lucide="user-plus"></i>
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      <div class="table-responsive">
        <table class="custom-table" id="employees-table" style="font-size:12.5px;">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;"><input type="checkbox" id="select-all-employees" /></th>
              <th style="width: 100px;">ID Number</th>
              <th>Personnel Name</th>
              <th>Designation Role</th>
              <th>Department</th>
              <th>Email / Contact</th>
              <th style="width: 120px;">Salary (₹)</th>
              <th style="text-align:center; width: 170px;">Actions</th>
            </tr>
          </thead>
          <tbody id="employees-list-body">
            ${employees.length === 0 ? `
              <tr>
                <td colspan="8" class="text-center muted-text" style="padding:40px 0;">
                  No employee records found. Click <strong>"Add Employee"</strong> above to register staff.
                </td>
              </tr>
            ` : employees.map(emp => `
              <tr data-id="${emp.id}">
                <td style="text-align: center;" class="noclick"><input type="checkbox" class="emp-select-checkbox" data-id="${emp.id}" /></td>
                <td><code>${emp.id}</code></td>
                <td>
                  <div style="display:flex; align-items:center; gap:10px;">
                    <div style="width:30px; height:30px; border-radius:50%; background:rgba(0,82,204,0.15); color:var(--primary-color); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:11px;">
                      ${(emp.name || 'E').substring(0, 2).toUpperCase()}
                    </div>
                    <strong>${emp.name}</strong>
                  </div>
                </td>
                <td>${emp.role || 'Employee'}</td>
                <td><span class="badge primary">${emp.department || 'Operations'}</span></td>
                <td>
                  <div>${emp.contact || 'N/A'}</div>
                  ${emp.phone ? `<span style="font-size:10.5px; color:var(--text-muted);">📱 ${emp.phone}</span>` : ''}
                </td>
                <td style="font-weight:700;">₹${Number(emp.salary || 0).toLocaleString()}</td>
                <td style="text-align:center;" class="noclick">
                  <div style="display:flex; justify-content:center; gap:6px;">
                    <button class="btn btn-secondary view-profile-btn" data-id="${emp.id}" title="View Dossier" style="padding: 4px 8px; font-size:11.5px; display:flex; align-items:center; gap:4px;">
                      <i data-lucide="eye" style="width:13px; height:13px;"></i> View
                    </button>
                    <button class="btn btn-secondary edit-profile-btn" data-id="${emp.id}" title="Edit Profile & Credentials" style="padding: 4px 8px; font-size:11.5px; display:flex; align-items:center; gap:4px; color:var(--primary-color);">
                      <i data-lucide="edit" style="width:13px; height:13px;"></i> Edit
                    </button>
                    <button class="btn btn-secondary delete-emp-btn" data-id="${emp.id}" title="Delete" style="padding: 4px 8px; font-size:11.5px; color:var(--danger); border:none;">
                      <i data-lucide="trash-2" style="width:13px; height:13px;"></i>
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Search Filter
  const searchInput = document.getElementById('emp-search');
  searchInput?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#employees-list-body tr').forEach(row => {
      const txt = row.innerText.toLowerCase();
      if (txt.includes(q)) {
        row.classList.remove('hidden');
      } else {
        row.classList.add('hidden');
      }
    });
  });

  // Action Buttons in Rows
  container.querySelectorAll('.view-profile-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const empId = btn.getAttribute('data-id');
      const emp = await db.get('employees', empId);
      if (emp) openEmployeeProfileModal(emp);
    });
  });

  container.querySelectorAll('.edit-profile-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const empId = btn.getAttribute('data-id');
      const emp = await db.get('employees', empId);
      if (emp) openEditEmployeeModal(emp);
    });
  });

  container.querySelectorAll('.delete-emp-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const empId = btn.getAttribute('data-id');
      const emp = await db.get('employees', empId);
      if (emp && confirm(`Are you sure you want to delete employee record for ${emp.name}?`)) {
        await db.delete('employees', empId);
        await sync.queueOperation('employees', 'delete', empId);
        app.showToast('Employee Removed', `Deleted ${emp.name}.`, 'success');
        await renderActiveHRTab();
      }
    });
  });

  // Add Employee Button
  document.getElementById('add-employee-btn')?.addEventListener('click', () => {
    const formHTML = `
      <form id="create-employee-form" class="login-form" style="padding:0; display:flex; flex-direction:column; gap:14px;">
        <div class="input-group" style="margin-bottom:0;">
          <label>Full Name <span style="color:var(--danger); font-size:11px;">*required</span></label>
          <input type="text" id="new-emp-name" class="form-control-noicon" required placeholder="e.g. Rahul Sharma">
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
          <div class="input-group" style="margin-bottom:0;">
            <label>Email Address</label>
            <input type="email" id="new-emp-email" class="form-control-noicon" placeholder="rahul@example.com">
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Mobile / Phone Number</label>
            <input type="text" id="new-emp-phone" class="form-control-noicon" placeholder="+91 98260XXXXX">
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
          <div class="input-group" style="margin-bottom:0;">
            <label>Designation Role</label>
            <input type="text" id="new-emp-role" class="form-control-noicon" placeholder="e.g. Glass Cutter, Lead Installer" value="Employee">
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Department</label>
            <select id="new-emp-dept" class="form-control-noicon">
              <option value="Operations">Operations</option>
              <option value="Logistics">Logistics</option>
              <option value="Human Resources">Human Resources</option>
              <option value="Projects & Engineering">Projects & Engineering</option>
              <option value="Accounts & Sales">Accounts & Sales</option>
            </select>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
          <div class="input-group" style="margin-bottom:0;">
            <label>Joining Date</label>
            <input type="date" id="new-emp-join" class="form-control-noicon" value="${getTodayDateStr()}">
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Monthly Salary (₹)</label>
            <input type="number" id="new-emp-salary" class="form-control-noicon" value="35000">
          </div>
        </div>

        <!-- Initial Login Account Setup -->
        <div style="background:rgba(0,0,0,0.15); padding:12px 14px; border-radius:6px; border:1px solid var(--glass-border); display:flex; flex-direction:column; gap:10px;">
          <span style="font-size:12px; font-weight:700; color:var(--primary-color); text-transform:uppercase;">
            System Login Credentials
          </span>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
            <div class="input-group" style="margin-bottom:0;">
              <label>System Username</label>
              <input type="text" id="new-emp-username" class="form-control-noicon" placeholder="auto-generated if empty" style="font-family:monospace;">
            </div>
            <div class="input-group" style="margin-bottom:0;">
              <label>Login Password</label>
              <input type="text" id="new-emp-password" class="form-control-noicon" value="user123" style="font-family:monospace;">
            </div>
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:8px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary" style="font-weight:700;">Save & Register Profile</button>
        </div>
      </form>
    `;

    app.openModal('Register New Employee', formHTML, '620px');

    document.getElementById('create-employee-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('new-emp-name').value.trim();
      const contact = document.getElementById('new-emp-email').value.trim() || '';
      const phone = document.getElementById('new-emp-phone').value.trim() || '';
      const role = document.getElementById('new-emp-role').value.trim() || 'Employee';
      const department = document.getElementById('new-emp-dept').value || 'Operations';
      const joiningDate = document.getElementById('new-emp-join').value || getTodayDateStr();
      const salary = parseFloat(document.getElementById('new-emp-salary').value) || 0;
      const id = `EMP-${Math.floor(1000 + Math.random() * 9000)}`;

      let username = document.getElementById('new-emp-username')?.value.trim().toLowerCase();
      if (!username) {
        username = name.toLowerCase().replace(/[^a-z0-9]/g, '') || `user_${id.toLowerCase()}`;
      }
      const password = document.getElementById('new-emp-password')?.value.trim() || 'user123';

      const newEmp = { id, name, username, role, department, contact, phone, joiningDate, documents: [], leaveBalance: 15, salary };
      await db.put('employees', newEmp);
      await sync.queueOperation('employees', 'insert', newEmp);

      // Create linked user login
      const newUser = { username, password, role, status: 'Active', employeeId: id };
      await db.put('users', newUser);
      await sync.queueOperation('users', 'insert', newUser);

      app.closeModal();
      app.showToast('Employee Registered', `Profile created with login username: "${username}" and password: "${password}".`, 'success', 6000);
      await renderActiveHRTab();
    });
  });

  // CSV Import Button
  document.getElementById('import-employees-btn')?.addEventListener('click', () => {
    document.getElementById('hr-csv-upload')?.click();
  });

  document.getElementById('hr-csv-upload')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (typeof Papa === 'undefined') {
      app.showToast('Error', 'CSV parser library is not loaded.', 'danger');
      return;
    }

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: async (results) => {
        let count = 0;
        for (const row of results.data) {
          const name = row.name || row.Name || row['Full Name'];
          if (!name) continue;

          const contact = row.contact || row.Contact || row.email || row.Email || '';
          const phone = row.phone || row.Phone || row.mobile || '';
          const role = row.role || row.Role || row.Designation || 'Employee';
          const department = row.department || row.Department || 'Operations';
          const joiningDate = row.joiningDate || row['Joining Date'] || getTodayDateStr();
          const salary = parseFloat(row.salary || row.Salary) || 0;
          const id = `EMP-${Math.floor(1000 + Math.random() * 9000)}`;
          const username = (row.username || name.toLowerCase().replace(/[^a-z0-9]/g, '') || `user_${id.toLowerCase()}`).trim();
          const password = row.password || 'user123';

          const newEmp = { id, name, username, role, department, contact, phone, joiningDate, documents: [], leaveBalance: 15, salary };
          await db.put('employees', newEmp);
          await sync.queueOperation('employees', 'insert', newEmp);

          const newUser = { username, password, role, status: 'Active', employeeId: id };
          await db.put('users', newUser);
          await sync.queueOperation('users', 'insert', newUser);

          count++;
        }
        if (count > 0) {
          app.showToast('Import Successful', `Imported ${count} employee records with login accounts.`, 'success');
          await renderActiveHRTab();
        } else {
          app.showToast('Import Warning', 'No valid records found in CSV file.', 'warning');
        }
        e.target.value = '';
      },
      error: (err) => {
        app.showToast('Import Error', err.message || 'Failed to parse CSV.', 'danger');
      }
    });
  });

  // Batch delete logic
  const updateBatchDeleteEmpUI = () => {
    const checkboxes = document.querySelectorAll('.emp-select-checkbox');
    const checked = Array.from(checkboxes).filter(cb => cb.checked);
    const selectAll = document.getElementById('select-all-employees');
    const batchBtn = document.getElementById('batch-delete-employees-btn');
    const batchText = document.getElementById('batch-delete-emp-text');

    if (selectAll) {
      selectAll.checked = checkboxes.length > 0 && checked.length === checkboxes.length;
    }

    if (batchBtn && batchText) {
      if (checked.length > 0) {
        batchBtn.classList.remove('hidden');
        batchText.textContent = `Remove Selected (${checked.length})`;
      } else {
        batchBtn.classList.add('hidden');
      }
    }
  };

  document.getElementById('select-all-employees')?.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    document.querySelectorAll('.emp-select-checkbox').forEach(cb => { cb.checked = isChecked; });
    updateBatchDeleteEmpUI();
  });

  document.getElementById('employees-list-body')?.addEventListener('change', (e) => {
    if (e.target.classList.contains('emp-select-checkbox')) {
      updateBatchDeleteEmpUI();
    }
  });

  document.getElementById('batch-delete-employees-btn')?.addEventListener('click', async () => {
    const checkedBoxes = document.querySelectorAll('.emp-select-checkbox:checked');
    const ids = Array.from(checkedBoxes).map(cb => cb.getAttribute('data-id'));
    if (ids.length === 0) return;

    if (confirm(`Are you sure you want to remove ${ids.length} selected employee records?`)) {
      for (const id of ids) {
        await db.delete('employees', id);
        await sync.queueOperation('employees', 'delete', id);
      }
      app.showToast('Employees Deleted', `Removed ${ids.length} employee records.`, 'success');
      await renderActiveHRTab();
    }
  });

  lucide.createIcons();
}

/**
 * Open Modal to Edit Employee Record and Credentials
 */
async function openEditEmployeeModal(emp) {
  const user = await getEmployeeUserAccount(emp);

  const formHTML = `
    <form id="edit-employee-form" class="login-form" style="padding:0; display:flex; flex-direction:column; gap:14px;">
      <div class="input-group" style="margin-bottom:0;">
        <label>Full Name <span style="color:var(--danger); font-size:11px;">*required</span></label>
        <input type="text" id="edit-emp-name" class="form-control-noicon" required value="${emp.name || ''}">
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
        <div class="input-group" style="margin-bottom:0;">
          <label>Email Address</label>
          <input type="email" id="edit-emp-email" class="form-control-noicon" value="${emp.contact || ''}">
        </div>
        <div class="input-group" style="margin-bottom:0;">
          <label>Mobile / Phone Number</label>
          <input type="text" id="edit-emp-phone" class="form-control-noicon" value="${emp.phone || ''}">
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
        <div class="input-group" style="margin-bottom:0;">
          <label>Designation Role</label>
          <input type="text" id="edit-emp-role" class="form-control-noicon" value="${emp.role || 'Employee'}">
        </div>
        <div class="input-group" style="margin-bottom:0;">
          <label>Department</label>
          <select id="edit-emp-dept" class="form-control-noicon">
            <option value="Operations" ${emp.department === 'Operations' ? 'selected' : ''}>Operations</option>
            <option value="Logistics" ${emp.department === 'Logistics' ? 'selected' : ''}>Logistics</option>
            <option value="Human Resources" ${emp.department === 'Human Resources' ? 'selected' : ''}>Human Resources</option>
            <option value="Projects & Engineering" ${emp.department === 'Projects & Engineering' ? 'selected' : ''}>Projects & Engineering</option>
            <option value="Accounts & Sales" ${emp.department === 'Accounts & Sales' ? 'selected' : ''}>Accounts & Sales</option>
          </select>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
        <div class="input-group" style="margin-bottom:0;">
          <label>Joining Date</label>
          <input type="date" id="edit-emp-join" class="form-control-noicon" value="${emp.joiningDate || ''}">
        </div>
        <div class="input-group" style="margin-bottom:0;">
          <label>Monthly Salary (₹)</label>
          <input type="number" id="edit-emp-salary" class="form-control-noicon" value="${emp.salary || 0}">
        </div>
      </div>

      <!-- System Login Credentials Section -->
      <div style="background:rgba(0,0,0,0.15); padding:14px; border-radius:6px; border:1px solid var(--glass-border); display:flex; flex-direction:column; gap:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:12px; font-weight:700; color:var(--primary-color); text-transform:uppercase; display:flex; align-items:center; gap:6px;">
            <i data-lucide="key-round" style="width:14px; height:14px;"></i>
            System Username & Password
          </span>
          <span class="muted-text" style="font-size:11px;">Operator Login Account</span>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
          <div class="input-group" style="margin-bottom:0;">
            <label>Login Username *</label>
            <input type="text" id="edit-emp-username" class="form-control-noicon" required value="${user.username}" style="font-family:monospace; font-weight:600;">
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Login Password *</label>
            <div style="display:flex; gap:6px;">
              <input type="password" id="edit-emp-password" class="form-control-noicon" required value="${user.password}" style="font-family:monospace; flex:1;">
              <button type="button" id="edit-pwd-toggle-btn" class="btn btn-secondary" style="padding:4px 8px;" title="Show/Hide Password">
                <i data-lucide="eye" style="width:14px; height:14px;"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:8px;">
        <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary" style="font-weight:700;">Save Profile & Credentials</button>
      </div>
    </form>
  `;

  app.openModal(`Edit Profile: ${emp.name}`, formHTML, '620px');

  // Password toggle
  document.getElementById('edit-pwd-toggle-btn')?.addEventListener('click', () => {
    const pwdInp = document.getElementById('edit-emp-password');
    if (pwdInp) {
      pwdInp.type = pwdInp.type === 'password' ? 'text' : 'password';
    }
  });

  document.getElementById('edit-employee-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    emp.name = document.getElementById('edit-emp-name').value.trim();
    emp.contact = document.getElementById('edit-emp-email').value.trim();
    emp.phone = document.getElementById('edit-emp-phone').value.trim();
    emp.role = document.getElementById('edit-emp-role').value.trim() || 'Employee';
    emp.department = document.getElementById('edit-emp-dept').value || 'Operations';
    emp.joiningDate = document.getElementById('edit-emp-join').value || '';
    emp.salary = parseFloat(document.getElementById('edit-emp-salary').value) || 0;

    const newUsername = document.getElementById('edit-emp-username').value.trim().toLowerCase();
    const newPassword = document.getElementById('edit-emp-password').value.trim();

    if (!newUsername || !newPassword) {
      app.showToast('Validation Error', 'Username and Password cannot be empty.', 'danger');
      return;
    }

    // Handle username changes
    const oldUsername = user.username;
    if (newUsername !== oldUsername) {
      const existingUser = await db.get('users', newUsername);
      if (existingUser && existingUser.username !== oldUsername) {
        app.showToast('Username Taken', `The username "${newUsername}" is already in use by another user.`, 'warning');
        return;
      }

      await db.delete('users', oldUsername);
      await sync.queueOperation('users', 'delete', oldUsername);
    }

    // Save updated user record
    const updatedUser = {
      username: newUsername,
      password: newPassword,
      role: emp.role || 'Employee',
      status: user.status || 'Active',
      employeeId: emp.id
    };
    await db.put('users', updatedUser);
    await sync.queueOperation('users', 'update', updatedUser);

    emp.username = newUsername;
    await db.put('employees', emp);
    await sync.queueOperation('employees', 'update', emp);

    app.closeModal();
    app.showToast('Profile & Credentials Saved', `Updated ${emp.name} with username "${newUsername}".`, 'success');
    await renderActiveHRTab();
  });

  lucide.createIcons();
}

/**
 * Detailed Employee Profile viewer Modal containing sub-tabs
 */
async function openEmployeeProfileModal(emp) {
  emp.documents = emp.documents || [];
  const user = await getEmployeeUserAccount(emp);

  let activeProfileTab = 'info';

  const generateModalHTML = () => `
    <div style="display:flex; flex-direction:column; gap:18px;">
      <!-- Profile Card Summary -->
      <div style="display:flex; align-items:center; gap:16px; justify-content:space-between; flex-wrap:wrap; border-bottom:1px solid var(--glass-border); padding-bottom:14px;">
        <div style="display:flex; align-items:center; gap:16px;">
          <div style="width:60px; height:60px; border-radius:50%; background:var(--primary-color); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:22px;">
            ${(emp.name || 'E').substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 style="font-size:18px; font-family:var(--font-heading); font-weight:800; margin:0 0 4px 0;">${emp.name}</h2>
            <span class="badge primary">${emp.department || 'Operations'}</span>
            <span class="badge secondary" style="margin-left:4px;">${emp.role || 'Employee'}</span>
            <span class="muted-text" style="font-size:11.5px; margin-left:8px;">ID: <code>${emp.id}</code></span>
          </div>
        </div>
        <button id="modal-edit-emp-btn" class="btn btn-primary" style="padding:6px 14px; font-size:12px; display:flex; align-items:center; gap:6px;">
          <i data-lucide="edit"></i> Edit Profile
        </button>
      </div>

      <!-- Nested modal profile tabs -->
      <div style="display:flex; gap:6px; border-bottom:1px solid var(--glass-border); padding-bottom:6px; flex-wrap:wrap;">
        <button class="tab-btn modal-prof-tab ${activeProfileTab === 'info' ? 'active' : ''}" data-ptab="info" style="padding:5px 12px; font-size:12px;">General Info</button>
        <button class="tab-btn modal-prof-tab ${activeProfileTab === 'credentials' ? 'active' : ''}" data-ptab="credentials" style="padding:5px 12px; font-size:12px;">Login Account</button>
        <button class="tab-btn modal-prof-tab ${activeProfileTab === 'attendance' ? 'active' : ''}" data-ptab="attendance" style="padding:5px 12px; font-size:12px;">Attendance History</button>
        <button class="tab-btn modal-prof-tab ${activeProfileTab === 'leaves' ? 'active' : ''}" data-ptab="leaves" style="padding:5px 12px; font-size:12px;">Advances Taken</button>
        <button class="tab-btn modal-prof-tab ${activeProfileTab === 'documents' ? 'active' : ''}" data-ptab="documents" style="padding:5px 12px; font-size:12px;">Documents (${emp.documents.length})</button>
      </div>

      <!-- Nested tab contents -->
      <div id="modal-profile-tab-viewport" style="min-height:220px;">
        <!-- Rendered dynamically -->
      </div>
    </div>
  `;

  app.openModal(`Employee Dossier: ${emp.name}`, generateModalHTML(), '680px');

  const updateProfileTabRender = async () => {
    const modalViewport = document.getElementById('modal-profile-tab-viewport');
    if (!modalViewport) return;

    const advances = await db.getAll('leaves');
    const empAdvances = advances.filter(a => a.employeeId === emp.id);
    const outstandingSum = empAdvances.filter(a => a.status === 'Outstanding').reduce((sum, a) => sum + parseFloat(a.amount || 0), 0);

    if (activeProfileTab === 'info') {
      modalViewport.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; font-size:12.5px;">
          <div class="info-field-item"><label>ID Number</label><span>${emp.id}</span></div>
          <div class="info-field-item"><label>Email Contact</label><span>${emp.contact || 'N/A'}</span></div>
          <div class="info-field-item"><label>Mobile Phone</label><span>${emp.phone || 'N/A'}</span></div>
          <div class="info-field-item"><label>Joining Date</label><span>${emp.joiningDate || 'N/A'}</span></div>
          <div class="info-field-item"><label>Assigned Role</label><span>${emp.role || 'Employee'}</span></div>
          <div class="info-field-item"><label>Base Monthly Salary</label><span style="font-weight:700;">₹${Number(emp.salary || 0).toLocaleString()}</span></div>
          <div class="info-field-item"><label>Outstanding Advance</label><span class="danger-text" style="font-weight:700;">₹${outstandingSum.toLocaleString()}</span></div>
          <div class="info-field-item"><label>System Username</label><span><code>${user.username}</code></span></div>
        </div>
      `;
    } else if (activeProfileTab === 'credentials') {
      modalViewport.innerHTML = `
        <div style="background:rgba(0,0,0,0.12); padding:16px; border-radius:6px; border:1px solid var(--glass-border); display:flex; flex-direction:column; gap:14px;">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; font-size:12.5px;">
            <div class="info-field-item">
              <label>System Username</label>
              <span style="font-family:monospace; font-weight:700; font-size:13px; color:var(--primary-color);">${user.username}</span>
            </div>
            <div class="info-field-item">
              <label>Current Password</label>
              <div style="display:flex; align-items:center; gap:8px;">
                <span id="prof-pwd-display" style="font-family:monospace; font-weight:700;">••••••••</span>
                <button type="button" id="prof-pwd-reveal-btn" class="btn btn-secondary" style="padding:2px 8px; font-size:11px;">Show</button>
              </div>
            </div>
            <div class="info-field-item">
              <label>Account Role</label>
              <span><span class="badge primary">${user.role || emp.role}</span></span>
            </div>
            <div class="info-field-item">
              <label>Account Status</label>
              <span><span class="badge ${user.status === 'Active' ? 'success' : 'danger'}">${user.status || 'Active'}</span></span>
            </div>
          </div>

          <div style="border-top:1px dashed var(--glass-border); padding-top:12px; display:flex; justify-content:flex-end;">
            <button type="button" id="prof-quick-edit-creds-btn" class="btn btn-primary" style="font-size:12px; padding:6px 14px;">
              <i data-lucide="edit"></i> Change Username / Password
            </button>
          </div>
        </div>
      `;
      lucide.createIcons();

      let revealed = false;
      document.getElementById('prof-pwd-reveal-btn')?.addEventListener('click', () => {
        revealed = !revealed;
        const disp = document.getElementById('prof-pwd-display');
        const btn = document.getElementById('prof-pwd-reveal-btn');
        if (disp && btn) {
          disp.textContent = revealed ? user.password : '••••••••';
          btn.textContent = revealed ? 'Hide' : 'Show';
        }
      });

      document.getElementById('prof-quick-edit-creds-btn')?.addEventListener('click', () => {
        openEditEmployeeModal(emp);
      });
    } else if (activeProfileTab === 'attendance') {
      modalViewport.innerHTML = `<div id="employee-calendar-widget" style="padding: 6px 0;"></div>`;
      const calendarContainer = document.getElementById('employee-calendar-widget');
      const now = new Date();
      renderEmployeeMonthlyCalendar(emp, calendarContainer, now.getFullYear(), now.getMonth());
    } else if (activeProfileTab === 'leaves') {
      modalViewport.innerHTML = `
        <div style="margin-bottom:10px; font-weight:600; font-size:12.5px;">Total Outstanding Advance: <span class="danger-text">₹${outstandingSum.toLocaleString()}</span></div>
        <div class="table-responsive" style="max-height:200px; overflow-y:auto;">
          <table class="custom-table" style="font-size:12px;">
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Purpose</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${empAdvances.length > 0 ? empAdvances.map(a => `
                <tr>
                  <td><code>${a.date}</code></td>
                  <td><strong>₹${parseFloat(a.amount || 0).toLocaleString()}</strong></td>
                  <td>${a.purpose || 'N/A'}</td>
                  <td><span class="badge ${a.status === 'Outstanding' ? 'warning' : 'success'}">${a.status}</span></td>
                </tr>
              `).join('') : '<tr><td colspan="4" class="text-center muted-text" style="padding:16px;">No advance records in database.</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    } else if (activeProfileTab === 'documents') {
      modalViewport.innerHTML = `
        <div class="documents-list">
          ${(emp.documents || []).map(doc => `
            <div class="document-item" style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:rgba(0,0,0,0.1); border-radius:6px; margin-bottom:8px;">
              <span style="display:flex; align-items:center; gap:8px; font-size:12.5px;">
                <i data-lucide="file-text" style="width:16px; height:16px; color:var(--primary-color);"></i>
                <strong>${doc.name}</strong>
              </span>
              <span class="badge secondary" style="font-size:10px;">Stored Locally</span>
            </div>
          `).join('')}

          <div style="border:1px dashed var(--glass-border); padding:16px; border-radius:8px; text-align:center; margin-top:8px;">
            <i data-lucide="upload-cloud" style="width:28px; height:28px; color:var(--text-muted); margin-bottom:6px;"></i>
            <p style="font-size:12px; margin:0 0 8px;" class="muted-text">Upload verification or credential documents</p>
            <input type="file" id="document-upload-mock" style="display:none;">
            <button class="btn btn-secondary" style="padding:5px 14px; font-size:11.5px;" onclick="document.getElementById('document-upload-mock').click()">Browse Document</button>
          </div>
        </div>
      `;
      lucide.createIcons();

      document.getElementById('document-upload-mock')?.addEventListener('change', async (e) => {
        if (e.target.files.length > 0) {
          const fileName = e.target.files[0].name;
          emp.documents.push({ name: fileName });
          await db.put('employees', emp);
          await sync.queueOperation('employees', 'update', emp);
          app.showToast('Document Uploaded', `Attached file: ${fileName}`, 'success');
          updateProfileTabRender();
        }
      });
    }
    lucide.createIcons();
  };

  updateProfileTabRender();

  // Tab triggering
  document.querySelectorAll('.modal-prof-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal-prof-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeProfileTab = btn.getAttribute('data-ptab');
      updateProfileTabRender();
    });
  });

  // Direct Edit button from inside modal
  document.getElementById('modal-edit-emp-btn')?.addEventListener('click', () => {
    openEditEmployeeModal(emp);
  });

  lucide.createIcons();
}

/**
 * ==========================================================================
 * Tab 2: Daily Attendance Register (Interactive Live Marking)
 * ==========================================================================
 */
async function renderAttendanceTab(container) {
  const employees = await db.getAll('employees');
  const allAttendance = await db.getAll('attendance');

  // Filter attendance records for selectedDate
  const dateAttendance = allAttendance.filter(a => a.date === selectedAttendanceDate);
  const attendanceMap = new Map();
  dateAttendance.forEach(a => attendanceMap.set(a.employeeId, a));

  // Compute live statistics for selected date
  let presentCount = 0;
  let halfDayCount = 0;
  let absentCount = 0;
  let leaveCount = 0;

  employees.forEach(emp => {
    const att = attendanceMap.get(emp.id);
    if (att && att.status) {
      if (att.status === 'Present') presentCount++;
      else if (att.status === 'Half Day') halfDayCount++;
      else if (att.status === 'Absent') absentCount++;
      else if (att.status === 'Leave') leaveCount++;
    }
  });

  const totalEmployees = employees.length;
  const attendancePct = totalEmployees > 0 ? Math.round(((presentCount + (halfDayCount * 0.5)) / totalEmployees) * 100) : 0;

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:20px;">
      <!-- Date Bar & Fast Actions -->
      <div class="glass-card" style="padding:16px 20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <!-- Left: Date Selector & Quick Toggles -->
        <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
          <div style="display:flex; align-items:center; gap:6px;">
            <i data-lucide="calendar" style="width:18px; height:18px; color:var(--primary-color);"></i>
            <span style="font-size:13px; font-weight:700;">Date:</span>
            <input type="date" id="attendance-date-picker" class="form-control-noicon" value="${selectedAttendanceDate}" style="padding:6px 10px; font-size:12.5px; font-weight:600; width:150px;">
          </div>

          <button id="att-btn-today" class="btn btn-secondary" style="padding:6px 12px; font-size:12px;">Today</button>
          <button id="att-btn-yesterday" class="btn btn-secondary" style="padding:6px 12px; font-size:12px;">Yesterday</button>
        </div>

        <!-- Right: Bulk Actions -->
        <div style="display:flex; align-items:center; gap:10px;">
          <button id="att-mark-all-present" class="btn btn-success" style="padding:7px 16px; font-size:12px; font-weight:700; display:flex; align-items:center; gap:6px;">
            <i data-lucide="check-check"></i>
            <span>Mark All Present</span>
          </button>
          <button id="att-reset-all" class="btn btn-secondary" style="padding:7px 12px; font-size:12px; color:var(--danger); border:none;" title="Clear records for this date">
            <i data-lucide="rotate-ccw"></i>
          </button>
        </div>
      </div>

      <!-- KPI Statistics Cards -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:14px;">
        <div class="kpi-card glass-card" style="padding:14px; text-align:center;">
          <span class="muted-text" style="font-size:11px; text-transform:uppercase; font-weight:700;">Total Staff</span>
          <div style="font-size:22px; font-weight:800; color:var(--text-primary); margin-top:2px;">${totalEmployees}</div>
        </div>
        <div class="kpi-card glass-card" style="padding:14px; text-align:center; border-bottom:3px solid #22c55e;">
          <span class="muted-text" style="font-size:11px; text-transform:uppercase; font-weight:700; color:#22c55e;">Present</span>
          <div style="font-size:22px; font-weight:800; color:#22c55e; margin-top:2px;">${presentCount}</div>
        </div>
        <div class="kpi-card glass-card" style="padding:14px; text-align:center; border-bottom:3px solid #eab308;">
          <span class="muted-text" style="font-size:11px; text-transform:uppercase; font-weight:700; color:#eab308;">Half Day</span>
          <div style="font-size:22px; font-weight:800; color:#eab308; margin-top:2px;">${halfDayCount}</div>
        </div>
        <div class="kpi-card glass-card" style="padding:14px; text-align:center; border-bottom:3px solid #ef4444;">
          <span class="muted-text" style="font-size:11px; text-transform:uppercase; font-weight:700; color:#ef4444;">Absent</span>
          <div style="font-size:22px; font-weight:800; color:#ef4444; margin-top:2px;">${absentCount}</div>
        </div>
        <div class="kpi-card glass-card" style="padding:14px; text-align:center; border-bottom:3px solid #3b82f6;">
          <span class="muted-text" style="font-size:11px; text-transform:uppercase; font-weight:700; color:#3b82f6;">On Leave</span>
          <div style="font-size:22px; font-weight:800; color:#3b82f6; margin-top:2px;">${leaveCount}</div>
        </div>
        <div class="kpi-card glass-card" style="padding:14px; text-align:center;">
          <span class="muted-text" style="font-size:11px; text-transform:uppercase; font-weight:700;">Attendance %</span>
          <div style="font-size:22px; font-weight:800; color:var(--primary-color); margin-top:2px;">${attendancePct}%</div>
        </div>
      </div>

      <!-- Attendance Register Table -->
      <div class="glass-card" style="padding:20px; display:flex; flex-direction:column; gap:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div class="search-input-wrapper" style="min-width:260px;">
            <i data-lucide="search"></i>
            <input type="text" id="att-emp-search" placeholder="Search employee in register..." class="form-control" style="padding-top:7px; padding-bottom:7px; font-size:12px;">
          </div>

          <div style="font-size:12px; color:var(--text-secondary);">
            Click <strong>P</strong>, <strong>H</strong>, <strong>A</strong>, or <strong>L</strong> to mark attendance instantly.
          </div>
        </div>

        <div class="table-responsive">
          <table class="custom-table" id="attendance-register-table" style="font-size:12.5px;">
            <thead>
              <tr>
                <th style="width:36px; text-align:center;">#</th>
                <th>Employee Name</th>
                <th>Department</th>
                <th style="width:130px;">Check-In</th>
                <th style="width:130px;">Check-Out</th>
                <th style="width:120px; text-align:center;">Current Status</th>
                <th style="width:230px; text-align:center;">Quick Mark Attendance</th>
              </tr>
            </thead>
            <tbody id="attendance-register-tbody">
              ${employees.map((emp, idx) => {
                const att = attendanceMap.get(emp.id) || { status: 'Not Recorded', checkIn: '', checkOut: '' };
                const curStatus = att.status || 'Not Recorded';

                let badgeClass = 'secondary';
                if (curStatus === 'Present') badgeClass = 'success';
                else if (curStatus === 'Half Day') badgeClass = 'warning';
                else if (curStatus === 'Absent') badgeClass = 'danger';
                else if (curStatus === 'Leave') badgeClass = 'primary';

                return `
                  <tr data-emp-id="${emp.id}">
                    <td style="text-align:center; font-weight:700; color:var(--text-muted);">${idx + 1}</td>
                    <td>
                      <div style="font-weight:700; color:var(--text-primary);">${emp.name}</div>
                      <span class="muted-text" style="font-size:11px;"><code>${emp.id}</code> • ${emp.role || 'Employee'}</span>
                    </td>
                    <td><span class="badge primary">${emp.department || 'Operations'}</span></td>
                    <td>
                      <input type="time" class="form-control-noicon att-in-time" data-emp-id="${emp.id}" value="${att.checkIn || ''}" style="padding:4px 6px; font-size:11.5px; width:110px;" />
                    </td>
                    <td>
                      <input type="time" class="form-control-noicon att-out-time" data-emp-id="${emp.id}" value="${att.checkOut || ''}" style="padding:4px 6px; font-size:11.5px; width:110px;" />
                    </td>
                    <td style="text-align:center;">
                      <span class="badge ${badgeClass}" style="font-size:11px; padding:4px 8px;" id="att-badge-${emp.id}">
                        ${curStatus}
                      </span>
                    </td>
                    <td style="text-align:center;">
                      <div style="display:flex; justify-content:center; gap:4px;">
                        <button type="button" class="btn att-mark-btn ${curStatus === 'Present' ? 'btn-success' : 'btn-secondary'}" data-emp-id="${emp.id}" data-status="Present" title="Mark Present" style="padding:4px 10px; font-size:11px; font-weight:700;">
                          P
                        </button>
                        <button type="button" class="btn att-mark-btn ${curStatus === 'Half Day' ? 'btn-warning' : 'btn-secondary'}" data-emp-id="${emp.id}" data-status="Half Day" title="Mark Half Day" style="padding:4px 10px; font-size:11px; font-weight:700;">
                          H
                        </button>
                        <button type="button" class="btn att-mark-btn ${curStatus === 'Absent' ? 'btn-danger' : 'btn-secondary'}" data-emp-id="${emp.id}" data-status="Absent" title="Mark Absent" style="padding:4px 10px; font-size:11px; font-weight:700;">
                          A
                        </button>
                        <button type="button" class="btn att-mark-btn ${curStatus === 'Leave' ? 'btn-primary' : 'btn-secondary'}" data-emp-id="${emp.id}" data-status="Leave" title="Mark On Leave" style="padding:4px 10px; font-size:11px; font-weight:700;">
                          L
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Search Filter in Register
  document.getElementById('att-emp-search')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#attendance-register-tbody tr').forEach(row => {
      const txt = row.innerText.toLowerCase();
      if (txt.includes(q)) {
        row.classList.remove('hidden');
      } else {
        row.classList.add('hidden');
      }
    });
  });

  // Date picker listener
  document.getElementById('attendance-date-picker')?.addEventListener('change', async (e) => {
    selectedAttendanceDate = e.target.value;
    await renderActiveHRTab();
  });

  // Today button
  document.getElementById('att-btn-today')?.addEventListener('click', async () => {
    selectedAttendanceDate = getTodayDateStr();
    await renderActiveHRTab();
  });

  // Yesterday button
  document.getElementById('att-btn-yesterday')?.addEventListener('click', async () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    selectedAttendanceDate = `${year}-${month}-${day}`;
    await renderActiveHRTab();
  });

  // Save / Update Attendance Function
  const saveAttendanceStatus = async (empId, status) => {
    const clockId = `att-${empId}-${selectedAttendanceDate}`;
    let inTime = container.querySelector(`.att-in-time[data-emp-id="${empId}"]`)?.value || '';
    let outTime = container.querySelector(`.att-out-time[data-emp-id="${empId}"]`)?.value || '';

    if (status === 'Present' && !inTime) {
      inTime = '09:00';
      const inInp = container.querySelector(`.att-in-time[data-emp-id="${empId}"]`);
      if (inInp) inInp.value = '09:00';
    }

    const record = {
      id: clockId,
      employeeId: empId,
      date: selectedAttendanceDate,
      checkIn: inTime,
      checkOut: outTime,
      status: status
    };

    await db.put('attendance', record);
    await sync.queueOperation('attendance', 'update', record);

    const badge = document.getElementById(`att-badge-${empId}`);
    if (badge) {
      badge.textContent = status;
      let badgeClass = 'secondary';
      if (status === 'Present') badgeClass = 'success';
      else if (status === 'Half Day') badgeClass = 'warning';
      else if (status === 'Absent') badgeClass = 'danger';
      else if (status === 'Leave') badgeClass = 'primary';
      badge.className = `badge ${badgeClass}`;
    }

    const row = container.querySelector(`tr[data-emp-id="${empId}"]`);
    if (row) {
      row.querySelectorAll('.att-mark-btn').forEach(b => {
        const bStat = b.getAttribute('data-status');
        b.className = 'btn att-mark-btn btn-secondary';
        if (bStat === status) {
          if (status === 'Present') b.className = 'btn att-mark-btn btn-success';
          else if (status === 'Half Day') b.className = 'btn att-mark-btn btn-warning';
          else if (status === 'Absent') b.className = 'btn att-mark-btn btn-danger';
          else if (status === 'Leave') b.className = 'btn att-mark-btn btn-primary';
        }
      });
    }

    app.showToast('Attendance Marked', `Marked as ${status} on ${selectedAttendanceDate}.`, 'success', 2000);
  };

  // Quick mark buttons
  container.querySelectorAll('.att-mark-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const empId = btn.getAttribute('data-emp-id');
      const status = btn.getAttribute('data-status');
      await saveAttendanceStatus(empId, status);
      await renderActiveHRTab();
    });
  });

  // Time input change listeners
  container.querySelectorAll('.att-in-time, .att-out-time').forEach(inp => {
    inp.addEventListener('change', async () => {
      const empId = inp.getAttribute('data-emp-id');
      const clockId = `att-${empId}-${selectedAttendanceDate}`;
      const existing = await db.get('attendance', clockId) || {
        id: clockId,
        employeeId: empId,
        date: selectedAttendanceDate,
        status: 'Present'
      };

      existing.checkIn = container.querySelector(`.att-in-time[data-emp-id="${empId}"]`)?.value || '';
      existing.checkOut = container.querySelector(`.att-out-time[data-emp-id="${empId}"]`)?.value || '';

      await db.put('attendance', existing);
      await sync.queueOperation('attendance', 'update', existing);
      app.showToast('Time Recorded', `Updated shift times for ${empId}.`, 'info', 1500);
    });
  });

  // Mark All Present Button
  document.getElementById('att-mark-all-present')?.addEventListener('click', async () => {
    for (const emp of employees) {
      const clockId = `att-${emp.id}-${selectedAttendanceDate}`;
      const existing = await db.get('attendance', clockId) || {};
      const record = {
        id: clockId,
        employeeId: emp.id,
        date: selectedAttendanceDate,
        checkIn: existing.checkIn || '09:00',
        checkOut: existing.checkOut || '18:00',
        status: 'Present'
      };
      await db.put('attendance', record);
      await sync.queueOperation('attendance', 'update', record);
    }
    app.showToast('Attendance Registered', `All ${employees.length} employees marked Present on ${selectedAttendanceDate}.`, 'success');
    await renderActiveHRTab();
  });

  // Reset All Button
  document.getElementById('att-reset-all')?.addEventListener('click', async () => {
    if (confirm(`Clear all attendance records for ${selectedAttendanceDate}?`)) {
      for (const emp of employees) {
        const clockId = `att-${emp.id}-${selectedAttendanceDate}`;
        await db.delete('attendance', clockId);
        await sync.queueOperation('attendance', 'delete', clockId);
      }
      app.showToast('Attendance Reset', `Cleared records for ${selectedAttendanceDate}.`, 'info');
      await renderActiveHRTab();
    }
  });

  lucide.createIcons();
}

/**
 * Monthly attendance calendar widget
 */
async function renderEmployeeMonthlyCalendar(emp, container, year, month) {
  const attendance = await db.getAll('attendance');
  const empAtt = attendance.filter(a => a.employeeId === emp.id);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  let absentCount = 0;
  let halfDayCount = 0;
  let presentCount = 0;
  let leaveCount = 0;

  let calendarDaysHTML = '';
  
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDaysHTML += `<div style="padding:10px; border:1px solid var(--glass-border); opacity:0.15;"></div>`;
  }

  for (let day = 1; day <= totalDays; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const record = empAtt.find(a => a.date === dateStr);
    
    let status = 'Unrecorded';
    let bg = 'rgba(255,255,255,0.02)';
    let color = 'var(--text-muted)';
    let shortLabel = '—';

    if (record) {
      status = record.status;
      if (status === 'Present') {
        bg = 'rgba(34,197,94,0.15)';
        color = '#22c55e';
        shortLabel = 'P';
        presentCount++;
      } else if (status === 'Absent') {
        bg = 'rgba(239,68,68,0.15)';
        color = '#ef4444';
        shortLabel = 'A';
        absentCount++;
      } else if (status === 'Half Day') {
        bg = 'rgba(234,179,8,0.15)';
        color = '#eab308';
        shortLabel = 'H';
        halfDayCount++;
      } else if (status === 'Leave') {
        bg = 'rgba(59,130,246,0.15)';
        color = '#3b82f6';
        shortLabel = 'L';
        leaveCount++;
      }
    }

    calendarDaysHTML += `
      <div style="padding:6px 4px; border:1px solid var(--glass-border); background:${bg}; border-radius:4px; display:flex; flex-direction:column; align-items:center; gap:2px; min-height:42px; justify-content:center;">
        <span style="font-size:10px; font-weight:700; color:var(--text-primary);">${day}</span>
        <span style="font-size:10px; font-weight:800; color:${color};" title="${status}">${shortLabel}</span>
      </div>
    `;
  }

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:14px;">
      <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.15); padding:8px 12px; border-radius:6px; border:1px solid var(--glass-border);">
        <button id="cal-prev-month" class="btn btn-secondary" style="padding:4px 10px; font-size:11px;">&lt; Prev</button>
        <strong style="font-size:13px; font-family:var(--font-heading);">${monthNames[month]} ${year}</strong>
        <button id="cal-next-month" class="btn btn-secondary" style="padding:4px 10px; font-size:11px;">Next &gt;</button>
      </div>

      <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:8px; text-align:center;">
        <div style="padding:6px; background:rgba(34,197,94,0.08); border-left:3px solid #22c55e; border-radius:4px;">
          <span class="muted-text" style="font-size:9.5px; text-transform:uppercase;">Present</span>
          <h4 style="margin:2px 0 0 0; color:#22c55e; font-size:14px;">${presentCount}</h4>
        </div>
        <div style="padding:6px; background:rgba(234,179,8,0.08); border-left:3px solid #eab308; border-radius:4px;">
          <span class="muted-text" style="font-size:9.5px; text-transform:uppercase;">Half Day</span>
          <h4 style="margin:2px 0 0 0; color:#eab308; font-size:14px;">${halfDayCount}</h4>
        </div>
        <div style="padding:6px; background:rgba(239,68,68,0.08); border-left:3px solid #ef4444; border-radius:4px;">
          <span class="muted-text" style="font-size:9.5px; text-transform:uppercase;">Absent</span>
          <h4 style="margin:2px 0 0 0; color:#ef4444; font-size:14px;">${absentCount}</h4>
        </div>
        <div style="padding:6px; background:rgba(59,130,246,0.08); border-left:3px solid #3b82f6; border-radius:4px;">
          <span class="muted-text" style="font-size:9.5px; text-transform:uppercase;">Leave</span>
          <h4 style="margin:2px 0 0 0; color:#3b82f6; font-size:14px;">${leaveCount}</h4>
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:4px;">
        <div style="display:grid; grid-template-columns:repeat(7, 1fr); text-align:center; font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:4px;">
          <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
        </div>
        <div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:4px;">
          ${calendarDaysHTML}
        </div>
      </div>
    </div>
  `;

  container.querySelector('#cal-prev-month')?.addEventListener('click', () => {
    let nextMonth = month - 1;
    let nextYear = year;
    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear--;
    }
    renderEmployeeMonthlyCalendar(emp, container, nextYear, nextMonth);
  });

  container.querySelector('#cal-next-month')?.addEventListener('click', () => {
    let nextMonth = month + 1;
    let nextYear = year;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear++;
    }
    renderEmployeeMonthlyCalendar(emp, container, nextYear, nextMonth);
  });
}

/**
 * ==========================================================================
 * Tab 3: Staff Usernames & Passwords Manager
 * ==========================================================================
 */
async function renderCredentialsTab(container) {
  const employees = await db.getAll('employees');

  const employeeAccounts = [];
  for (const emp of employees) {
    const user = await getEmployeeUserAccount(emp);
    employeeAccounts.push({ emp, user });
  }

  container.innerHTML = `
    <div class="glass-card" style="display:flex; flex-direction:column; gap:20px; padding:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div>
          <h3 style="font-size:16px; font-family:var(--font-heading); font-weight:700; margin:0 0 4px 0; display:flex; align-items:center; gap:8px;">
            <i data-lucide="shield-check" style="color:var(--primary-color);"></i>
            Staff Usernames & Passwords Manager
          </h3>
          <p class="muted-text" style="font-size:12px; margin:0;">
            Configure system login username and password for each employee profile. Operators use these credentials to sign in.
          </p>
        </div>

        <div class="search-input-wrapper" style="min-width:280px;">
          <i data-lucide="search"></i>
          <input type="text" id="cred-search-inp" placeholder="Search by name, username, or role..." class="form-control" style="padding-top:7px; padding-bottom:7px; font-size:12px;">
        </div>
      </div>

      <div class="table-responsive">
        <table class="custom-table" id="credentials-table" style="font-size:12.5px;">
          <thead>
            <tr>
              <th style="width:36px; text-align:center;">#</th>
              <th>Personnel Profile</th>
              <th style="width:160px;">System Role</th>
              <th style="width:180px;">System Username *</th>
              <th style="width:240px;">Login Password *</th>
              <th style="width:120px;">Account Status</th>
              <th style="width:130px; text-align:center;">Action</th>
            </tr>
          </thead>
          <tbody id="credentials-list-body">
            ${employeeAccounts.length === 0 ? `
              <tr>
                <td colspan="7" class="text-center muted-text" style="padding:40px 0;">
                  No employee profiles found. Register staff in Staff Directory first.
                </td>
              </tr>
            ` : employeeAccounts.map(({ emp, user }, idx) => `
              <tr data-emp-id="${emp.id}" data-current-username="${user.username}">
                <td style="text-align:center; font-weight:700; color:var(--text-muted);">${idx + 1}</td>
                <td>
                  <div style="display:flex; align-items:center; gap:10px;">
                    <div style="width:32px; height:32px; border-radius:50%; background:rgba(0,82,204,0.15); color:var(--primary-color); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:11px;">
                      ${(emp.name || 'E').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <strong style="color:var(--text-primary);">${emp.name}</strong>
                      <span class="muted-text" style="font-size:11px; display:block;"><code>${emp.id}</code> • ${emp.department || 'Operations'}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <select class="form-control-noicon cred-role-select" data-emp-id="${emp.id}" style="padding:5px 8px; font-size:11.5px;">
                    <option value="Employee" ${user.role === 'Employee' ? 'selected' : ''}>Employee</option>
                    <option value="Manager" ${user.role === 'Manager' ? 'selected' : ''}>Manager</option>
                    <option value="Store Keeper" ${user.role === 'Store Keeper' ? 'selected' : ''}>Store Keeper</option>
                    <option value="HR" ${user.role === 'HR' ? 'selected' : ''}>HR Manager</option>
                    <option value="Admin" ${user.role === 'Admin' ? 'selected' : ''}>Administrator</option>
                  </select>
                </td>
                <td>
                  <input type="text" class="form-control-noicon cred-username-inp" data-emp-id="${emp.id}" value="${user.username}" style="padding:5px 8px; font-size:12px; font-family:monospace; font-weight:600;" required />
                </td>
                <td>
                  <div style="display:flex; align-items:center; gap:4px;">
                    <input type="password" class="form-control-noicon cred-password-inp" data-emp-id="${emp.id}" value="${user.password}" style="padding:5px 8px; font-size:12px; font-family:monospace; flex:1;" required />
                    <button type="button" class="btn btn-secondary cred-toggle-pwd-btn" data-emp-id="${emp.id}" title="Show/Hide Password" style="padding:5px 7px;">
                      <i data-lucide="eye" style="width:13px; height:13px;"></i>
                    </button>
                    <button type="button" class="btn btn-secondary cred-gen-pwd-btn" data-emp-id="${emp.id}" title="Auto-generate password" style="padding:5px 7px; font-size:11px;">
                      🎲
                    </button>
                  </div>
                </td>
                <td>
                  <select class="form-control-noicon cred-status-select" data-emp-id="${emp.id}" style="padding:5px 8px; font-size:11.5px;">
                    <option value="Active" ${user.status === 'Active' ? 'selected' : ''}>Active</option>
                    <option value="Inactive" ${user.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                  </select>
                </td>
                <td style="text-align:center;">
                  <button type="button" class="btn btn-primary cred-save-btn" data-emp-id="${emp.id}" style="padding:5px 14px; font-size:11.5px; font-weight:700; display:inline-flex; align-items:center; gap:4px;">
                    <i data-lucide="save" style="width:12px; height:12px;"></i>
                    <span>Save</span>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Search filter
  document.getElementById('cred-search-inp')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#credentials-list-body tr').forEach(row => {
      const txt = row.innerText.toLowerCase();
      const userInp = row.querySelector('.cred-username-inp')?.value.toLowerCase() || '';
      if (txt.includes(q) || userInp.includes(q)) {
        row.classList.remove('hidden');
      } else {
        row.classList.add('hidden');
      }
    });
  });

  // Password toggle buttons
  container.querySelectorAll('.cred-toggle-pwd-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const empId = btn.getAttribute('data-emp-id');
      const inp = container.querySelector(`.cred-password-inp[data-emp-id="${empId}"]`);
      if (inp) {
        inp.type = inp.type === 'password' ? 'text' : 'password';
      }
    });
  });

  // Password auto-generator buttons
  container.querySelectorAll('.cred-gen-pwd-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const empId = btn.getAttribute('data-emp-id');
      const inp = container.querySelector(`.cred-password-inp[data-emp-id="${empId}"]`);
      if (inp) {
        const randNum = Math.floor(1000 + Math.random() * 9000);
        const words = ['Glass', 'Aero', 'Solar', 'Shield', 'Clear', 'Toughened'];
        const word = words[Math.floor(Math.random() * words.length)];
        const generated = `${word}#${randNum}`;
        inp.value = generated;
        inp.type = 'text'; // Show generated password so user can see it
        app.showToast('Generated Password', `Created password: "${generated}". Click Save to apply.`, 'info');
      }
    });
  });

  // Save Credentials button
  container.querySelectorAll('.cred-save-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const empId = btn.getAttribute('data-emp-id');
      const row = container.querySelector(`tr[data-emp-id="${empId}"]`);
      if (!row) return;

      const oldUsername = row.getAttribute('data-current-username');
      const newUsername = row.querySelector('.cred-username-inp')?.value.trim().toLowerCase();
      const newPassword = row.querySelector('.cred-password-inp')?.value.trim();
      const newRole = row.querySelector('.cred-role-select')?.value || 'Employee';
      const newStatus = row.querySelector('.cred-status-select')?.value || 'Active';

      if (!newUsername || !newPassword) {
        app.showToast('Validation Error', 'Username and Password cannot be empty.', 'danger');
        return;
      }

      const emp = await db.get('employees', empId);
      if (!emp) {
        app.showToast('Error', 'Employee profile not found.', 'danger');
        return;
      }

      // Check if username was changed and if it is taken by another account
      if (newUsername !== oldUsername) {
        const existing = await db.get('users', newUsername);
        if (existing && existing.username !== oldUsername) {
          app.showToast('Username Taken', `The username "${newUsername}" is already assigned to another account.`, 'warning');
          return;
        }

        // Delete old user key from store
        await db.delete('users', oldUsername);
        await sync.queueOperation('users', 'delete', oldUsername);
      }

      // Save new user record
      const updatedUser = {
        username: newUsername,
        password: newPassword,
        role: newRole,
        status: newStatus,
        employeeId: emp.id
      };
      await db.put('users', updatedUser);
      await sync.queueOperation('users', 'update', updatedUser);

      // Update employee record
      emp.username = newUsername;
      emp.role = newRole;
      await db.put('employees', emp);
      await sync.queueOperation('employees', 'update', emp);

      row.setAttribute('data-current-username', newUsername);
      app.showToast('Credentials Saved', `Updated credentials for ${emp.name}: Username: "${newUsername}", Password: "${newPassword}".`, 'success', 5000);
    });
  });

  lucide.createIcons();
}

/* ==========================================================================
   Tab 4: Salary Advances Management
   ========================================================================== */
async function renderAdvancesTab(container) {
  const advances = await db.getAll('leaves');
  const employees = await db.getAll('employees');

  const outstandingAdvances = advances.filter(a => a.status === 'Outstanding');
  const settledAdvances = advances.filter(a => a.status === 'Deducted');

  container.innerHTML = `
    <div style="display:grid; grid-template-columns:1fr 2fr; gap:24px;">
      <!-- Record Advance Form -->
      <div class="glass-card" style="display:flex; flex-direction:column; gap:16px; height:fit-content; padding:20px;">
        <h3 style="font-size:15px; font-family:var(--font-heading); font-weight:700; border-bottom:1px solid var(--glass-border); padding-bottom:8px; margin:0;">
          Record Salary Advance
        </h3>
        <form id="record-advance-form" style="display:flex; flex-direction:column; gap:12px;">
          <div class="input-group" style="margin-bottom:0;">
            <label>Employee <span style="color:var(--danger); font-size:11px;">*required</span></label>
            <select id="advance-staff" class="form-control-noicon" required>
              ${employees.map(emp => `<option value="${emp.id}">${emp.name} (ID: ${emp.id})</option>`).join('')}
            </select>
          </div>

          <div class="input-group" style="margin-bottom:0;">
            <label>Advance Amount (₹) <span style="color:var(--danger); font-size:11px;">*required</span></label>
            <input type="number" id="advance-amount" class="form-control-noicon" min="1" placeholder="e.g. 5000" required>
          </div>

          <div class="input-group" style="margin-bottom:0;">
            <label>Date</label>
            <input type="date" id="advance-date" class="form-control-noicon" value="${getTodayDateStr()}">
          </div>

          <div class="input-group" style="margin-bottom:0;">
            <label>Purpose / Description</label>
            <textarea id="advance-purpose" class="form-control-noicon" rows="2" placeholder="State purpose of advance..."></textarea>
          </div>

          <button type="submit" class="btn btn-primary btn-block" style="font-weight:700;">Record Advance</button>
        </form>
      </div>

      <!-- Advances Ledger -->
      <div style="display:flex; flex-direction:column; gap:20px;">
        <div class="search-input-wrapper">
          <i data-lucide="search"></i>
          <input type="text" id="advances-search" placeholder="Search advances by employee name..." class="form-control" style="padding-top:8px; padding-bottom:8px; font-size:12.5px;">
        </div>

        <!-- Outstanding Queue -->
        <div class="glass-card" style="display:flex; flex-direction:column; gap:16px; padding:20px;">
          <h3 style="font-size:15px; font-family:var(--font-heading); font-weight:700; margin:0;">Outstanding Advances</h3>
          <div class="table-responsive">
            <table class="custom-table" style="font-size:12.5px;">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Purpose</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="advances-outstanding-body">
                ${outstandingAdvances.length > 0 ? outstandingAdvances.map(adv => {
                  const emp = employees.find(e => e.id === adv.employeeId);
                  return `
                    <tr>
                      <td><strong>${emp ? emp.name : adv.employeeId}</strong> <span class="muted-text" style="font-size:11px; display:block;">ID: ${adv.employeeId}</span></td>
                      <td><strong class="warning-text">₹${parseFloat(adv.amount || 0).toLocaleString()}</strong></td>
                      <td><code>${adv.date}</code></td>
                      <td><span style="font-size:11px;" class="muted-text">"${adv.purpose || 'N/A'}"</span></td>
                      <td>
                        <button class="btn btn-success advance-deduct-btn" data-id="${adv.id}" style="padding:4px 8px; font-size:11px;">Deduct from Salary</button>
                      </td>
                    </tr>
                  `;
                }).join('') : '<tr><td colspan="5" class="text-center muted-text" style="padding:16px 0;">No outstanding advances.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Settle Ledger History -->
        <div class="glass-card" style="display:flex; flex-direction:column; gap:16px; padding:20px;">
          <h3 style="font-size:15px; font-family:var(--font-heading); font-weight:700; margin:0;">Deducted / Settle History</h3>
          <div class="table-responsive" style="max-height:200px; overflow-y:auto;">
            <table class="custom-table" style="font-size:12px;">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Purpose</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody id="advances-history-body">
                ${settledAdvances.length > 0 ? settledAdvances.map(adv => {
                  const emp = employees.find(e => e.id === adv.employeeId);
                  return `
                    <tr>
                      <td><strong>${emp ? emp.name : adv.employeeId}</strong></td>
                      <td><strong class="success-text">₹${parseFloat(adv.amount || 0).toLocaleString()}</strong></td>
                      <td><code>${adv.date}</code></td>
                      <td><span class="muted-text">${adv.purpose || 'N/A'}</span></td>
                      <td><span class="badge success">Deducted</span></td>
                    </tr>
                  `;
                }).join('') : '<tr><td colspan="5" class="text-center muted-text" style="padding:16px 0;">No settled advances.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  // Search Filter
  const searchInput = document.getElementById('advances-search');
  searchInput?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#advances-outstanding-body tr, #advances-history-body tr').forEach(row => {
      if (row.querySelector('td')?.colSpan > 1) return;
      const txt = row.innerText.toLowerCase();
      if (txt.includes(q)) {
        row.classList.remove('hidden');
      } else {
        row.classList.add('hidden');
      }
    });
  });

  // Record advance form
  document.getElementById('record-advance-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const employeeId = document.getElementById('advance-staff').value;
    const amount = parseFloat(document.getElementById('advance-amount').value);
    const date = document.getElementById('advance-date').value || getTodayDateStr();
    const purpose = document.getElementById('advance-purpose').value.trim();
    const id = `adv-${Date.now()}`;

    const newAdvance = {
      id,
      employeeId,
      amount,
      date,
      purpose,
      status: 'Outstanding'
    };

    await db.put('leaves', newAdvance);
    await sync.queueOperation('leaves', 'insert', newAdvance);

    app.showToast('Advance Recorded', `Recorded ₹${amount.toLocaleString()} advance.`, 'success');
    await renderActiveHRTab();
  });

  // Deduct from salary button
  container.querySelectorAll('.advance-deduct-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const advId = btn.getAttribute('data-id');
      const adv = await db.get('leaves', advId);
      if (adv && confirm(`Mark this advance of ₹${parseFloat(adv.amount || 0).toLocaleString()} as deducted from salary?`)) {
        adv.status = 'Deducted';
        await db.put('leaves', adv);
        await sync.queueOperation('leaves', 'update', adv);

        app.showToast('Advance Settled', 'Advance marked as Deducted.', 'success');
        await renderActiveHRTab();
      }
    });
  });

  lucide.createIcons();
}

/* ==========================================================================
   Tab 5: Departments & Payroll
   ========================================================================== */
async function renderPayrollTab(container) {
  const employees = await db.getAll('employees');
  const advances = await db.getAll('leaves');

  const departments = {};
  employees.forEach(emp => {
    const dName = emp.department || 'Operations';
    if (!departments[dName]) {
      departments[dName] = { name: dName, count: 0, totalSalary: 0 };
    }
    departments[dName].count++;
    departments[dName].totalSalary += parseFloat(emp.salary || 0);
  });

  container.innerHTML = `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px;">
      <!-- Department breakdown -->
      <div class="glass-card" style="display:flex; flex-direction:column; gap:16px; padding:20px;">
        <h3 style="font-size:15px; font-family:var(--font-heading); font-weight:700; border-bottom:1px solid var(--glass-border); padding-bottom:8px; margin:0;">
          Departmental Payroll Breakdown
        </h3>
        <div class="table-responsive">
          <table class="custom-table" style="font-size:12.5px;">
            <thead>
              <tr>
                <th>Department Name</th>
                <th>Staff Count</th>
                <th>Total Monthly Budget</th>
              </tr>
            </thead>
            <tbody>
              ${Object.values(departments).map(dept => `
                <tr>
                  <td><strong>${dept.name}</strong></td>
                  <td>${dept.count} members</td>
                  <td><strong>₹${dept.totalSalary.toLocaleString()}/mo</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Quick Salary Adjuster -->
      <div class="glass-card" style="display:flex; flex-direction:column; gap:16px; padding:20px;">
        <h3 style="font-size:15px; font-family:var(--font-heading); font-weight:700; margin:0;">Quick Salary Adjuster</h3>
        <p class="muted-text" style="font-size:12px; margin:0;">Modify employee salary metrics and deduct outstanding salary advances.</p>

        <div class="search-input-wrapper">
          <i data-lucide="search"></i>
          <input type="text" id="payroll-search" placeholder="Search by employee name..." class="form-control" style="padding-top:7px; padding-bottom:7px; font-size:12px;">
        </div>

        <div class="table-responsive" style="max-height:350px; overflow-y:auto;">
          <table class="custom-table" style="font-size:12.5px;">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Base Salary</th>
                <th>Advance</th>
                <th>Net Payable</th>
                <th style="text-align:center;">Action</th>
              </tr>
            </thead>
            <tbody id="payroll-list-body">
              ${employees.map(emp => {
                const empAdvances = advances.filter(a => a.employeeId === emp.id && a.status === 'Outstanding');
                const outstanding = empAdvances.reduce((sum, a) => sum + parseFloat(a.amount || 0), 0);
                const netSalary = Math.max(0, parseFloat(emp.salary || 0) - outstanding);
                return `
                  <tr>
                    <td><strong>${emp.name}</strong> <span style="font-size:11px;" class="muted-text"><code>${emp.id}</code></span></td>
                    <td>
                      <div style="display:flex; align-items:center; gap:4px;">
                        <span style="font-size:12px; color:var(--text-secondary);">₹</span>
                        <input type="number" id="sal-inp-${emp.id}" value="${emp.salary || 0}" class="form-control-noicon" style="width:85px; padding:4px 6px; font-size:11.5px;">
                      </div>
                    </td>
                    <td><strong class="warning-text">₹${outstanding.toLocaleString()}</strong></td>
                    <td><strong class="success-text">₹${netSalary.toLocaleString()}</strong></td>
                    <td style="text-align:center;">
                      <div style="display:flex; justify-content:center; gap:6px;">
                        <button class="btn btn-primary sal-update-btn" data-id="${emp.id}" style="padding:4px 8px; font-size:11px;">Update</button>
                        ${outstanding > 0 ? `<button class="btn btn-success sal-deduct-adv-btn" data-id="${emp.id}" style="padding:4px 8px; font-size:11px;">Deduct</button>` : ''}
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Search
  document.getElementById('payroll-search')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#payroll-list-body tr').forEach(row => {
      const txt = row.innerText.toLowerCase();
      if (txt.includes(q)) {
        row.classList.remove('hidden');
      } else {
        row.classList.add('hidden');
      }
    });
  });

  // Salary Update
  container.querySelectorAll('.sal-update-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const empId = btn.getAttribute('data-id');
      const nextSal = document.getElementById(`sal-inp-${empId}`)?.value;

      if (!nextSal || parseFloat(nextSal) < 0) {
        app.showToast('Validation Error', 'Salary must be a non-negative amount.', 'danger');
        return;
      }

      const emp = await db.get('employees', empId);
      if (emp) {
        emp.salary = parseFloat(nextSal);
        await db.put('employees', emp);
        await sync.queueOperation('employees', 'update', emp);
        app.showToast('Salary Updated', `Updated salary for ${emp.name} to ₹${emp.salary.toLocaleString()}.`, 'success');
        await renderActiveHRTab();
      }
    });
  });

  // Deduct advance
  container.querySelectorAll('.sal-deduct-adv-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const empId = btn.getAttribute('data-id');
      const emp = await db.get('employees', empId);
      const empAdvances = advances.filter(a => a.employeeId === empId && a.status === 'Outstanding');
      const outstandingSum = empAdvances.reduce((sum, a) => sum + parseFloat(a.amount || 0), 0);

      if (outstandingSum === 0) return;

      if (confirm(`Deduct ₹${outstandingSum.toLocaleString()} outstanding advance from ${emp.name}'s salary?`)) {
        for (const adv of empAdvances) {
          adv.status = 'Deducted';
          await db.put('leaves', adv);
          await sync.queueOperation('leaves', 'update', adv);
        }
        app.showToast('Advance Deducted', `Deducted ₹${outstandingSum.toLocaleString()} from ${emp.name}.`, 'success');
        await renderActiveHRTab();
      }
    });
  });

  lucide.createIcons();
}