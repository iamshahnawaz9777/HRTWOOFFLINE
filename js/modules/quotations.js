/* ==========================================================================
   AeroGlass ERP Quotations & Invoices Module — Pixel-Perfect Glassology Engine
   ========================================================================== */

import { db } from '../db.js';
import { sync } from '../sync.js';
import { auth } from '../auth.js';

const app = new Proxy({}, {
  get: (target, prop) => window.app ? window.app[prop] : undefined
});

// Default Company & Bank settings matching the reference screenshot
const DEFAULT_SETTINGS = {
  companyName: 'GLASSOLOGY',
  logoUrl: '',
  addressLine1: 'Plot 42, GIA/4, Govindpura Industrial Area, Bhopal, Madhya Pradesh 462023',
  addressLine2: 'DC Industrial Estate, Sector 26, Gandhinagar, Gujarat - 382028',
  contact: '+91 9826330806 , +91 9425821171',
  email: 'glassology.bpl@gmail.com',
  bankName: 'State Bank of India',
  accountNo: '123456789012',
  ifscCode: 'SBIN0001234',
  branch: 'Gandhinagar',
  qrCodeUrl: '',
  showBankDetails: true,
  defaultGSTRate: 18,
  terms: [
    '1. Price is ex-factory. Transportation and installation/labour charges are extra.',
    '2. 50% advance along with order purchase, balance 50% before delivery.',
    '3. Goods once sold will not be taken back or exchanged.',
    '4. Glass breakage after delivery is not our responsibility.',
    '5. Any disputes are subject to local jurisdiction only.'
  ]
};

// Default Column visibility configuration
const DEFAULT_COLUMNS = {
  category: true,
  size: true,
  qty: true,
  rate: true
};

let activeTab = 'list'; // 'list' | 'create' | 'preview' | 'settings'
let previewQuoteId = null;
let editingQuoteId = null;
let activeFilters = { search: '', status: '', type: '' };

// Creator temporary state
let currentCreatorState = null;

/**
 * Cleanly extracts numeric value from text (e.g. "378.80 sq.ft" -> 378.80, "₹400.00 / sq.ft" -> 400.00, "1 pcs" -> 1)
 */
function extractNumericValue(val) {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const clean = val.toString().replace(/₹|,/g, '').trim();
  const match = clean.match(/-?\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : 0;
}

/**
 * Retrieve saved settings from app_settings store with fallback
 */
async function getQuotationSettings() {
  try {
    const saved = await db.get('app_settings', 'quotation_settings');
    if (saved && saved.value) {
      return { ...DEFAULT_SETTINGS, ...saved.value };
    }
  } catch (err) {
    console.warn('Could not load quotation settings:', err);
  }
  return { ...DEFAULT_SETTINGS };
}

/**
 * Save settings to app_settings store
 */
async function saveQuotationSettings(settings) {
  const record = { key: 'quotation_settings', value: settings, updatedAt: new Date().toISOString() };
  await db.put('app_settings', record);
  await sync.queueOperation('app_settings', 'update', record);
}

/**
 * Auto-seed initial sample quotations if empty
 */
async function seedInitialQuotationsIfEmpty() {
  const existing = await db.getAll('quotes');
  if (existing.length === 0) {
    const samples = [
      {
        id: 'quote-2026-3907',
        quotationNo: 'GQ-2026-3907',
        type: 'INVOICE',
        date: '6 Jul 2026, 12:08 pm',
        partyName: 'Amit Glass (GST- 23AUTTS5015C2ZR)',
        mobile: 'N/A',
        email: 'N/A',
        projectId: null,
        status: 'Confirmed',
        columns: { category: true, size: true, qty: true, rate: true },
        items: [
          {
            description: 'Mirror With Black Frame 72 x 17 = 3 pcs\nMirror With Black Frame 36 x 17 = 1 pcs\nMirror With Black Frame 36 x 26 = 1 pcs\nTotal 5 Mirrors',
            category: 'Mirror',
            size: '—',
            qty: '—',
            rate: '₹11,567.80 / pcs',
            amount: 11567.80
          }
        ],
        subtotal: 11567.80,
        applyGST: true,
        gstRate: 18,
        gstAmount: 2082.20,
        total: 13650.00,
        terms: [...DEFAULT_SETTINGS.terms],
        createdAt: '2026-07-06T12:08:00Z'
      },
      {
        id: 'quote-2026-0024',
        quotationNo: 'GQ-2026-24',
        type: 'QUOTATION',
        date: '20 Jul 2026, 05:53 pm',
        partyName: 'Mr. Shashank ji 8MM Toughened Quotation',
        mobile: 'N/A',
        email: 'N/A',
        projectId: null,
        status: 'Not Confirmed',
        columns: { category: true, size: true, qty: true, rate: true },
        items: [
          {
            description: 'Fixed Window With Z 40 MM series make alucoat\nWith 8 micron powder coating\nwith 8 MM Clear Toughened Glass make saint gobain ,\nTransport Extra',
            category: 'Window',
            size: '378.80 sq.ft',
            qty: '1 pcs',
            rate: '₹400.00 / sq.ft',
            amount: 151520.00
          }
        ],
        subtotal: 151520.00,
        applyGST: false,
        gstRate: 0,
        gstAmount: 0.00,
        total: 151520.00,
        terms: [...DEFAULT_SETTINGS.terms],
        createdAt: '2026-07-20T17:53:00Z'
      }
    ];

    for (const q of samples) {
      await db.put('quotes', q);
      await sync.queueOperation('quotes', 'insert', q);
    }
  }
}

/**
 * Main Quotations Module Entry Point
 */
export async function renderQuotations(container, routeParts = []) {
  await seedInitialQuotationsIfEmpty();

  // Sub-routing support (#quotations/preview/id or #quotations/create)
  if (routeParts[1] === 'preview' && routeParts[2]) {
    activeTab = 'preview';
    previewQuoteId = routeParts[2];
  } else if (routeParts[1] === 'create') {
    activeTab = 'create';
    editingQuoteId = null;
  } else if (routeParts[1] === 'edit' && routeParts[2]) {
    activeTab = 'create';
    editingQuoteId = routeParts[2];
  } else if (routeParts[1] === 'settings') {
    activeTab = 'settings';
  } else if (routeParts[1] === 'list') {
    activeTab = 'list';
  }
  // Otherwise preserve activeTab as currently selected ('list', 'create', 'preview', 'settings')

  // Render Skeleton with top-level tabs
  const quotes = await db.getAll('quotes');

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:16px;">
      <!-- Module Navigation Header -->
      <div class="glass-card" style="padding: 10px 18px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <button id="quotation-tab-list" class="btn ${activeTab === 'list' ? 'btn-primary' : 'btn-secondary'}" style="padding: 7px 16px; font-size:12px; display:flex; align-items:center; gap:6px; ${activeTab === 'list' ? 'background:var(--primary-color);' : 'background:transparent;'}">
            <i data-lucide="file-spreadsheet" style="width:14px; height:14px;"></i>
            <span>Quotations Ledger (${quotes.length})</span>
          </button>
          <button id="quotation-tab-create" class="btn ${activeTab === 'create' ? 'btn-primary' : 'btn-secondary'}" style="padding: 7px 16px; font-size:12px; display:flex; align-items:center; gap:6px; ${activeTab === 'create' ? 'background:var(--primary-color);' : 'background:transparent;'}">
            <i data-lucide="plus-circle" style="width:14px; height:14px;"></i>
            <span>${editingQuoteId ? 'Edit Quotation' : 'Create Quotation'}</span>
          </button>
          ${previewQuoteId ? `
            <button id="quotation-tab-preview" class="btn ${activeTab === 'preview' ? 'btn-primary' : 'btn-secondary'}" style="padding: 7px 16px; font-size:12px; display:flex; align-items:center; gap:6px; ${activeTab === 'preview' ? 'background:var(--primary-color);' : 'background:transparent;'}">
              <i data-lucide="eye" style="width:14px; height:14px;"></i>
              <span>Print / View Sheet</span>
            </button>
          ` : ''}
          <button id="quotation-tab-settings" class="btn ${activeTab === 'settings' ? 'btn-primary' : 'btn-secondary'}" style="padding: 7px 16px; font-size:12px; display:flex; align-items:center; gap:6px; ${activeTab === 'settings' ? 'background:var(--primary-color);' : 'background:transparent;'}">
            <i data-lucide="sliders" style="width:14px; height:14px;"></i>
            <span>Company & Bank Settings</span>
          </button>
        </div>

        <div>
          ${activeTab !== 'create' ? `
            <button id="quotation-quick-new-btn" class="btn btn-primary" style="padding: 8px 16px; font-size:12px; display:flex; align-items:center; gap:6px; font-weight:600;">
              <i data-lucide="plus"></i>
              <span>New Quotation</span>
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Active Content Workspace -->
      <div id="quotation-workspace" style="min-height: calc(100vh - 220px);">
        <!-- Injected dynamically -->
      </div>
    </div>
  `;

  // Bind top level tab switchers
  document.getElementById('quotation-tab-list')?.addEventListener('click', () => {
    activeTab = 'list';
    renderQuotations(container);
  });
  document.getElementById('quotation-tab-create')?.addEventListener('click', () => {
    activeTab = 'create';
    editingQuoteId = null;
    currentCreatorState = null;
    renderQuotations(container);
  });
  document.getElementById('quotation-tab-preview')?.addEventListener('click', () => {
    if (previewQuoteId) {
      activeTab = 'preview';
      renderQuotations(container);
    }
  });
  document.getElementById('quotation-tab-settings')?.addEventListener('click', () => {
    activeTab = 'settings';
    renderQuotations(container);
  });
  document.getElementById('quotation-quick-new-btn')?.addEventListener('click', () => {
    activeTab = 'create';
    editingQuoteId = null;
    currentCreatorState = null;
    renderQuotations(container);
  });

  // Render appropriate view
  const workspace = document.getElementById('quotation-workspace');
  if (activeTab === 'list') {
    await renderQuotationsList(workspace, container);
  } else if (activeTab === 'create') {
    await renderQuotationCreator(workspace, container);
  } else if (activeTab === 'preview') {
    await renderQuotationPreview(workspace, container);
  } else if (activeTab === 'settings') {
    await renderQuotationSettings(workspace, container);
  }

  lucide.createIcons();
}

/**
 * ==========================================================================
 * 1. QUOTATIONS LIST / LEDGER VIEW
 * ==========================================================================
 */
async function renderQuotationsList(workspace, container) {
  const quotes = await db.getAll('quotes');

  // Filter quotes
  let filtered = [...quotes];
  if (activeFilters.search) {
    const q = activeFilters.search.toLowerCase();
    filtered = filtered.filter(quote =>
      (quote.quotationNo || '').toLowerCase().includes(q) ||
      (quote.partyName || '').toLowerCase().includes(q) ||
      (quote.items || []).some(item => (item.description || '').toLowerCase().includes(q))
    );
  }
  if (activeFilters.status) {
    filtered = filtered.filter(quote => quote.status === activeFilters.status);
  }
  if (activeFilters.type) {
    filtered = filtered.filter(quote => quote.type === activeFilters.type);
  }

  // Sort newest first
  filtered.sort((a, b) => (b.id || '').localeCompare(a.id || ''));

  workspace.innerHTML = `
    <div class="glass-card" style="display:flex; flex-direction:column; gap:16px; padding:20px;">
      <!-- Filter Bar -->
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; gap:10px; align-items:center; flex:1; min-width:240px;">
          <div class="search-input-wrapper" style="flex:1;">
            <i data-lucide="search"></i>
            <input type="text" id="quote-search-input" placeholder="Search by Party Name, Quote No, or Item..." class="form-control" style="font-size:12px; padding-top:7px; padding-bottom:7px;" value="${activeFilters.search}">
          </div>

          <!-- Status Filter -->
          <select id="quote-status-filter" class="form-control-noicon" style="font-size:12px; padding:7px 10px; width:160px;">
            <option value="">All Statuses</option>
            <option value="Confirmed" ${activeFilters.status === 'Confirmed' ? 'selected' : ''}>✅ Confirmed</option>
            <option value="Not Confirmed" ${activeFilters.status === 'Not Confirmed' ? 'selected' : ''}>⏳ Not Confirmed</option>
          </select>

          <!-- Type Filter -->
          <select id="quote-type-filter" class="form-control-noicon" style="font-size:12px; padding:7px 10px; width:140px;">
            <option value="">All Types</option>
            <option value="QUOTATION" ${activeFilters.type === 'QUOTATION' ? 'selected' : ''}>QUOTATION</option>
            <option value="INVOICE" ${activeFilters.type === 'INVOICE' ? 'selected' : ''}>INVOICE</option>
          </select>
        </div>

        <div style="font-size:12px; color:var(--text-secondary);">
          Showing <strong>${filtered.length}</strong> of ${quotes.length} Records
        </div>
      </div>

      <!-- Ledger Table -->
      <div class="table-responsive">
        <table class="custom-table" style="font-size:12.5px;">
          <thead>
            <tr>
              <th style="width:130px;">Doc Number</th>
              <th style="width:100px;">Type</th>
              <th style="width:140px;">Date</th>
              <th>Prepared For (Party)</th>
              <th>Items Preview</th>
              <th style="width:130px;">Final Total</th>
              <th style="width:150px; text-align:center;">Status</th>
              <th style="text-align:center; width:130px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0 ? `
              <tr>
                <td colspan="8" class="text-center muted-text" style="padding:60px 20px;">
                  <i data-lucide="file-x" style="width:40px; height:40px; margin-bottom:8px; opacity:0.4; display:block; margin:0 auto 8px;"></i>
                  No quotations found. Click <strong>"+ Create New Quotation"</strong> to initialize a new sheet.
                </td>
              </tr>
            ` : filtered.map(quote => {
              const isConfirmed = quote.status === 'Confirmed';
              const itemsPreview = (quote.items || []).map(i => {
                const firstLine = (i.description || '').split('\n')[0];
                return `${firstLine}${i.qty && i.qty !== '—' ? ` (${i.qty})` : ''}`;
              }).join(', ');

              return `
                <tr>
                  <td>
                    <strong style="color:var(--primary-color); cursor:pointer;" class="quote-view-link" data-id="${quote.id}">
                      ${quote.quotationNo}
                    </strong>
                  </td>
                  <td>
                    <span class="badge ${quote.type === 'INVOICE' ? 'primary' : 'secondary'}" style="font-size:10px;">
                      ${quote.type}
                    </span>
                  </td>
                  <td><span style="font-size:11px; color:var(--text-secondary);">${quote.date}</span></td>
                  <td>
                    <div style="font-weight:600; color:var(--text-primary);">${quote.partyName}</div>
                    ${quote.mobile && quote.mobile !== 'N/A' ? `<span style="font-size:10px; color:var(--text-muted);">📱 ${quote.mobile}</span>` : ''}
                  </td>
                  <td style="max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${itemsPreview}">
                    ${itemsPreview || '<span class="muted-text">—</span>'}
                  </td>
                  <td style="font-weight:700; color:var(--text-primary);">
                    ₹${Number(quote.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td style="text-align:center;">
                    <div style="display:inline-flex; align-items:center; gap:6px;">
                      <span class="badge ${isConfirmed ? 'success' : 'warning'}" style="font-size:10px; cursor:pointer;" title="Click to toggle status" data-action="toggle-status" data-id="${quote.id}">
                        ${isConfirmed ? '✅ Confirmed' : '⏳ Not Confirmed'}
                      </span>
                    </div>
                  </td>
                  <td style="text-align:center;">
                    <div style="display:flex; justify-content:center; gap:6px;">
                      <button class="btn btn-secondary quote-preview-btn" data-id="${quote.id}" title="View & Print Quotation" style="padding:4px 8px; font-size:11px;">
                        <i data-lucide="eye" style="width:13px; height:13px;"></i>
                      </button>
                      <button class="btn btn-secondary quote-edit-btn" data-id="${quote.id}" title="Edit Quotation" style="padding:4px 8px; font-size:11px;">
                        <i data-lucide="edit" style="width:13px; height:13px;"></i>
                      </button>
                      <button class="btn btn-danger quote-delete-btn" data-id="${quote.id}" title="Delete" style="padding:4px 8px; font-size:11px;">
                        <i data-lucide="trash-2" style="width:13px; height:13px;"></i>
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
  `;

  // Search & Filter Events
  document.getElementById('quote-search-input')?.addEventListener('input', (e) => {
    activeFilters.search = e.target.value;
    renderQuotationsList(workspace, container);
  });
  document.getElementById('quote-status-filter')?.addEventListener('change', (e) => {
    activeFilters.status = e.target.value;
    renderQuotationsList(workspace, container);
  });
  document.getElementById('quote-type-filter')?.addEventListener('change', (e) => {
    activeFilters.type = e.target.value;
    renderQuotationsList(workspace, container);
  });

  // Toggle Confirmed Status
  workspace.querySelectorAll('[data-action="toggle-status"]').forEach(badge => {
    badge.addEventListener('click', async () => {
      const id = badge.getAttribute('data-id');
      const quote = await db.get('quotes', id);
      if (quote) {
        quote.status = quote.status === 'Confirmed' ? 'Not Confirmed' : 'Confirmed';
        await db.put('quotes', quote);
        await sync.queueOperation('quotes', 'update', quote);
        app.showToast('Status Updated', `${quote.quotationNo} is now ${quote.status}.`, 'success');
        renderQuotationsList(workspace, container);
      }
    });
  });

  // View / Preview
  const openPreview = (id) => {
    previewQuoteId = id;
    activeTab = 'preview';
    renderQuotations(container);
  };

  workspace.querySelectorAll('.quote-view-link').forEach(link => {
    link.addEventListener('click', () => openPreview(link.getAttribute('data-id')));
  });
  workspace.querySelectorAll('.quote-preview-btn').forEach(btn => {
    btn.addEventListener('click', () => openPreview(btn.getAttribute('data-id')));
  });

  // Edit
  workspace.querySelectorAll('.quote-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      editingQuoteId = btn.getAttribute('data-id');
      activeTab = 'create';
      currentCreatorState = null;
      renderQuotations(container);
    });
  });

  // Delete
  workspace.querySelectorAll('.quote-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const quote = await db.get('quotes', id);
      if (quote && confirm(`Are you sure you want to permanently delete ${quote.quotationNo}?`)) {
        await db.delete('quotes', id);
        await sync.queueOperation('quotes', 'delete', id);
        app.showToast('Quotation Deleted', `Removed ${quote.quotationNo}.`, 'success');
        renderQuotations(container);
      }
    });
  });

  lucide.createIcons();
}

/**
 * ==========================================================================
 * 2. QUOTATION CREATOR & DYNAMIC LINE ITEMS FORM
 * ==========================================================================
 */
async function renderQuotationCreator(workspace, container) {
  const settings = await getQuotationSettings();
  const projects = await db.getAll('projects');
  const allQuotes = await db.getAll('quotes');

  // If editing an existing quote, load it; otherwise initialize new
  let quote = null;
  if (editingQuoteId) {
    quote = await db.get('quotes', editingQuoteId);
  }

  if (!currentCreatorState) {
    if (quote) {
      currentCreatorState = JSON.parse(JSON.stringify(quote));
      // Ensure applyGST flag exists
      if (currentCreatorState.applyGST === undefined) {
        currentCreatorState.applyGST = (currentCreatorState.gstRate > 0 || currentCreatorState.gstAmount > 0);
      }
    } else {
      const nextNum = allQuotes.length + 1;
      const defaultNo = `GQ-${new Date().getFullYear()}-${nextNum.toString().padStart(4, '0')}`;
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' +
                      now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();

      currentCreatorState = {
        id: `quote-${Date.now()}`,
        quotationNo: defaultNo,
        type: 'QUOTATION',
        date: dateStr,
        partyName: '',
        mobile: 'N/A',
        email: 'N/A',
        projectId: null,
        status: 'Not Confirmed',
        columns: { ...DEFAULT_COLUMNS },
        items: [
          {
            description: '',
            category: 'Window',
            size: '',
            qty: '1 pcs',
            rate: '',
            amount: 0
          }
        ],
        subtotal: 0,
        applyGST: false, // Default: GST is EXCLUDED as requested
        gstRate: 18,
        gstAmount: 0,
        total: 0,
        terms: [...settings.terms]
      };
    }
  }

  const s = currentCreatorState;

  workspace.innerHTML = `
    <div class="glass-card" style="display:flex; flex-direction:column; gap:20px; padding:24px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; border-bottom:1px solid var(--glass-border); padding-bottom:14px;">
        <div>
          <h3 style="font-size:18px; font-family:var(--font-heading); font-weight:700; margin:0;">
            ${editingQuoteId ? `Edit Document: ${s.quotationNo}` : 'New Quotation & Invoice Creator'}
          </h3>
          <p class="muted-text" style="font-size:12px; margin:2px 0 0;">
            Size, Qty, and Rate auto-multiply to calculate Final Amount. Click ✕ on any column header to remove it.
          </p>
        </div>
        <div style="display:flex; gap:10px;">
          <button id="creator-cancel-btn" class="btn btn-secondary" style="padding:6px 14px; font-size:12px;">Cancel</button>
          <button id="creator-save-btn" class="btn btn-primary" style="padding:6px 18px; font-size:12px; font-weight:600;">
            <i data-lucide="check"></i> Save Quotation
          </button>
          <button id="creator-save-preview-btn" class="btn btn-accent" style="padding:6px 18px; font-size:12px; font-weight:600;">
            <i data-lucide="eye"></i> Save & View Print Sheet
          </button>
        </div>
      </div>

      <!-- General Meta Parameters Form -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:16px;">
        <div class="input-group" style="margin-bottom:0;">
          <label style="font-weight:700;">Document Type *</label>
          <select id="quote-input-type" class="form-control-noicon">
            <option value="QUOTATION" ${s.type === 'QUOTATION' ? 'selected' : ''}>QUOTATION</option>
            <option value="INVOICE" ${s.type === 'INVOICE' ? 'selected' : ''}>INVOICE</option>
          </select>
        </div>

        <div class="input-group" style="margin-bottom:0;">
          <label style="font-weight:700;">Quotation / Invoice No. *</label>
          <input type="text" id="quote-input-no" class="form-control-noicon" value="${s.quotationNo}" required />
        </div>

        <div class="input-group" style="margin-bottom:0;">
          <label style="font-weight:700;">Date & Time *</label>
          <input type="text" id="quote-input-date" class="form-control-noicon" value="${s.date}" required />
        </div>

        <div class="input-group" style="margin-bottom:0;">
          <label style="font-weight:700;">Status</label>
          <select id="quote-input-status" class="form-control-noicon">
            <option value="Not Confirmed" ${s.status === 'Not Confirmed' ? 'selected' : ''}>⏳ Not Confirmed (Draft)</option>
            <option value="Confirmed" ${s.status === 'Confirmed' ? 'selected' : ''}>✅ Confirmed (Finalized)</option>
          </select>
        </div>
      </div>

      <!-- Party Information -->
      <div style="background:rgba(0,0,0,0.12); padding:16px; border-radius:var(--radius-md); border:1px solid var(--glass-border);">
        <h4 style="font-size:13px; font-weight:700; color:var(--primary-color); margin:0 0 12px; text-transform:uppercase; letter-spacing:0.5px;">
          Prepared For (Party Details)
        </h4>
        <div style="display:grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap:14px;">
          <div class="input-group" style="margin-bottom:0;">
            <label>Party / Client Name & GSTIN *</label>
            <input type="text" id="quote-input-party" class="form-control-noicon" placeholder="e.g. Amit Glass (GST- 23AUTTS5015C2ZR)" value="${s.partyName}" required />
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Mobile No</label>
            <input type="text" id="quote-input-mobile" class="form-control-noicon" placeholder="N/A or Phone" value="${s.mobile}" />
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Email Id</label>
            <input type="text" id="quote-input-email" class="form-control-noicon" placeholder="N/A or Email" value="${s.email}" />
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Connected Project (Optional)</label>
            <select id="quote-input-project" class="form-control-noicon">
              <option value="">— No Project Connect —</option>
              ${projects.map(p => `<option value="${p.id}" ${p.id === s.projectId ? 'selected' : ''}>🏗️ ${p.name}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>

      <!-- Dynamic Columns Bar with Restore Options -->
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; background:rgba(255,255,255,0.02); padding:10px 14px; border-radius:6px; border:1px solid var(--glass-border);">
        <div style="display:flex; align-items:center; gap:8px; font-size:12px; flex-wrap:wrap;">
          <i data-lucide="columns-3" style="width:16px; height:16px; color:var(--primary-color);"></i>
          <span style="font-weight:700; text-transform:uppercase;">Table Columns:</span>
          <span class="muted-text" style="font-size:11px;">(Click ✕ on any column header to remove it)</span>
        </div>

        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          ${!s.columns.category ? `
            <button type="button" class="btn btn-secondary col-restore-btn" data-col="category" style="padding:3px 8px; font-size:11px;">
              <i data-lucide="plus" style="width:12px; height:12px;"></i> Add Category
            </button>
          ` : ''}
          ${!s.columns.size ? `
            <button type="button" class="btn btn-secondary col-restore-btn" data-col="size" style="padding:3px 8px; font-size:11px;">
              <i data-lucide="plus" style="width:12px; height:12px;"></i> Add Size (Sq.Ft.)
            </button>
          ` : ''}
          ${!s.columns.qty ? `
            <button type="button" class="btn btn-secondary col-restore-btn" data-col="qty" style="padding:3px 8px; font-size:11px;">
              <i data-lucide="plus" style="width:12px; height:12px;"></i> Add Qty (Units)
            </button>
          ` : ''}
          ${!s.columns.rate ? `
            <button type="button" class="btn btn-secondary col-restore-btn" data-col="rate" style="padding:3px 8px; font-size:11px;">
              <i data-lucide="plus" style="width:12px; height:12px;"></i> Add Rate / Size
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Dynamic Line Items Editor -->
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <h4 style="font-size:14px; font-weight:700; margin:0;">
            Quotation Line Items
            <span class="muted-text" style="font-size:11px; font-weight:400; margin-left:6px;">(Auto-computes: Size × Qty × Rate = Final Amount)</span>
          </h4>
          <button type="button" id="creator-add-line-btn" class="btn btn-secondary" style="padding:5px 14px; font-size:12px; display:flex; align-items:center; gap:4px;">
            <i data-lucide="plus"></i> Add Line Item
          </button>
        </div>

        <div class="table-responsive" style="border:1px solid var(--glass-border); border-radius:var(--radius-md);">
          <table class="custom-table" style="font-size:12px; margin:0;" id="creator-items-table">
            <thead>
              <tr style="background:rgba(0,0,0,0.25);">
                <th style="width:36px; text-align:center;">#</th>
                <th style="min-width:280px;">Description / Glass Specifications *</th>
                
                ${s.columns.category ? `
                  <th style="width:125px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <span>Category</span>
                      <button type="button" class="col-remove-header-btn" data-col="category" title="Remove Category column from this quotation" style="background:transparent; border:none; color:#f87171; cursor:pointer; padding:0 4px; font-size:13px; font-weight:bold; line-height:1;">
                        ✕
                      </button>
                    </div>
                  </th>
                ` : ''}

                ${s.columns.size ? `
                  <th style="width:120px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <span>Size (Sq.Ft.)</span>
                      <button type="button" class="col-remove-header-btn" data-col="size" title="Remove Size column from this quotation" style="background:transparent; border:none; color:#f87171; cursor:pointer; padding:0 4px; font-size:13px; font-weight:bold; line-height:1;">
                        ✕
                      </button>
                    </div>
                  </th>
                ` : ''}

                ${s.columns.qty ? `
                  <th style="width:105px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <span>Qty (Units)</span>
                      <button type="button" class="col-remove-header-btn" data-col="qty" title="Remove Qty column from this quotation" style="background:transparent; border:none; color:#f87171; cursor:pointer; padding:0 4px; font-size:13px; font-weight:bold; line-height:1;">
                        ✕
                      </button>
                    </div>
                  </th>
                ` : ''}

                ${s.columns.rate ? `
                  <th style="width:145px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <span>Rate / Size</span>
                      <button type="button" class="col-remove-header-btn" data-col="rate" title="Remove Rate column from this quotation" style="background:transparent; border:none; color:#f87171; cursor:pointer; padding:0 4px; font-size:13px; font-weight:bold; line-height:1;">
                        ✕
                      </button>
                    </div>
                  </th>
                ` : ''}

                <th style="width:140px; text-align:right;">Final Amount (₹) *</th>
                <th style="width:40px; text-align:center;"></th>
              </tr>
            </thead>
            <tbody id="creator-items-tbody">
              <!-- Populated by JS -->
            </tbody>
          </table>
        </div>
      </div>

      <!-- Financials & Terms Section -->
      <div style="display:grid; grid-template-columns: 1.4fr 1fr; gap:20px; align-items:start;">
        <!-- Terms & Conditions -->
        <div class="input-group" style="margin-bottom:0;">
          <label style="font-weight:700;">Terms & Conditions</label>
          <textarea id="quote-input-terms" class="form-control-noicon" rows="6" style="font-size:11.5px; line-height:1.5;">${s.terms.join('\n')}</textarea>
          <span class="muted-text" style="font-size:11px; margin-top:4px;">One term clause per line. Pre-populated from company defaults.</span>
        </div>

        <!-- Totals Calculation Box with GST Selector Box -->
        <div class="glass-card" style="padding:16px; background:rgba(0,0,0,0.18); display:flex; flex-direction:column; gap:12px;">
          <!-- Items Subtotal -->
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:13px;">
            <span class="muted-text">Items Subtotal:</span>
            <strong id="creator-subtotal-display">₹${Number(s.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
          </div>

          <!-- GST Selector Box: Excluded by Default -->
          <div style="background:rgba(255,255,255,0.03); padding:10px 12px; border-radius:6px; border:1px solid var(--glass-border);">
            <label style="cursor:pointer; display:flex; align-items:center; justify-content:space-between; font-size:12.5px; font-weight:600; margin-bottom:0;">
              <div style="display:flex; align-items:center; gap:8px;">
                <input type="checkbox" id="quote-apply-gst-chk" ${s.applyGST ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;" />
                <span>Include GST Tax</span>
              </div>
              <span class="badge ${s.applyGST ? 'primary' : 'secondary'}" style="font-size:10px;" id="gst-status-badge">
                ${s.applyGST ? 'GST Enabled' : 'Excluded (0%)'}
              </span>
            </label>

            <!-- GST Rate Controls (shown when checked) -->
            <div id="quote-gst-rate-row" style="display:${s.applyGST ? 'flex' : 'none'}; justify-content:space-between; align-items:center; margin-top:10px; padding-top:8px; border-top:1px dashed var(--glass-border);">
              <div style="display:flex; align-items:center; gap:8px; font-size:12px;">
                <span class="muted-text">GST Rate:</span>
                <select id="quote-input-gst-rate" class="form-control-noicon" style="padding:3px 8px; font-size:11.5px; width:75px;">
                  <option value="5" ${s.gstRate === 5 ? 'selected' : ''}>5%</option>
                  <option value="12" ${s.gstRate === 12 ? 'selected' : ''}>12%</option>
                  <option value="18" ${s.gstRate === 18 || !s.gstRate ? 'selected' : ''}>18%</option>
                  <option value="28" ${s.gstRate === 28 ? 'selected' : ''}>28%</option>
                </select>
              </div>
              <strong id="creator-gst-display" style="font-size:13px;">₹${Number(s.gstAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
            </div>
          </div>

          <div style="height:1px; background:var(--glass-border); margin:2px 0;"></div>

          <!-- Grand Total -->
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:16px;">
            <span style="font-weight:700; color:var(--text-primary);">Grand Total:</span>
            <strong style="color:var(--primary-color); font-size:18px;" id="creator-total-display">
              ₹${Number(s.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </strong>
          </div>
        </div>
      </div>
    </div>
  `;

  // Render Line Items Table Rows
  renderCreatorTableRows();

  // Column header remove button listeners (the cross sign on each column)
  workspace.querySelectorAll('.col-remove-header-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const col = btn.getAttribute('data-col');
      if (col && currentCreatorState.columns[col] !== undefined) {
        syncCurrentFormStateToMemory();
        currentCreatorState.columns[col] = false;
        app.showToast('Column Removed', `Removed "${col}" column from this quotation.`, 'info');
        renderQuotationCreator(workspace, container);
      }
    });
  });

  // Restore removed column buttons
  workspace.querySelectorAll('.col-restore-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const col = btn.getAttribute('data-col');
      if (col && currentCreatorState.columns[col] !== undefined) {
        syncCurrentFormStateToMemory();
        currentCreatorState.columns[col] = true;
        app.showToast('Column Added', `Restored "${col}" column to quotation.`, 'success');
        renderQuotationCreator(workspace, container);
      }
    });
  });

  // Add Line Item button
  document.getElementById('creator-add-line-btn')?.addEventListener('click', () => {
    syncCurrentFormStateToMemory();
    currentCreatorState.items.push({
      description: '',
      category: 'Window',
      size: '',
      qty: '1 pcs',
      rate: '',
      amount: 0
    });
    renderCreatorTableRows();
    recalculateTotals();
    lucide.createIcons();
  });

  // GST Checkbox selector listener (Excluded by default)
  document.getElementById('quote-apply-gst-chk')?.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    currentCreatorState.applyGST = isChecked;
    const rateRow = document.getElementById('quote-gst-rate-row');
    const badge = document.getElementById('gst-status-badge');

    if (rateRow) rateRow.style.display = isChecked ? 'flex' : 'none';
    if (badge) {
      badge.className = isChecked ? 'badge primary' : 'badge secondary';
      badge.textContent = isChecked ? 'GST Enabled' : 'Excluded (0%)';
    }

    if (isChecked) {
      const currentRate = parseFloat(document.getElementById('quote-input-gst-rate')?.value || '18') || 18;
      currentCreatorState.gstRate = currentRate;
    } else {
      currentCreatorState.gstRate = 0;
    }

    recalculateTotals();
  });

  // GST rate change listener
  document.getElementById('quote-input-gst-rate')?.addEventListener('change', (e) => {
    currentCreatorState.gstRate = parseFloat(e.target.value || '18') || 18;
    recalculateTotals();
  });

  // Cancel Button
  document.getElementById('creator-cancel-btn')?.addEventListener('click', () => {
    activeTab = 'list';
    currentCreatorState = null;
    editingQuoteId = null;
    renderQuotations(container);
  });

  // Save Buttons
  const handleSave = async (andPreview = false) => {
    syncCurrentFormStateToMemory();
    const finalData = currentCreatorState;

    if (!finalData.partyName || !finalData.quotationNo) {
      app.showToast('Required Information', 'Party Name and Quotation No are mandatory.', 'warning');
      return;
    }

    if (finalData.items.length === 0) {
      app.showToast('No Line Items', 'Please add at least one line item to the quotation.', 'warning');
      return;
    }

    await db.put('quotes', finalData);
    await sync.queueOperation('quotes', editingQuoteId ? 'update' : 'insert', finalData);

    app.showToast('Quotation Saved', `${finalData.quotationNo} successfully recorded.`, 'success');

    if (andPreview) {
      previewQuoteId = finalData.id;
      activeTab = 'preview';
    } else {
      activeTab = 'list';
    }

    currentCreatorState = null;
    editingQuoteId = null;
    renderQuotations(container);
  };

  document.getElementById('creator-save-btn')?.addEventListener('click', () => handleSave(false));
  document.getElementById('creator-save-preview-btn')?.addEventListener('click', () => handleSave(true));

  lucide.createIcons();
}

/**
 * Renders the line item rows in the creator table and attaches the live multiplication listeners
 */
function renderCreatorTableRows() {
  const tbody = document.getElementById('creator-items-tbody');
  if (!tbody || !currentCreatorState) return;

  const s = currentCreatorState;

  tbody.innerHTML = s.items.map((item, idx) => `
    <tr data-row-idx="${idx}">
      <td style="text-align:center; font-weight:700; color:var(--text-muted); vertical-align:middle;">${idx + 1}</td>
      <td>
        <textarea class="form-control-noicon item-desc" rows="2" style="font-size:11.5px; padding:6px 8px; width:100%;" placeholder="Glass specifications, thickness, series, transport...">${item.description || ''}</textarea>
      </td>
      ${s.columns.category ? `
        <td>
          <input type="text" class="form-control-noicon item-category" value="${item.category || ''}" placeholder="Window, Mirror..." style="font-size:11.5px; padding:6px 8px;" />
        </td>
      ` : ''}
      ${s.columns.size ? `
        <td>
          <input type="text" class="form-control-noicon item-size" value="${item.size || ''}" placeholder="378.80 sq.ft" style="font-size:11.5px; padding:6px 8px;" />
        </td>
      ` : ''}
      ${s.columns.qty ? `
        <td>
          <input type="text" class="form-control-noicon item-qty" value="${item.qty || ''}" placeholder="1 pcs" style="font-size:11.5px; padding:6px 8px;" />
        </td>
      ` : ''}
      ${s.columns.rate ? `
        <td>
          <input type="text" class="form-control-noicon item-rate" value="${item.rate || ''}" placeholder="400.00" style="font-size:11.5px; padding:6px 8px;" />
        </td>
      ` : ''}
      <td>
        <input type="number" step="0.01" class="form-control-noicon item-amount" value="${item.amount !== undefined ? item.amount : 0}" style="font-size:12px; font-weight:700; text-align:right; padding:6px 8px; color:var(--primary-color);" required />
      </td>
      <td style="text-align:center; vertical-align:middle;">
        <button type="button" class="btn btn-secondary creator-remove-row-btn" data-idx="${idx}" title="Delete Row" style="padding:4px 6px; font-size:11px; color:var(--danger); border:none; background:transparent;">
          <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
        </button>
      </td>
    </tr>
  `).join('');

  // Row removal listeners
  tbody.querySelectorAll('.creator-remove-row-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-idx'));
      syncCurrentFormStateToMemory();
      currentCreatorState.items.splice(idx, 1);
      renderCreatorTableRows();
      recalculateTotals();
      lucide.createIcons();
    });
  });

  // AUTO-MULTIPLICATION: Size (Sq.Ft.) × Qty (Units) × Rate / Size = Final Amount (₹)
  tbody.querySelectorAll('tr').forEach((row, idx) => {
    const sizeInp = row.querySelector('.item-size');
    const qtyInp = row.querySelector('.item-qty');
    const rateInp = row.querySelector('.item-rate');
    const amountInp = row.querySelector('.item-amount');

    const computeRowAmount = () => {
      const sizeVal = sizeInp ? extractNumericValue(sizeInp.value) : 0;
      const qtyVal = qtyInp ? extractNumericValue(qtyInp.value) : 0;
      const rateVal = rateInp ? extractNumericValue(rateInp.value) : 0;

      if (rateVal > 0) {
        let multiplier = 1;
        if (sizeVal > 0 && qtyVal > 0) {
          multiplier = sizeVal * qtyVal;
        } else if (sizeVal > 0) {
          multiplier = sizeVal;
        } else if (qtyVal > 0) {
          multiplier = qtyVal;
        }

        const computed = Math.round((multiplier * rateVal) * 100) / 100;
        if (amountInp) {
          amountInp.value = computed;
          if (s.items[idx]) {
            s.items[idx].amount = computed;
          }
        }
      }
      recalculateTotals();
    };

    sizeInp?.addEventListener('input', computeRowAmount);
    qtyInp?.addEventListener('input', computeRowAmount);
    rateInp?.addEventListener('input', computeRowAmount);

    // Manual amount override
    amountInp?.addEventListener('input', () => {
      if (s.items[idx]) {
        s.items[idx].amount = parseFloat(amountInp.value || '0') || 0;
      }
      recalculateTotals();
    });
  });

  lucide.createIcons();
}

/**
 * Synchronize all form fields into currentCreatorState memory
 */
function syncCurrentFormStateToMemory() {
  if (!currentCreatorState) return;
  const s = currentCreatorState;

  s.type = document.getElementById('quote-input-type')?.value || 'QUOTATION';
  s.quotationNo = document.getElementById('quote-input-no')?.value?.trim() || s.quotationNo;
  s.date = document.getElementById('quote-input-date')?.value?.trim() || s.date;
  s.status = document.getElementById('quote-input-status')?.value || 'Not Confirmed';

  s.partyName = document.getElementById('quote-input-party')?.value?.trim() || '';
  s.mobile = document.getElementById('quote-input-mobile')?.value?.trim() || 'N/A';
  s.email = document.getElementById('quote-input-email')?.value?.trim() || 'N/A';
  s.projectId = document.getElementById('quote-input-project')?.value || null;

  const termsText = document.getElementById('quote-input-terms')?.value || '';
  s.terms = termsText.split('\n').map(t => t.trim()).filter(t => t.length > 0);

  // Sync rows
  const rows = document.querySelectorAll('#creator-items-tbody tr');
  rows.forEach((tr, idx) => {
    if (s.items[idx]) {
      s.items[idx].description = tr.querySelector('.item-desc')?.value?.trim() || '';
      if (s.columns.category) s.items[idx].category = tr.querySelector('.item-category')?.value?.trim() || '';
      if (s.columns.size) s.items[idx].size = tr.querySelector('.item-size')?.value?.trim() || '';
      if (s.columns.qty) s.items[idx].qty = tr.querySelector('.item-qty')?.value?.trim() || '';
      if (s.columns.rate) s.items[idx].rate = tr.querySelector('.item-rate')?.value?.trim() || '';
      s.items[idx].amount = parseFloat(tr.querySelector('.item-amount')?.value || '0') || 0;
    }
  });

  s.applyGST = document.getElementById('quote-apply-gst-chk')?.checked || false;
  if (s.applyGST) {
    s.gstRate = parseFloat(document.getElementById('quote-input-gst-rate')?.value || '18') || 18;
  } else {
    s.gstRate = 0;
  }
}

/**
 * Recalculate Subtotal, GST, and Grand Total
 */
function recalculateTotals() {
  if (!currentCreatorState) return;
  const s = currentCreatorState;

  let subtotal = 0;
  document.querySelectorAll('#creator-items-tbody .item-amount').forEach(inp => {
    subtotal += parseFloat(inp.value || '0') || 0;
  });
  subtotal = Math.round(subtotal * 100) / 100;

  const applyGST = document.getElementById('quote-apply-gst-chk')?.checked ?? s.applyGST;
  const gstRate = applyGST ? (parseFloat(document.getElementById('quote-input-gst-rate')?.value || '18') || 18) : 0;

  const gstAmount = applyGST ? Math.round((subtotal * (gstRate / 100)) * 100) / 100 : 0;
  const total = Math.round((subtotal + gstAmount) * 100) / 100;

  s.subtotal = subtotal;
  s.applyGST = applyGST;
  s.gstRate = gstRate;
  s.gstAmount = gstAmount;
  s.total = total;

  const subEl = document.getElementById('creator-subtotal-display');
  const gstEl = document.getElementById('creator-gst-display');
  const totEl = document.getElementById('creator-total-display');

  if (subEl) subEl.textContent = `₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  if (gstEl) gstEl.textContent = `₹${gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  if (totEl) totEl.textContent = `₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

/**
 * ==========================================================================
 * 3. PIXEL-PERFECT QUOTATION & INVOICE SHEET PREVIEW (Matching Reference)
 * ==========================================================================
 */
async function renderQuotationPreview(workspace, container) {
  const quote = await db.get('quotes', previewQuoteId);
  if (!quote) {
    workspace.innerHTML = `<div class="glass-card text-center muted-text" style="padding:60px;">Quotation not found.</div>`;
    return;
  }

  const settings = await getQuotationSettings();
  const cols = quote.columns || DEFAULT_COLUMNS;

  // Render preview toolbar + sheet
  workspace.innerHTML = `
    <div>
      <!-- Top Action Toolbar -->
      <div class="quotation-toolbar">
        <div style="display:flex; align-items:center; gap:10px;">
          <button id="preview-back-btn" class="btn btn-secondary" style="padding:6px 14px; font-size:12px; display:flex; align-items:center; gap:6px;">
            <i data-lucide="arrow-left"></i> Back to Ledger
          </button>
          <span style="font-size:13px; font-weight:700; color:var(--text-primary);">
            ${quote.quotationNo} (${quote.type})
          </span>
          <span class="badge ${quote.status === 'Confirmed' ? 'success' : 'warning'}" style="font-size:10px;">
            ${quote.status}
          </span>
        </div>

        <div style="display:flex; gap:8px; align-items:center;">
          <button id="preview-toggle-status-btn" class="btn btn-secondary" style="padding:6px 12px; font-size:11px;">
            ${quote.status === 'Confirmed' ? 'Mark as Not Confirmed' : 'Mark as Confirmed'}
          </button>
          <button id="preview-edit-btn" class="btn btn-secondary" style="padding:6px 14px; font-size:12px; display:flex; align-items:center; gap:6px;">
            <i data-lucide="edit"></i> Edit Document
          </button>
          <button id="preview-print-btn" class="btn btn-primary" style="padding:7px 18px; font-size:12px; font-weight:700; display:flex; align-items:center; gap:6px;">
            <i data-lucide="printer"></i> Print / Save as PDF
          </button>
        </div>
      </div>

      <!-- Exact Pixel-Perfect Sheet Matching Glassology Reference -->
      <div class="quotation-sheet-wrapper">
        <div class="quotation-sheet" id="print-quotation-target">
          <div>
            <!-- Top Header -->
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:26px;">
              <!-- Left: Brand Logo & Company Info -->
              <div style="display:flex; gap:14px; align-items:flex-start; max-width:65%;">
                <!-- Logo Box -->
                <div style="flex-shrink:0;">
                  ${settings.logoUrl ? `
                    <img src="${settings.logoUrl}" alt="Logo" style="max-height:54px; max-width:80px; object-fit:contain;" />
                  ` : `
                    <div style="width:48px; height:48px; background:#0052cc; border-radius:6px; display:flex; align-items:center; justify-content:center; color:#ffffff; font-weight:900; font-size:26px; font-family:sans-serif; letter-spacing:-1px;">
                      g
                    </div>
                  `}
                </div>

                <!-- Company Details -->
                <div>
                  <h1 style="margin:0 0 4px 0; font-size:21px; font-weight:800; color:#111827; letter-spacing:0.5px; font-family:sans-serif;">
                    ${settings.companyName}
                  </h1>
                  <div style="font-size:11px; color:#4b5563; line-height:1.45;">
                    ${settings.addressLine1 ? `<div>${settings.addressLine1}</div>` : ''}
                    ${settings.addressLine2 ? `<div>${settings.addressLine2}</div>` : ''}
                    <div style="margin-top:2px;">
                      <strong>Contact:</strong> ${settings.contact} • <strong>Email:</strong> ${settings.email}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Right: Document Title & Identifiers -->
              <div style="text-align:right;">
                <h2 style="margin:0 0 4px 0; font-size:22px; font-weight:800; color:#16396b; letter-spacing:0.5px; font-family:sans-serif;">
                  ${quote.type}
                </h2>
                <div style="font-size:13px; font-weight:700; color:#1f2937; margin-bottom:4px;">
                  ${quote.quotationNo}
                </div>
                <div style="font-size:11px; color:#6b7280; line-height:1.4;">
                  Date: ${quote.date}
                </div>
              </div>
            </div>

            <!-- Divider line -->
            <div style="height:1px; background:#e5e7eb; margin:0 0 20px 0;"></div>

            <!-- Two-Column Meta: PREPARED FOR (PARTY) & BANK DETAILS -->
            <div style="display:grid; grid-template-columns: 1.2fr 1fr; gap:28px; margin-bottom:24px;">
              <!-- Left: Prepared For -->
              <div style="border-left:3px solid #16396b; padding-left:12px;">
                <div style="font-size:11px; font-weight:700; color:#16396b; text-transform:uppercase; letter-spacing:0.4px; margin-bottom:6px;">
                  PREPARED FOR (PARTY):
                </div>
                <div style="font-size:13.5px; font-weight:700; color:#111827; margin-bottom:4px; line-height:1.35;">
                  ${quote.partyName}
                </div>
                <div style="font-size:11.5px; color:#4b5563; line-height:1.5;">
                  <div>Mobile No: ${quote.mobile || 'N/A'}</div>
                  <div>Email Id: ${quote.email || 'N/A'}</div>
                </div>
              </div>

              <!-- Right: Bank Details & QR Code -->
              <div style="border-left:3px solid #16396b; padding-left:12px;">
                <div style="font-size:11px; font-weight:700; color:#16396b; text-transform:uppercase; letter-spacing:0.4px; margin-bottom:6px;">
                  BANK DETAILS:
                </div>
                ${settings.showBankDetails ? `
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
                    <div style="font-size:11.5px; color:#4b5563; line-height:1.5; flex:1;">
                      <div>Bank Name: <strong>${settings.bankName}</strong></div>
                      <div>Account No: <strong>${settings.accountNo}</strong></div>
                      <div>IFSC Code: <strong>${settings.ifscCode}</strong></div>
                      <div>Branch: <strong>${settings.branch}</strong></div>
                    </div>
                    ${settings.qrCodeUrl ? `
                      <div style="display:flex; flex-direction:column; align-items:center; flex-shrink:0; text-align:center;">
                        <img src="${settings.qrCodeUrl}" alt="Payment QR Code" style="width:72px; height:72px; object-fit:contain; border:1px solid #d1d5db; border-radius:4px; padding:3px; background:#ffffff;" />
                        <span style="font-size:8.5px; font-weight:700; color:#16396b; margin-top:2px; letter-spacing:0.3px;">SCAN TO PAY</span>
                      </div>
                    ` : ''}
                  </div>
                ` : `
                  <div style="font-size:11.5px; color:#6b7280; font-style:italic; padding:4px 0;">
                    Bank details not configured.
                  </div>
                `}
              </div>
            </div>

            <!-- Line Items Table -->
            <table class="quotation-table">
              <thead>
                <tr>
                  <th style="width:40%;">Description</th>
                  ${cols.category ? '<th style="width:14%;">Category</th>' : ''}
                  ${cols.size ? '<th class="text-center" style="width:14%;">Size<br><span style="font-size:9.5px; opacity:0.85;">(Sq.Ft.)</span></th>' : ''}
                  ${cols.qty ? '<th class="text-center" style="width:12%;">Qty<br><span style="font-size:9.5px; opacity:0.85;">(Units)</span></th>' : ''}
                  ${cols.rate ? '<th class="text-right" style="width:18%;">Rate / Size<br><span style="font-size:9.5px; opacity:0.85;">(Sq.Ft.)</span></th>' : ''}
                  <th class="text-right" style="width:18%;">Final Amount</th>
                </tr>
              </thead>
              <tbody>
                ${(quote.items || []).map(item => `
                  <tr>
                    <td style="white-space:pre-line; font-weight:600; color:#111827;">${item.description}</td>
                    ${cols.category ? `<td style="color:#4b5563;">${item.category || '—'}</td>` : ''}
                    ${cols.size ? `<td class="text-center" style="color:#4b5563;">${item.size || '—'}</td>` : ''}
                    ${cols.qty ? `<td class="text-center" style="color:#4b5563;">${item.qty || '—'}</td>` : ''}
                    ${cols.rate ? `<td class="text-right" style="color:#4b5563; font-family:monospace;">${item.rate || '—'}</td>` : ''}
                    <td class="text-right" style="font-weight:700; color:#111827; font-family:monospace;">
                      ₹${Number(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Bottom Section: Terms & Conditions + Totals Box + Signatures -->
          <div>
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:24px; margin-bottom:48px;">
              <!-- Left: Terms & Conditions -->
              <div style="flex:1; font-size:10.5px; color:#4b5563; line-height:1.55;">
                <div style="font-size:11px; font-weight:700; color:#16396b; margin-bottom:6px;">
                  Terms & Conditions:
                </div>
                ${(quote.terms || DEFAULT_SETTINGS.terms).map(t => `<div>${t}</div>`).join('')}
              </div>

              <!-- Right: Totals Light Blue Box -->
              <div class="quotation-summary-box">
                <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:12px; color:#1f2937;">
                  <span>Items Subtotal:</span>
                  <span style="font-weight:700; font-family:monospace;">
                    ₹${Number(quote.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:12px; color:${quote.applyGST ? '#1f2937' : '#6b7280'};">
                  <span>GST (${quote.applyGST ? (quote.gstRate || 0) : 0}%):</span>
                  <span style="font-weight:700; font-family:monospace;">
                    ₹${Number(quote.applyGST ? (quote.gstAmount || 0) : 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div style="height:1px; background:#bfdbfe; margin-bottom:10px;"></div>
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:14.5px;">
                  <span style="font-weight:800; color:#16396b;">Total:</span>
                  <span style="font-weight:800; color:#16396b; font-size:17px; font-family:monospace;">
                    ₹${Number(quote.total || quote.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            <!-- Signatures Row -->
            <div style="display:flex; justify-content:space-between; align-items:flex-end; padding-top:24px; font-size:11.5px; color:#374151;">
              <div style="text-align:center; min-width:220px;">
                <div style="border-top:1.5px solid #4b5563; padding-top:6px; font-weight:600;">
                  Customer Acceptance Signature
                </div>
              </div>

              <div style="text-align:center; min-width:220px;">
                <div style="border-top:1.5px solid #4b5563; padding-top:6px; font-weight:600;">
                  Authorized Sales Officer
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Toolbar Actions
  document.getElementById('preview-back-btn')?.addEventListener('click', () => {
    activeTab = 'list';
    renderQuotations(container);
  });

  document.getElementById('preview-edit-btn')?.addEventListener('click', () => {
    editingQuoteId = quote.id;
    activeTab = 'create';
    currentCreatorState = null;
    renderQuotations(container);
  });

  document.getElementById('preview-print-btn')?.addEventListener('click', () => {
    window.print();
  });

  document.getElementById('preview-toggle-status-btn')?.addEventListener('click', async () => {
    quote.status = quote.status === 'Confirmed' ? 'Not Confirmed' : 'Confirmed';
    await db.put('quotes', quote);
    await sync.queueOperation('quotes', 'update', quote);
    app.showToast('Status Updated', `${quote.quotationNo} is now ${quote.status}.`, 'success');
    renderQuotationPreview(workspace, container);
  });

  lucide.createIcons();
}

/**
 * ==========================================================================
 * 4. COMPANY & BANK SETTINGS VIEW
 * ==========================================================================
 */
async function renderQuotationSettings(workspace, container) {
  const settings = await getQuotationSettings();

  workspace.innerHTML = `
    <div class="glass-card" style="display:flex; flex-direction:column; gap:20px; padding:24px; max-width:860px; margin:0 auto;">
      <div style="border-bottom:1px solid var(--glass-border); padding-bottom:14px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h3 style="font-size:18px; font-family:var(--font-heading); font-weight:700; margin:0;">
            Quotation & Invoice Branding Settings
          </h3>
          <p class="muted-text" style="font-size:12px; margin:2px 0 0;">
            Configure your organization branding, bank details, and default terms shown on printable vouchers.
          </p>
        </div>
        <button id="set-back-btn" class="btn btn-secondary" style="padding:6px 14px; font-size:12px; display:flex; align-items:center; gap:6px;">
          <i data-lucide="arrow-left"></i> Back to Ledger
        </button>
      </div>

      <form id="quote-settings-form" style="display:flex; flex-direction:column; gap:18px;">
        <!-- Company Identity -->
        <div style="background:rgba(0,0,0,0.14); padding:16px; border-radius:var(--radius-md); border:1px solid var(--glass-border);">
          <h4 style="font-size:13px; font-weight:700; color:var(--primary-color); margin:0 0 14px; text-transform:uppercase;">
            Company Details
          </h4>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px; margin-bottom:12px;">
            <div class="input-group" style="margin-bottom:0;">
              <label>Company Name *</label>
              <input type="text" id="set-company-name" class="form-control-noicon" value="${settings.companyName}" required />
            </div>

            <div class="input-group" style="margin-bottom:0;">
              <label>Company Logo</label>
              <div style="display:flex; gap:8px;">
                <input type="text" id="set-company-logo" class="form-control-noicon" placeholder="Image URL or upload below..." value="${settings.logoUrl || ''}" style="flex:1;" />
                <label class="btn btn-secondary" style="padding:6px 12px; font-size:11px; cursor:pointer; display:flex; align-items:center; gap:4px; white-space:nowrap;">
                  <i data-lucide="upload"></i> Upload
                  <input type="file" id="set-logo-file-input" accept="image/*" style="display:none;" />
                </label>
              </div>
              <div id="set-logo-preview" style="margin-top:6px; display:${settings.logoUrl ? 'block' : 'none'};">
                <img src="${settings.logoUrl || ''}" alt="Logo Preview" style="max-height:40px; max-width:80px; object-fit:contain; border:1px solid var(--glass-border); border-radius:4px; padding:2px; background:#fff;" />
              </div>
            </div>
          </div>

          <div class="input-group" style="margin-bottom:12px;">
            <label>Address Line 1</label>
            <input type="text" id="set-company-addr1" class="form-control-noicon" value="${settings.addressLine1 || ''}" />
          </div>

          <div class="input-group" style="margin-bottom:12px;">
            <label>Address Line 2 (Optional)</label>
            <input type="text" id="set-company-addr2" class="form-control-noicon" value="${settings.addressLine2 || ''}" />
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px;">
            <div class="input-group" style="margin-bottom:0;">
              <label>Contact Phone Number(s)</label>
              <input type="text" id="set-company-contact" class="form-control-noicon" value="${settings.contact || ''}" />
            </div>

            <div class="input-group" style="margin-bottom:0;">
              <label>Official Email</label>
              <input type="email" id="set-company-email" class="form-control-noicon" value="${settings.email || ''}" />
            </div>
          </div>
        </div>

        <!-- Bank Details Section -->
        <div style="background:rgba(0,0,0,0.14); padding:16px; border-radius:var(--radius-md); border:1px solid var(--glass-border);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
            <h4 style="font-size:13px; font-weight:700; color:var(--primary-color); margin:0; text-transform:uppercase;">
              Bank Account Details
            </h4>
            <label style="font-size:12px; cursor:pointer; display:flex; align-items:center; gap:6px;">
              <input type="checkbox" id="set-show-bank" ${settings.showBankDetails ? 'checked' : ''}>
              <span>Display Bank Details on Quotation Sheet</span>
            </label>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px; margin-bottom:14px;">
            <div class="input-group" style="margin-bottom:0;">
              <label>Bank Name</label>
              <input type="text" id="set-bank-name" class="form-control-noicon" value="${settings.bankName || ''}" />
            </div>

            <div class="input-group" style="margin-bottom:0;">
              <label>Account Number</label>
              <input type="text" id="set-bank-acc" class="form-control-noicon" value="${settings.accountNo || ''}" />
            </div>

            <div class="input-group" style="margin-bottom:0;">
              <label>IFSC Code</label>
              <input type="text" id="set-bank-ifsc" class="form-control-noicon" value="${settings.ifscCode || ''}" />
            </div>

            <div class="input-group" style="margin-bottom:0;">
              <label>Branch Name</label>
              <input type="text" id="set-bank-branch" class="form-control-noicon" value="${settings.branch || ''}" />
            </div>
          </div>

          <!-- Payment QR Code Uploader Field -->
          <div style="background:rgba(255,255,255,0.03); padding:12px 14px; border-radius:6px; border:1px dashed var(--glass-border);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <label style="font-weight:700; font-size:12px; margin-bottom:0; display:flex; align-items:center; gap:6px;">
                <i data-lucide="qr-code" style="width:15px; height:15px; color:var(--primary-color);"></i>
                <span>Payment QR Code (Displays by the side of Bank Details in Quotation)</span>
              </label>
              <button type="button" id="set-qr-remove-btn" class="btn btn-secondary" style="padding:2px 8px; font-size:10.5px; color:var(--danger); display:${settings.qrCodeUrl ? 'inline-flex' : 'none'}; align-items:center; gap:4px;">
                <i data-lucide="trash-2" style="width:11px; height:11px;"></i> Remove QR
              </button>
            </div>

            <div style="display:flex; gap:12px; align-items:center;">
              <div style="flex:1; display:flex; gap:8px;">
                <input type="text" id="set-qr-code-url" class="form-control-noicon" placeholder="Image URL or upload QR Code image file..." value="${settings.qrCodeUrl || ''}" style="flex:1;" />
                <label class="btn btn-secondary" style="padding:6px 12px; font-size:11px; cursor:pointer; display:flex; align-items:center; gap:4px; white-space:nowrap;">
                  <i data-lucide="upload"></i> Upload QR Code
                  <input type="file" id="set-qr-file-input" accept="image/*" style="display:none;" />
                </label>
              </div>

              <!-- QR Code Live Preview Box -->
              <div id="set-qr-preview" style="width:60px; height:60px; border:1px solid var(--glass-border); border-radius:4px; display:flex; align-items:center; justify-content:center; background:#ffffff; overflow:hidden; flex-shrink:0;">
                ${settings.qrCodeUrl ? `
                  <img src="${settings.qrCodeUrl}" alt="QR Preview" style="width:100%; height:100%; object-fit:contain;" />
                ` : `
                  <span style="font-size:9.5px; color:#9ca3af; text-align:center; line-height:1.2;">No QR</span>
                `}
              </div>
            </div>
          </div>
        </div>

        <!-- Default Terms & GST -->
        <div style="background:rgba(0,0,0,0.14); padding:16px; border-radius:var(--radius-md); border:1px solid var(--glass-border);">
          <h4 style="font-size:13px; font-weight:700; color:var(--primary-color); margin:0 0 14px; text-transform:uppercase;">
            Default Terms & Tax Rates
          </h4>

          <div class="input-group" style="margin-bottom:12px;">
            <label>Default GST Rate (%)</label>
            <input type="number" id="set-default-gst" class="form-control-noicon" value="${settings.defaultGSTRate || 18}" style="width:120px;" />
          </div>

          <div class="input-group" style="margin-bottom:0;">
            <label>Standard Terms & Conditions (One per line)</label>
            <textarea id="set-default-terms" class="form-control-noicon" rows="5" style="font-size:12px; line-height:1.5;">${settings.terms.join('\n')}</textarea>
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:8px;">
          <button type="submit" class="btn btn-primary" style="padding:9px 24px; font-size:13px; font-weight:700;">
            Save Settings
          </button>
        </div>
      </form>
    </div>
  `;

  // Back button
  document.getElementById('set-back-btn')?.addEventListener('click', () => {
    activeTab = 'list';
    renderQuotations(container);
  });

  // Logo file upload handler
  const fileInput = document.getElementById('set-logo-file-input');
  const logoText = document.getElementById('set-company-logo');
  const previewDiv = document.getElementById('set-logo-preview');

  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const dataUrl = evt.target.result;
        logoText.value = dataUrl;
        previewDiv.style.display = 'block';
        previewDiv.innerHTML = `<img src="${dataUrl}" alt="Logo Preview" style="max-height:40px; max-width:80px; object-fit:contain; border:1px solid var(--glass-border); border-radius:4px; padding:2px; background:#fff;" />`;
        app.showToast('Logo Loaded', 'Image ready to save.', 'info');
      };
      reader.readAsDataURL(file);
    }
  });

  logoText?.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    if (val) {
      previewDiv.style.display = 'block';
      previewDiv.innerHTML = `<img src="${val}" alt="Logo Preview" style="max-height:40px; max-width:80px; object-fit:contain; border:1px solid var(--glass-border); border-radius:4px; padding:2px; background:#fff;" />`;
    } else {
      previewDiv.style.display = 'none';
    }
  });

  // QR Code file upload handler
  const qrFileInput = document.getElementById('set-qr-file-input');
  const qrText = document.getElementById('set-qr-code-url');
  const qrPreview = document.getElementById('set-qr-preview');
  const qrRemoveBtn = document.getElementById('set-qr-remove-btn');

  qrFileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const dataUrl = evt.target.result;
        qrText.value = dataUrl;
        qrPreview.innerHTML = `<img src="${dataUrl}" alt="QR Preview" style="width:100%; height:100%; object-fit:contain;" />`;
        if (qrRemoveBtn) qrRemoveBtn.style.display = 'inline-flex';
        app.showToast('QR Code Loaded', 'QR code image ready to save.', 'info');
      };
      reader.readAsDataURL(file);
    }
  });

  qrText?.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    if (val) {
      qrPreview.innerHTML = `<img src="${val}" alt="QR Preview" style="width:100%; height:100%; object-fit:contain;" />`;
      if (qrRemoveBtn) qrRemoveBtn.style.display = 'inline-flex';
    } else {
      qrPreview.innerHTML = `<span style="font-size:9.5px; color:#9ca3af; text-align:center; line-height:1.2;">No QR</span>`;
      if (qrRemoveBtn) qrRemoveBtn.style.display = 'none';
    }
  });

  qrRemoveBtn?.addEventListener('click', () => {
    qrText.value = '';
    qrPreview.innerHTML = `<span style="font-size:9.5px; color:#9ca3af; text-align:center; line-height:1.2;">No QR</span>`;
    qrRemoveBtn.style.display = 'none';
    app.showToast('QR Code Removed', 'Click Save Settings to apply.', 'info');
  });

  // Submit Handler
  document.getElementById('quote-settings-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const termsStr = document.getElementById('set-default-terms')?.value || '';
    const updated = {
      companyName: document.getElementById('set-company-name')?.value?.trim() || 'GLASSOLOGY',
      logoUrl: document.getElementById('set-company-logo')?.value?.trim() || '',
      addressLine1: document.getElementById('set-company-addr1')?.value?.trim() || '',
      addressLine2: document.getElementById('set-company-addr2')?.value?.trim() || '',
      contact: document.getElementById('set-company-contact')?.value?.trim() || '',
      email: document.getElementById('set-company-email')?.value?.trim() || '',
      showBankDetails: document.getElementById('set-show-bank')?.checked || false,
      bankName: document.getElementById('set-bank-name')?.value?.trim() || '',
      accountNo: document.getElementById('set-bank-acc')?.value?.trim() || '',
      ifscCode: document.getElementById('set-bank-ifsc')?.value?.trim() || '',
      branch: document.getElementById('set-bank-branch')?.value?.trim() || '',
      qrCodeUrl: document.getElementById('set-qr-code-url')?.value?.trim() || '',
      defaultGSTRate: parseFloat(document.getElementById('set-default-gst')?.value || '18') || 0,
      terms: termsStr.split('\n').map(t => t.trim()).filter(t => t.length > 0)
    };

    await saveQuotationSettings(updated);
    app.showToast('Settings Saved', 'Quotation branding and QR Code settings updated.', 'success');
    activeTab = 'list';
    renderQuotations(container);
  });

  lucide.createIcons();
}
