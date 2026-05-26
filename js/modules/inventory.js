/* ==========================================================================
   AeroGlass ERP Store & Inventory Module — v2.0
   ========================================================================== */

import { db } from '../db.js';
import { auth } from '../auth.js';
import { sync } from '../sync.js';

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
  const lowStockItems = items.filter(item => item.currentStock <= item.minStock);
  const TODAY_STR = new Date().toISOString().split('T')[0];

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:24px;">
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
            <span class="muted-text" style="font-size:11px; text-transform:uppercase;">Low Stock Alerts</span>
            <h2 style="font-family:var(--font-heading); font-size:26px; font-weight:800; margin:4px 0;" class="${lowStockItems.length > 0 ? 'danger-text' : 'success-text'}">${lowStockItems.length}</h2>
            <p style="font-size:11px; color:var(--text-secondary);">Items below threshold</p>
          </div>
          <i data-lucide="alert-triangle" style="width:40px; height:40px; color:${lowStockItems.length > 0 ? 'var(--danger)' : 'var(--success)'};"></i>
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

      <!-- Low stock banner -->
      ${lowStockItems.length > 0 ? `
        <div class="alert-bar" style="margin-bottom:0;">
          <i data-lucide="bell" class="spinning"></i>
          <div><strong>Reorder Alert:</strong> Below minimum safety levels: <code>${lowStockItems.map(i => i.code).join(', ')}</code></div>
        </div>
      ` : ''}

      <!-- Main Grid: Table + Transaction Form -->
      <div style="display:grid; grid-template-columns:2fr 1fr; gap:24px; align-items:start;">
        <!-- Item Registry Table -->
        <div class="glass-card" style="display:flex; flex-direction:column; gap:16px;">
          <!-- Header row with search + controls -->
          <div style="display:flex; flex-direction:column; gap:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
              <h3 style="font-size:16px; font-family:var(--font-heading); font-weight:700;">Item Master Registry</h3>
              <button id="add-item-btn" class="btn btn-primary" style="padding:6px 14px; font-size:13px;">
                <i data-lucide="plus"></i>
                <span>Register Item</span>
              </button>
            </div>

            <!-- Search bar + Category filter -->
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
              <div class="search-input-wrapper" style="flex-grow:1; min-width:200px;">
                <i data-lucide="search"></i>
                <input type="text" id="inv-search-input" placeholder="Search by name, code, category, description..." class="form-control" style="padding-top:7px; padding-bottom:7px; font-size:12px;" value="${invSearchQuery}">
              </div>
              <select id="inv-category-filter" class="form-control-noicon" style="padding:7px 12px; font-size:12px; min-width:150px;">
                <option value="">All Categories</option>
                <option value="glass sheets" ${selectedCategory === 'glass sheets' ? 'selected' : ''}>Glass Sheets</option>
                <option value="hardware" ${selectedCategory === 'hardware' ? 'selected' : ''}>Hardware Fittings</option>
                <option value="tools" ${selectedCategory === 'tools' ? 'selected' : ''}>Tools &amp; Kits</option>
                <option value="chemicals" ${selectedCategory === 'chemicals' ? 'selected' : ''}>Chemicals</option>
                <option value="others" ${selectedCategory === 'others' ? 'selected' : ''}>Others</option>
              </select>
            </div>
          </div>

          <div class="table-responsive">
            <table class="custom-table" style="font-size:13px;">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th>Min Level</th>
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
    const isLow = i.currentStock <= i.minStock;
    return `
      <tr>
        <td><code>${i.code}</code></td>
        <td>
          <strong>${i.name}</strong>
          ${i.description ? `<span class="muted-text" style="font-size:11px; display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px;">${i.description}</span>` : ''}
        </td>
        <td><span class="badge primary">${i.category}</span></td>
        <td>
          <strong class="${isLow ? 'danger-text' : 'success-text'}" style="font-size:15px;">${i.currentStock}</strong>
          <span style="font-size:10px;" class="muted-text"> ${i.unit}</span>
          ${isLow ? '<span class="badge danger" style="font-size:8px; display:block; margin-top:2px;">LOW</span>' : ''}
        </td>
        <td>
          <input type="number" class="form-control-noicon min-stock-input" data-id="${i.id}" value="${i.minStock}" style="width:70px; padding:3px 6px; font-size:12px; text-align:center;" min="0">
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
}

/* ==========================================================================
   Event Bindings
   ========================================================================== */
function bindInventoryEvents(container) {
  // Search bar
  document.getElementById('inv-search-input')?.addEventListener('input', async (e) => {
    invSearchQuery = e.target.value;
    await populateItemsTable();
    bindTableButtons();
    lucide.createIcons();
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

  bindTableButtons();
}

/* ==========================================================================
   Register Item Modal
   ========================================================================== */
function openRegisterItemModal(container) {
  const TODAY_STR = new Date().toISOString().split('T')[0];
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
            <option value="glass sheets">Glass Sheets</option>
            <option value="hardware">Hardware Fittings</option>
            <option value="tools">Tools &amp; Kits</option>
            <option value="chemicals">Chemicals</option>
            <option value="others">Others</option>
          </select>
        </div>
        <div class="input-group" style="margin-bottom:0;">
          <label>Unit Measure <span class="muted-text" style="font-size:10px;">(optional)</span></label>
          <input type="text" id="new-item-unit" class="form-control-noicon" placeholder="e.g. SqFt, Pcs, Bottles">
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
        <div class="input-group" style="margin-bottom:0;">
          <label>Min Safety Stock <span class="muted-text" style="font-size:10px;">(optional)</span></label>
          <input type="number" id="new-item-min" class="form-control-noicon" min="0" placeholder="e.g. 20">
        </div>
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
    const minStock = parseInt(document.getElementById('new-item-min')?.value || '0') || 0;
    const currentStock = parseInt(document.getElementById('new-item-init')?.value || '0') || 0;
    const description = document.getElementById('new-item-desc')?.value?.trim() || '';

    // Duplicate code check
    const allItems = await db.getAll('inventory');
    if (rawCode && allItems.some(i => i.code === code)) {
      app.showToast('Duplicate Code', `Item code [${code}] already exists. Leave blank for auto-generated code.`, 'danger');
      return;
    }

    const id = `inv-${Date.now()}`;
    const newItem = { id, code, name, category, unit, minStock, currentStock, description };
    await db.put('inventory', newItem);
    await sync.queueOperation('inventory', 'insert', newItem);

    // Opening balance transaction
    if (currentStock > 0) {
      const txId = `tx-${Date.now()}`;
      await db.put('transactions', { id: txId, itemId: id, type: 'inward', quantity: currentStock, sourceOrPurpose: 'Opening balance', date: new Date().toISOString().split('T')[0] });
    }

    app.closeModal();
    app.showToast('Item Registered', `"${name}" added to inventory catalog.`, 'success');
    renderInventory(container);
  });
}

/* ==========================================================================
   Edit Item Modal — pre-fills all fields for editing
   ========================================================================== */
async function openEditItemModal(itemId, container) {
  const item = await db.get('inventory', itemId);
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
            <option value="glass sheets" ${item.category === 'glass sheets' ? 'selected' : ''}>Glass Sheets</option>
            <option value="hardware" ${item.category === 'hardware' ? 'selected' : ''}>Hardware Fittings</option>
            <option value="tools" ${item.category === 'tools' ? 'selected' : ''}>Tools &amp; Kits</option>
            <option value="chemicals" ${item.category === 'chemicals' ? 'selected' : ''}>Chemicals</option>
            <option value="others" ${item.category === 'others' ? 'selected' : ''}>Others</option>
          </select>
        </div>
        <div class="input-group" style="margin-bottom:0;">
          <label>Unit Measure</label>
          <input type="text" id="edit-item-unit" class="form-control-noicon" value="${item.unit || ''}">
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
        <div class="input-group" style="margin-bottom:0;">
          <label>Min Safety Stock</label>
          <input type="number" id="edit-item-min" class="form-control-noicon" min="0" value="${item.minStock || 0}">
        </div>
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
      minStock: parseInt(document.getElementById('edit-item-min')?.value || '0') || 0,
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
  const date = document.getElementById('tx-date')?.value || new Date().toISOString().split('T')[0];
  const purpose = document.getElementById('tx-purpose')?.value?.trim() || 'General transaction';
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
  await db.put('transactions', { id: txId, itemId, type, quantity, sourceOrPurpose: purpose, date });
  await sync.queueOperation('transactions', 'insert', { id: txId, itemId, type, quantity, sourceOrPurpose: purpose, date });

  app.showToast('Transaction Logged', `${type === 'inward' ? 'Received' : 'Issued'} ${quantity} ${item.unit} of ${item.name}. Stock: ${oldStock} → ${item.currentStock}`, 'success');
  renderInventory(container);
}

/* ==========================================================================
   Table Row Button Bindings
   ========================================================================== */
function bindTableButtons() {
  // Min stock inline edit
  document.querySelectorAll('.min-stock-input').forEach(input => {
    input.addEventListener('change', async (e) => {
      const itemId = input.getAttribute('data-id');
      const val = parseInt(e.target.value);
      if (val < 0) { app.showToast('Invalid Value', 'Min stock cannot be negative.', 'danger'); return; }
      const item = await db.get('inventory', itemId);
      if (item) {
        const old = item.minStock;
        item.minStock = val;
        await db.put('inventory', item);
        await sync.queueOperation('inventory', 'update', item);
        app.showToast('Limit Updated', `${item.code} minimum changed from ${old} to ${val}.`, 'success');
        await populateItemsTable();
        bindTableButtons();
        lucide.createIcons();
      }
    });
  });

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
      const itemTx = allTx.filter(t => t.itemId === itemId).sort((a, b) => b.date.localeCompare(a.date));

      const modalHTML = `
        <div style="display:flex; flex-direction:column; gap:14px;">
          <!-- Item summary bar -->
          <div style="display:flex; gap:20px; flex-wrap:wrap; font-size:13px; padding:12px; background:rgba(0,0,0,0.1); border-radius:8px;">
            <span><strong>Code:</strong> <code>${item.code}</code></span>
            <span><strong>Unit:</strong> ${item.unit}</span>
            <span><strong>Min Stock:</strong> ${item.minStock}</span>
            <span><strong>Current Stock:</strong> <span class="${item.currentStock <= item.minStock ? 'danger-text' : 'success-text'} font-bold">${item.currentStock} ${item.unit}</span></span>
          </div>

          <!-- Search transactions -->
          <div class="search-input-wrapper">
            <i data-lucide="search"></i>
            <input type="text" id="tx-log-search" placeholder="Filter by date, type, supplier..." class="form-control" style="padding-top:7px; padding-bottom:7px; font-size:12px;">
          </div>

          <div class="table-responsive" style="max-height:320px; overflow-y:auto;">
            <table class="custom-table" style="font-size:12px;" id="tx-log-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th style="text-align:center;">Qty</th>
                  <th>Source / Purpose</th>
                </tr>
              </thead>
              <tbody id="tx-log-body">
                ${renderTxRows(itemTx)}
              </tbody>
            </table>
          </div>
        </div>
      `;

      app.openModal(`Transaction Logs — ${item.name}`, modalHTML, '650px');

      // Bind log search
      document.getElementById('tx-log-search')?.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        const filteredTx = itemTx.filter(t =>
          (t.date || '').includes(q) ||
          (t.type || '').includes(q) ||
          (t.sourceOrPurpose || '').toLowerCase().includes(q)
        );
        const body = document.getElementById('tx-log-body');
        if (body) body.innerHTML = renderTxRows(filteredTx);
      });
    });
  });
}

function renderTxRows(txList) {
  if (txList.length === 0) return `<tr><td colspan="4" class="text-center muted-text" style="padding:20px;">No transactions found.</td></tr>`;
  return txList.map(t => `
    <tr>
      <td><code>${t.date}</code></td>
      <td><span class="badge ${t.type === 'inward' ? 'success' : 'primary'}">${t.type}</span></td>
      <td style="text-align:center;"><strong>${t.quantity}</strong></td>
      <td>${t.sourceOrPurpose}</td>
    </tr>
  `).join('');
}
