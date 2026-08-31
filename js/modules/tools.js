import { db } from '../db.js';
import { DateEngine } from '../dateEngine.js';
import { sync } from '../sync.js';
import { auth } from '../auth.js';

const app = new Proxy({}, {
  get: (target, prop) => window.app ? window.app[prop] : undefined
});

let isManualEmployee = false;

export async function renderTools(container) {
  const employees = await db.getAll('employees');
  const toolsDatabase = await db.getAll('tools_tracking');
  const projects = await db.getAll('projects');

  const defaultDate = new Date().toISOString().split('T')[0];

  container.innerHTML = `
    <div style="display:grid; grid-template-columns: 1fr 2fr; gap: 24px; align-items: start;">
      <!-- ISSUE TOOL FORM -->
      <div class="glass-card" style="display:flex; flex-direction:column; gap:16px;">
        <h3 style="font-size:16px; font-family:var(--font-heading); font-weight:700;">🔧 Issue Tool Registry</h3>
        <form id="issue-tool-form" style="display:flex; flex-direction:column; gap:14px;">
          
          <!-- Project Selection -->
          <div class="input-group" style="margin-bottom:0;">
            <label style="font-weight:700; color:var(--text-primary); display:flex; justify-content:space-between;">
              <span>Connected Project / Site</span>
              <span class="muted-text" style="font-size:11px; font-weight:400;">Links to Project & Tasks</span>
            </label>
            <select id="tool-project-select" class="form-control-noicon" style="border-color:var(--primary-color);">
              <option value="">— Workshop / No Project —</option>
              ${projects.map(p => `<option value="${p.id}">🏗️ ${p.name} (${p.status})</option>`).join('')}
            </select>
          </div>

          <!-- Employee Field -->
          <div class="input-group" style="margin-bottom:0;">
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <label>Employee *</label>
              <button type="button" id="toggle-emp-mode" style="background:none; border:none; color:var(--primary-color); font-size:11px; cursor:pointer; padding:0;">
                ${isManualEmployee ? "Select from List" : "Enter Manually"}
              </button>
            </div>
            ${!isManualEmployee ? `
              <select id="tool-emp-select" class="form-control-noicon" required>
                <option value="">-- Choose Employee --</option>
                ${employees.map(emp => `<option value="${emp.name}">${emp.name}</option>`).join('')}
              </select>
            ` : `
              <input type="text" id="tool-emp-input" class="form-control-noicon" placeholder="Type employee's full name..." required />
            `}
          </div>

          <!-- Tool Details -->
          <div class="input-group" style="margin-bottom:0;">
            <label>Tool Details *</label>
            <input type="text" id="tool-details-input" class="form-control-noicon" placeholder="Item name, serial tracking numbers..." required />
          </div>

          <!-- Date Taken -->
          <div class="input-group" style="margin-bottom:0;">
            <label>Date Taken (Optional)</label>
            <input type="date" id="tool-date-taken" class="form-control-noicon" value="${defaultDate}" />
          </div>

          <!-- Expected Return Date -->
          <div class="input-group" style="margin-bottom:0;">
            <label>Expected Return Date (Optional)</label>
            <input type="date" id="tool-date-expected" class="form-control-noicon" />
          </div>

          <button type="submit" class="btn btn-primary btn-block" style="margin-top:8px;">
            Log Tool Allotment
          </button>
        </form>
      </div>

      <!-- ACTIVE LOGS MATRIX -->
      <div class="glass-card" style="display:flex; flex-direction:column; gap:16px;">
        <h3 style="font-size:16px; font-family:var(--font-heading); font-weight:700;">Active Allotments & Return Grid</h3>
        <div class="table-responsive">
          <table class="custom-table" style="font-size:13px;">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Project / Site</th>
                <th>Tool Set</th>
                <th>Issued</th>
                <th>Returned</th>
                <th>Status</th>
                <th style="text-align:center;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${toolsDatabase.length === 0 ? `<tr><td colspan="7" class="text-center muted-text" style="padding:20px;">No tools issued yet.</td></tr>` : ''}
              ${toolsDatabase.sort((a,b) => b.id.localeCompare(a.id)).map(record => `
                <tr>
                  <td style="font-weight:600;">${record.employeeName}</td>
                  <td>
                    ${record.projectName ? `<span class="badge secondary" style="font-size:10px; white-space:nowrap;">🏗️ ${record.projectName}</span>` : '<span class="muted-text">—</span>'}
                  </td>
                  <td style="font-family:monospace; color:var(--text-secondary);">${record.toolDetails}</td>
                  <td>${record.dateTaken || '—'}</td>
                  <td>${record.dateReturned || '—'}</td>
                  <td>
                    <span class="badge ${record.status === 'Returned' ? 'success' : 'warning'}">${record.status}</span>
                  </td>
                  <td style="text-align:center;">
                    ${record.status === 'Issued' ? `
                      <button class="btn btn-secondary mark-returned-btn" data-id="${record.id}" style="padding:4px 8px; font-size:11px;">
                        Mark Returned
                      </button>
                    ` : ''}
                    <button class="btn btn-primary edit-tool-btn" data-id="${record.id}" style="padding:4px 8px; font-size:11px; margin-left:4px;">
                      Edit
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  bindEvents(container, projects);
  lucide.createIcons();
}

function bindEvents(container, projects = []) {
  // Toggle Manual/List Employee
  document.getElementById('toggle-emp-mode')?.addEventListener('click', () => {
    isManualEmployee = !isManualEmployee;
    renderTools(container);
  });

  // Submit Issue Form
  document.getElementById('issue-tool-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    let employeeName = '';
    if (isManualEmployee) {
      employeeName = document.getElementById('tool-emp-input')?.value.trim();
    } else {
      employeeName = document.getElementById('tool-emp-select')?.value.trim();
    }

    const projectId = document.getElementById('tool-project-select')?.value || null;
    const selectedProj = projects.find(p => p.id === projectId);
    const projectName = selectedProj ? selectedProj.name : '';

    const toolDetails = document.getElementById('tool-details-input')?.value.trim();
    const rawDateTaken = document.getElementById('tool-date-taken')?.value;
    const rawDateExpected = document.getElementById('tool-date-expected')?.value;

    if (!employeeName || !toolDetails) {
      app.showToast('Validation Error', 'Employee Name and Tool Details are mandatory!', 'warning');
      return;
    }

    const newRecord = {
      id: 'TL-' + Date.now(),
      employeeName,
      projectId: projectId || null,
      projectName: projectName || '',
      toolDetails,
      dateTaken: DateEngine.stringify(rawDateTaken),
      dateReturned: '',
      expectedReturn: DateEngine.stringify(rawDateExpected),
      status: 'Issued'
    };

    await db.put('tools_tracking', newRecord);
    await sync.queueOperation('tools_tracking', 'insert', newRecord);

    // Auto-create task on project's Kanban task list if connected
    if (projectId) {
      try {
        const taskItem = {
          id: `task-tl-${Date.now()}`,
          projectId: projectId,
          name: `🔧 Tool Allocated: ${toolDetails}`,
          description: `Equipment "${toolDetails}" allocated to technician ${employeeName}. Issued on ${newRecord.dateTaken || 'Today'}, Expected return: ${newRecord.expectedReturn || 'Unspecified'}.`,
          assignees: [employeeName],
          deadline: newRecord.expectedReturn || newRecord.dateTaken,
          priority: 'low',
          status: 'in-progress',
          subtasks: [
            { text: `Return ${toolDetails} in good condition`, completed: false }
          ],
          activityLog: [
            {
              time: new Date().toISOString(),
              user: auth.getCurrentUser()?.username || 'System',
              action: `Issued equipment "${toolDetails}" to ${employeeName}`
            }
          ]
        };
        await db.put('tasks', taskItem);
        await sync.queueOperation('tasks', 'insert', taskItem);
      } catch (err) {
        console.warn('Could not auto-create tool task in project:', err);
      }
    }

    app.showToast('Tool Issued', `Successfully logged allotment for ${employeeName}${projectName ? ` on ${projectName}` : ''}.`, 'success');
    renderTools(container);
  });

  // Mark Returned
  document.querySelectorAll('.mark-returned-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id') || e.target.closest('button').getAttribute('data-id');
      if (!id) return;

      const record = await db.get('tools_tracking', id);
      if (record) {
        record.status = 'Returned';
        record.dateReturned = DateEngine.stringify(new Date().toISOString().split('T')[0]);
        
        await db.put('tools_tracking', record);
        await sync.queueOperation('tools_tracking', 'update', record);

        app.showToast('Tool Returned', `Marked ${record.toolDetails} as returned.`, 'success');
        renderTools(container);
      }
    });
  });

  // Edit Tool Allotment
  document.querySelectorAll('.edit-tool-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id') || e.target.closest('button').getAttribute('data-id');
      if (!id) return;

      const record = await db.get('tools_tracking', id);
      if (record) {
        const formHTML = `
          <form id="edit-tool-form" style="display:flex; flex-direction:column; gap:14px; padding:10px;">
            <div class="input-group" style="margin-bottom:0;">
              <label>Connected Project / Site</label>
              <select id="edit-tool-project" class="form-control-noicon" style="border-color:var(--primary-color);">
                <option value="">— Workshop / No Project —</option>
                ${projects.map(p => `<option value="${p.id}" ${p.id === record.projectId ? 'selected' : ''}>🏗️ ${p.name} (${p.status})</option>`).join('')}
              </select>
            </div>
            <div class="input-group" style="margin-bottom:0;">
              <label>Employee</label>
              <input type="text" id="edit-tool-emp" class="form-control-noicon" value="${record.employeeName}" required />
            </div>
            <div class="input-group" style="margin-bottom:0;">
              <label>Tool Details</label>
              <input type="text" id="edit-tool-details" class="form-control-noicon" value="${record.toolDetails}" required />
            </div>
            <div class="input-group" style="margin-bottom:0;">
              <label>Date Taken</label>
              <input type="date" id="edit-tool-taken" class="form-control-noicon" value="${record.dateTaken || ''}" />
            </div>
            <div class="input-group" style="margin-bottom:0;">
              <label>Expected Return Date</label>
              <input type="date" id="edit-tool-expected" class="form-control-noicon" value="${record.expectedReturn || ''}" />
            </div>
            <div class="input-group" style="margin-bottom:0;">
              <label>Status</label>
              <select id="edit-tool-status" class="form-control-noicon">
                <option value="Issued" ${record.status === 'Issued' ? 'selected' : ''}>Issued</option>
                <option value="Returned" ${record.status === 'Returned' ? 'selected' : ''}>Returned</option>
              </select>
            </div>
            <button type="submit" class="btn btn-primary btn-block" style="margin-top:8px;">
              Save Changes
            </button>
          </form>
        `;
        app.openModal('Edit Tool Allotment', formHTML, '420px');

        document.getElementById('edit-tool-form').addEventListener('submit', async (ev) => {
          ev.preventDefault();
          const editProjId = document.getElementById('edit-tool-project')?.value || null;
          const editProj = projects.find(p => p.id === editProjId);

          record.projectId = editProjId;
          record.projectName = editProj ? editProj.name : '';
          record.employeeName = document.getElementById('edit-tool-emp').value.trim();
          record.toolDetails = document.getElementById('edit-tool-details').value.trim();
          record.dateTaken = document.getElementById('edit-tool-taken').value;
          record.expectedReturn = document.getElementById('edit-tool-expected').value;
          record.status = document.getElementById('edit-tool-status').value;

          if (record.status === 'Returned' && !record.dateReturned) {
            record.dateReturned = DateEngine.stringify(new Date().toISOString().split('T')[0]);
          }

          await db.put('tools_tracking', record);
          await sync.queueOperation('tools_tracking', 'update', record);

          app.closeModal();
          app.showToast('Tool Updated', 'Successfully updated tool allotment.', 'success');
          renderTools(container);
        });
      }
    });
  });
}

/**
 * Helper to open the Issue Tool modal from another screen (e.g. from Projects)
 */
export async function openIssueToolModal(container, defaultProjectId = null, onSaved = null) {
  const employees = await db.getAll('employees');
  const projects = await db.getAll('projects');
  const defaultDate = new Date().toISOString().split('T')[0];

  const formHTML = `
    <form id="modal-issue-tool-form" style="display:flex; flex-direction:column; gap:14px; padding:10px;">
      <div class="input-group" style="margin-bottom:0;">
        <label style="font-weight:700; color:var(--text-primary);">Connected Project / Site</label>
        <select id="modal-tool-project" class="form-control-noicon" style="border-color:var(--primary-color);">
          <option value="">— Workshop / No Project —</option>
          ${projects.map(p => `<option value="${p.id}" ${p.id === defaultProjectId ? 'selected' : ''}>🏗️ ${p.name} (${p.status})</option>`).join('')}
        </select>
      </div>

      <div class="input-group" style="margin-bottom:0;">
        <label>Employee / Technician *</label>
        <select id="modal-tool-emp" class="form-control-noicon" required>
          <option value="">-- Choose Employee --</option>
          ${employees.map(emp => `<option value="${emp.name}">${emp.name}</option>`).join('')}
        </select>
      </div>

      <div class="input-group" style="margin-bottom:0;">
        <label>Tool Details / Serial No. *</label>
        <input type="text" id="modal-tool-details" class="form-control-noicon" placeholder="e.g. Suction Lifter Pair, Diamond Glass Cutter" required />
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div class="input-group" style="margin-bottom:0;">
          <label>Date Taken</label>
          <input type="date" id="modal-tool-taken" class="form-control-noicon" value="${defaultDate}" />
        </div>
        <div class="input-group" style="margin-bottom:0;">
          <label>Expected Return</label>
          <input type="date" id="modal-tool-expected" class="form-control-noicon" />
        </div>
      </div>

      <button type="submit" class="btn btn-primary btn-block" style="margin-top:8px;">
        Issue Equipment
      </button>
    </form>
  `;

  app.openModal('Issue Equipment / Tool', formHTML, '450px');

  document.getElementById('modal-issue-tool-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const projectId = document.getElementById('modal-tool-project')?.value || null;
    const selectedProj = projects.find(p => p.id === projectId);
    const projectName = selectedProj ? selectedProj.name : '';

    const employeeName = document.getElementById('modal-tool-emp')?.value.trim();
    const toolDetails = document.getElementById('modal-tool-details')?.value.trim();
    const dateTaken = document.getElementById('modal-tool-taken')?.value;
    const expectedReturn = document.getElementById('modal-tool-expected')?.value;

    if (!employeeName || !toolDetails) {
      app.showToast('Error', 'Employee and Tool Details are required', 'warning');
      return;
    }

    const newRecord = {
      id: 'TL-' + Date.now(),
      employeeName,
      projectId: projectId || null,
      projectName: projectName || '',
      toolDetails,
      dateTaken: DateEngine.stringify(dateTaken),
      dateReturned: '',
      expectedReturn: DateEngine.stringify(expectedReturn),
      status: 'Issued'
    };

    await db.put('tools_tracking', newRecord);
    await sync.queueOperation('tools_tracking', 'insert', newRecord);

    if (projectId) {
      try {
        const taskItem = {
          id: `task-tl-${Date.now()}`,
          projectId: projectId,
          name: `🔧 Tool Allocated: ${toolDetails}`,
          description: `Equipment "${toolDetails}" allocated to technician ${employeeName}. Issued on ${newRecord.dateTaken || 'Today'}, Expected return: ${newRecord.expectedReturn || 'Unspecified'}.`,
          assignees: [employeeName],
          deadline: newRecord.expectedReturn || newRecord.dateTaken,
          priority: 'low',
          status: 'in-progress',
          subtasks: [
            { text: `Return ${toolDetails} in good condition`, completed: false }
          ],
          activityLog: [
            {
              time: new Date().toISOString(),
              user: auth.getCurrentUser()?.username || 'System',
              action: `Issued equipment "${toolDetails}" to ${employeeName}`
            }
          ]
        };
        await db.put('tasks', taskItem);
        await sync.queueOperation('tasks', 'insert', taskItem);
      } catch (err) {
        console.warn('Could not auto-create tool task in project:', err);
      }
    }

    app.closeModal();
    app.showToast('Tool Issued', `Successfully logged allotment for ${employeeName}${projectName ? ` on ${projectName}` : ''}.`, 'success');

    if (typeof onSaved === 'function') {
      onSaved();
    }
  });
}
