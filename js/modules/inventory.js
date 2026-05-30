/* ==========================================================================
   AeroGlass ERP Store & Inventory Module — v2.0
   ========================================================================== */

import { db } from '../db.js';
import { auth } from '../auth.js';
import { sync } from '../sync.js';
import { DateEngine, SystemDateFormatter } from '../dateEngine.js';

const app = new Proxy({}, {
  get: (target, prop) => window.app ? window.app[prop] : undefined
});

let selectedCategory = '';
let invSearchQuery = '';

/* ==========================================================================
   Main Inventory Entry Renderer
   ========================================================================== */
export async function renderInventory(container, routeParts = []) {
  const items = await db.getAll('inventory');
  const transactions = await db.getAll('transactions');
  const categories = await db.getAll('inventory_categories');
  const TODAY_STR = new Date().toISOString().split('T')[0];

  // Add import/export tools bar at top
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:24px;">
      <!-- Bulk Import/Export Tools -->
      <div class="glass-card" style="display:flex; align-items:center; gap:12px; padding:12px 20px; flex-wrap:wrap;">
        <span style="font-size:12px; font-weight:600; color:var(--text-secondary);">📂 Data Tools:</span>
        <input type="file" id="inv-file-upload" accept=".csv, .xlsx" style="font-size:12px; max-width:180px;" />
        <button id="inv-import-btn" class="btn btn-primary" style="padding:6px 12px; font-size:11px;">
          <i data-lucide="upload" style="width:14px; height:14px;"></i> Import
        </button>
        <button id="inv-export-csv-btn" class="btn btn-secondary" style="padding:6px 12px; font-size:11px;">
          <i data-lucide="file-spreadsheet" style="width:14px; height:14px;"></i> Export CSV
        </button>
        <button id="inv-export-xlsx-btn" class="btn btn-accent" style="padding:6px 12px; font-size:11px;">
          <i data-lucide="file-text" style="width:14px; height:14px;"></i> Export Excel
        </button>
      </div>

      <!-- Summary Stat Cards -->
      <div class="inventory-summary-cards">
        <div class="glass-card" style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <span class="muted-text" style="font-size:11px; text-transform:uppercase;">Registered Items</span>
            <h2 style="font-family:var(--font-heading); font-size:26px; font-weight:800; margin:4px 0;">${items.length}</h2>
            <p style="font-size:11px; color:var(--text-secondary);">Total catalog entries</p>
          </div>
          <i data-lucide="package" style="width:40px; height:40px; color:var(--primary-color);"></i>
        </div>

        <div class="glass-card" style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <span class="muted-text" style="font-size:11px; text-transform:uppercase;">Transactions</span>
            <h2 style="font-family:var(--font-heading); font-size:26px; font-weight:800; margin:4px 0;">${transactions.length}</h2>
            <p style="font-size:11px; color:var(--text-secondary);">Total ledger logs</p>
          </div>
          <i data-lucide="shuffle" style="width:40px; height:40px; color:var(--accent-color);"></i>
        </div>
      </div>

      <!-- Inventory Category Manager -->
      <div style="padding: 16px; background: #F9F9FB; border-radius: 12px; border: 1px solid var(--glass-border); display: flex; align-items: flex-end; gap: 16px;">
        <div style="flex-grow: 1;">
          <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 4px;">Create Custom Inventory Asset Category Class</label>
          <input type="text" id="new-cat-name" placeholder="e.g., Heavy Machinery, Safety Apparel, Glass Sheet Panels..." class="form-control-noicon" style="background: white;" />
        </div>
        <button id="add-cat-btn" class="btn btn-primary" style="padding: 10px 16px; font-size: 12px;">
          + Build Category
        </button>
      </div>

      <!-- Main Grid: Table + Transaction Form -->
      <div style="display:grid; grid-template-columns:2fr 1fr; gap:24px; align-items:start;">
        <!-- Item Registry Table -->
        <div class="glass-card" style="display:flex; flex-direction:column; gap:16px;">
          <!-- Header row with search + controls -->
          <div style="display:flex; flex-direction:column; gap:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
              <h3 style="font-size:16px; font-family:var(--font-heading); font-weight:700;">Item Master Registry</h3>
              <div style="display:flex; gap:10px; align-items:center;">
                <button id="batch-delete-btn" class="btn btn-danger hidden" style="padding:6px 14px; font-size:13px; display:flex; align-items:center; gap:6px;">
                  <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
                  <span id="batch-delete-text">Delete Selected (0)</span>
                </button>
                <button id="add-item-btn" class="btn btn-primary" style="padding:6px 14px; font-size:13px;">
                  <i data-lucide="plus"></i>
                  <span>Register Item</span>
                </button>
              </div>
            </div>

            <!-- Search bar + Category filter -->
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
              <div class="search-input-wrapper" style="flex-grow:1; min-width:200px;">
                <i data-lucide="search"></i>
                <input type="text" id="inv-search-input" placeholder="Search by name, code, category, description..." class="form-control" style="padding-top:7px; padding-bottom:7px; font-size:12px;" value="${invSearchQuery}">
              </div>
              <select id="inv-category-filter" class="form-control-noicon" style="padding:7px 12px; font-size:12px; min-width:150px;">
                <option value="">All Categories</option>
                ${categories.map(cat => `<option value="${cat.name.toLowerCase()}" ${selectedCategory === cat.name.toLowerCase() ? 'selected' : ''}>${cat.name}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="table-responsive">
            <table class="custom-table" style="font-size:13px;">
              <thead>
                <tr>
                  <th style="width: 40px; text-align: center;"><input type="checkbox" id="select-all-inv" /></th>
                  <th>Code</th>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="inventory-table-body">
                <!-- Injected dynamically -->
              </tbody>
            </table>
          </div>

          <div id="inv-no-results" class="text-center muted-text hidden" style="padding:24px; font-size:13px;">
            <i data-lucide="search-x" style="width:32px; height:32px; display:block; margin:0 auto 8px; opacity:0.4;"></i>
            No items match your search.
          </div>
        </div>

        <!-- Log Transaction Sidebar -->
        <div class="glass-card" style="display:flex; flex-direction:column; gap:16px;">
          <h3 style="font-size:15px; font-family:var(--font-heading); font-weight:700; border-bottom:1px solid var(--glass-border); padding-bottom:8px;">Log Stock Transaction</h3>
          <form id="stock-tx-form" style="display:flex; flex-direction:column; gap:12px;">
            <div class="input-group" style="margin-bottom:0;">
              <label>Select Item <span class="muted-text" style="font-size:10px;">(optional)</span></label>
              <select id="tx-item-select" class="form-control-noicon">
                <option value="">— Select —</option>
                ${items.map(item => `<option value="${item.id}">${item.code} - ${item.name} (${item.currentStock} ${item.unit})</option>`).join('')}
              </select>
            </div>

            <div class="input-group" style="margin-bottom:0;">
              <label>Transaction Type</label>
              <select id="tx-type-select" class="form-control-noicon">
                <option value="inward" selected>Inward (Receiving)</option>
                <option value="outward">Outward (Issuing)</option>
              </select>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              <div class="input-group" style="margin-bottom:0;">
                <label>Quantity</label>
                <input type="number" id="tx-quantity" class="form-control-noicon" min="1" placeholder="0">
              </div>
              <div class="input-group" style="margin-bottom:0;">
                <label>Date</label>
                <input type="date" id="tx-date" class="form-control-noicon" value="${TODAY_STR}">
              </div>
            </div>

            <div class="input-group" style="margin-bottom:0;">
              <label>Supplier / Purpose <span class="muted-text" style="font-size:10px;">(optional)</span></label>
              <input type="text" id="tx-purpose" class="form-control-noicon" placeholder="e.g. GlassCorp Ltd...">
            </div>

            <div class="input-group" style="margin-bottom:0;">
              <label>Hardware Name <span class="muted-text" style="font-size:10px;">(optional)</span></label>
              <input type="text" id="tx-hardware-name" class="form-control-noicon" placeholder="e.g. Door Handle, Aluminium Frame">
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              <div class="input-group" style="margin-bottom:0;">
                <label>Party Name <span class="muted-text" style="font-size:10px;">(optional)</span></label>
                <input type="text" id="tx-party-name" class="form-control-noicon" placeholder="Supplier / Client">
              </div>
              <div class="input-group" style="margin-bottom:0;">
                <label>Fitter / Helper Name <span class="muted-text" style="font-size:10px;">(optional)</span></label>
                <input type="text" id="tx-fitter-name" class="form-control-noicon" placeholder="Fitter or helper">
              </div>
            </div>

            <button type="submit" class="btn btn-primary btn-block">
              <i data-lucide="save"></i>
              <span>Commit Transaction</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  `;

  try { await populateItemsTable(); } catch (e) { console.error('Inventory table error:', e); }
  bindInventoryEvents(container);
  bindImportExportEvents(container);
  lucide.createIcons();
}

/* ==========================================================================
   Populate Inventory Table (with search + category filters)
   ========================================================================== */
async function populateItemsTable() {
  const tbody = document.getElementById('inventory-table-body');
  const noResults = document.getElementById('inv-no-results');
  if (!tbody) return;

  const items = await db.getAll('inventory');
  const transactions = await db.getAll('transactions');
  let filtered = items;

  // Category filter
  if (selectedCategory) {
    filtered = filtered.filter(i => i.category === selectedCategory);
  }

  // Search filter — name, code, category, description
  if (invSearchQuery) {
    const q = invSearchQuery.toLowerCase();
    filtered = filtered.filter(i =>
      (i.name || '').toLowerCase().includes(q) ||
      (i.code || '').toLowerCase().includes(q) ||
      (i.category || '').toLowerCase().includes(q) ||
      (i.description || '').toLowerCase().includes(q)
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    if (noResults) noResults.classList.remove('hidden');
    return;
  }
  if (noResults) noResults.classList.add('hidden');

  tbody.innerHTML = filtered.map(i => {
    const itemTx = transactions.filter(t => t.itemId === i.id).sort((a, b) => b.date.localeCompare(a.date));
    const lastLogDate = itemTx.length > 0 ? itemTx[0].date : (i.createdDate || 'N/A');
    
    return `
      <tr>
        <td style="text-align: center;"><input type="checkbox" class="inv-select-checkbox" data-id="${i.id}" /></td>
        <td><code>${i.code}</code></td>
        <td>
          <strong>${i.name}</strong>
          ${i.description ? `<span class="muted-text" style="font-size:11px; display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px;">${i.description}</span>` : ''}
        </td>
        <td><span class="badge primary">${i.category}</span></td>
        <td>
          <strong class="primary-text" style="font-size:15px;">${i.currentStock}</strong>
          <span style="font-size:10px;" class="muted-text"> ${i.unit}</span>
        </td>
        <td>
          ${lastLogDate}
        </td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-primary edit-item-btn" data-id="${i.id}" style="padding:4px 8px; font-size:11px;">
              <i data-lucide="pencil" style="width:12px; height:12px;"></i>
              Edit
            </button>
            <button class="btn btn-secondary inspect-tx-btn" data-id="${i.id}" style="padding:4px 8px; font-size:11px;">
              <i data-lucide="history" style="width:12px; height:12px;"></i>
              Logs
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  const selectAll = document.getElementById('select-all-inv');
  if (selectAll) selectAll.checked = false;
  const batchBtn = document.getElementById('batch-delete-btn');
  if (batchBtn) batchBtn.classList.add('hidden');
}

/* ==========================================================================
   Event Bindings
   ========================================================================== */
function bindInventoryEvents(container) {
  const updateBatchDeleteUI = () => {
    const checkboxes = document.querySelectorAll('.inv-select-checkbox');
    const checked = Array.from(checkboxes).filter(cb => cb.checked);
    const selectAll = document.getElementById('select-all-inv');
    const batchBtn = document.getElementById('batch-delete-btn');
    const batchText = document.getElementById('batch-delete-text');

    if (selectAll) {
      selectAll.checked = checkboxes.length > 0 && checked.length === checkboxes.length;
    }

    if (batchBtn && batchText) {
      if (checked.length > 0) {
        batchBtn.classList.remove('hidden');
        batchText.textContent = `Delete Selected (${checked.length})`;
      } else {
        batchBtn.classList.add('hidden');
      }
    }
  };

  // Search bar
  document.getElementById('inv-search-input')?.addEventListener('input', async (e) => {
    invSearchQuery = e.target.value;
    await populateItemsTable();
    bindTableButtons();
    lucide.createIcons();
  });

  // Add Category Button
  document.getElementById('add-cat-btn')?.addEventListener('click', async () => {
    const inputEl = document.getElementById('new-cat-name');
    if (!inputEl) return;
    const catName = inputEl.value.trim();
    if (!catName) return;

    const categories = await db.getAll('inventory_categories');
    if (categories.some(c => c.name.toLowerCase() === catName.toLowerCase())) {
      app.showToast('Duplicate Category', 'Category name declaration already verified inside standard register registry.', 'warning');
      return;
    }

    const newCat = { id: `cat-${Date.now()}`, name: catName };
    await db.put('inventory_categories', newCat);
    await sync.queueOperation('inventory_categories', 'insert', newCat);

    app.showToast('Category Created', `Added "${catName}" to system categories.`, 'success');
    inputEl.value = '';
    renderInventory(container);
  });

  // Category filter
  document.getElementById('inv-category-filter')?.addEventListener('change', async (e) => {
    selectedCategory = e.target.value;
    await populateItemsTable();
    bindTableButtons();
    lucide.createIcons();
  });

  // Register New Item button
  document.getElementById('add-item-btn')?.addEventListener('click', () => {
    openRegisterItemModal(container);
  });

  // Stock Transaction form
  document.getElementById('stock-tx-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleTransactionSubmit(container);
  });

  // Select All checkbox
  document.getElementById('select-all-inv')?.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    document.querySelectorAll('.inv-select-checkbox').forEach(cb => {
      cb.checked = isChecked;
    });
    updateBatchDeleteUI();
  });

  // Individual checkboxes (delegated to table body/container)
  document.getElementById('inventory-table-body')?.addEventListener('change', (e) => {
    if (e.target.classList.contains('inv-select-checkbox')) {
      updateBatchDeleteUI();
    }
  });

  // Batch delete button action
  document.getElementById('batch-delete-btn')?.addEventListener('click', async () => {
    const checkedBoxes = document.querySelectorAll('.inv-select-checkbox:checked');
    const ids = Array.from(checkedBoxes).map(cb => cb.getAttribute('data-id'));
    if (ids.length === 0) return;

    if (confirm(`Are you sure you want to delete ${ids.length} selected items from the catalog? This cannot be undone.`)) {
      for (const id of ids) {
        await db.delete('inventory', id);
        await sync.queueOperation('inventory', 'delete', id);
      }
      app.showToast('Batch Delete Successful', `Removed ${ids.length} items from inventory.`, 'success');
      renderInventory(container);
    }
  });

  bindTableButtons();
}

/* ==========================================================================
   Register Item Modal
   ========================================================================== */
function openRegisterItemModal(container) {
  const TODAY_STR = new Date().toISOString().split('T')[0];
  db.getAll('inventory_categories').then(categories => {
    const formHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="padding:8px 12px; background:rgba(59,130,246,0.08); border-left:3px solid var(--primary-color); border-radius:4px; font-size:12px; color:var(--text-secondary);">
          Only <strong>Item Name</strong> is required. All other fields are optional.
        </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
        <div class="input-group" style="margin-bottom:0;">
          <label>Item Code <span class="muted-text" style="font-size:10px;">(optional)</span></label>
          <input type="text" id="new-item-code" class="form-control-noicon" placeholder="e.g. GLS-15MM-TEM (auto-gen if empty)">
        </div>
        <div class="input-group" style="margin-bottom:0;">
          <label>Item Name <span style="color:var(--danger); font-size:11px;">*required</span></label>
          <input type="text" id="new-item-name" class="form-control-noicon" required placeholder="e.g. 15mm Tempered Glass Pane">
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
        <div class="input-group" style="margin-bottom:0;">
          <label>Category</label>
          <select id="new-item-category" class="form-control-noicon">
            ${categories.map(cat => `<option value="${cat.name.toLowerCase()}">${cat.name}</option>`).join('')}
          </select>
        </div>
        <div class="input-group" style="margin-bottom:0;">
          <label>Unit Measure <span class="muted-text" style="font-size:10px;">(optional)</span></label>
          <input type="text" id="new-item-unit" class="form-control-noicon" placeholder="e.g. SqFt, Pcs, Bottles">
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
        <div class="input-group" style="margin-bottom:0;">
          <label>Opening Stock Balance <span class="muted-text" style="font-size:10px;">(optional)</span></label>
          <input type="number" id="new-item-init" class="form-control-noicon" min="0" placeholder="e.g. 50">
        </div>
      </div>

      <div class="input-group" style="margin-bottom:0;">
        <label>Description <span class="muted-text" style="font-size:10px;">(optional)</span></label>
        <textarea id="new-item-desc" class="form-control-noicon" rows="2" placeholder="State dimensions, brand, or spec details..."></textarea>
      </div>

      <button type="button" id="register-item-submit-btn" class="btn btn-primary btn-block">
        <i data-lucide="package-plus"></i>
        <span>Register Catalog Item</span>
      </button>
    </div>
    `;

    app.openModal('Register Inventory Item', formHTML);

  document.getElementById('register-item-submit-btn')?.addEventListener('click', async () => {
    const nameEl = document.getElementById('new-item-name');
    const name = nameEl?.value?.trim();
    if (!name) {
      app.showToast('Name Required', 'Item Name is the only required field.', 'warning');
      nameEl?.focus();
      return;
    }

    const rawCode = document.getElementById('new-item-code')?.value?.trim().toUpperCase();
    const code = rawCode || `ITM-${Date.now()}`;
    const category = document.getElementById('new-item-category')?.value || 'others';
    const unit = document.getElementById('new-item-unit')?.value?.trim() || 'Pcs';
    const currentStock = parseInt(document.getElementById('new-item-init')?.value || '0') || 0;
    const description = document.getElementById('new-item-desc')?.value?.trim() || '';
    const TODAY_STR = new Date().toISOString().split('T')[0];

    // Duplicate code check
    const allItems = await db.getAll('inventory');
    if (rawCode && allItems.some(i => i.code === code)) {
      app.showToast('Duplicate Code', `Item code [${code}] already exists. Leave blank for auto-generated code.`, 'danger');
      return;
    }

    const id = `inv-${Date.now()}`;
    const newItem = { id, code, name, category, unit, currentStock, description, createdDate: TODAY_STR };
    await db.put('inventory', newItem);
    await sync.queueOperation('inventory', 'insert', newItem);

    // Opening balance transaction
    if (currentStock > 0) {
      const txId = `tx-${Date.now()}`;
      await db.put('transactions', { id: txId, itemId: id, type: 'inward', quantity: currentStock, sourceOrPurpose: 'Opening balance', date: SystemDateFormatter.toSystemFormat(new Date()) });
    }

    app.closeModal();
    app.showToast('Item Registered', `"${name}" added to inventory catalog.`, 'success');
    renderInventory(container);
  });
  });
}

/* ==========================================================================
   Edit Item Modal — pre-fills all fields for editing
   ========================================================================== */
async function openEditItemModal(itemId, container) {
  const item = await db.get('inventory', itemId);
  const categories = await db.getAll('inventory_categories');
  if (!item) return;

  const formHTML = `
    <div style="display:flex; flex-direction:column; gap:16px;">
      <div style="padding:8px 12px; background:rgba(139,92,246,0.08); border-left:3px solid var(--accent-color); border-radius:4px; font-size:12px; color:var(--text-secondary);">
        Editing <strong><code>${item.code}</code> — ${item.name}</strong>. Only Item Name is required.
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
        <div class="input-group" style="margin-bottom:0;">
          <label>Item Code <span class="muted-text" style="font-size:10px;">(editable)</span></label>
          <input type="text" id="edit-item-code" class="form-control-noicon" value="${item.code || ''}">
        </div>
        <div class="input-group" style="margin-bottom:0;">
          <label>Item Name <span style="color:var(--danger); font-size:11px;">*required</span></label>
          <input type="text" id="edit-item-name" class="form-control-noicon" required value="${item.name || ''}">
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
        <div class="input-group" style="margin-bottom:0;">
          <label>Category</label>
          <select id="edit-item-category" class="form-control-noicon">
            ${categories.map(cat => `<option value="${cat.name.toLowerCase()}" ${item.category === cat.name.toLowerCase() ? 'selected' : ''}>${cat.name}</option>`).join('')}
          </select>
        </div>
        <div class="input-group" style="margin-bottom:0;">
          <label>Unit Measure</label>
          <input type="text" id="edit-item-unit" class="form-control-noicon" value="${item.unit || ''}">
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
        <div class="input-group" style="margin-bottom:0;">
          <label>Current Stock <span class="muted-text" style="font-size:10px;">(direct override)</span></label>
          <input type="number" id="edit-item-stock" class="form-control-noicon" min="0" value="${item.currentStock || 0}">
        </div>
      </div>

      <div class="input-group" style="margin-bottom:0;">
        <label>Description</label>
        <textarea id="edit-item-desc" class="form-control-noicon" rows="2">${item.description || ''}</textarea>
      </div>

      <div style="display:flex; gap:10px;">
        <button type="button" id="edit-item-save-btn" class="btn btn-primary" style="flex-grow:1;">
          <i data-lucide="save"></i>
          <span>Save Changes</span>
        </button>
        <button type="button" id="edit-item-delete-btn" class="btn btn-danger" style="padding:10px 16px;">
          <i data-lucide="trash-2"></i>
          <span>Delete Item</span>
        </button>
      </div>
    </div>
  `;

  app.openModal(`Edit Item — ${item.name}`, formHTML, '600px');

  // Save handler
  document.getElementById('edit-item-save-btn')?.addEventListener('click', async () => {
    const name = document.getElementById('edit-item-name')?.value?.trim();
    if (!name) {
      app.showToast('Name Required', 'Item Name cannot be empty.', 'warning');
      return;
    }

    const updatedItem = {
      ...item,
      code: document.getElementById('edit-item-code')?.value?.trim().toUpperCase() || item.code,
      name,
      category: document.getElementById('edit-item-category')?.value || item.category,
      unit: document.getElementById('edit-item-unit')?.value?.trim() || item.unit,
      currentStock: parseInt(document.getElementById('edit-item-stock')?.value || '0') || 0,
      description: document.getElementById('edit-item-desc')?.value?.trim() || ''
    };

    await db.put('inventory', updatedItem);
    await sync.queueOperation('inventory', 'update', updatedItem);

    app.closeModal();
    app.showToast('Item Updated', `"${name}" has been updated successfully.`, 'success');
    renderInventory(container);
  });

  // Delete handler
  document.getElementById('edit-item-delete-btn')?.addEventListener('click', async () => {
    if (!confirm(`Are you sure you want to delete "${item.name}" from the catalog? This cannot be undone.`)) return;

    await db.delete('inventory', itemId);
    await sync.queueOperation('inventory', 'delete', itemId);

    app.closeModal();
    app.showToast('Item Deleted', `"${item.name}" removed from inventory.`, 'info');
    renderInventory(container);
  });
}

/* ==========================================================================
   Handle Transaction Form Submit
   ========================================================================== */
async function handleTransactionSubmit(container) {
  const itemId = document.getElementById('tx-item-select')?.value;
  const type = document.getElementById('tx-type-select')?.value || 'inward';
  const quantityRaw = document.getElementById('tx-quantity')?.value;
  const rawDate = document.getElementById('tx-date')?.value || new Date();
  const date = SystemDateFormatter.toSystemFormat(rawDate);
  const purpose = document.getElementById('tx-purpose')?.value?.trim() || 'General transaction';
  const hardwareName = document.getElementById('tx-hardware-name')?.value?.trim() || '';
  const partyName = document.getElementById('tx-party-name')?.value?.trim() || '';
  const fitterName = document.getElementById('tx-fitter-name')?.value?.trim() || '';
  const quantity = parseInt(quantityRaw || '0');

  if (!itemId) {
    app.showToast('Select Item', 'Please select an inventory item for the transaction.', 'warning');
    return;
  }
  if (!quantity || quantity < 1) {
    app.showToast('Invalid Quantity', 'Please enter a valid quantity (minimum 1).', 'warning');
    return;
  }

  const item = await db.get('inventory', itemId);
  if (!item) return;

  // Outward validation
  if (type === 'outward' && item.currentStock < quantity) {
    app.showToast('Exceeded Stock', `Only ${item.currentStock} ${item.unit} in stock, cannot issue ${quantity}.`, 'danger');
    return;
  }

  const oldStock = item.currentStock;
  item.currentStock = type === 'inward' ? item.currentStock + quantity : item.currentStock - quantity;

  await db.put('inventory', item);
  await sync.queueOperation('inventory', 'update', item);

  const txId = `tx-${Date.now()}`;
  const txRecord = { id: txId, itemId, type, quantity, sourceOrPurpose: purpose, hardwareName, partyName, fitterName, date };
  await db.put('transactions', txRecord);
  await sync.queueOperation('transactions', 'insert', txRecord);

  app.showToast('Transaction Logged', `${type === 'inward' ? 'Received' : 'Issued'} ${quantity} ${item.unit} of ${item.name}. Stock: ${oldStock} → ${item.currentStock}`, 'success');
  renderInventory(container);
}

/* ==========================================================================
   Table Row Button Bindings
   ========================================================================== */
/* ==========================================================================
   Recalculate Stock Helper
   ========================================================================== */
async function recalculateStock(itemId) {
  const item = await db.get('inventory', itemId);
  const allTx = await db.getAll('transactions');
  const itemTx = allTx.filter(t => t.itemId === itemId);
  let calculated = 0;
  itemTx.forEach(t => {
     calculated += (t.type === 'inward' ? t.quantity : -t.quantity);
  });
  item.currentStock = calculated;
  await db.put('inventory', item);
  await sync.queueOperation('inventory', 'update', item);
  return calculated;
}

function bindTableButtons() {
  // Edit button → opens Edit modal
  document.querySelectorAll('.edit-item-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const itemId = btn.getAttribute('data-id');
      const container = document.getElementById('view-content');
      await openEditItemModal(itemId, container);
    });
  });

  // Inspect Logs button → opens transaction history modal
  document.querySelectorAll('.inspect-tx-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const itemId = btn.getAttribute('data-id');
      const item = await db.get('inventory', itemId);
      const allTx = await db.getAll('transactions');
      let itemTx = allTx.filter(t => t.itemId === itemId).sort((a, b) => b.date.localeCompare(a.date));

      const modalHTML = `
        <div style="display:flex; flex-direction:column; gap:14px;">
          <!-- Item summary bar -->
          <div style="display:flex; gap:20px; flex-wrap:wrap; font-size:13px; padding:12px; background:rgba(0,0,0,0.1); border-radius:8px;">
            <span><strong>Code:</strong> <code>${item.code}</code></span>
            <span><strong>Unit:</strong> ${item.unit}</span>
            <span><strong>Current Stock:</strong> <span class="primary-text font-bold" id="modal-current-stock">${item.currentStock} ${item.unit}</span></span>
          </div>

          <!-- Log Management Tools -->
          <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; border-bottom:1px solid var(--glass-border); padding-bottom:10px;">
             <div>
                <label style="font-size:11px; display:block; margin-bottom:4px;" class="muted-text">Import Log CSV</label>
                <input type="file" id="modal-log-import" accept=".csv" style="font-size:11px; max-width:180px;">
             </div>
             <button type="button" id="modal-log-export-btn" class="btn btn-secondary" style="padding:4px 10px; font-size:11px; margin-top:16px;">
               <i data-lucide="download"></i> Download Logs
             </button>
          </div>

          <!-- Search transactions -->
          <div class="search-input-wrapper">
            <i data-lucide="search"></i>
            <input type="text" id="tx-log-search" placeholder="Filter by date, type, supplier..." class="form-control" style="padding-top:7px; padding-bottom:7px; font-size:12px;">
          </div>

          <div style="max-height:380px; overflow-y:auto;">
            <div class="inv-log-table-wrapper">
              <table class="inv-log-table" id="tx-log-table">
                <thead>
                  <tr>
                    <th>S NO</th>
                    <th>DATE</th>
                    <th>HARDWARE NAME</th>
                    <th>PARTY NAME</th>
                    <th>FITTER NAME /HELPAR NAME</th>
                    <th>INPUT</th>
                    <th class="output-col">OUTPUT</th>
                    <th>TOTAL</th>
                  </tr>
                </thead>
                <tbody id="tx-log-body">
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      app.openModal(`Transaction Logs — ${item.name}`, modalHTML, '650px');

      const renderModalLogs = (txData) => {
        const body = document.getElementById('tx-log-body');
        if (body) {
           body.innerHTML = renderTxRows(txData);
           body.querySelectorAll('.log-edit').forEach(input => {
             input.addEventListener('change', async (e) => {
                const txId = e.target.getAttribute('data-id');
                const field = e.target.getAttribute('data-field');
                let val = e.target.value;
                if (field === 'quantity') val = parseInt(val) || 0;
                if (field === 'date') val = SystemDateFormatter.toSystemFormat(val);

                const tx = await db.get('transactions', txId);
                if (tx) {
                   tx[field] = val;
                   await db.put('transactions', tx);
                   await sync.queueOperation('transactions', 'update', tx);
                   
                   // Recalculate stock only for quantity/type changes
                   if (field === 'quantity' || field === 'type') {
                     const newStock = await recalculateStock(itemId);
                     const ms = document.getElementById('modal-current-stock');
                     if (ms) ms.innerText = newStock + ' ' + item.unit;
                   }
                   
                   // Re-render to update running totals
                   const allTxRefresh = await db.getAll('transactions');
                   const refreshedTx = allTxRefresh.filter(t => t.itemId === itemId).sort((a, b) => b.date.localeCompare(a.date));
                   renderModalLogs(refreshedTx);
                   populateItemsTable();
                }
             });
           });
        }
      };

      renderModalLogs(itemTx);

      // Bind log search — includes all new register fields
      document.getElementById('tx-log-search')?.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        const filteredTx = itemTx.filter(t =>
          (t.date || '').includes(q) ||
          (t.type || '').includes(q) ||
          (t.sourceOrPurpose || '').toLowerCase().includes(q) ||
          (t.hardwareName || '').toLowerCase().includes(q) ||
          (t.partyName || '').toLowerCase().includes(q) ||
          (t.fitterName || '').toLowerCase().includes(q)
        );
        renderModalLogs(filteredTx);
      });

      // Bind import
      document.getElementById('modal-log-import')?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        Papa.parse(file, {
          header: true,
          dynamicTyping: true,
          complete: async (results) => {
            let count = 0;
            for (const row of results.data) {
              if (!row.date || !row.quantity) continue;
              const txId = `tx-${Date.now()}-${count}`;
              const type = (row.type || row.Type || 'inward').toLowerCase();
              const quantity = parseInt(row.quantity || row.Quantity) || 0;
              const sourceOrPurpose = row.description || row.sourceOrPurpose || row.Description || '';
              let date = row.date || row.Date || new Date();
              date = SystemDateFormatter.toSystemFormat(date);
              
              const newTx = { id: txId, itemId, type, quantity, sourceOrPurpose, date };
              await db.put('transactions', newTx);
              await sync.queueOperation('transactions', 'insert', newTx);
              count++;
            }
            if (count > 0) {
               const newStock = await recalculateStock(itemId);
               const ms = document.getElementById('modal-current-stock');
               if (ms) ms.innerText = newStock + ' ' + item.unit;
               app.showToast('Logs Imported', `Imported ${count} records.`, 'success');
               
               const allTxRef = await db.getAll('transactions');
               itemTx = allTxRef.filter(t => t.itemId === itemId).sort((a, b) => b.date.localeCompare(a.date));
               renderModalLogs(itemTx);
               populateItemsTable();
            }
            e.target.value = '';
          }
        });
      });

      // Bind export — full register columns
      document.getElementById('modal-log-export-btn')?.addEventListener('click', () => {
        let runTotal = 0;
        const sorted = [...itemTx].sort((a, b) => a.date.localeCompare(b.date));
        const rows = sorted.map((t, i) => {
          const isInward = t.type === 'inward';
          const input = isInward ? t.quantity : '';
          const output = !isInward ? t.quantity : '';
          runTotal += isInward ? t.quantity : -t.quantity;
          return {
            'S NO': i + 1,
            'DATE': t.date,
            'HARDWARE NAME': t.hardwareName || '',
            'PARTY NAME': t.partyName || '',
            'FITTER NAME / HELPER NAME': t.fitterName || t.sourceOrPurpose || '',
            'INPUT': input,
            'OUTPUT': output,
            'TOTAL': runTotal
          };
        });
        const csv = Papa.unparse(rows);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${item.name}_register_log.csv`;
        link.click();
        URL.revokeObjectURL(url);
      });
    });
  });
}

function renderTxRows(txList) {
  if (txList.length === 0) return `<tr><td colspan="8" style="text-align:center; padding:20px; color:#555;">No transactions found.</td></tr>`;
  
  // Sort chronologically for running total calculation
  const sorted = [...txList].sort((a, b) => a.date.localeCompare(b.date));
  let runningTotal = 0;

  return sorted.map((t, i) => {
    const isInward = t.type === 'inward';
    const inputVal = isInward ? t.quantity : '';
    const outputVal = !isInward ? t.quantity : '';
    runningTotal += isInward ? t.quantity : -t.quantity;

    // Parse sourceOrPurpose for party/fitter info
    const source = t.sourceOrPurpose || '';

    return `
      <tr>
        <td class="text-center">${i + 1}</td>
        <td>
          <input type="date" class="log-edit-field log-edit" data-id="${t.id}" data-field="date" value="${DateEngine.toPickerFormat(t.date)}" style="width:120px;">
        </td>
        <td class="uppercase">
          <input type="text" class="log-edit-field log-edit" data-id="${t.id}" data-field="hardwareName" value="${t.hardwareName || t.itemName || ''}" style="width:100%;" placeholder="—">
        </td>
        <td>
          <input type="text" class="log-edit-field log-edit" data-id="${t.id}" data-field="partyName" value="${t.partyName || ''}" style="width:100%;" placeholder="—">
        </td>
        <td>
          <input type="text" class="log-edit-field log-edit" data-id="${t.id}" data-field="fitterName" value="${t.fitterName || source}" style="width:100%;" placeholder="—">
        </td>
        <td class="text-center">${inputVal}</td>
        <td class="text-center">${outputVal}</td>
        <td class="text-center" style="font-weight:700;">${runningTotal}</td>
      </tr>
    `;
  }).join('');
}

/* ==========================================================================
   Bulk Import / Export (CSV & Excel) Event Bindings
   ========================================================================== */
function bindImportExportEvents(container) {
  // --- IMPORT: Parse uploaded CSV or Excel file ---
  document.getElementById('inv-import-btn')?.addEventListener('click', async () => {
    const fileInput = document.getElementById('inv-file-upload');
    const file = fileInput?.files?.[0];
    if (!file) {
      app.showToast('No File Selected', 'Please select a .csv or .xlsx file first.', 'warning');
      return;
    }

    const extension = file.name.split('.').pop().toLowerCase();
    let importedData = [];

    try {
      if (extension === 'csv') {
        const text = await file.text();
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
        importedData = parsed.data;
      } else if (extension === 'xlsx') {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        importedData = XLSX.utils.sheet_to_json(ws);
      } else {
        app.showToast('Invalid Format', 'Only .csv and .xlsx files are supported.', 'danger');
        return;
      }
    } catch (parseErr) {
      console.error('File parse error:', parseErr);
      app.showToast('Parse Error', 'Failed to read the file. Check the format and try again.', 'danger');
      return;
    }

    if (!importedData || importedData.length === 0) {
      app.showToast('Empty Data', 'The file contains no records to import.', 'warning');
      return;
    }

    // Map generic column names to our schema
    let imported = 0;
    const existingItems = await db.getAll('inventory');

    for (const row of importedData) {
      const name = row.name || row.Name || row.ITEM_NAME || row['Item Name'] || '';
      if (!name) continue;

      const code = (row.code || row.Code || row.ITEM_CODE || row['Item Code'] || '').toString().trim().toUpperCase() || `ITM-${Date.now()}-${imported}`;
      // Skip duplicate codes
      if (existingItems.some(i => i.code === code) || (await db.getAll('inventory')).some(i => i.code === code)) continue;

      const category = row.category || row.Category || row.CATEGORY || row['Category'] || 'others';
      const unit = row.unit || row.Unit || row.UNIT || row['Unit'] || 'Pcs';
      const currentStock = parseInt(row.currentStock || row.CurrentStock || row.CURRENT_STOCK || row['Current Stock'] || row.stock || row.Stock || '0') || 0;
      const description = row.description || row.Description || row.DESCRIPTION || row['Description'] || '';

      const id = `inv-${Date.now()}-${imported}`;
      const TODAY_STR = new Date().toISOString().split('T')[0];
      const newItem = { id, code, name, category, unit, currentStock, description, createdDate: TODAY_STR };
      await db.put('inventory', newItem);
      await sync.queueOperation('inventory', 'insert', newItem);
      imported++;
    }

    fileInput.value = '';
    app.showToast('Import Complete', `Successfully imported ${imported} new items from ${file.name}.`, 'success');
    renderInventory(container);
  });

  // --- EXPORT CSV ---
  document.getElementById('inv-export-csv-btn')?.addEventListener('click', async () => {
    const items = await db.getAll('inventory');
    if (items.length === 0) {
      app.showToast('No Data', 'No inventory items to export.', 'warning');
      return;
    }
    const csv = Papa.unparse(items.map(i => ({
      code: i.code,
      name: i.name,
      category: i.category,
      unit: i.unit,
      currentStock: i.currentStock,
      createdDate: i.createdDate,
      description: i.description
    })));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    app.showToast('Export Complete', `Downloaded ${items.length} items as CSV.`, 'success');
  });

  // --- EXPORT Excel ---
  document.getElementById('inv-export-xlsx-btn')?.addEventListener('click', async () => {
    const items = await db.getAll('inventory');
    if (items.length === 0) {
      app.showToast('No Data', 'No inventory items to export.', 'warning');
      return;
    }
    const data = items.map(i => ({
      Code: i.code,
      Name: i.name,
      Category: i.category,
      Unit: i.unit,
      'Current Stock': i.currentStock,
      'Created Date': i.createdDate,
      Description: i.description
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    XLSX.writeFile(wb, `inventory_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    app.showToast('Export Complete', `Downloaded ${items.length} items as Excel.`, 'success');
  });
}
