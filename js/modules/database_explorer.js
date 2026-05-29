/* ==========================================================================
   AeroGlass ERP Database Table Explorer Module
   ========================================================================== */

import { db } from '../db.js';
import { sync } from '../sync.js';

const app = new Proxy({}, {
  get: (target, prop) => window.app ? window.app[prop] : undefined
});

export async function renderDatabaseExplorer(container) {
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:24px;">
      <!-- Database Table Editor -->
      <div class="glass-card" style="display:flex; flex-direction:column; gap:16px;">
        <h3 style="font-size:15px; font-family:var(--font-heading); font-weight:700;">Database Table Explorer</h3>
        <p class="muted-text" style="font-size:12px;">Browse and edit raw table data directly in an editable grid.</p>
        
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn btn-secondary table-select-btn active" data-table="inventory" style="padding:6px 14px; font-size:12px;">Inventory</button>
          <button class="btn btn-secondary table-select-btn" data-table="employees" style="padding:6px 14px; font-size:12px;">Employees</button>
          <button class="btn btn-secondary table-select-btn" data-table="tasks" style="padding:6px 14px; font-size:12px;">Tasks</button>
          <button class="btn btn-secondary table-select-btn" data-table="gatepasses" style="padding:6px 14px; font-size:12px;">Gate Passes</button>
          <button class="btn btn-secondary table-select-btn" data-table="transactions" style="padding:6px 14px; font-size:12px;">Transactions</button>
          <button class="btn btn-secondary table-select-btn" data-table="projects" style="padding:6px 14px; font-size:12px;">Projects</button>
        </div>
        
        <div id="db-table-editor-container" style="overflow:auto; max-height:550px; border:1px solid var(--glass-border); border-radius:var(--radius-md);">
          <table class="custom-table" style="font-size:11px;" id="db-table-editor-table">
            <thead id="db-table-head"></thead>
            <tbody id="db-table-body"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  bindTableEditorEvents(container);
  lucide.createIcons();
}

function bindTableEditorEvents(container) {
  let currentTable = 'inventory';

  const loadTableData = async (tableName) => {
    const head = document.getElementById('db-table-head');
    const body = document.getElementById('db-table-body');
    if (!head || !body) return;

    const data = await db.getAll(tableName);
    if (data.length === 0) {
      head.innerHTML = '';
      body.innerHTML = '<tr><td class="text-center muted-text" style="padding:20px;">No records found in this table.</td></tr>';
      return;
    }

    const keys = Object.keys(data[0]);
    head.innerHTML = `<tr>${keys.map(k => `<th style="padding:8px; font-size:10px; white-space:nowrap;">${k}</th>`).join('')}</tr>`;

    body.innerHTML = data.slice(0, 50).map((row, ri) => `
      <tr>
        ${keys.map(key => {
      let val = row[key];
      if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
      if (val === undefined || val === null) val = '';
      return `<td style="padding:4px 6px; max-width:200px; overflow:hidden; text-overflow:ellipsis;">
            <input type="text" class="form-control-noicon cell-edit" data-table="${tableName}" data-row-id="${row.id || ri}" data-key="${key}" value="${typeof val === 'string' ? val.replace(/"/g, '"') : val}" style="width:100%; padding:2px 4px; font-size:10px; background:transparent; border:none;" />
          </td>`;
    }).join('')}
      </tr>
    `).join('');

    // Bind cell edits
    body.querySelectorAll('.cell-edit').forEach(input => {
      let timeout;
      input.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(async () => {
          const tbl = input.getAttribute('data-table');
          const rowId = input.getAttribute('data-row-id');
          const key = input.getAttribute('data-key');
          const newVal = input.value;

          const allData = await db.getAll(tbl);
          let record = allData.find(r => (r.id || r.username) === rowId);
          if (!record) return;

          // Try to parse numbers
          record[key] = isNaN(newVal) ? newVal : Number(newVal);
          await db.put(tbl, record);
          await sync.queueOperation(tbl, 'update', record);
        }, 600);
      });
    });
  };

  // Initial load
  loadTableData('inventory');

  // Tab switching
  container.querySelectorAll('.table-select-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.table-select-btn').forEach(b => {
        b.className = 'btn btn-secondary table-select-btn';
        b.style.cssText = 'padding:6px 14px; font-size:12px;';
      });
      btn.className = 'btn btn-primary table-select-btn';
      btn.style.cssText = 'padding:6px 14px; font-size:12px;';
      currentTable = btn.getAttribute('data-table');
      loadTableData(currentTable);
    });
  });
}
