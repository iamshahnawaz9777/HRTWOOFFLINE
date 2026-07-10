/* ==========================================================================
   AeroGlass ERP HR Management Module
   ========================================================================== */

import { db } from '../db.js';
import { auth } from '../auth.js';
import { sync } from '../sync.js';

// Resolve circular dependency using a dynamic global window proxy
const app = new Proxy({}, {
  get: (target, prop) => window.app ? window.app[prop] : undefined
});

let activeHRTab = 'directory';
const TODAY_STR = '2026-05-26'; // Mock constant system date
let selectedAttendanceDate = TODAY_STR;

/**
 * Main HR Module Entry
 */
export async function renderHR(container, routeParts = []) {
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
      case 'leaves':
        await renderAdvancesTab(viewport);
        break;
      case 'payroll':
        await renderPayrollTab(viewport);
        break;
    }
  } catch (hrErr) {
    console.error(`Failed to render HR tab [${activeHRTab}]:`, hrErr);
    viewport.innerHTML = `
      <div class="glass-card text-center" style="margin: 20px auto; max-width: 500px;">
        <i data-lucide="alert-triangle" class="danger-text" style="width: 32px; height: 32px; margin-bottom: 12px;"></i>
        <h3 class="danger-text">Sub-Tab Load Failure</h3>
        <p class="muted-text" style="margin-top: 8px; font-size: 13px;">An error occurred while loading this HR view.</p>
        <pre style="text-align: left; background: rgba(0,0,0,0.3); padding: 10px; margin-top: 12px; border-radius: 6px; font-size: 11px; overflow-x: auto;">${hrErr.message}</pre>
      </div>
    `;
  }
  lucide.createIcons();
}

/* ==========================================================================
   Tab 1: Staff Directory
   ========================================================================== */
async function renderDirectoryTab(container) {
  const employees = await db.getAll('employees');

  container.innerHTML = `
    <div class="glass-card" style="display:flex; flex-direction:column; gap:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div class="search-input-wrapper">
          <i data-lucide="search"></i>
          <input type="text" id="emp-search" placeholder="Search by name, department..." class="form-control" style="padding-top:8px; padding-bottom:8px;">
        </div>
        
        <div style="display:flex; gap:8px; align-items:center;">
          <button id="batch-delete-employees-btn" class="btn btn-danger hidden" style="padding: 8px 16px; display:flex; align-items:center; gap:6px;">
            <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
            <span id="batch-delete-emp-text">Delete Selected (0)</span>
          </button>
          <input type="file" id="hr-csv-upload" accept=".csv" style="display:none;" />
          <button id="import-employees-btn" class="btn btn-secondary" style="padding: 8px 16px;" onclick="document.getElementById('hr-csv-upload').click()">
            <i data-lucide="upload-cloud"></i>
            <span>Import CSV</span>
          </button>
          <button id="add-employee-btn" class="btn btn-primary" style="padding: 8px 16px;">
            <i data-lucide="user-plus"></i>
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      <div class="table-responsive">
        <table class="custom-table" id="employees-table">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;"><input type="checkbox" id="select-all-employees" /></th>
              <th>ID Number</th>
              <th>Full Name</th>
              <th>Designation Role</th>
              <th>Department</th>
              <th>Email Address</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="employees-list-body">
            ${employees.map(emp => `
              <tr class="pointer" data-id="${emp.id}">
                <td style="text-align: center;" class="noclick"><input type="checkbox" class="emp-select-checkbox" data-id="${emp.id}" /></td>
                <td><code>${emp.id}</code></td>
                <td><strong>${emp.name}</strong></td>
                <td>${emp.role}</td>
                <td><span class="badge primary">${emp.department}</span></td>
                <td>${emp.contact}</td>
                <td>
                  <button class="btn btn-secondary view-profile-btn" style="padding: 4px 10px; font-size:12px;">View Profile</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Bind Search filter
  const searchInput = document.getElementById('emp-search');
  searchInput.addEventListener('input', (e) => {
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

  // Bind Click profile inspect
  container.querySelectorAll('#employees-list-body tr').forEach(row => {
    row.addEventListener('click', async (e) => {
      // Don't open if clicked checkbox or action buttons
      if (e.target.closest('.noclick') || e.target.closest('input[type="checkbox"]') || e.target.closest('.btn')) {
        return;
      }
      const empId = row.getAttribute('data-id');
      const emp = await db.get('employees', empId);
      openEmployeeProfileModal(emp);
    });
  });

  // Bind Create Employee Button
  document.getElementById('add-employee-btn').addEventListener('click', () => {
    const formHTML = `
      <form id="create-employee-form" class="login-form" style="padding:0;">
        <div class="input-group">
          <label>Full Name <span style="color:var(--danger); font-size:11px;">*required</span></label>
          <input type="text" id="new-emp-name" class="form-control-noicon" required placeholder="John Doe">
        </div>
        <div class="input-group">
          <label>Email Contact <span class="muted-text" style="font-size:10px;">(optional)</span></label>
          <input type="email" id="new-emp-email" class="form-control-noicon" placeholder="john.doe@glasserp.com">
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
          <div class="input-group">
            <label>Designation Role <span class="muted-text" style="font-size:10px;">(optional)</span></label>
            <select id="new-emp-role" class="form-control-noicon">
              <option value="Employee">Employee</option>
              <option value="Manager">Manager</option>
              <option value="Store Keeper">Store Keeper</option>
              <option value="HR">HR Manager</option>
            </select>
          </div>
          <div class="input-group">
            <label>Department <span class="muted-text" style="font-size:10px;">(optional)</span></label>
            <select id="new-emp-dept" class="form-control-noicon">
              <option value="Operations">Operations</option>
              <option value="Logistics">Logistics</option>
              <option value="Human Resources">Human Resources</option>
              <option value="Projects & Engineering">Projects & Engineering</option>
            </select>
          </div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
          <div class="input-group">
            <label>Joining Date <span class="muted-text" style="font-size:10px;">(optional)</span></label>
            <input type="date" id="new-emp-join" class="form-control-noicon" value="2026-05-26">
          </div>
          <div class="input-group">
            <label>Starting Salary (₹) <span class="muted-text" style="font-size:10px;">(optional)</span></label>
            <input type="number" id="new-emp-salary" class="form-control-noicon" value="35000">
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-block">Register Profile</button>
      </form>
    `;

    app.openModal('Add New Employee Record', formHTML);

    document.getElementById('create-employee-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('new-emp-name').value;
      const contact = document.getElementById('new-emp-email').value || '';
      const role = document.getElementById('new-emp-role').value || 'Employee';
      const department = document.getElementById('new-emp-dept').value || 'Operations';
      const joiningDate = document.getElementById('new-emp-join').value || '';
      const salary = document.getElementById('new-emp-salary').value || 0;
      const id = `EMP-${Math.floor(1000 + Math.random() * 9000)}`;

      const newEmp = { id, name, role, department, contact, joiningDate, documents: [], leaveBalance: 15, salary };

      await db.put('employees', newEmp);
      await sync.queueOperation('employees', 'insert', newEmp);

      // Create linked user login automatically
      const userLower = name.split(' ')[0].toLowerCase() + Math.floor(10 + Math.random() * 90);
      const newUser = { username: userLower, password: 'user123', role, status: 'Active' };

      await db.put('users', newUser);
      await sync.queueOperation('users', 'insert', newUser);

      app.closeModal();
      app.showToast('Employee Added', `Created profile for ${name}. Automatically generated demo system account: "${userLower}" (password: "user123")`, 'success', 8000);

      await renderActiveHRTab();
    });
  });

  // Bind CSV Import
  const csvUploadInput = document.getElementById('hr-csv-upload');
  if (csvUploadInput) {
    csvUploadInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (typeof Papa === 'undefined') {
        app.showToast('Error', 'Papa Parse is not loaded.', 'danger');
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
            const role = row.role || row.Role || row.Designation || 'Employee';
            const department = row.department || row.Department || 'Operations';
            const joiningDate = row.joiningDate || row['Joining Date'] || TODAY_STR;
            const salary = parseFloat(row.salary || row.Salary) || 0;
            const id = `EMP-${Math.floor(1000 + Math.random() * 9000)}`;

            const newEmp = { id, name, role, department, contact, joiningDate, documents: [], leaveBalance: 15, salary };
            await db.put('employees', newEmp);
            await sync.queueOperation('employees', 'insert', newEmp);

            const userLower = name.split(' ')[0].toLowerCase() + Math.floor(10 + Math.random() * 90);
            const newUser = { username: userLower, password: 'user123', role, status: 'Active' };
            await db.put('users', newUser);
            await sync.queueOperation('users', 'insert', newUser);
            count++;
          }
          if (count > 0) {
            app.showToast('Import Successful', `Imported ${count} employees from CSV.`, 'success');
            await renderActiveHRTab();
          } else {
            app.showToast('Import Failed', 'No valid employee data found in CSV.', 'warning');
          }
          e.target.value = ''; // Reset input
        },
        error: (err) => {
          console.error(err);
          app.showToast('Import Error', 'Failed to parse the CSV file.', 'danger');
        }
      });
    });
  }

  // Batch delete logic & helper function
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
        batchText.textContent = `Remove Selected Personnel (${checked.length})`;
      } else {
        batchBtn.classList.add('hidden');
      }
    }
  };

  // Bind select all checkbox
  document.getElementById('select-all-employees')?.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    document.querySelectorAll('.emp-select-checkbox').forEach(cb => {
      cb.checked = isChecked;
    });
    updateBatchDeleteEmpUI();
  });

  // Bind individual checkbox change
  document.getElementById('employees-list-body')?.addEventListener('change', (e) => {
    if (e.target.classList.contains('emp-select-checkbox')) {
      updateBatchDeleteEmpUI();
    }
  });

  // Bind Batch Delete Button
  document.getElementById('batch-delete-employees-btn')?.addEventListener('click', async () => {
    const checkedBoxes = document.querySelectorAll('.emp-select-checkbox:checked');
    const ids = Array.from(checkedBoxes).map(cb => cb.getAttribute('data-id'));
    if (ids.length === 0) return;

    if (confirm(`Are you absolutely sure you want to delete the ${ids.length} selected employee records?`)) {
      for (const id of ids) {
        await db.delete('employees', id);
        await sync.queueOperation('employees', 'delete', id);
      }
      app.showToast('Employees Deleted', `Successfully removed ${ids.length} employee records.`, 'success');
      await renderActiveHRTab();
    }
  });
}

/**
 * Detailed Employee Profile viewer Modal containing custom sub-tabs
 */
async function openEmployeeProfileModal(emp) {
  const attendance = await db.getAll('attendance');
  const empAtt = attendance.filter(a => a.employeeId === emp.id);
  const leaves = await db.getAll('leaves');
  const empLeaves = leaves.filter(l => l.employeeId === emp.id);

  let activeProfileTab = 'info';

  const generateModalHTML = () => `
    <div style="display:flex; flex-direction:column; gap:20px;">
      <!-- Profile Card Summary -->
      <div style="display:flex; align-items:center; gap:20px; justify-content:space-between;">
        <div style="display:flex; align-items:center; gap:20px;">
          <div class="profile-avatar-large" style="margin-bottom:0; width:70px; height:70px; font-size:24px;">
            ${emp.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 style="font-size:18px; font-family:var(--font-heading); font-weight:800;">${emp.name}</h2>
            <span class="badge primary">${emp.department}</span>
            <span class="muted-text" style="font-size:12px; margin-left:8px;">Joined ${emp.joiningDate}</span>
          </div>
        </div>
        <button id="edit-employee-btn" class="btn btn-secondary" style="padding:6px 12px; font-size:12px;">
          <i data-lucide="edit"></i> Edit Profile
        </button>
      </div>

      <!-- Nested modal profile tabs -->
      <div style="display:flex; gap:6px; border-bottom:1px solid var(--glass-border); padding-bottom:6px;">
        <button class="tab-btn modal-prof-tab ${activeProfileTab === 'info' ? 'active' : ''}" data-ptab="info" style="padding:6px 12px; font-size:12px;">General Info</button>
        <button class="tab-btn modal-prof-tab ${activeProfileTab === 'attendance' ? 'active' : ''}" data-ptab="attendance" style="padding:6px 12px; font-size:12px;">Attendance History</button>
        <button class="tab-btn modal-prof-tab ${activeProfileTab === 'leaves' ? 'active' : ''}" data-ptab="leaves" style="padding:6px 12px; font-size:12px;">Advances Taken</button>
        <button class="tab-btn modal-prof-tab ${activeProfileTab === 'documents' ? 'active' : ''}" data-ptab="documents" style="padding:6px 12px; font-size:12px;">Documents (${emp.documents.length})</button>
      </div>

      <!-- Nested tab contents -->
      <div id="modal-profile-tab-viewport">
        <!-- Rendered dynamically below -->
      </div>
    </div>
  `;

  app.openModal('Employee Dossier', '', '680px');

  const updateProfileTabRender = async () => {
    const modalViewport = document.getElementById('modal-profile-tab-viewport');
    if (!modalViewport) return;

    const advances = await db.getAll('leaves');
    const empAdvances = advances.filter(a => a.employeeId === emp.id);
    const outstandingSum = empAdvances.filter(a => a.status === 'Outstanding').reduce((sum, a) => sum + parseFloat(a.amount || 0), 0);

    if (activeProfileTab === 'info') {
      modalViewport.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
          <div class="info-field-item"><label>ID Number</label><span>${emp.id}</span></div>
          <div class="info-field-item"><label>Email Contact</label><span>${emp.contact}</span></div>
          <div class="info-field-item"><label>Assigned Role</label><span>${emp.role}</span></div>
          <div class="info-field-item"><label>Base Monthly Salary</label><span>₹${emp.salary}</span></div>
          <div class="info-field-item"><label>Outstanding Advance</label><span class="danger-text">₹${outstandingSum.toLocaleString()}</span></div>
        </div>
      `;
    } else if (activeProfileTab === 'attendance') {
      modalViewport.innerHTML = `<div id="employee-calendar-widget" style="padding: 10px 0;"></div>`;
      const calendarContainer = document.getElementById('employee-calendar-widget');
      const today = new Date(TODAY_STR);
      renderEmployeeMonthlyCalendar(emp, calendarContainer, today.getFullYear(), today.getMonth());
    } else if (activeProfileTab === 'leaves') {
      modalViewport.innerHTML = `
        <div style="margin-bottom:12px; font-weight:600; font-size:13px;">Total Outstanding Advance: <span class="danger-text">₹${outstandingSum.toLocaleString()}</span></div>
        <div class="table-responsive" style="max-height:180px; overflow-y:auto;">
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
              `).join('') : '<tr><td colspan="4" class="text-center muted-text">No advance records in database.</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    } else if (activeProfileTab === 'documents') {
      modalViewport.innerHTML = `
        <div class="documents-list">
          ${emp.documents.map(doc => `
            <div class="document-item">
              <span style="display:flex; align-items:center; gap:8px; font-size:13px;">
                <i data-lucide="file-text" style="width:16px; height:16px; color:var(--primary-color);"></i>
                <strong>${doc.name}</strong>
              </span>
              <a href="#" class="btn btn-secondary" style="padding:4px 8px; font-size:11px;" onclick="event.preventDefault(); alert('Simulated Document Download');">Download</a>
            </div>
          `).join('')}

          <div style="border:1px dashed var(--glass-border); padding:20px; border-radius:8px; text-align:center; margin-top:12px;">
            <i data-lucide="upload-cloud" style="width:32px; height:32px; color:var(--text-muted); margin-bottom:8px;"></i>
            <p style="font-size:13px;" class="muted-text">Drag & drop certification copies or click to browse</p>
            <input type="file" id="document-upload-mock" style="display:none;">
            <button class="btn btn-secondary" style="margin-top:8px; padding:6px 12px;" onclick="document.getElementById('document-upload-mock').click()">Browse Document</button>
          </div>
        </div>
      `;
      lucide.createIcons();

      // Bind Simulated Document upload browser trigger
      const mockUpload = document.getElementById('document-upload-mock');
      if (mockUpload) {
        mockUpload.addEventListener('change', async (e) => {
          if (e.target.files.length > 0) {
            const fileName = e.target.files[0].name;
            emp.documents.push({ name: fileName });

            await db.put('employees', emp);
            await sync.queueOperation('employees', 'update', emp);

            app.showToast('Document Uploaded', `Successfully uploaded simulated document file: ${fileName}`, 'success');
            activeProfileTab = 'documents';
            updateProfileTabRender();
          }
        });
      }
    }
  };

  // Inject Base Structural Framework and render defaults
  const containerBody = document.getElementById('modal-body');
  containerBody.innerHTML = generateModalHTML();
  updateProfileTabRender();
  lucide.createIcons();

  // Tab triggering
  containerBody.querySelectorAll('.modal-prof-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      containerBody.querySelectorAll('.modal-prof-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeProfileTab = btn.getAttribute('data-ptab');
      updateProfileTabRender();
    });
  });

  document.getElementById('edit-employee-btn')?.addEventListener('click', () => {
    app.closeModal();
    setTimeout(() => {
      openEditEmployeeModal(emp);
    }, 300);
  });
}

async function openEditEmployeeModal(emp) {
  const formHTML = `
    <form id="edit-employee-form" class="login-form" style="padding:0;">
      <div class="input-group">
        <label>Full Name <span style="color:var(--danger); font-size:11px;">*required</span></label>
        <input type="text" id="edit-emp-name" class="form-control-noicon" required value="${emp.name}">
      </div>
      <div class="input-group">
        <label>Email Contact</label>
        <input type="email" id="edit-emp-email" class="form-control-noicon" value="${emp.contact || ''}">
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
        <div class="input-group">
          <label>Designation Role</label>
          <input type="text" id="edit-emp-role" class="form-control-noicon" value="${emp.role || ''}">
        </div>
        <div class="input-group">
          <label>Department</label>
          <input type="text" id="edit-emp-dept" class="form-control-noicon" value="${emp.department || ''}">
        </div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
        <div class="input-group">
          <label>Joining Date</label>
          <input type="date" id="edit-emp-join" class="form-control-noicon" value="${emp.joiningDate || ''}">
        </div>
        <div class="input-group">
          <label>Starting Salary (₹)</label>
          <input type="number" id="edit-emp-salary" class="form-control-noicon" value="${emp.salary || 0}">
        </div>
      </div>
      <button type="submit" class="btn btn-primary btn-block">Save Changes</button>
    </form>
  `;

  app.openModal('Edit Employee Record', formHTML);

  document.getElementById('edit-employee-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    emp.name = document.getElementById('edit-emp-name').value;
    emp.contact = document.getElementById('edit-emp-email').value || '';
    emp.role = document.getElementById('edit-emp-role').value || 'Employee';
    emp.department = document.getElementById('edit-emp-dept').value || 'Operations';
    emp.joiningDate = document.getElementById('edit-emp-join').value || '';
    emp.salary = document.getElementById('edit-emp-salary').value || 0;

    await db.put('employees', emp);
    await sync.queueOperation('employees', 'update', emp);

    app.closeModal();
    app.showToast('Employee Updated', `Updated profile for ${emp.name}.`, 'success');

    await renderActiveHRTab();
    setTimeout(() => { openEmployeeProfileModal(emp); }, 350);
  });
}

/* ==========================================================================
   Tab 2: Daily Attendance
   ========================================================================== */
async function renderAttendanceTab(container) {
  const employees = await db.getAll('employees');
  const attendance = await db.getAll('attendance');

  // Filter attendance exceptions logged for the selected date
  const selectedDateExceptions = attendance.filter(a => a.date === selectedAttendanceDate);

  const totalCount = employees.length;
  const absentCount = selectedDateExceptions.filter(a => a.status === 'Absent').length;
  const halfDayCount = selectedDateExceptions.filter(a => a.status === 'Half Day').length;
  const presentCount = totalCount - absentCount - halfDayCount;

  container.innerHTML = `
    <div style="display:grid; grid-template-columns:1fr 1.5fr; gap:24px;">
      <!-- Mark Attendance Exception Form -->
      <div class="glass-card" style="display:flex; flex-direction:column; gap:16px; height:fit-content;">
        <h3 style="font-size:15px; font-family:var(--font-heading); font-weight:700; border-bottom:1px solid var(--glass-border); padding-bottom:8px;">Mark Attendance Exception</h3>
        
        <form id="attendance-exception-form" style="display:flex; flex-direction:column; gap:12px;">
          <div class="input-group" style="margin-bottom:0;">
            <label>Select Date</label>
            <input type="date" id="attendance-date-select" class="form-control-noicon" value="${selectedAttendanceDate}">
          </div>

          <div class="input-group" style="margin-bottom:0;">
            <label>Select Employee <span style="color:var(--danger); font-size:11px;">*required</span></label>
            <select id="attendance-employee-select" class="form-control-noicon" required>
              ${employees.map(emp => `<option value="${emp.id}">${emp.name} (ID: ${emp.id})</option>`).join('')}
            </select>
          </div>

          <div class="input-group" style="margin-bottom:0;">
            <label>Select Exception Status</label>
            <select id="attendance-status-select" class="form-control-noicon">
              <option value="Absent" selected>Absent (Leave)</option>
              <option value="Half Day">Half Day</option>
            </select>
          </div>

          <button type="submit" class="btn btn-primary btn-block">Record Exception</button>
        </form>

        <div style="border-top:1px solid var(--glass-border); padding-top:12px; display:flex; flex-direction:column; gap:8px;">
          <span style="font-size:11px; font-weight:700; color:var(--text-secondary); text-transform:uppercase;">Daily Statistics:</span>
          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; text-align:center; font-size:11px;">
            <div style="padding:4px; background:rgba(34,197,94,0.08); border-radius:4px;">
              <span class="muted-text" style="font-size:9px;">Present</span>
              <div class="success-text" style="font-weight:700;">${presentCount}</div>
            </div>
            <div style="padding:4px; background:rgba(234,179,8,0.08); border-radius:4px;">
              <span class="muted-text" style="font-size:9px;">Half Day</span>
              <div class="warning-text" style="font-weight:700;">${halfDayCount}</div>
            </div>
            <div style="padding:4px; background:rgba(239,68,68,0.08); border-radius:4px;">
              <span class="muted-text" style="font-size:9px;">Absent</span>
              <div class="danger-text" style="font-weight:700;">${absentCount}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Logs overview -->
      <div class="glass-card" style="display:flex; flex-direction:column; gap:16px;">
        <h3 style="font-size:15px; font-family:var(--font-heading); font-weight:700; border-bottom:1px solid var(--glass-border); padding-bottom:8px;">Logged Exceptions for ${selectedAttendanceDate}</h3>
        <p class="muted-text" style="font-size:12px;">By default, all roster employees are considered <strong>Present</strong>. Only exceptions logged for this date are listed below.</p>
        
        <div class="table-responsive" style="max-height:400px; overflow-y:auto;">
          <table class="custom-table" style="font-size:13px;" id="attendance-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Logged Exception</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="attendance-list-body">
              ${selectedDateExceptions.length > 0 ? selectedDateExceptions.map(exc => {
                const emp = employees.find(e => e.id === exc.employeeId);
                const badgeClass = exc.status === 'Absent' ? 'danger' : 'warning';
                return `
                  <tr>
                    <td><strong>${emp ? emp.name : exc.employeeId}</strong> <span class="muted-text" style="font-size:11px; display:block;"><code>${exc.employeeId}</code></span></td>
                    <td><span class="badge ${badgeClass}">${exc.status}</span></td>
                    <td>
                      <button class="btn btn-secondary remove-exception-btn" data-id="${exc.id}" style="padding:4px 8px; font-size:11px;">
                        Reset to Present
                      </button>
                    </td>
                  </tr>
                `;
              }).join('') : '<tr><td colspan="3" class="text-center muted-text" style="padding:24px 0;">No attendance exceptions logged. Everyone is Present today!</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Bind Date selection change
  document.getElementById('attendance-date-select')?.addEventListener('change', async (e) => {
    selectedAttendanceDate = e.target.value;
    await renderActiveHRTab();
  });

  // Bind Submit Exception
  document.getElementById('attendance-exception-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const empId = document.getElementById('attendance-employee-select').value;
    const status = document.getElementById('attendance-status-select').value;
    const date = document.getElementById('attendance-date-select').value;
    const clockId = `att-${empId}-${date}`;

    const record = {
      id: clockId,
      employeeId: empId,
      date: date,
      status: status
    };

    await db.put('attendance', record);
    await sync.queueOperation('attendance', 'update', record);

    app.showToast('Exception Recorded', `Successfully marked employee as ${status} on ${date}.`, 'success');
    await renderActiveHRTab();
  });

  // Bind Reset to Present / Remove Exception
  container.querySelectorAll('.remove-exception-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const excId = btn.getAttribute('data-id');
      await db.delete('attendance', excId);
      await sync.queueOperation('attendance', 'delete', excId);

      app.showToast('Status Reset', 'Attendance status reset to Present.', 'success');
      await renderActiveHRTab();
    });
  });
}

/**
 * Helper to render monthly attendance calendar grid
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

  let calendarDaysHTML = '';
  
  // Empty grids before start of month
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDaysHTML += `<div style="padding:10px; border:1px solid var(--glass-border); opacity:0.2;"></div>`;
  }

  for (let day = 1; day <= totalDays; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const record = empAtt.find(a => a.date === dateStr);
    
    let status = 'Present';
    let bg = 'rgba(34,197,94,0.15)';
    let color = 'var(--success-color)';
    let shortLabel = 'P';

    if (record) {
      status = record.status;
      if (status === 'Absent') {
        bg = 'rgba(239,68,68,0.15)';
        color = 'var(--danger-color)';
        shortLabel = 'A';
        absentCount++;
      } else if (status === 'Half Day') {
        bg = 'rgba(234,179,8,0.15)';
        color = 'var(--warning-color)';
        shortLabel = 'H';
        halfDayCount++;
      }
    } else {
      presentCount++;
    }

    calendarDaysHTML += `
      <div style="padding:6px 4px; border:1px solid var(--glass-border); background:${bg}; border-radius:4px; display:flex; flex-direction:column; align-items:center; gap:2px; position:relative; min-height:40px; justify-content:center;">
        <span style="font-size:10px; font-weight:700; color:var(--text-primary);">${day}</span>
        <span style="font-size:9px; font-weight:800; color:${color};" title="${status}">${shortLabel}</span>
      </div>
    `;
  }

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.15); padding:8px 12px; border-radius:6px; border:1px solid var(--glass-border);">
        <button id="cal-prev-month" class="btn btn-secondary" style="padding:4px 10px; font-size:11px;">&lt; Prev</button>
        <strong style="font-size:13px; font-family:var(--font-heading);">${monthNames[month]} ${year}</strong>
        <button id="cal-next-month" class="btn btn-secondary" style="padding:4px 10px; font-size:11px;">Next &gt;</button>
      </div>

      <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; text-align:center;">
        <div style="padding:6px; background:rgba(34,197,94,0.08); border-left:3px solid var(--success-color); border-radius:4px;">
          <span class="muted-text" style="font-size:10px; text-transform:uppercase;">Present</span>
          <h4 style="margin:2px 0 0 0; color:var(--success-color);">${presentCount}</h4>
        </div>
        <div style="padding:6px; background:rgba(234,179,8,0.08); border-left:3px solid var(--warning-color); border-radius:4px;">
          <span class="muted-text" style="font-size:10px; text-transform:uppercase;">Half Day</span>
          <h4 style="margin:2px 0 0 0; color:var(--warning-color);">${halfDayCount}</h4>
        </div>
        <div style="padding:6px; background:rgba(239,68,68,0.08); border-left:3px solid var(--danger-color); border-radius:4px;">
          <span class="muted-text" style="font-size:10px; text-transform:uppercase;">Absent (Leaves)</span>
          <h4 style="margin:2px 0 0 0; color:var(--danger-color);">${absentCount}</h4>
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

  container.querySelector('#cal-prev-month').addEventListener('click', () => {
    let nextMonth = month - 1;
    let nextYear = year;
    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear--;
    }
    renderEmployeeMonthlyCalendar(emp, container, nextYear, nextMonth);
  });

  container.querySelector('#cal-next-month').addEventListener('click', () => {
    let nextMonth = month + 1;
    let nextYear = year;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear++;
    }
    renderEmployeeMonthlyCalendar(emp, container, nextYear, nextMonth);
  });
}

/* ==========================================================================
   Tab 3: Salary Advances Management
   ========================================================================== */
async function renderAdvancesTab(container) {
  const advances = await db.getAll('leaves'); // using leaves store
  const employees = await db.getAll('employees');

  const outstandingAdvances = advances.filter(a => a.status === 'Outstanding');
  const settledAdvances = advances.filter(a => a.status === 'Deducted');

  container.innerHTML = `
    <div style="display:grid; grid-template-columns:1fr 2fr; gap:24px;">
      <!-- Record Advance Form -->
      <div class="glass-card" style="display:flex; flex-direction:column; gap:16px; height:fit-content;">
        <h3 style="font-size:15px; font-family:var(--font-heading); font-weight:700; border-bottom:1px solid var(--glass-border); padding-bottom:8px;">Record Salary Advance</h3>
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
            <label>Date <span class="muted-text" style="font-size:10px;">(optional)</span></label>
            <input type="date" id="advance-date" class="form-control-noicon" value="${new Date().toISOString().split('T')[0]}">
          </div>

          <div class="input-group" style="margin-bottom:0;">
            <label>Purpose / Description <span class="muted-text" style="font-size:10px;">(optional)</span></label>
            <textarea id="advance-purpose" class="form-control-noicon" rows="2" placeholder="State purpose of advance..."></textarea>
          </div>

          <button type="submit" class="btn btn-primary btn-block">Record Advance</button>
        </form>
      </div>

      <!-- Advances Ledger -->
      <div style="display:flex; flex-direction:column; gap:24px;">
        <div class="search-input-wrapper">
          <i data-lucide="search"></i>
          <input type="text" id="advances-search" placeholder="Search advances by employee name..." class="form-control" style="padding-top:8px; padding-bottom:8px;">
        </div>

        <!-- Outstanding Queue -->
        <div class="glass-card" style="display:flex; flex-direction:column; gap:16px;">
          <h3 style="font-size:15px; font-family:var(--font-heading); font-weight:700;">Outstanding Advances</h3>
          <div class="table-responsive">
            <table class="custom-table" style="font-size:13px;">
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
        <div class="glass-card" style="display:flex; flex-direction:column; gap:16px;">
          <h3 style="font-size:15px; font-family:var(--font-heading); font-weight:700;">Deducted / Settle History</h3>
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

  // Bind Search Filter
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

  // Bind Submit Application
  document.getElementById('record-advance-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const employeeId = document.getElementById('advance-staff').value;
    const amount = parseFloat(document.getElementById('advance-amount').value) || 0;
    const date = document.getElementById('advance-date').value || new Date().toISOString().split('T')[0];
    const purpose = document.getElementById('advance-purpose').value || '';

    const id = `adv-${Date.now()}`;
    const newAdvance = { id, employeeId, amount, date, purpose, status: 'Outstanding' };

    await db.put('leaves', newAdvance); // store in leaves
    await sync.queueOperation('leaves', 'insert', newAdvance);

    app.showToast('Advance Recorded', `Successfully recorded ₹${amount.toLocaleString()} advance for employee.`, 'success');
    await renderActiveHRTab();
  });

  // Bind Deduct Action
  container.querySelectorAll('.advance-deduct-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const advId = btn.getAttribute('data-id');
      const adv = await db.get('leaves', advId);
      const emp = await db.get('employees', adv.employeeId);

      if (confirm(`Are you sure you want to deduct ₹${parseFloat(adv.amount).toLocaleString()} from ${emp.name}'s salary?`)) {
        adv.status = 'Deducted';
        await db.put('leaves', adv);
        await sync.queueOperation('leaves', 'update', adv);

        app.showToast('Advance Settled', `Deducted ₹${parseFloat(adv.amount).toLocaleString()} from ${emp.name}'s salary profile.`, 'success');
        await renderActiveHRTab();
      }
    });
  });
}

/* ==========================================================================
   Tab 4: Departments & Payroll
   ========================================================================== */
async function renderPayrollTab(container) {
  const employees = await db.getAll('employees');
  const advances = await db.getAll('leaves'); // using leaves store

  // Calculate average payroll stats
  const departments = {};
  employees.forEach(emp => {
    if (!departments[emp.department]) {
      departments[emp.department] = { name: emp.department, count: 0, totalSalary: 0 };
    }
    departments[emp.department].count++;
    departments[emp.department].totalSalary += parseFloat(emp.salary || 0);
  });

  container.innerHTML = `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px;">
      <!-- Department lists -->
      <div class="glass-card" style="display:flex; flex-direction:column; gap:16px;">
        <h3 style="font-size:15px; font-family:var(--font-heading); font-weight:700; border-bottom:1px solid var(--glass-border); padding-bottom:8px;">Departments Breakdown</h3>
        <div class="table-responsive">
          <table class="custom-table" style="font-size:13px;">
            <thead>
              <tr>
                <th>Department Name</th>
                <th>Staff Count</th>
                <th>Total Payroll Budget</th>
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

      <!-- Payroll updates sheet -->
      <div class="glass-card" style="display:flex; flex-direction:column; gap:16px;">
        <h3 style="font-size:15px; font-family:var(--font-heading); font-weight:700;">Quick Salary Adjuster</h3>
        <p class="muted-text" style="font-size:12px;">Quickly review and modify current employee salary metrics, subtract outstanding advances.</p>

        <div class="search-input-wrapper">
          <i data-lucide="search"></i>
          <input type="text" id="payroll-search" placeholder="Search by employee name..." class="form-control" style="padding-top:8px; padding-bottom:8px;">
        </div>

        <div class="table-responsive" style="max-height:350px; overflow-y:auto;">
          <table class="custom-table" style="font-size:13px;">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Base Salary</th>
                <th>Outstanding Advance</th>
                <th>Net Payable</th>
                <th>Action</th>
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
                        <span style="font-size:13px; color:var(--text-secondary);">₹</span>
                        <input type="number" id="sal-inp-${emp.id}" value="${emp.salary}" class="form-control-noicon" style="width:90px; padding:4px 8px; font-size:12px;">
                      </div>
                    </td>
                    <td><strong class="warning-text">₹${outstanding.toLocaleString()}</strong></td>
                    <td><strong class="success-text">₹${netSalary.toLocaleString()}</strong></td>
                    <td>
                      <div style="display:flex; gap:6px;">
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

  // Bind Payroll Search filter
  const searchInput = document.getElementById('payroll-search');
  searchInput?.addEventListener('input', (e) => {
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

  // Bind Salary Update Button
  container.querySelectorAll('.sal-update-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const empId = btn.getAttribute('data-id');
      const nextSal = document.getElementById(`sal-inp-${empId}`).value;

      if (!nextSal || parseFloat(nextSal) <= 0) {
        app.showToast('Validation Error', 'Salary amount must be a positive value.', 'danger');
        return;
      }

      const emp = await db.get('employees', empId);
      const oldSal = emp.salary;
      emp.salary = nextSal;

      await db.put('employees', emp);
      await sync.queueOperation('employees', 'update', emp);

      app.showToast('Salary Updated', `Successfully updated ${emp.name}'s monthly salary from ₹${oldSal} to ₹${nextSal}.`, 'success');
      await renderActiveHRTab();
    });
  });

  // Bind Deduct Advance from Salary Button
  container.querySelectorAll('.sal-deduct-adv-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const empId = btn.getAttribute('data-id');
      const emp = await db.get('employees', empId);
      const empAdvances = advances.filter(a => a.employeeId === empId && a.status === 'Outstanding');
      const outstandingSum = empAdvances.reduce((sum, a) => sum + parseFloat(a.amount || 0), 0);

      if (outstandingSum === 0) return;

      if (confirm(`Are you sure you want to deduct ₹${outstandingSum.toLocaleString()} advance from ${emp.name}'s salary? All outstanding advances for this employee will be marked as Settle/Deducted.`)) {
        for (const adv of empAdvances) {
          adv.status = 'Deducted';
          await db.put('leaves', adv);
          await sync.queueOperation('leaves', 'update', adv);
        }

        app.showToast('Advances Deducted', `Successfully deducted ₹${outstandingSum.toLocaleString()} from ${emp.name}'s salary payment.`, 'success');
        await renderActiveHRTab();
      }
    });
  });
}