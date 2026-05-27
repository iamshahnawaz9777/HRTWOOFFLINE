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
            <i data-lucide="plane-takeoff" style="width:16px; height:16px; display:inline-block; vertical-align:middle; margin-right:6px;"></i>
            <span>Leave Requests</span>
          </button>
          <button class="tab-btn ${activeHRTab === 'payroll' ? 'active' : ''}" data-tab="payroll">
            <i data-lucide="banknote" style="width:16px; height:16px; display:inline-block; vertical-align:middle; margin-right:6px;"></i>
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
        await renderLeavesTab(viewport);
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
          <button id="add-employee-btn" class="btn btn-primary" style="padding: 8px 16px;">
            <i data-lucide="user-plus"></i>
            <span>Add Employee</span>
          </button>
          <button id="bulk-delete-employees-btn" class="btn btn-danger" style="padding:8px 12px; font-size:12px;">
            <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
          </button>
        </div>
      </div>

      <div class="table-responsive">
        <table class="custom-table" id="employees-table">
          <thead>
            <tr>
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
      // Don't open if clicked direct button (will trigger anyway)
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
            <label>Starting Salary ($) <span class="muted-text" style="font-size:10px;">(optional)</span></label>
            <input type="number" id="new-emp-salary" class="form-control-noicon" value="3500">
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

  // Bind Bulk Delete Employee Button
  document.getElementById('bulk-delete-employees-btn')?.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to delete ALL employee records? This action cannot be undone.')) return;
    const emps = await db.getAll('employees');
    for (const emp of emps) {
      await db.delete('employees', emp.id);
      await sync.queueOperation('employees', 'delete', emp.id);
    }
    app.showToast('Employees Deleted', `All ${emps.length} employee records have been removed.`, 'info');
    await renderActiveHRTab();
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

      <!-- Nested modal profile tabs -->
      <div style="display:flex; gap:6px; border-bottom:1px solid var(--glass-border); padding-bottom:6px;">
        <button class="tab-btn modal-prof-tab ${activeProfileTab === 'info' ? 'active' : ''}" data-ptab="info" style="padding:6px 12px; font-size:12px;">General Info</button>
        <button class="tab-btn modal-prof-tab ${activeProfileTab === 'attendance' ? 'active' : ''}" data-ptab="attendance" style="padding:6px 12px; font-size:12px;">Attendance History</button>
        <button class="tab-btn modal-prof-tab ${activeProfileTab === 'leaves' ? 'active' : ''}" data-ptab="leaves" style="padding:6px 12px; font-size:12px;">Leave Ledger</button>
        <button class="tab-btn modal-prof-tab ${activeProfileTab === 'documents' ? 'active' : ''}" data-ptab="documents" style="padding:6px 12px; font-size:12px;">Documents (${emp.documents.length})</button>
      </div>

      <!-- Nested tab contents -->
      <div id="modal-profile-tab-viewport">
        <!-- Rendered dynamically below -->
      </div>
    </div>
  `;

  app.openModal('Employee Dossier', '', '680px');

  const updateProfileTabRender = () => {
    const modalViewport = document.getElementById('modal-profile-tab-viewport');
    if (!modalViewport) return;

    if (activeProfileTab === 'info') {
      modalViewport.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
          <div class="info-field-item"><label>ID Number</label><span>${emp.id}</span></div>
          <div class="info-field-item"><label>Email Contact</label><span>${emp.contact}</span></div>
          <div class="info-field-item"><label>Assigned Role</label><span>${emp.role}</span></div>
          <div class="info-field-item"><label>Base Monthly Salary</label><span>$${emp.salary}</span></div>
          <div class="info-field-item"><label>Annual Leave Balance</label><span>${emp.leaveBalance} days remaining</span></div>
        </div>
      `;
    } else if (activeProfileTab === 'attendance') {
      modalViewport.innerHTML = `
        <div class="table-responsive" style="max-height:220px; overflow-y:auto;">
          <table class="custom-table" style="font-size:12px;">
            <thead>
              <tr>
                <th>Date</th>
                <th>Check-In</th>
                <th>Check-Out</th>
                <th>Daily Status</th>
              </tr>
            </thead>
            <tbody>
              ${empAtt.length > 0 ? empAtt.map(a => `
                <tr>
                  <td><code>${a.date}</code></td>
                  <td>${a.checkIn || '-'}</td>
                  <td>${a.checkOut || '-'}</td>
                  <td><span class="badge ${a.status === 'Present' ? 'success' : 'danger'}">${a.status}</span></td>
                </tr>
              `).join('') : '<tr><td colspan="4" class="text-center muted-text">No attendance records clocked.</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    } else if (activeProfileTab === 'leaves') {
      modalViewport.innerHTML = `
        <div style="margin-bottom:12px; font-weight:600; font-size:13px;">Leave Allocation Balance: <span class="primary-text">${emp.leaveBalance} days</span></div>
        <div class="table-responsive" style="max-height:180px; overflow-y:auto;">
          <table class="custom-table" style="font-size:12px;">
            <thead>
              <tr>
                <th>Dates</th>
                <th>Type</th>
                <th>Status</th>
                <th>Reason Description</th>
              </tr>
            </thead>
            <tbody>
              ${empLeaves.length > 0 ? empLeaves.map(l => `
                <tr>
                  <td><code>${l.startDate} to ${l.endDate}</code></td>
                  <td>${l.type}</td>
                  <td><span class="badge ${l.status === 'Approved' ? 'success' : 'warning'}">${l.status}</span></td>
                  <td>${l.reason}</td>
                </tr>
              `).join('') : '<tr><td colspan="4" class="text-center muted-text">No leaves applied in database.</td></tr>'}
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
}

/* ==========================================================================
   Tab 2: Daily Attendance
   ========================================================================== */
async function renderAttendanceTab(container) {
  const employees = await db.getAll('employees');
  const attendance = await db.getAll('attendance');

  // Filter attendance record logged for today constant
  const todayAttendance = attendance.filter(a => a.date === TODAY_STR);

  container.innerHTML = `
    <div style="display:grid; grid-template-columns:1fr 2fr; gap:24px;">
      <!-- Console check buttons -->
      <div class="glass-card" style="display:flex; flex-direction:column; gap:16px;">
        <h3 style="font-size:15px; font-family:var(--font-heading); font-weight:700; border-bottom:1px solid var(--glass-border); padding-bottom:8px;">Terminal Clock Console</h3>
        <p class="muted-text" style="font-size:12px;">Simulate biometric log events for scheduled personnel for today (<code>${TODAY_STR}</code>).</p>
        
        <div class="input-group" style="margin-bottom:0;">
          <label>Select Staff Member</label>
          <select id="attendance-clock-staff" class="form-control-noicon">
            ${employees.map(emp => `<option value="${emp.id}">${emp.name} (${emp.id})</option>`).join('')}
          </select>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <button id="clock-in-btn" class="btn btn-success">
            <i data-lucide="log-in"></i>
            <span>Clock In</span>
          </button>
          <button id="clock-out-btn" class="btn btn-danger">
            <i data-lucide="log-out"></i>
            <span>Clock Out</span>
          </button>
        </div>
      </div>

      <!-- Logs overview -->
      <div class="glass-card" style="display:flex; flex-direction:column; gap:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h3 style="font-size:15px; font-family:var(--font-heading); font-weight:700;">Clock logs for ${TODAY_STR}</h3>
          <span class="badge primary">${todayAttendance.length} / ${employees.length} Checked In</span>
        </div>
        
        <div class="search-input-wrapper">
          <i data-lucide="search"></i>
          <input type="text" id="attendance-search" placeholder="Search logs by employee name..." class="form-control" style="padding-top:8px; padding-bottom:8px;">
        </div>

        <div class="table-responsive" style="max-height:400px; overflow-y:auto;">
          <table class="custom-table" style="font-size:13px;" id="attendance-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Work Status</th>
              </tr>
            </thead>
            <tbody id="attendance-list-body">
              ${employees.map(emp => {
    const clock = todayAttendance.find(a => a.employeeId === emp.id);
    return `
                  <tr>
                    <td><strong>${emp.name}</strong> <span class="muted-text" style="font-size:11px; display:block;"><code>${emp.id}</code></span></td>
                    <td>${clock ? clock.checkIn : '<span class="muted-text">-</span>'}</td>
                    <td>${clock && clock.checkOut ? clock.checkOut : '<span class="muted-text">-</span>'}</td>
                    <td>
                      ${clock ? `
                        <span class="badge ${clock.checkOut ? 'success' : 'warning'}">
                          ${clock.checkOut ? 'Completed' : 'Working'}
                        </span>
                      ` : '<span class="badge secondary">Absent</span>'}
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

  // Bind Attendance Search filter
  const searchInput = document.getElementById('attendance-search');
  searchInput?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#attendance-list-body tr').forEach(row => {
      const txt = row.innerText.toLowerCase();
      if (txt.includes(q)) {
        row.classList.remove('hidden');
      } else {
        row.classList.add('hidden');
      }
    });
  });

  // Bind Clock In Action
  document.getElementById('clock-in-btn').addEventListener('click', async () => {
    const empId = document.getElementById('attendance-clock-staff').value;
    const existing = todayAttendance.find(a => a.employeeId === empId);

    if (existing) {
      app.showToast('Clock Event Blocked', 'This staff member is already clocked in today.', 'warning');
      return;
    }

    const clockId = `att-${empId}-${TODAY_STR}`;
    const newAtt = {
      id: clockId,
      employeeId: empId,
      date: TODAY_STR,
      checkIn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      checkOut: '',
      status: 'Present'
    };

    await db.put('attendance', newAtt);
    await sync.queueOperation('attendance', 'insert', newAtt);

    app.showToast('Clocked In', `Registered Check-In time for employee ${empId}.`, 'success');
    await renderActiveHRTab();
  });

  // Bind Clock Out Action
  document.getElementById('clock-out-btn').addEventListener('click', async () => {
    const empId = document.getElementById('attendance-clock-staff').value;
    const existing = todayAttendance.find(a => a.employeeId === empId);

    if (!existing) {
      app.showToast('Clock Event Blocked', 'Cannot register checkout before checkin has occurred.', 'warning');
      return;
    }

    if (existing.checkOut) {
      app.showToast('Clock Event Blocked', 'This staff member is already checked out for today.', 'warning');
      return;
    }

    existing.checkOut = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

    await db.put('attendance', existing);
    await sync.queueOperation('attendance', 'update', existing);

    app.showToast('Clocked Out', `Registered Check-Out time for employee ${empId}. Daily shift complete.`, 'success');
    await renderActiveHRTab();
  });
}

/* ==========================================================================
   Tab 3: Leave Requests Management
   ========================================================================== */
async function renderLeavesTab(container) {
  const leaves = await db.getAll('leaves');
  const employees = await db.getAll('employees');

  const pendingLeaves = leaves.filter(l => l.status === 'Pending');
  const pastLeaves = leaves.filter(l => l.status !== 'Pending');

  container.innerHTML = `
    <div style="display:grid; grid-template-columns:1fr 2fr; gap:24px;">
      <!-- Apply Form -->
      <div class="glass-card" style="display:flex; flex-direction:column; gap:16px; height:fit-content;">
        <h3 style="font-size:15px; font-family:var(--font-heading); font-weight:700; border-bottom:1px solid var(--glass-border); padding-bottom:8px;">File Leave Application</h3>
        <form id="apply-leave-form" style="display:flex; flex-direction:column; gap:12px;">
          <div class="input-group" style="margin-bottom:0;">
            <label>Requesting Employee <span style="color:var(--danger); font-size:11px;">*required</span></label>
            <select id="leave-staff" class="form-control-noicon" required>
              ${employees.map(emp => `<option value="${emp.id}">${emp.name} (Balance: ${emp.leaveBalance} days)</option>`).join('')}
            </select>
          </div>

          <div class="input-group" style="margin-bottom:0;">
            <label>Leave Category Type <span class="muted-text" style="font-size:10px;">(optional)</span></label>
            <select id="leave-type" class="form-control-noicon">
              <option value="Annual Leave">Annual Leave</option>
              <option value="Medical Leave">Medical Leave</option>
              <option value="Casual Leave">Casual Leave</option>
            </select>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div class="input-group" style="margin-bottom:0;">
              <label>Start Date <span class="muted-text" style="font-size:10px;">(optional)</span></label>
              <input type="date" id="leave-start" class="form-control-noicon" value="2026-06-10">
            </div>
            <div class="input-group" style="margin-bottom:0;">
              <label>End Date <span class="muted-text" style="font-size:10px;">(optional)</span></label>
              <input type="date" id="leave-end" class="form-control-noicon" value="2026-06-12">
            </div>
          </div>

          <div class="input-group" style="margin-bottom:0;">
            <label>Reason Description <span class="muted-text" style="font-size:10px;">(optional)</span></label>
            <textarea id="leave-reason" class="form-control-noicon" rows="2" placeholder="State reason for absence..."></textarea>
          </div>

          <button type="submit" class="btn btn-primary btn-block">Submit Application</button>
        </form>
      </div>

      <!-- Action Approval Dashboard & Ledger Lists -->
      <div style="display:flex; flex-direction:column; gap:24px;">
        <div class="search-input-wrapper">
          <i data-lucide="search"></i>
          <input type="text" id="leaves-search" placeholder="Search leave requests by employee name..." class="form-control" style="padding-top:8px; padding-bottom:8px;">
        </div>

        <!-- Authorization Queue -->
        <div class="glass-card" style="display:flex; flex-direction:column; gap:16px;">
          <h3 style="font-size:15px; font-family:var(--font-heading); font-weight:700;">Applications Awaiting Approval</h3>
          <div class="table-responsive">
            <table class="custom-table" style="font-size:13px;">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Details</th>
                  <th>Dates Range</th>
                  <th>Decision Actions</th>
                </tr>
              </thead>
              <tbody id="leaves-pending-body">
                ${pendingLeaves.length > 0 ? pendingLeaves.map(lv => {
    const emp = employees.find(e => e.id === lv.employeeId);
    return `
                    <tr>
                      <td><strong>${emp ? emp.name : lv.employeeId}</strong> <span class="muted-text" style="font-size:11px; display:block;">Balance: ${emp ? emp.leaveBalance : 0} days</span></td>
                      <td><strong>${lv.type}</strong><span style="display:block; font-size:11px;" class="muted-text">"${lv.reason}"</span></td>
                      <td><code>${lv.startDate} to ${lv.endDate}</code></td>
                      <td style="display:flex; gap:8px;">
                        <button class="btn btn-success leave-approve-btn" data-id="${lv.id}" style="padding:4px 8px; font-size:11px;">Approve</button>
                        <button class="btn btn-danger leave-reject-btn" data-id="${lv.id}" style="padding:4px 8px; font-size:11px;">Reject</button>
                      </td>
                    </tr>
                  `;
  }).join('') : '<tr><td colspan="4" class="text-center muted-text" style="padding:16px 0;">No pending requests in queue.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Ledger History -->
        <div class="glass-card" style="display:flex; flex-direction:column; gap:16px;">
          <h3 style="font-size:15px; font-family:var(--font-heading); font-weight:700;">Leave Requests History</h3>
          <div class="table-responsive" style="max-height:200px; overflow-y:auto;">
            <table class="custom-table" style="font-size:12px;">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Dates</th>
                  <th>Approved By</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody id="leaves-history-body">
                ${pastLeaves.length > 0 ? pastLeaves.map(lv => {
    const emp = employees.find(e => e.id === lv.employeeId);
    return `
                    <tr>
                      <td><strong>${emp ? emp.name : lv.employeeId}</strong></td>
                      <td>${lv.type}</td>
                      <td><code>${lv.startDate} to ${lv.endDate}</code></td>
                      <td>${lv.approvedBy || '-'}</td>
                      <td><span class="badge ${lv.status === 'Approved' ? 'success' : 'danger'}">${lv.status}</span></td>
                    </tr>
                  `;
  }).join('') : '<tr><td colspan="5" class="text-center muted-text">No archived ledger entries.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  // Bind Leaves Search filter
  const searchInput = document.getElementById('leaves-search');
  searchInput?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#leaves-pending-body tr, #leaves-history-body tr').forEach(row => {
      // Don't hide the "No pending requests" or "No archived entries" rows
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
  document.getElementById('apply-leave-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const employeeId = document.getElementById('leave-staff').value;
    const type = document.getElementById('leave-type').value || 'Annual Leave';
    const startDate = document.getElementById('leave-start').value || TODAY_STR;
    const endDate = document.getElementById('leave-end').value || TODAY_STR;
    const reason = document.getElementById('leave-reason').value || '';

    // Check invalid date boundaries (Boundary case!)
    if (new Date(startDate) > new Date(endDate)) {
      app.showToast('Leave Date Error', 'The selected leave start date cannot occur after the end date.', 'danger');
      return;
    }

    const id = `lv-${Date.now()}`;
    const newLeave = { id, employeeId, type, startDate, endDate, reason, status: 'Pending', approvedBy: '' };

    await db.put('leaves', newLeave);
    await sync.queueOperation('leaves', 'insert', newLeave);

    app.showToast('Leave Applied', 'Your request has been routed to HR Managers for approval.', 'success');
    await renderActiveHRTab();
  });

  // Bind Approve Action (Balance Deductions)
  container.querySelectorAll('.leave-approve-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const lvId = btn.getAttribute('data-id');
      const lv = await db.get('leaves', lvId);
      const emp = await db.get('employees', lv.employeeId);

      // Compute number of days requested
      const start = new Date(lv.startDate);
      const end = new Date(lv.endDate);
      const days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;

      if (emp.leaveBalance < days) {
        const proceed = confirm(`Warning: Employee has only ${emp.leaveBalance} days remaining, but requested ${days} days. Force approve?`);
        if (!proceed) return;
      }

      // Deduct leave balance
      emp.leaveBalance = Math.max(0, emp.leaveBalance - days);
      await db.put('employees', emp);
      await sync.queueOperation('employees', 'update', emp);

      // Update Leave
      lv.status = 'Approved';
      lv.approvedBy = auth.getCurrentUser()?.username || 'HR Manager';
      await db.put('leaves', lv);
      await sync.queueOperation('leaves', 'update', lv);

      app.showToast('Request Approved', `Subtracted ${days} days from ${emp.name}'s balance.`, 'success');
      await renderActiveHRTab();
    });
  });

  // Bind Reject Action
  container.querySelectorAll('.leave-reject-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const lvId = btn.getAttribute('data-id');
      const lv = await db.get('leaves', lvId);

      lv.status = 'Rejected';
      lv.approvedBy = auth.getCurrentUser()?.username || 'HR Manager';
      await db.put('leaves', lv);
      await sync.queueOperation('leaves', 'update', lv);

      app.showToast('Request Rejected', 'The application has been marked Rejected.', 'info');
      await renderActiveHRTab();
    });
  });
}

/* ==========================================================================
   Tab 4: Departments & Payroll
   ========================================================================== */
async function renderPayrollTab(container) {
  const employees = await db.getAll('employees');

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
                  <td><strong>$${dept.totalSalary.toLocaleString()}/mo</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Payroll updates sheet -->
      <div class="glass-card" style="display:flex; flex-direction:column; gap:16px;">
        <h3 style="font-size:15px; font-family:var(--font-heading); font-weight:700;">Quick Salary Adjuster</h3>
        <p class="muted-text" style="font-size:12px;">Quickly review and modify current employee salary metrics.</p>

        <div class="search-input-wrapper">
          <i data-lucide="search"></i>
          <input type="text" id="payroll-search" placeholder="Search by employee name..." class="form-control" style="padding-top:8px; padding-bottom:8px;">
        </div>

        <div class="table-responsive" style="max-height:350px; overflow-y:auto;">
          <table class="custom-table" style="font-size:13px;">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Current Salary</th>
                <th>New Value</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="payroll-list-body">
              ${employees.map(emp => `
                <tr>
                  <td><strong>${emp.name}</strong> <span style="font-size:11px;" class="muted-text"><code>${emp.id}</code></span></td>
                  <td><code>$${emp.salary}/mo</code></td>
                  <td>
                    <input type="number" id="sal-inp-${emp.id}" value="${emp.salary}" class="form-control-noicon" style="width:100px; padding:4px 8px; font-size:12px;">
                  </td>
                  <td>
                    <button class="btn btn-primary sal-update-btn" data-id="${emp.id}" style="padding:4px 10px; font-size:11px;">Update</button>
                  </td>
                </tr>
              `).join('')}
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

      app.showToast('Salary Updated', `Successfully updated ${emp.name}'s monthly salary from $${oldSal} to $${nextSal}.`, 'success');
      await renderActiveHRTab();
    });
  });
}