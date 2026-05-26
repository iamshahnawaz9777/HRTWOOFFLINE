/* ==========================================================================
   AeroGlass ERP Gate Pass Management Module — v2.0 Enhanced
   ========================================================================== */

import { db } from '../db.js';
import { auth } from '../auth.js';
import { sync } from '../sync.js';

// Resolve circular dependency using a dynamic global window proxy
const app = new Proxy({}, {
  get: (target, prop) => window.app ? window.app[prop] : undefined
});

let selectedGatePassId = null;
let gatePassFilters = { search: '', status: '' };
let tempGatePassItems = []; // Temporary holder during GP creation
const TODAY_STR = new Date().toISOString().split('T')[0];

/* ==========================================================================
   Main Entry Renderer
   ========================================================================== */
export async function renderGatePass(container, routeParts = []) {
  const passes = await db.getAll('gatepasses');

  // Set default selected pass if none active
  if (!selectedGatePassId && passes.length > 0) {
    selectedGatePassId = passes[0].id;
  }

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: 360px 1fr; gap: 24px; height: calc(100vh - 150px);">
      <!-- Left Pane: Pass Ledger list -->
      <div class="glass-card" style="display:flex; flex-direction:column; padding: 20px; overflow:hidden; gap: 14px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h3 style="font-size:15px; font-family:var(--font-heading); font-weight:700;">Gate Pass Ledger</h3>
          <button id="add-gatepass-btn" class="btn btn-primary" style="padding: 6px 14px; font-size: 12px;">
            <i data-lucide="plus"></i>
            <span>New Pass</span>
          </button>
        </div>

        <!-- Search & Filter Panel -->
        <div style="display:flex; flex-direction:column; gap:8px;">
          <div class="search-input-wrapper">
            <i data-lucide="search"></i>
            <input type="text" id="gp-search-input" placeholder="Search pass no, driver, or item name..." class="form-control" style="padding-top:6px; padding-bottom:6px; font-size:12px;" value="${gatePassFilters.search}">
          </div>
          <select id="gp-status-filter" class="form-control-noicon" style="padding: 6px 10px; font-size:12px;">
            <option value="">All Statuses</option>
            <option value="Pending" ${gatePassFilters.status === 'Pending' ? 'selected' : ''}>Pending Approval</option>
            <option value="Approved" ${gatePassFilters.status === 'Approved' ? 'selected' : ''}>Approved Out</option>
            <option value="Returned" ${gatePassFilters.status === 'Returned' ? 'selected' : ''}>Items Returned</option>
            <option value="Closed" ${gatePassFilters.status === 'Closed' ? 'selected' : ''}>Closed / Complete</option>
          </select>
        </div>

        <!-- Pass list -->
        <div id="gatepass-ledger-list" style="display:flex; flex-direction:column; gap:8px; flex-grow:1; overflow-y:auto; padding-right:4px;">
          <!-- Loaded dynamically -->
        </div>
      </div>

      <!-- Right Pane: Pass Details Inspector -->
      <div id="gatepass-details-viewport" style="height:100%; overflow-y:auto;">
        <!-- Injected dynamically -->
      </div>
    </div>
  `;

  try { await populatePassList(); } catch (e) { console.error('Pass list error:', e); }
  try { await renderPassDetails(); } catch (e) { console.error('Pass details error:', e); }

  bindGatePassListEvents(container);
  lucide.createIcons();
}

/* ==========================================================================
   Left Panel — Pass List Renderer
   ========================================================================== */
async function populatePassList() {
  const listEl = document.getElementById('gatepass-ledger-list');
  if (!listEl) return;

  const passes = await db.getAll('gatepasses');
  let filtered = passes;

  if (gatePassFilters.search) {
    const q = gatePassFilters.search.toLowerCase();
    filtered = filtered.filter(gp => {
      const inHeader = (gp.gatePassNo || '').toLowerCase().includes(q)
        || (gp.person?.name || '').toLowerCase().includes(q)
        || (gp.vehicle?.driverName || '').toLowerCase().includes(q);
      // Search through items list too
      const inItems = (gp.items || []).some(item =>
        (item.name || '').toLowerCase().includes(q) ||
        (item.code || '').toLowerCase().includes(q)
      );
      return inHeader || inItems;
    });
  }

  if (gatePassFilters.status) {
    filtered = filtered.filter(gp => gp.status === gatePassFilters.status);
  }

  if (filtered.length === 0) {
    listEl.innerHTML = `<div class="text-center muted-text" style="padding:40px 0; font-size:13px;">
      <i data-lucide="file-x" style="width:32px; height:32px; display:block; margin:0 auto 8px;"></i>
      No gate passes match your search.
    </div>`;
    lucide.createIcons();
    return;
  }

  listEl.innerHTML = filtered.map(gp => {
    const isActive = gp.id === selectedGatePassId;
    let statusClass = 'warning';
    if (gp.status === 'Approved') statusClass = 'primary';
    if (gp.status === 'Returned') statusClass = 'success';
    if (gp.status === 'Closed') statusClass = 'secondary';

    const itemNames = (gp.items || []).slice(0, 2).map(i => i.name).join(', ');
    const extraItems = (gp.items || []).length > 2 ? ` +${gp.items.length - 2} more` : '';
    const totalAmt = gp.pricing?.totalAmount ? ` · ₹${Number(gp.pricing.totalAmount).toLocaleString()}` : '';

    return `
      <div class="gp-ledger-card pointer ${isActive ? 'active-gp' : ''}" data-id="${gp.id}"
           style="padding:12px; border-radius:var(--radius-md); border:1px solid ${isActive ? 'var(--primary-color)' : 'var(--glass-border)'}; 
           background:${isActive ? 'var(--primary-glow)' : 'rgba(255,255,255,0.01)'}; transition:all var(--transition-fast); cursor:pointer;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
          <strong style="font-size:13px; font-family:var(--font-heading);">${gp.gatePassNo}</strong>
          <span class="badge ${statusClass}" style="font-size:9px;">${gp.status}</span>
        </div>
        <div style="font-size:11px; color:var(--text-secondary); margin-bottom:3px;">
          ${gp.vehicle?.driverName ? `🚛 ${gp.vehicle.driverName}` : '—'} · ${gp.date || ''}${totalAmt}
        </div>
        ${itemNames ? `<div style="font-size:10px; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          📦 ${itemNames}${extraItems}
        </div>` : ''}
      </div>
    `;
  }).join('');
}

/* ==========================================================================
   Right Panel — Pass Detail Renderer
   ========================================================================== */
async function renderPassDetails() {
  const viewport = document.getElementById('gatepass-details-viewport');
  if (!viewport) return;

  if (!selectedGatePassId) {
    viewport.innerHTML = `
      <div class="glass-card text-center muted-text" style="padding:80px 40px; display:flex; flex-direction:column; align-items:center; gap:16px;">
        <i data-lucide="file-check-2" style="width:48px; height:48px; opacity:0.3;"></i>
        <p>Select a gate pass from the left panel or create a new one.</p>
      </div>`;
    lucide.createIcons();
    return;
  }

  const gp = await db.get('gatepasses', selectedGatePassId);
  if (!gp) {
    viewport.innerHTML = `<div class="glass-card text-center danger-text" style="padding:80px;">Gate pass not found in database.</div>`;
    return;
  }

  const isPending = gp.status === 'Pending';
  const isApproved = gp.status === 'Approved';
  const isReturnable = gp.returnable;

  let statusBadge = 'badge warning';
  if (gp.status === 'Approved') statusBadge = 'badge primary';
  if (gp.status === 'Returned') statusBadge = 'badge success';
  if (gp.status === 'Closed') statusBadge = 'badge secondary';

  // Calculate financial totals
  const items = gp.items || [];
  const calcTotal = items.reduce((sum, i) => sum + ((i.price || 0) * (i.quantity || 0)), 0);
  const storedTotal = gp.pricing?.totalAmount || calcTotal;
  const amountPaid = gp.pricing?.amountPaid || 0;
  const paymentMode = gp.pricing?.paymentMode || '—';
  const paymentRemarks = gp.pricing?.remarks || '';
  const balance = storedTotal - amountPaid;

  // Item search state (stored in dataset)
  const itemSearch = viewport.dataset.itemSearch || '';

  viewport.innerHTML = `
    <div class="glass-card" style="display:flex; flex-direction:column; gap:20px;">
      <!-- Header -->
      <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid var(--glass-border); padding-bottom:16px; flex-wrap:wrap; gap:12px;">
        <div>
          <span style="font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; display:block; margin-bottom:4px;">Gate Pass Record</span>
          <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
            <h2 style="font-family:var(--font-heading); font-size:24px; font-weight:800;">${gp.gatePassNo}</h2>
            <span class="${statusBadge}">${gp.status}</span>
            ${isReturnable ? '<span class="badge success" style="font-size:10px;">Returnable</span>' : '<span class="badge secondary" style="font-size:10px;">Non-Returnable</span>'}
          </div>
          <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">Issued: ${gp.date || '—'}</div>
        </div>

        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          ${isPending ? `
            <button id="gp-approve-btn" class="btn btn-success" style="padding:8px 14px; font-size:13px;">
              <i data-lucide="check-circle"></i><span>Approve</span>
            </button>
          ` : ''}
          <button id="gp-print-btn" class="btn btn-secondary" style="padding:8px 14px; font-size:13px;">
            <i data-lucide="printer"></i><span>Print PDF</span>
          </button>
          ${(isApproved || gp.status === 'Returned') ? `
            <button id="gp-close-btn" class="btn btn-primary" style="padding:8px 14px; font-size:13px;">
              <i data-lucide="folder-lock"></i><span>Close Pass</span>
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Info Grid -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
        <div style="background:rgba(0,0,0,0.12); border:1px solid var(--glass-border); padding:14px; border-radius:10px;">
          <h4 style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-muted); margin-bottom:10px; letter-spacing:0.5px;">👤 Recipient</h4>
          <div style="display:flex; flex-direction:column; gap:5px; font-size:13px;">
            <span><strong>Name:</strong> ${gp.person?.name || '—'}</span>
            <span><strong>Designation:</strong> ${gp.person?.designation || '—'}</span>
            <span><strong>Contact:</strong> ${gp.person?.contact || '—'}</span>
          </div>
        </div>
        <div style="background:rgba(0,0,0,0.12); border:1px solid var(--glass-border); padding:14px; border-radius:10px;">
          <h4 style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-muted); margin-bottom:10px; letter-spacing:0.5px;">🚛 Vehicle / Logistics</h4>
          <div style="display:flex; flex-direction:column; gap:5px; font-size:13px;">
            <span><strong>Vehicle No:</strong> <code>${gp.vehicle?.vehicleNo || '—'}</code></span>
            <span><strong>Driver:</strong> ${gp.vehicle?.driverName || '—'}</span>
            <span><strong>Type:</strong> ${gp.vehicle?.vehicleType || '—'}</span>
          </div>
        </div>
      </div>

      <!-- Items Section with search bar -->
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
          <h4 style="font-size:14px; font-weight:700;">📦 Material Items (${items.length})</h4>
          <div class="search-input-wrapper" style="max-width:260px; flex-grow:1;">
            <i data-lucide="search"></i>
            <input type="text" id="gp-detail-item-search" placeholder="Filter items by name or code..." class="form-control" style="padding-top:5px; padding-bottom:5px; font-size:12px;" value="${itemSearch}">
          </div>
        </div>

        <div class="table-responsive">
          <table class="custom-table" style="font-size:13px;" id="gp-items-detail-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Item Name</th>
                <th>Source</th>
                <th style="text-align:center;">Qty</th>
                <th style="text-align:right;">Unit Price</th>
                <th style="text-align:right;">Amount</th>
                ${isReturnable ? '<th style="text-align:center;">Returned</th><th style="text-align:center;">Pending</th>' : ''}
                <th>Usage Note</th>
              </tr>
            </thead>
            <tbody id="gp-items-detail-body">
              ${renderItemsTableRows(items, gp, isReturnable, itemSearch)}
            </tbody>
          </table>
        </div>

        ${items.length === 0 ? `<div class="text-center muted-text" style="padding:20px; font-size:13px;">No items added to this gate pass.</div>` : ''}
      </div>

      <!-- Financial Summary -->
      <div style="background:linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.08) 100%); border:1px solid var(--primary-color); border-radius:12px; padding:18px;">
        <h4 style="font-size:13px; font-weight:700; margin-bottom:14px; color:var(--primary-color);">💰 Financial Summary</h4>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:16px;">
          <div>
            <div style="font-size:11px; color:var(--text-muted); margin-bottom:3px;">Total Amount</div>
            <div style="font-size:20px; font-weight:700; font-family:var(--font-heading);">₹${Number(storedTotal).toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
          </div>
          <div>
            <div style="font-size:11px; color:var(--text-muted); margin-bottom:3px;">Amount Paid</div>
            <div style="font-size:20px; font-weight:700; font-family:var(--font-heading); color:var(--success);">₹${Number(amountPaid).toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
          </div>
          <div>
            <div style="font-size:11px; color:var(--text-muted); margin-bottom:3px;">Balance Due</div>
            <div style="font-size:20px; font-weight:700; font-family:var(--font-heading); color:${balance > 0 ? 'var(--warning)' : 'var(--success)'};">₹${Number(balance).toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
          </div>
          <div>
            <div style="font-size:11px; color:var(--text-muted); margin-bottom:3px;">Payment Mode</div>
            <div style="font-size:15px; font-weight:600;">${paymentMode}</div>
          </div>
        </div>
        ${paymentRemarks ? `<div style="margin-top:10px; font-size:12px; color:var(--text-muted);">Remarks: ${paymentRemarks}</div>` : ''}
      </div>

      <!-- Return Logger (for approved returnable passes) -->
      ${(isReturnable && isApproved) ? `
        <div style="border-top:1px dashed var(--glass-border); padding-top:18px; display:flex; flex-direction:column; gap:14px;">
          <h4 style="font-size:14px; font-weight:700;">↩ Log Material Return</h4>
          <div style="display:flex; align-items:flex-end; gap:12px; flex-wrap:wrap;">
            <div class="input-group" style="margin-bottom:0; width:220px;">
              <label>Select Item</label>
              <select id="return-item-select" class="form-control-noicon">
                ${items.map(item => {
                  const retInfo = gp.returns?.find(r => r.code === item.code);
                  const maxReturn = item.quantity - (retInfo ? retInfo.returnedQty : 0);
                  return maxReturn > 0 ? `<option value="${item.code}">${item.code} – ${item.name} (max: ${maxReturn})</option>` : '';
                }).join('')}
              </select>
            </div>
            <div class="input-group" style="margin-bottom:0; width:110px;">
              <label>Return Qty</label>
              <input type="number" id="return-quantity-input" class="form-control-noicon" min="1" value="1">
            </div>
            <div class="input-group" style="margin-bottom:0; width:150px;">
              <label>Return Date</label>
              <input type="date" id="return-date-input" class="form-control-noicon" value="${TODAY_STR}">
            </div>
            <button id="commit-return-btn" class="btn btn-success" style="padding: 10px 18px;">
              <i data-lucide="rotate-ccw"></i>
              <span>Log Return</span>
            </button>
          </div>
        </div>
      ` : ''}
    </div>
  `;

  bindDetailsActions(gp);

  // Bind item search inside detail view
  const itemSearchEl = document.getElementById('gp-detail-item-search');
  if (itemSearchEl) {
    itemSearchEl.addEventListener('input', (e) => {
      viewport.dataset.itemSearch = e.target.value;
      const q = e.target.value.toLowerCase();
      document.getElementById('gp-items-detail-body').innerHTML = renderItemsTableRows(items, gp, isReturnable, q);
    });
  }

  lucide.createIcons();
}

/* Helper: renders items table rows with optional item search filter */
function renderItemsTableRows(items, gp, isReturnable, searchQ = '') {
  let filtered = items;
  if (searchQ) {
    filtered = items.filter(i =>
      (i.name || '').toLowerCase().includes(searchQ) ||
      (i.code || '').toLowerCase().includes(searchQ)
    );
  }
  if (filtered.length === 0) {
    const cols = isReturnable ? 9 : 7;
    return `<tr><td colspan="${cols}" class="text-center muted-text" style="padding:16px;">No items match your filter.</td></tr>`;
  }

  return filtered.map(item => {
    const retInfo = gp.returns ? gp.returns.find(r => r.code === item.code) : null;
    const retQty = retInfo ? retInfo.returnedQty : 0;
    const pending = (item.quantity || 0) - retQty;
    const unitPrice = item.price || 0;
    const lineTotal = unitPrice * (item.quantity || 0);
    const sourceTag = item.source === 'manual'
      ? '<span class="badge warning" style="font-size:9px;">Manual</span>'
      : '<span class="badge secondary" style="font-size:9px;">Store</span>';

    return `
      <tr>
        <td><code>${item.code || '—'}</code></td>
        <td><strong>${item.name}</strong></td>
        <td>${sourceTag}</td>
        <td style="text-align:center;">${item.quantity}</td>
        <td style="text-align:right;">${unitPrice > 0 ? '₹' + unitPrice.toLocaleString('en-IN') : '—'}</td>
        <td style="text-align:right; font-weight:600;">${lineTotal > 0 ? '₹' + lineTotal.toLocaleString('en-IN') : '—'}</td>
        ${isReturnable ? `
          <td style="text-align:center;"><span class="success-text">${retQty}</span></td>
          <td style="text-align:center;"><span class="${pending > 0 ? 'warning-text' : 'muted-text'}">${pending}</span></td>
        ` : ''}
        <td style="color:var(--text-muted); font-size:12px;">${item.description || '—'}</td>
      </tr>
    `;
  }).join('');
}

/* ==========================================================================
   Left Panel — Event Binds
   ========================================================================== */
function bindGatePassListEvents(container) {
  // Search input — searches pass header AND items
  document.getElementById('gp-search-input')?.addEventListener('input', async (e) => {
    gatePassFilters.search = e.target.value;
    await populatePassList();
    lucide.createIcons();
  });

  // Status filter dropdown
  document.getElementById('gp-status-filter')?.addEventListener('change', async (e) => {
    gatePassFilters.status = e.target.value;
    await populatePassList();
  });

  // Left roster click (Event Delegation)
  const ledgerList = document.getElementById('gatepass-ledger-list');
  if (ledgerList) {
    ledgerList.addEventListener('click', async (e) => {
      const card = e.target.closest('.gp-ledger-card');
      if (card) {
        selectedGatePassId = card.getAttribute('data-id');
        await populatePassList();
        await renderPassDetails();
      }
    });
  }

  // Create Gate Pass button
  document.getElementById('add-gatepass-btn')?.addEventListener('click', async () => {
    await openCreateGatePassModal(container);
  });
}

/* ==========================================================================
   Create Gate Pass — Modal Builder
   ========================================================================== */
async function openCreateGatePassModal(container) {
  tempGatePassItems = [];
  const inventoryItems = await db.getAll('inventory');

  const formHTML = `
    <div style="display:flex; flex-direction:column; gap:20px;">

      <!-- Section 1: Person -->
      <div>
        <h4 style="font-size:12px; font-weight:700; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.5px; margin-bottom:12px; border-bottom:1px solid var(--glass-border); padding-bottom:6px;">
          1. Person Responsible <span style="font-weight:400; font-style:italic;">(all optional)</span>
        </h4>
        <div class="gp-form-sections">
          <div class="input-group" style="margin-bottom:0;">
            <label>Recipient Name</label>
            <input type="text" id="gp-new-name" class="form-control-noicon" placeholder="e.g. Jack Vance">
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Contact Phone</label>
            <input type="text" id="gp-new-contact" class="form-control-noicon" placeholder="e.g. +91-9876543210">
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Designation</label>
            <input type="text" id="gp-new-designation" class="form-control-noicon" placeholder="e.g. Site Supervisor">
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Remarks</label>
            <input type="text" id="gp-new-person-remarks" class="form-control-noicon" placeholder="Any notes...">
          </div>
        </div>
      </div>

      <!-- Section 2: Transport -->
      <div>
        <h4 style="font-size:12px; font-weight:700; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.5px; margin-bottom:12px; border-bottom:1px solid var(--glass-border); padding-bottom:6px;">
          2. Transportation Details <span style="font-weight:400; font-style:italic;">(all optional)</span>
        </h4>
        <div class="gp-form-sections">
          <div class="input-group" style="margin-bottom:0;">
            <label>Vehicle Plate No.</label>
            <input type="text" id="gp-new-vehno" class="form-control-noicon" placeholder="e.g. KA-05-D-2026">
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Driver Full Name</label>
            <input type="text" id="gp-new-driver" class="form-control-noicon" placeholder="e.g. Raju Singh">
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Vehicle Type</label>
            <input type="text" id="gp-new-vehtype" class="form-control-noicon" placeholder="e.g. Flatbed Truck">
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Pass Date</label>
            <input type="date" id="gp-new-date" class="form-control-noicon" value="${TODAY_STR}">
          </div>
        </div>
      </div>

      <!-- Section 3: Add Items -->
      <div>
        <h4 style="font-size:12px; font-weight:700; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.5px; margin-bottom:12px; border-bottom:1px solid var(--glass-border); padding-bottom:6px;">
          3. Add Material Items
        </h4>

        <!-- Tab Switch Buttons -->
        <div style="display:flex; gap:8px; margin-bottom:14px;">
          <button type="button" id="gp-tab-store-btn" class="btn btn-primary" style="padding:6px 14px; font-size:12px;">
            <i data-lucide="package-search"></i>
            <span>From Store</span>
          </button>
          <button type="button" id="gp-tab-manual-btn" class="btn btn-secondary" style="padding:6px 14px; font-size:12px;">
            <i data-lucide="pencil-line"></i>
            <span>Manual Entry</span>
          </button>
        </div>

        <!-- From Store Panel -->
        <div id="gp-store-panel" style="display:flex; flex-direction:column; gap:10px;">
          <!-- Search Bar for Store Items -->
          <div class="search-input-wrapper">
            <i data-lucide="search"></i>
            <input type="text" id="gp-store-search" placeholder="Search store items by name or code..." class="form-control" style="padding-top:7px; padding-bottom:7px; font-size:12px;">
          </div>
          <!-- Filtered store items list -->
          <div id="gp-store-results" style="max-height:200px; overflow-y:auto; border:1px solid var(--glass-border); border-radius:var(--radius-md); background:rgba(0,0,0,0.1);">
            ${renderStoreResults(inventoryItems, '')}
          </div>
          <!-- Add row for store item -->
          <div style="display:flex; gap:10px; align-items:flex-end; flex-wrap:wrap;">
            <div class="input-group" style="margin-bottom:0; flex-grow:1; min-width:180px;">
              <label>Selected Item</label>
              <input type="text" id="gp-store-selected-display" class="form-control-noicon" readonly placeholder="Click an item above to select" style="cursor:default; opacity:0.7;">
              <input type="hidden" id="gp-store-selected-code">
              <input type="hidden" id="gp-store-selected-name">
            </div>
            <div class="input-group" style="margin-bottom:0; width:90px;">
              <label>Quantity</label>
              <input type="number" id="gp-store-qty" class="form-control-noicon" min="1" value="1">
            </div>
            <div class="input-group" style="margin-bottom:0; width:110px;">
              <label>Unit Price (₹)</label>
              <input type="number" id="gp-store-price" class="form-control-noicon" min="0" step="0.01" placeholder="0.00">
            </div>
            <div class="input-group" style="margin-bottom:0; width:160px;">
              <label>Usage Note</label>
              <input type="text" id="gp-store-desc" class="form-control-noicon" placeholder="e.g. Site A delivery">
            </div>
            <button type="button" id="gp-store-add-btn" class="btn btn-primary" style="padding:10px 16px; white-space:nowrap;">
              <i data-lucide="plus"></i> Add
            </button>
          </div>
        </div>

        <!-- Manual Entry Panel -->
        <div id="gp-manual-panel" style="display:none; flex-direction:column; gap:10px;">
          <div style="padding:10px; background:rgba(245,158,11,0.08); border:1px solid var(--warning); border-radius:var(--radius-md); font-size:12px; color:var(--warning);">
            ⚠ Manual items are not tracked in inventory and will not affect stock levels.
          </div>
          <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:flex-end;">
            <div class="input-group" style="margin-bottom:0; width:120px;">
              <label>Item Code</label>
              <input type="text" id="gp-manual-code" class="form-control-noicon" placeholder="e.g. EXT-001">
            </div>
            <div class="input-group" style="margin-bottom:0; flex-grow:1; min-width:160px;">
              <label>Item Name</label>
              <input type="text" id="gp-manual-name" class="form-control-noicon" placeholder="e.g. Silicone Sealant 300ml">
            </div>
            <div class="input-group" style="margin-bottom:0; width:90px;">
              <label>Quantity</label>
              <input type="number" id="gp-manual-qty" class="form-control-noicon" min="1" value="1">
            </div>
            <div class="input-group" style="margin-bottom:0; width:110px;">
              <label>Unit Price (₹)</label>
              <input type="number" id="gp-manual-price" class="form-control-noicon" min="0" step="0.01" placeholder="0.00">
            </div>
            <div class="input-group" style="margin-bottom:0; width:150px;">
              <label>Usage Note</label>
              <input type="text" id="gp-manual-desc" class="form-control-noicon" placeholder="Purpose...">
            </div>
            <button type="button" id="gp-manual-add-btn" class="btn btn-accent" style="padding:10px 16px; white-space:nowrap;">
              <i data-lucide="plus"></i> Add
            </button>
          </div>
        </div>
      </div>

      <!-- Section 4: Queued Items Table -->
      <div id="gp-queued-section" style="border:1px solid var(--glass-border); border-radius:var(--radius-md); overflow:hidden;">
        <div style="padding:10px 14px; background:rgba(0,0,0,0.15); border-bottom:1px solid var(--glass-border); display:flex; justify-content:space-between; align-items:center;">
          <h5 style="font-size:12px; font-weight:700; margin:0;">Queued Items</h5>
          <span id="gp-items-count" style="font-size:11px; color:var(--text-muted);">0 items · Total: ₹0.00</span>
        </div>
        <div style="overflow-x:auto; max-height:200px; overflow-y:auto;">
          <table class="custom-table" style="font-size:11px;" id="gp-queued-items-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Item Name</th>
                <th>Source</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Amount</th>
                <th>Note</th>
                <th>Remove</th>
              </tr>
            </thead>
            <tbody id="gp-queued-items-body">
              <tr><td colspan="8" class="text-center muted-text" style="padding:16px;">No items added yet.</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Section 5: Payment / Amount -->
      <div>
        <h4 style="font-size:12px; font-weight:700; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.5px; margin-bottom:12px; border-bottom:1px solid var(--glass-border); padding-bottom:6px;">
          4. Payment & Amount <span style="font-weight:400; font-style:italic;">(all optional)</span>
        </h4>
        <div class="gp-form-sections">
          <div class="input-group" style="margin-bottom:0;">
            <label>Total Amount (₹) <span style="color:var(--text-muted); font-weight:400;">(auto-calculated, editable)</span></label>
            <input type="number" id="gp-total-amount" class="form-control-noicon" min="0" step="0.01" placeholder="0.00" value="0">
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Amount Paid (₹)</label>
            <input type="number" id="gp-amount-paid" class="form-control-noicon" min="0" step="0.01" placeholder="0.00" value="">
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Payment Mode</label>
            <select id="gp-payment-mode" class="form-control-noicon">
              <option value="">— Select Mode —</option>
              <option value="Cash">Cash</option>
              <option value="Cheque">Cheque</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="UPI">UPI</option>
              <option value="Credit">Credit / Due</option>
            </select>
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Payment Remarks</label>
            <input type="text" id="gp-payment-remarks" class="form-control-noicon" placeholder="e.g. Cheque no. 003421">
          </div>
        </div>
      </div>

      <!-- Section 6: Options + Submit -->
      <div style="border-top:1px solid var(--glass-border); padding-top:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:13px;">
          <input type="checkbox" id="gp-new-returnable" style="width:16px; height:16px;">
          <span>Returnable Gate Pass <span class="muted-text" style="font-size:11px;">(items must be returned)</span></span>
        </label>
        <button type="button" id="gp-submit-btn" class="btn btn-primary" style="padding:10px 28px;">
          <i data-lucide="file-plus"></i>
          <span>Create Gate Pass</span>
        </button>
      </div>
    </div>
  `;

  app.openModal('New Gate Pass', formHTML, '800px');

  // Wait for DOM injection then bind all modal events
  bindCreateModalEvents(inventoryItems, container);
}

/* Helper: renders the store item search results list */
function renderStoreResults(items, query) {
  let filtered = items;
  if (query) {
    const q = query.toLowerCase();
    filtered = items.filter(i =>
      (i.name || '').toLowerCase().includes(q) ||
      (i.code || '').toLowerCase().includes(q) ||
      (i.category || '').toLowerCase().includes(q)
    );
  }

  if (filtered.length === 0) {
    return `<div class="text-center muted-text" style="padding:20px; font-size:12px;">No matching items found in store.</div>`;
  }

  return filtered.map(i => {
    const isLow = i.currentStock <= i.minStock;
    return `
      <div class="gp-store-item-row pointer" data-code="${i.code}" data-name="${i.name}" data-stock="${i.currentStock}"
           style="padding:8px 12px; border-bottom:1px solid var(--glass-border); display:flex; justify-content:space-between; align-items:center; cursor:pointer; transition:background var(--transition-fast);"
           onmouseover="this.style.background='rgba(59,130,246,0.08)'" onmouseout="this.style.background='transparent'">
        <div>
          <code style="font-size:11px; color:var(--primary-color);">${i.code}</code>
          <strong style="font-size:12px; margin-left:8px;">${i.name}</strong>
          <span class="badge secondary" style="font-size:9px; margin-left:6px;">${i.category}</span>
        </div>
        <div style="text-align:right; font-size:11px;">
          <span class="${isLow ? 'danger-text' : 'success-text'}" style="font-weight:600;">${i.currentStock} ${i.unit}</span>
          ${isLow ? '<span class="badge danger" style="font-size:8px; margin-left:4px;">LOW</span>' : ''}
        </div>
      </div>
    `;
  }).join('');
}

/* Helper: recalculates auto-total from tempGatePassItems */
function recalcTotal() {
  const total = tempGatePassItems.reduce((s, i) => s + ((i.price || 0) * (i.quantity || 0)), 0);
  const el = document.getElementById('gp-total-amount');
  if (el) el.value = total.toFixed(2);
  return total;
}

/* Helper: updates count badge */
function updateItemCount() {
  const total = recalcTotal();
  const el = document.getElementById('gp-items-count');
  if (el) el.textContent = `${tempGatePassItems.length} item${tempGatePassItems.length !== 1 ? 's' : ''} · Total: ₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

/* Helper: renders the queued items in the modal table */
function updateQueuedTable() {
  const body = document.getElementById('gp-queued-items-body');
  if (!body) return;

  if (tempGatePassItems.length === 0) {
    body.innerHTML = `<tr><td colspan="8" class="text-center muted-text" style="padding:16px;">No items added yet.</td></tr>`;
    updateItemCount();
    return;
  }

  body.innerHTML = tempGatePassItems.map((item, idx) => {
    const lineTotal = (item.price || 0) * (item.quantity || 0);
    const sourceBadge = item.source === 'manual'
      ? '<span class="badge warning" style="font-size:8px;">Manual</span>'
      : '<span class="badge secondary" style="font-size:8px;">Store</span>';
    return `
      <tr>
        <td><code>${item.code || '—'}</code></td>
        <td><strong>${item.name}</strong></td>
        <td>${sourceBadge}</td>
        <td>${item.quantity}</td>
        <td>${item.price > 0 ? '₹' + item.price : '—'}</td>
        <td style="font-weight:600;">${lineTotal > 0 ? '₹' + lineTotal.toLocaleString('en-IN') : '—'}</td>
        <td style="color:var(--text-muted); max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${item.description || '—'}</td>
        <td>
          <button type="button" class="btn btn-danger gp-remove-item-btn" data-idx="${idx}" style="padding:2px 7px; font-size:10px;">&times;</button>
        </td>
      </tr>
    `;
  }).join('');

  // Bind remove buttons
  body.querySelectorAll('.gp-remove-item-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      tempGatePassItems.splice(parseInt(btn.getAttribute('data-idx')), 1);
      updateQueuedTable();
    });
  });

  updateItemCount();
}

/* Bind all events inside the Create Gate Pass modal */
function bindCreateModalEvents(inventoryItems, container) {
  // --- Tab switching ---
  const storeBtn = document.getElementById('gp-tab-store-btn');
  const manualBtn = document.getElementById('gp-tab-manual-btn');
  const storePanel = document.getElementById('gp-store-panel');
  const manualPanel = document.getElementById('gp-manual-panel');

  storeBtn?.addEventListener('click', () => {
    storePanel.style.display = 'flex';
    manualPanel.style.display = 'none';
    storeBtn.className = 'btn btn-primary';
    storeBtn.style.cssText = 'padding:6px 14px; font-size:12px;';
    manualBtn.className = 'btn btn-secondary';
    manualBtn.style.cssText = 'padding:6px 14px; font-size:12px;';
  });

  manualBtn?.addEventListener('click', () => {
    storePanel.style.display = 'none';
    manualPanel.style.display = 'flex';
    manualBtn.className = 'btn btn-accent';
    manualBtn.style.cssText = 'padding:6px 14px; font-size:12px;';
    storeBtn.className = 'btn btn-secondary';
    storeBtn.style.cssText = 'padding:6px 14px; font-size:12px;';
  });

  // --- Store search bar ---
  document.getElementById('gp-store-search')?.addEventListener('input', (e) => {
    const results = document.getElementById('gp-store-results');
    if (results) results.innerHTML = renderStoreResults(inventoryItems, e.target.value);

    // Rebind row clicks after re-render
    bindStoreRowClicks();
  });

  // Bind initial store row clicks
  bindStoreRowClicks();

  // --- Store Add button ---
  document.getElementById('gp-store-add-btn')?.addEventListener('click', () => {
    const code = document.getElementById('gp-store-selected-code')?.value?.trim();
    const name = document.getElementById('gp-store-selected-name')?.value?.trim();
    const qty = parseInt(document.getElementById('gp-store-qty')?.value || '1');
    const price = parseFloat(document.getElementById('gp-store-price')?.value || '0') || 0;
    const desc = document.getElementById('gp-store-desc')?.value?.trim() || '';

    if (!code || !name) {
      app.showToast('Select Item', 'Please click an item from the store list first.', 'warning');
      return;
    }
    if (qty < 1) {
      app.showToast('Invalid Qty', 'Quantity must be at least 1.', 'warning');
      return;
    }

    // Stock check
    const storeItem = inventoryItems.find(i => i.code === code);
    if (storeItem && storeItem.currentStock < qty) {
      app.showToast('Exceeded Stock', `Only ${storeItem.currentStock} ${storeItem.unit} available in store.`, 'danger');
      return;
    }

    // Merge if exists
    const existing = tempGatePassItems.find(t => t.code === code && t.source === 'store');
    if (existing) {
      existing.quantity += qty;
    } else {
      tempGatePassItems.push({ code, name, quantity: qty, price, description: desc, source: 'store' });
    }

    // Reset store form
    document.getElementById('gp-store-selected-code').value = '';
    document.getElementById('gp-store-selected-name').value = '';
    document.getElementById('gp-store-selected-display').value = '';
    document.getElementById('gp-store-qty').value = 1;
    document.getElementById('gp-store-price').value = '';
    document.getElementById('gp-store-desc').value = '';

    updateQueuedTable();
    app.showToast('Item Added', `${name} × ${qty} added to gate pass.`, 'success');
  });

  // --- Manual Add button ---
  document.getElementById('gp-manual-add-btn')?.addEventListener('click', () => {
    const code = document.getElementById('gp-manual-code')?.value?.trim() || `MNL-${Date.now()}`;
    const name = document.getElementById('gp-manual-name')?.value?.trim();
    const qty = parseInt(document.getElementById('gp-manual-qty')?.value || '1');
    const price = parseFloat(document.getElementById('gp-manual-price')?.value || '0') || 0;
    const desc = document.getElementById('gp-manual-desc')?.value?.trim() || '';

    if (!name) {
      app.showToast('Item Name Required', 'Please enter the item name for manual entry.', 'warning');
      return;
    }
    if (qty < 1) {
      app.showToast('Invalid Qty', 'Quantity must be at least 1.', 'warning');
      return;
    }

    tempGatePassItems.push({ code, name, quantity: qty, price, description: desc, source: 'manual' });

    // Reset manual form
    document.getElementById('gp-manual-code').value = '';
    document.getElementById('gp-manual-name').value = '';
    document.getElementById('gp-manual-qty').value = 1;
    document.getElementById('gp-manual-price').value = '';
    document.getElementById('gp-manual-desc').value = '';

    updateQueuedTable();
    app.showToast('Manual Item Added', `${name} × ${qty} added as manual entry.`, 'success');
  });

  // --- Submit Gate Pass ---
  document.getElementById('gp-submit-btn')?.addEventListener('click', async () => {
    const name = document.getElementById('gp-new-name')?.value?.trim() || '';
    const designation = document.getElementById('gp-new-designation')?.value?.trim() || '';
    const contact = document.getElementById('gp-new-contact')?.value?.trim() || '';
    const vehicleNo = (document.getElementById('gp-new-vehno')?.value?.trim() || '').toUpperCase();
    const driverName = document.getElementById('gp-new-driver')?.value?.trim() || '';
    const vehicleType = document.getElementById('gp-new-vehtype')?.value?.trim() || '';
    const passDate = document.getElementById('gp-new-date')?.value || TODAY_STR;
    const returnable = document.getElementById('gp-new-returnable')?.checked || false;

    const totalAmount = parseFloat(document.getElementById('gp-total-amount')?.value || '0') || 0;
    const amountPaid = parseFloat(document.getElementById('gp-amount-paid')?.value || '0') || 0;
    const paymentMode = document.getElementById('gp-payment-mode')?.value || '';
    const paymentRemarks = document.getElementById('gp-payment-remarks')?.value?.trim() || '';

    // Generate sequential pass number
    const allGP = await db.getAll('gatepasses');
    const passIndex = allGP.length + 1;
    const gatePassNo = `GP-${new Date().getFullYear()}-${passIndex.toString().padStart(4, '0')}`;
    const id = `gp-${Date.now()}`;

    const returns = returnable
      ? tempGatePassItems.filter(i => i.source === 'store').map(item => ({ code: item.code, returnedQty: 0, date: '' }))
      : [];

    const newPass = {
      id,
      gatePassNo,
      date: passDate,
      status: 'Pending',
      person: { name, designation, contact },
      vehicle: { vehicleNo, driverName, vehicleType },
      items: [...tempGatePassItems],
      returnable,
      returns,
      pricing: { totalAmount, amountPaid, paymentMode, remarks: paymentRemarks }
    };

    await db.put('gatepasses', newPass);
    await sync.queueOperation('gatepasses', 'insert', newPass);

    app.closeModal();
    app.showToast('Gate Pass Created', `${gatePassNo} created successfully${tempGatePassItems.length > 0 ? ` with ${tempGatePassItems.length} items` : ''}.`, 'success');

    selectedGatePassId = id;
    await renderGatePass(container);
  });
}

/* Binds click events on store item rows (re-called after search re-renders the list) */
function bindStoreRowClicks() {
  document.querySelectorAll('.gp-store-item-row').forEach(row => {
    row.addEventListener('click', () => {
      const code = row.getAttribute('data-code');
      const name = row.getAttribute('data-name');

      const codeEl = document.getElementById('gp-store-selected-code');
      const nameEl = document.getElementById('gp-store-selected-name');
      const displayEl = document.getElementById('gp-store-selected-display');

      if (codeEl) codeEl.value = code;
      if (nameEl) nameEl.value = name;
      if (displayEl) displayEl.value = `${code} — ${name}`;

      // Visual highlight
      document.querySelectorAll('.gp-store-item-row').forEach(r => r.style.background = 'transparent');
      row.style.background = 'rgba(59,130,246,0.15)';
    });
  });
}

/* ==========================================================================
   Detail Panel — Action Binds (Approve, Print, Close, Returns)
   ========================================================================== */
function bindDetailsActions(gp) {
  // 1. Approve Pass
  const approveBtn = document.getElementById('gp-approve-btn');
  if (approveBtn) {
    approveBtn.addEventListener('click', async () => {
      gp.status = 'Approved';
      await db.put('gatepasses', gp);
      await sync.queueOperation('gatepasses', 'update', gp);

      // Deduct from store stock (only store-sourced items)
      const inventory = await db.getAll('inventory');
      for (const gpItem of (gp.items || [])) {
        if (gpItem.source === 'manual') continue; // Skip manual items
        const item = inventory.find(i => i.code === gpItem.code);
        if (item) {
          item.currentStock = Math.max(0, item.currentStock - gpItem.quantity);
          await db.put('inventory', item);
          await sync.queueOperation('inventory', 'update', item);

          const txId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
          await db.put('transactions', {
            id: txId,
            itemId: item.id,
            type: 'outward',
            quantity: gpItem.quantity,
            sourceOrPurpose: `Gate pass dispatch: ${gp.gatePassNo}`,
            date: TODAY_STR
          });
        }
      }

      app.showToast('Approved', `Gate pass ${gp.gatePassNo} approved. Store stock updated.`, 'success');
      await renderGatePass(document.getElementById('view-content'));
    });
  }

  // 2. Print / Export PDF
  document.getElementById('gp-print-btn')?.addEventListener('click', () => {
    const items = gp.items || [];
    const total = gp.pricing?.totalAmount || 0;
    const paid = gp.pricing?.amountPaid || 0;

    const printHTML = `
      <div class="gp-print-view">
        <div class="gp-print-header">
          <div>
            <h2 style="margin:0; font-weight:800; font-family:var(--font-heading); letter-spacing:-0.5px;">AEROGLASS INDUSTRIES</h2>
            <span style="font-size:11px; text-transform:uppercase; color:#666;">Glass Engineering & Logistics ERP</span>
          </div>
          <div style="text-align:right;">
            <h3 style="margin:0; font-weight:800;">OUTWARD GATE PASS</h3>
            <span style="font-size:12px;">Pass No: <strong>${gp.gatePassNo}</strong></span><br>
            <span style="font-size:11px; color:#777;">Date: ${gp.date || '—'}</span>
          </div>
        </div>

        <div class="gp-print-body-sections">
          <div>
            <h4 style="margin:0 0 8px; font-size:12px; text-transform:uppercase; color:#777; border-bottom:1.5px solid #000; padding-bottom:4px;">RECIPIENT</h4>
            <div style="font-size:12px; line-height:1.8;">
              <strong>Name:</strong> ${gp.person?.name || '—'}<br>
              <strong>Designation:</strong> ${gp.person?.designation || '—'}<br>
              <strong>Contact:</strong> ${gp.person?.contact || '—'}
            </div>
          </div>
          <div>
            <h4 style="margin:0 0 8px; font-size:12px; text-transform:uppercase; color:#777; border-bottom:1.5px solid #000; padding-bottom:4px;">TRANSPORT</h4>
            <div style="font-size:12px; line-height:1.8;">
              <strong>Vehicle No:</strong> ${gp.vehicle?.vehicleNo || '—'}<br>
              <strong>Driver:</strong> ${gp.vehicle?.driverName || '—'}<br>
              <strong>Type:</strong> ${gp.vehicle?.vehicleType || '—'}
            </div>
          </div>
        </div>

        <div style="margin-bottom:24px;">
          <h4 style="margin:0 0 10px; font-size:12px; text-transform:uppercase; color:#777; border-bottom:1.5px solid #000; padding-bottom:4px;">AUTHORIZED MATERIALS</h4>
          <table class="gp-print-table">
            <thead>
              <tr>
                <th style="width:120px;">Code</th>
                <th>Item Name</th>
                <th style="width:60px; text-align:center;">Qty</th>
                <th style="width:100px; text-align:right;">Unit Price</th>
                <th style="width:110px; text-align:right;">Amount</th>
                <th style="width:80px;">Type</th>
                <th>Usage Note</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td><code>${item.code || '—'}</code></td>
                  <td><strong>${item.name}</strong></td>
                  <td style="text-align:center;">${item.quantity}</td>
                  <td style="text-align:right;">${item.price > 0 ? '₹' + item.price : '—'}</td>
                  <td style="text-align:right; font-weight:600;">${(item.price || 0) * item.quantity > 0 ? '₹' + ((item.price || 0) * item.quantity).toLocaleString('en-IN') : '—'}</td>
                  <td>${gp.returnable && item.source !== 'manual' ? 'Returnable' : 'Non-Returnable'}</td>
                  <td style="font-size:11px;">${item.description || '—'}</td>
                </tr>
              `).join('')}
              <tr style="border-top:2px solid #000; font-weight:700;">
                <td colspan="4" style="text-align:right; padding-right:8px;">TOTAL AMOUNT:</td>
                <td style="text-align:right;">₹${Number(total).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
                <td colspan="2"></td>
              </tr>
              <tr style="font-weight:600; color:#444;">
                <td colspan="4" style="text-align:right; padding-right:8px;">AMOUNT PAID:</td>
                <td style="text-align:right;">₹${Number(paid).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
                <td colspan="2" style="font-size:11px;">${gp.pricing?.paymentMode || '—'}</td>
              </tr>
              <tr style="font-weight:700; color:${(total - paid) > 0 ? '#d97706' : '#059669'};">
                <td colspan="4" style="text-align:right; padding-right:8px;">BALANCE DUE:</td>
                <td style="text-align:right;">₹${Number(total - paid).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
                <td colspan="2"></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="gp-print-body-sections" style="font-size:11px; color:#555; margin-bottom:20px;">
          <div><strong>Declaration:</strong> Items logged under this pass are verified and cleared for gate dispatch.</div>
          <div style="text-align:right;"><strong>System Issued:</strong> ${new Date().toLocaleDateString('en-IN')}</div>
        </div>

        <div class="gp-print-signatures">
          <div>
            <div style="height:50px;"></div>
            <div class="signature-line">Store Keeper Signature</div>
          </div>
          <div>
            <div style="height:50px;"></div>
            <div class="signature-line">Authorized Manager Signoff</div>
          </div>
        </div>
      </div>
    `;

    app.openModal('Print Preview — Gate Pass', printHTML, '900px');
    setTimeout(() => window.print(), 450);
  });

  // 3. Close Pass
  document.getElementById('gp-close-btn')?.addEventListener('click', async () => {
    gp.status = 'Closed';
    await db.put('gatepasses', gp);
    await sync.queueOperation('gatepasses', 'update', gp);
    app.showToast('Pass Closed', `${gp.gatePassNo} closed successfully.`, 'success');
    await renderGatePass(document.getElementById('view-content'));
  });

  // 4. Log Material Return
  const commitReturnBtn = document.getElementById('commit-return-btn');
  if (commitReturnBtn) {
    commitReturnBtn.addEventListener('click', async () => {
      const itemCode = document.getElementById('return-item-select')?.value;
      const returnQty = parseInt(document.getElementById('return-quantity-input')?.value || '0');
      const returnDate = document.getElementById('return-date-input')?.value || TODAY_STR;

      if (!itemCode || returnQty < 1) return;

      const itemInfo = gp.items.find(i => i.code === itemCode);
      if (!itemInfo) return;
      const retInfo = gp.returns?.find(r => r.code === itemCode);
      const currentReturned = retInfo ? retInfo.returnedQty : 0;
      const pendingQty = itemInfo.quantity - currentReturned;

      if (returnQty > pendingQty) {
        app.showToast('Exceeded Limit', `Cannot return ${returnQty}. Only ${pendingQty} pending.`, 'danger');
        return;
      }

      if (retInfo) {
        retInfo.returnedQty += returnQty;
        retInfo.date = returnDate;
      }

      // Update inventory stock
      const inventory = await db.getAll('inventory');
      const storeItem = inventory.find(i => i.code === itemCode);
      if (storeItem) {
        storeItem.currentStock += returnQty;
        await db.put('inventory', storeItem);
        await sync.queueOperation('inventory', 'update', storeItem);

        await db.put('transactions', {
          id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          itemId: storeItem.id, type: 'inward', quantity: returnQty,
          sourceOrPurpose: `Return under gate pass: ${gp.gatePassNo}`, date: returnDate
        });
      }

      const allReturned = gp.items
        .filter(i => i.source !== 'manual')
        .every(item => {
          const ret = gp.returns?.find(r => r.code === item.code);
          return ret && ret.returnedQty >= item.quantity;
        });

      if (allReturned) {
        gp.status = 'Returned';
        app.showToast('All Returned', `All items under ${gp.gatePassNo} are returned. Stock updated.`, 'success');
      } else {
        app.showToast('Return Logged', `${returnQty} × ${itemCode} returned successfully.`, 'success');
      }

      await db.put('gatepasses', gp);
      await sync.queueOperation('gatepasses', 'update', gp);
      await renderGatePass(document.getElementById('view-content'));
    });
  }
}
