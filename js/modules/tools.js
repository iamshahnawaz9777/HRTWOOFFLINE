import { db } from '../db.js';
import { DateEngine } from '../dateEngine.js';
import { sync } from '../sync.js';

const app = new Proxy({}, {
  get: (target, prop) => window.app ? window.app[prop] : undefined
});

let isManualEmployee = false;

export async function renderTools(container) {
  const employees = await db.getAll('employees');
  const toolsDatabase = await db.getAll('tools_tracking');

  const defaultDate = new Date().toISOString().split('T')[0];

  container.innerHTML = `
    <div style="display:grid; grid-template-columns: 1fr 2fr; gap: 24px; align-items: start;">
      <!-- ISSUE TOOL FORM -->
      <div class="glass-card" style="display:flex; flex-direction:column; gap:16px;">
        <h3 style="font-size:16px; font-family:var(--font-heading); font-weight:700;">🔧 Issue Tool Registry</h3>
        <form id="issue-tool-form" style="display:flex; flex-direction:column; gap:14px;">
          
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
                <th>Tool Set</th>
                <th>Issued</th>
                <th>Returned</th>
                <th>Status</th>
                <th style="text-align:center;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${toolsDatabase.length === 0 ? `<tr><td colspan="6" class="text-center muted-text" style="padding:20px;">No tools issued yet.</td></tr>` : ''}
              ${toolsDatabase.sort((a,b) => b.id.localeCompare(a.id)).map(record => `
                <tr>
                  <td style="font-weight:600;">${record.employeeName}</td>
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
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  bindEvents(container);
  lucide.createIcons();
}

function bindEvents(container) {
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
      toolDetails,
      dateTaken: DateEngine.stringify(rawDateTaken),
      dateReturned: '',
      expectedReturn: DateEngine.stringify(rawDateExpected),
      status: 'Issued'
    };

    await db.put('tools_tracking', newRecord);
    await sync.queueOperation('tools_tracking', 'insert', newRecord);

    app.showToast('Tool Issued', `Successfully logged allotment for ${employeeName}.`, 'success');
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
}
