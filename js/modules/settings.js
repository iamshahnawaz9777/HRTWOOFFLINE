/* ==========================================================================
   AeroGlass ERP System Settings & Sync Module
   ========================================================================== */

import { db } from '../db.js';
import { auth } from '../auth.js';
import { sync } from '../sync.js';

// Resolve circular dependency using a dynamic global window proxy
const app = new Proxy({}, {
  get: (target, prop) => window.app ? window.app[prop] : undefined
});

/**
 * Main Settings module entry
 */
export async function renderSettings(container) {
  const config = sync.getConfig();
  const queue = await db.getAll('syncQueue');
  const syncStatus = sync.getStatus();

  const isBrowserPickerSupported = typeof window.showDirectoryPicker === 'function';
  const isConnected = !!(db.localDirHandle || db.localDirPath);
  let isAuthorized = false;
  let folderName = '';
  if (isConnected) {
    if (db.localDirHandle) {
      folderName = db.localDirHandle.name;
      isAuthorized = await db.verifyPermission(true);
    } else if (db.localDirPath) {
      folderName = db.localDirPath;
      isAuthorized = await db.verifyPermission(true);
    }
  }

  container.innerHTML = `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px;">
      <!-- Column 1: Supabase integration credentials and manual sync -->
      <div style="display:flex; flex-direction:column; gap:24px;">
        
        <!-- Google Sheets Sync Configuration -->
        <div class="glass-card" style="display:flex; flex-direction:column; gap:16px;">
          <div>
            <h3 style="font-size:15px; font-family:var(--font-heading); font-weight:700;">📊 Automated Failover Backup</h3>
            <p class="muted-text" style="font-size:12px;">Establishes real-time Google Sheets replication matrices protecting core data layers if remote infrastructure changes.</p>
          </div>

          <div style="display:flex; flex-direction:column; gap:14px;">
            <div class="input-group" style="margin-bottom:0;">
              <label>Google AppScript Webhook Deploy Endpoint URL</label>
              <input type="text" id="g-webhook-url" class="form-control-noicon" placeholder="https://script.google.com/macros/s/.../exec" value="${localStorage.getItem('aeroglass_gsheet_webhook') || ''}">
            </div>
            
            <div style="display:flex; align-items:center; gap:8px;">
              <input type="checkbox" id="g-autosync-check" ${localStorage.getItem('aeroglass_gsheet_autosync') !== 'false' ? 'checked' : ''} style="width:16px; height:16px;">
              <label for="g-autosync-check" style="font-size:12px; margin:0;">Auto-trigger sequential background sync array hourly</label>
            </div>

            <div style="display:flex; gap:12px;">
              <button id="g-save-btn" class="btn btn-primary" style="flex-grow:1; padding:10px 16px;">Save Connection</button>
              <button id="g-forcesync-btn" class="btn btn-secondary" style="padding:10px 16px;">Sync Live Snapshots Now</button>
            </div>
          </div>
        </div>
        
        <!-- Turso Cloud Database Configuration -->
        <div class="glass-card" style="display:flex; flex-direction:column; gap:16px;">
          <div>
            <h3 style="font-size:15px; font-family:var(--font-heading); font-weight:700;">🌐 Turso Cloud Database</h3>
            <p class="muted-text" style="font-size:12px;">Connect to Turso's distributed SQLite edge database for high-speed cloud replication as part of the triple-sync pipeline.</p>
          </div>

          <div style="display:flex; flex-direction:column; gap:14px;">
            <div class="input-group" style="margin-bottom:0;">
              <label>Turso Database URL</label>
              <input type="text" id="turso-url" class="form-control-noicon" placeholder="libsql://your-db.turso.io" value="${sync.getTursoConfig() ? sync.getTursoConfig().url : ''}">
            </div>
            <div class="input-group" style="margin-bottom:0;">
              <label>Auth Token</label>
              <input type="password" id="turso-token" class="form-control-noicon" placeholder="Enter Turso auth token..." value="${sync.getTursoConfig() ? sync.getTursoConfig().authToken : ''}">
            </div>
            <div style="display:flex; gap:12px;">
              <button id="turso-save-btn" class="btn btn-primary" style="flex-grow:1; padding:10px 16px;">Save Turso Config</button>
              ${sync.getTursoConfig() ? `<button id="turso-disconnect-btn" class="btn btn-secondary" style="padding:10px 16px;">Disconnect</button>` : ''}
            </div>
          </div>
        </div>
        <!-- Supabase Cloud Credentials Form -->
        <div class="glass-card" style="display:flex; flex-direction:column; gap:16px;">
          <div>
            <h3 style="font-size:15px; font-family:var(--font-heading); font-weight:700;">Supabase Backend Sync Config</h3>
            <p class="muted-text" style="font-size:12px;">Link AeroGlass local IndexedDB databases with a cloud PostgreSQL database.</p>
          </div>

          <form id="supabase-config-form" style="display:flex; flex-direction:column; gap:14px;">
            <div class="input-group" style="margin-bottom:0;">
              <label>Supabase Project URL</label>
              <input type="url" id="sup-url" class="form-control-noicon" placeholder="https://your-project.supabase.co" value="${config ? config.url : ''}">
            </div>
            <div class="input-group" style="margin-bottom:0;">
              <label>API Service Key (Anon Key)</label>
              <input type="password" id="sup-key" class="form-control-noicon" placeholder="Enter anon role service key..." value="${config ? config.key : ''}">
            </div>
            <div style="display:flex; gap:12px;">
              <button type="submit" class="btn btn-primary" style="flex-grow:1; padding:10px 16px;">Save & Connect</button>
              ${config ? `
                <button type="button" id="sup-disconnect-btn" class="btn btn-secondary" style="padding:10px 16px;">Disconnect</button>
              ` : ''}
            </div>
          </form>
        </div>

        <!-- Sync Actions and diagnostic status panels -->
        <div class="glass-card" style="display:flex; flex-direction:column; gap:16px;">
          <h3 style="font-size:15px; font-family:var(--font-heading); font-weight:700;">Operational Sync Status</h3>
          
          <div style="display:flex; flex-direction:column; gap:10px; font-size:13px;">
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--glass-border); padding-bottom:6px;">
              <span class="muted-text">Device Network Connection:</span>
              <strong class="${navigator.onLine ? 'success-text' : 'warning-text'}">${navigator.onLine ? 'CONNECTED (ONLINE)' : 'DISCONNECTED (OFFLINE)'}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--glass-border); padding-bottom:6px;">
              <span class="muted-text">Current System Mode:</span>
              <strong>${syncStatus === 'local-only' ? 'Local-First (Offline Sandbox)' : 'Cloud Synced (Automatic)'}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--glass-border); padding-bottom:6px;">
              <span class="muted-text">Transactions Awaiting Sync:</span>
              <strong class="${queue.length > 0 ? 'warning-text' : 'success-text'}">${queue.length} items queued</strong>
            </div>
          </div>

          <div style="display:flex; gap:10px; margin-top:10px;">
            <button id="manual-sync-btn" class="btn btn-accent" style="flex-grow:1;" ${queue.length === 0 || syncStatus === 'offline' ? 'disabled' : ''}>
              <i data-lucide="refresh-cw"></i>
              <span>Trigger Manual Sync</span>
            </button>
            <button id="pull-cloud-btn" class="btn btn-secondary" ${syncStatus !== 'online' ? 'disabled' : ''} title="Pull all datasets from Cloud">
              <i data-lucide="download"></i>
              <span>Cloud Pull</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Column 2: Data Backup & CSV Exports -->
      <div style="display:flex; flex-direction:column; gap:24px;">
        
        <!-- Local Folder Database Configuration -->
        <div class="glass-card" style="display:flex; flex-direction:column; gap:16px;">
          <div>
            <h3 style="font-size:15px; font-family:var(--font-heading); font-weight:700;">📁 Local Folder Database Sync</h3>
            <p class="muted-text" style="font-size:12px;">Store your ERP database locally in a folder on your computer as physical JSON files. Perfect for version control and total privacy.</p>
          </div>

          <div style="display:flex; flex-direction:column; gap:14px;">
            ${!isConnected ? `
              <div style="background:rgba(255,255,255,0.01); border:1px dashed var(--glass-border); padding:16px; border-radius:8px; display:flex; flex-direction:column; gap:12px;">
                <p class="muted-text" style="font-size:12px; margin:0; text-align:center;">No local folder connected. Database changes are saved to browser IndexedDB only.</p>
                
                ${isBrowserPickerSupported ? `
                  <button id="local-folder-select-btn" class="btn btn-primary" style="padding:10px 16px; margin: 0 auto; display: inline-flex; align-items: center; gap: 8px;">
                    <i data-lucide="folder-plus"></i>
                    <span>Select Local Folder</span>
                  </button>
                  <div style="text-align:center; font-size:11px; margin:4px 0;" class="muted-text">— OR ENTER PATH MANUALLY —</div>
                ` : `
                  <div style="background:rgba(239,68,68,0.1); border:1px solid var(--danger); padding:8px 12px; border-radius:6px; font-size:11px; color:var(--danger); display:flex; gap:8px; align-items:center; margin-bottom:4px;">
                    <i data-lucide="alert-circle" style="flex-shrink:0; width:16px; height:16px;"></i>
                    <span>Browser folder picker is unsupported. Reverting to local server path input.</span>
                  </div>
                `}

                <div style="display:flex; flex-direction:column; gap:6px;">
                  <label style="font-size:11px; font-weight:700; text-transform:uppercase; text-align:left;">Absolute Folder Path</label>
                  <div style="display:flex; gap:8px;">
                    <input type="text" id="local-folder-path-input" class="form-control-noicon" style="flex:1;" placeholder="e.g. C:\\aeroglass-data or D:\\erp-files" value="">
                    <button id="local-folder-path-connect-btn" class="btn btn-primary" style="padding:10px 16px; font-size:12px;">Connect Path</button>
                  </div>
                </div>
              </div>
            ` : `
              <div style="background:rgba(255,255,255,0.01); border:1px solid var(--glass-border); padding:16px; border-radius:8px; display:flex; flex-direction:column; gap:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <h4 style="font-size:13px; font-weight:700; display:flex; align-items:center; gap:6px;">
                      <i data-lucide="folder" style="color:var(--primary-color); width:16px; height:16px;"></i>
                      ${folderName}
                    </h4>
                    <p class="muted-text" style="font-size:11px; margin-top:2px;">Linked directory path handle</p>
                  </div>
                  <div>
                    ${isAuthorized ? `
                      <span class="badge success-badge" style="font-size:10px; padding:4px 8px; border-radius:4px; background:var(--success-glow); color:var(--success); border:1px solid var(--success); font-weight:bold;">Authorized</span>
                    ` : `
                      <span class="badge warning-badge" style="font-size:10px; padding:4px 8px; border-radius:4px; background:var(--warning-glow); color:var(--warning); border:1px solid var(--warning); font-weight:bold;">Needs Auth</span>
                    `}
                  </div>
                </div>

                ${!isAuthorized ? `
                  <button id="local-folder-auth-btn" class="btn btn-accent" style="padding:10px 16px; width:100%; display:inline-flex; align-items:center; justify-content:center; gap:8px;">
                    <i data-lucide="key"></i>
                    <span>Authorize Folder Access</span>
                  </button>
                ` : `
                  <div style="display:flex; align-items:center; gap:8px; border-top:1px solid var(--glass-border); padding-top:12px; margin-top:4px;">
                    <input type="checkbox" id="local-folder-autosave-check" ${db.isLocalDirAutoSave ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
                    <label for="local-folder-autosave-check" style="font-size:12px; margin:0; cursor:pointer; display:flex; align-items:center; gap:4px;">Auto-save changes in real-time</label>
                  </div>

                  <div style="display:flex; gap:10px; margin-top:4px; border-top:1px solid var(--glass-border); padding-top:12px;">
                    <button id="local-folder-import-btn" class="btn btn-secondary" style="flex:1; padding:8px 12px; font-size:12px; display:inline-flex; align-items:center; justify-content:center; gap:6px;" title="Load data from JSON files in the folder">
                      <i data-lucide="download" style="width:14px; height:14px;"></i>
                      <span>Import</span>
                    </button>
                    <button id="local-folder-export-btn" class="btn btn-secondary" style="flex:1; padding:8px 12px; font-size:12px; display:inline-flex; align-items:center; justify-content:center; gap:6px;" title="Save current database to files in the folder">
                      <i data-lucide="upload" style="width:14px; height:14px;"></i>
                      <span>Export</span>
                    </button>
                  </div>
                `}

                <button id="local-folder-disconnect-btn" class="btn btn-secondary" style="padding:8px 12px; font-size:12px; width:100%; display:inline-flex; align-items:center; justify-content:center; gap:6px; border-color:var(--danger); color:var(--danger); margin-top:4px;">
                  <i data-lucide="folder-minus" style="width:14px; height:14px;"></i>
                  <span>Disconnect Folder</span>
                </button>
              </div>
            `}
          </div>
        </div>

        <div class="glass-card" style="display:flex; flex-direction:column; gap:16px;">
          <div>
            <h3 style="font-size:15px; font-family:var(--font-heading); font-weight:700;">Data Backups & Exports</h3>
            <p class="muted-text" style="font-size:12px;">Export core operational databases as CSV files for backup or external analysis.</p>
          </div>

          <div style="display:flex; flex-direction:column; gap:12px; margin-top:10px;">
            <div style="background:rgba(255,255,255,0.01); border:1px solid var(--glass-border); padding:16px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
              <div>
                <h4 style="font-size:13px; font-weight:700;">Inventory Catalog Backup</h4>
                <p class="muted-text" style="font-size:11px; margin-top:2px;">Download all Item Master specifications and current stock quantities.</p>
              </div>
              <button id="export-inv-csv-btn" class="btn btn-secondary" style="padding:10px 16px;">
                <i data-lucide="file-spreadsheet" style="color:var(--success);"></i>
                <span>Backup CSV</span>
              </button>
            </div>

            <div style="background:rgba(255,255,255,0.01); border:1px solid var(--glass-border); padding:16px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
              <div>
                <h4 style="font-size:13px; font-weight:700;">Warehouse Transactions Ledger</h4>
                <p class="muted-text" style="font-size:11px; margin-top:2px;">Export all inward and outward material logs in chronological order.</p>
              </div>
              <button id="export-tx-csv-btn" class="btn btn-secondary" style="padding:10px 16px;">
                <i data-lucide="history" style="color:var(--primary-color);"></i>
                <span>Backup CSV</span>
              </button>
            </div>
          </div>
        </div>

        <!-- BYOK AI Cognitive Layer Vault -->
        <div class="glass-card" style="display:flex; flex-direction:column; gap:16px;">
          <div>
            <h3 style="font-size:15px; font-family:var(--font-heading); font-weight:700;">🧠 BYOK AI Cognitive Layer (OpenRouter / Gemini)</h3>
            <p class="muted-text" style="font-size:12px;">Link your custom OpenRouter or Google Gemini API keys to power local-first vision extraction of 2D/3D design configurations from blueprints.</p>
          </div>

          <div style="display:flex; flex-direction:column; gap:14px;">
            <div class="input-group" style="margin-bottom:0;">
              <label>OpenRouter API Key (BYOK Vault)</label>
              <input type="password" id="ai-key" class="form-control-noicon" placeholder="sk-or-v1-..." value="${localStorage.getItem('eva_openrouter_api_key') || ''}">
            </div>
            <div class="input-group" style="margin-bottom:0;">
              <label>Default Vision Model</label>
              <select id="ai-model" class="form-control-noicon">
                <option value="google/gemini-2.5-flash" ${localStorage.getItem('eva_openrouter_model') === 'google/gemini-2.5-flash' || !localStorage.getItem('eva_openrouter_model') ? 'selected' : ''}>Google: Gemini 2.5 Flash (Recommended)</option>
                <option value="google/gemini-2.5-pro" ${localStorage.getItem('eva_openrouter_model') === 'google/gemini-2.5-pro' ? 'selected' : ''}>Google: Gemini 2.5 Pro</option>
                <option value="meta-llama/llama-3.2-11b-vision-instruct" ${localStorage.getItem('eva_openrouter_model') === 'meta-llama/llama-3.2-11b-vision-instruct' ? 'selected' : ''}>Llama 3.2 11B Vision</option>
              </select>
            </div>
            <div style="display:flex; gap:12px;">
              <button id="ai-save-btn" class="btn btn-primary" style="flex-grow:1; padding:10px 16px;">Save API Configuration</button>
              ${localStorage.getItem('eva_openrouter_api_key') ? `<button id="ai-clear-btn" class="btn btn-secondary" style="padding:10px 16px;">Clear Key</button>` : ''}
            </div>
          </div>
        </div>

      </div>
    </div>
  `;

  bindSettingsEvents(container);
  lucide.createIcons();
}




function bindSettingsEvents(container) {
  // 1. Save Supabase config credentials
  document.getElementById('supabase-config-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = document.getElementById('sup-url').value.trim();
    const key = document.getElementById('sup-key').value.trim();

    if (!url || !key) {
      app.showToast('Validation Error', 'Please fill in both Supabase Endpoint URL and API Secret Key.', 'danger');
      return;
    }

    // Save parameters
    sync.saveConfig(url, key);
    app.showToast('Configuration Saved', 'Connected Supabase parameters. Operational sync is now active.', 'success');

    // Trigger sync immediately to push local sandbox files if online
    if (sync.getStatus() === 'online') {
      app.showToast('Syncing Queue', 'Pushing queued offline transactions to Supabase backend...', 'info');
      await sync.syncQueue();
    }

    await renderSettings(container);
  });

  // 2. Disconnect Supabase Cloud
  const disconnectBtn = document.getElementById('sup-disconnect-btn');
  if (disconnectBtn) {
    disconnectBtn.addEventListener('click', async () => {
      sync.saveConfig('', '');
      app.showToast('Disconnected', 'Severed Supabase cloud endpoints. Operating in local offline sandbox mode.', 'info');
      await renderSettings(container);
    });
  }

  // Google Sheets Config
  document.getElementById('g-save-btn')?.addEventListener('click', () => {
    const url = document.getElementById('g-webhook-url')?.value.trim();
    const autoSync = document.getElementById('g-autosync-check')?.checked;

    localStorage.setItem('aeroglass_gsheet_webhook', url);
    localStorage.setItem('aeroglass_gsheet_autosync', autoSync ? 'true' : 'false');

    app.showToast('Google Sheets Linked', 'Failover backup parameters saved successfully.', 'success');
  });

  document.getElementById('g-forcesync-btn')?.addEventListener('click', async () => {
    const url = document.getElementById('g-webhook-url')?.value.trim();
    if (!url) {
      app.showToast('Missing Webhook', 'Please provide a valid Google AppScript URL first.', 'warning');
      return;
    }

    app.showToast('Sync Started', 'Pushing database snapshots to Google Sheets...', 'info');
    try {
      const inventory = await db.getAll('inventory');
      const employees = await db.getAll('employees');
      let tools = [];
      try { tools = await db.getAll('tools_tracking'); } catch (e) {}

      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          inventory,
          hr_employees: employees,
          tools
        })
      });
      app.showToast('Matrix Push Succeeded', 'Spreadsheet state successfully replicated.', 'success');
    } catch (e) {
      console.error(e);
      app.showToast('Sync Failed', 'Could not reach Google Sheets Webhook.', 'danger');
    }
  });

  // Turso Cloud Config — Save
  document.getElementById('turso-save-btn')?.addEventListener('click', async () => {
    const url = document.getElementById('turso-url')?.value.trim();
    const token = document.getElementById('turso-token')?.value.trim();

    if (!url || !token) {
      app.showToast('Validation Error', 'Please provide both Turso Database URL and Auth Token.', 'danger');
      return;
    }

    sync.saveTursoConfig(url, token);
    app.showToast('Turso Connected', 'Turso cloud database credentials saved. Initializing schema...', 'success');

    // Auto-create tables on the remote Turso database
    try {
      await sync.createTursoTables();
      app.showToast('Schema Ready', '✓ Turso tables initialized. Triple-sync pipeline is now fully active.', 'success');
    } catch (e) {
      app.showToast('Schema Warning', 'Turso connected but table initialization could not be confirmed. Check your URL.', 'warning');
    }

    await renderSettings(container);
  });

  // Turso Cloud Config — Disconnect
  document.getElementById('turso-disconnect-btn')?.addEventListener('click', async () => {
    sync.saveTursoConfig('', '');
    app.showToast('Turso Disconnected', 'Removed Turso cloud credentials. Pipeline reverted to Supabase + Sheets.', 'info');
    await renderSettings(container);
  });

  // 3. Trigger manual sync clearance
  const syncBtn = document.getElementById('manual-sync-btn');
  if (syncBtn) {
    syncBtn.addEventListener('click', async () => {
      syncBtn.disabled = true;
      app.showToast('Manual Sync Started', 'Commencing queue reconcile...', 'info');

      const success = await sync.syncQueue();
      if (success) {
        app.showToast('Sync Succeeded', 'Reconciled all offline queue records with Supabase backend.', 'success');
      } else {
        app.showToast('Sync Failure', 'Failed to synchronize queue with Supabase. Check connectivity and credentials.', 'danger');
      }

      await renderSettings(container);
    });
  }

  // 4. Trigger cloud pull
  const pullBtn = document.getElementById('pull-cloud-btn');
  if (pullBtn) {
    pullBtn.addEventListener('click', async () => {
      pullBtn.disabled = true;
      app.showToast('Cloud Pull Triggered', 'Refreshing local stores with cloud backend files...', 'info');

      const res = await sync.pullAllFromCloud();
      if (res) {
        app.showToast('Pull Complete', 'Refreshed local records from cloud backend tables.', 'success');
      } else {
        app.showToast('Pull Failure', 'Cloud pull failed.', 'danger');
      }
      pullBtn.disabled = false;
    });
  }




  // 6. CSV Export: Inventory Table Master (Acceptance Criteria 8!)
  document.getElementById('export-inv-csv-btn').addEventListener('click', async () => {
    const items = await db.getAll('inventory');

    if (items.length === 0) {
      app.showToast('Export Blocked', 'No catalog records exist to back up.', 'warning');
      return;
    }

    // Prepare CSV header and lines
    let csv = 'Item Code,Item Name,Category,Unit,Current Stock,Safety Minimum,Description\n';
    items.forEach(item => {
      // Escape commas and double quotes for safety
      const name = item.name.replace(/"/g, '""');
      const desc = item.description.replace(/"/g, '""');
      csv += `"${item.code}","${name}","${item.category}","${item.unit}",${item.currentStock},${item.minStock},"${desc}"\n`;
    });

    // Create dynamic browser file downloader
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `AeroGlass_Inventory_Backup_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    app.showToast('Backup Complete', 'Downloaded Item Master catalogue data as CSV file successfully.', 'success');
  });

  // 7. CSV Export: Ledger Transactions
  document.getElementById('export-tx-csv-btn').addEventListener('click', async () => {
    const transactions = await db.getAll('transactions');
    const items = await db.getAll('inventory');

    if (transactions.length === 0) {
      app.showToast('Export Blocked', 'No transaction ledgers logged yet.', 'warning');
      return;
    }

    let csv = 'Transaction ID,Item Code,Item Name,Action Type,Quantity,Supplier/Purpose,Date\n';
    transactions.forEach(tx => {
      const item = items.find(i => i.id === tx.itemId);
      const code = item ? item.code : 'UNKNOWN';
      const name = item ? item.name.replace(/"/g, '""') : 'Deleted Item';
      const purpose = tx.sourceOrPurpose.replace(/"/g, '""');

      csv += `"${tx.id}","${code}","${name}","${tx.type}",${tx.quantity},"${purpose}","${tx.date}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `AeroGlass_Ledger_Transactions_Backup_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    app.showToast('Backup Complete', 'Downloaded chronological warehouse ledger logs as CSV successfully.', 'success');
  });

  // 8. BYOK AI Configuration Save
  document.getElementById('ai-save-btn')?.addEventListener('click', () => {
    const key = document.getElementById('ai-key')?.value.trim();
    const model = document.getElementById('ai-model')?.value;

    if (key) {
      localStorage.setItem('eva_openrouter_api_key', key);
    }
    if (model) {
      localStorage.setItem('eva_openrouter_model', model);
    }

    app.showToast('API Vault Synchronized', 'API key and default model saved securely in local storage.', 'success');
    renderSettings(container);
  });

  document.getElementById('ai-clear-btn')?.addEventListener('click', () => {
    localStorage.removeItem('eva_openrouter_api_key');
    app.showToast('Key Revoked', 'API key has been deleted from local vault storage.', 'info');
    renderSettings(container);
  });

  // 9. Local Folder Database Event Listeners
  
  // Select Local Folder
  document.getElementById('local-folder-select-btn')?.addEventListener('click', async () => {
    try {
      const handle = await window.showDirectoryPicker();
      await db.setLocalDirHandle(handle);
      
      app.showToast('Folder Connected', `Connected to local folder: ${handle.name}`, 'success');
      
      const authorized = await db.verifyPermission(true);
      if (authorized) {
        // Check if folder contains any database files
        let hasFiles = false;
        try {
          for await (const entry of handle.values()) {
            if (entry.name.endsWith('.json')) {
              hasFiles = true;
              break;
            }
          }
        } catch (e) {}

        if (hasFiles) {
          // Open Modal using App Coordinator Modal System to ask if they want to import or export
          const modalContent = `
            <div style="display:flex; flex-direction:column; gap:16px;">
              <p>The folder <strong>${handle.name}</strong> contains existing database files. How would you like to initialize the database?</p>
              <div style="display:flex; flex-direction:column; gap:12px; margin-top:10px;">
                <button id="modal-import-btn" class="btn btn-primary" style="text-align:left; justify-content:flex-start; padding:12px; display:block; width:100%;">
                  📥 <strong>Import from Folder</strong>
                  <div style="font-size:11px; font-weight:normal; opacity:0.8; margin-top:4px;">Overwrite the current browser database with the data from the folder.</div>
                </button>
                <button id="modal-export-btn" class="btn btn-secondary" style="text-align:left; justify-content:flex-start; padding:12px; display:block; width:100%;">
                  📤 <strong>Export to Folder</strong>
                  <div style="font-size:11px; font-weight:normal; opacity:0.8; margin-top:4px;">Keep the browser database and overwrite the files in the folder.</div>
                </button>
              </div>
            </div>
          `;
          app.openModal('Database Sync Choice', modalContent);

          document.getElementById('modal-import-btn')?.addEventListener('click', async () => {
            app.closeModal();
            app.showToast('Importing', 'Loading data from local folder...', 'info');
            try {
              const importedCount = await db.importAllFromFolder();
              app.showToast('Import Complete', `Successfully loaded ${importedCount} tables from folder.`, 'success');
            } catch (err) {
              app.showToast('Import Failed', err.message, 'danger');
            }
            await renderSettings(container);
          });

          document.getElementById('modal-export-btn')?.addEventListener('click', async () => {
            app.closeModal();
            app.showToast('Exporting', 'Writing database to local folder...', 'info');
            try {
              await db.exportAllToFolder();
              app.showToast('Export Complete', 'Successfully exported all tables to folder.', 'success');
            } catch (err) {
              app.showToast('Export Failed', err.message, 'danger');
            }
            await renderSettings(container);
          });
        } else {
          // Folder is empty, export by default
          app.showToast('Exporting', 'Empty folder. Writing initial database schema...', 'info');
          await db.exportAllToFolder();
          app.showToast('Export Complete', 'Exported initial database state to local folder.', 'success');
        }
      }
      await renderSettings(container);
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error(e);
        app.showToast('Connection Error', e.message, 'danger');
      }
    }
  });

  // Authorize Folder Access
  document.getElementById('local-folder-auth-btn')?.addEventListener('click', async () => {
    try {
      const authorized = await db.requestPermission(true);
      if (authorized) {
        app.showToast('Access Granted', 'Successfully authorized database folder access.', 'success');
      } else {
        app.showToast('Access Denied', 'Folder access was not authorized.', 'warning');
      }
      await renderSettings(container);
    } catch (e) {
      console.error(e);
      app.showToast('Authorization Error', e.message, 'danger');
    }
  });

  // Disconnect Folder
  document.getElementById('local-folder-disconnect-btn')?.addEventListener('click', async () => {
    await db.setLocalDirHandle(null);
    db.localDirPath = null;
    await db.setSetting('local_dir_path', null);
    app.showToast('Disconnected', 'Local folder disconnected. Data remains in browser IndexedDB.', 'info');
    await renderSettings(container);
  });

  // Connect via Manual Path
  document.getElementById('local-folder-path-connect-btn')?.addEventListener('click', async () => {
    const dirPath = document.getElementById('local-folder-path-input')?.value.trim();
    if (!dirPath) {
      app.showToast('Validation Error', 'Please enter a valid folder path.', 'danger');
      return;
    }
    
    app.showToast('Connecting', 'Verifying folder path via local server...', 'info');
    try {
      const tempPath = db.localDirPath;
      db.localDirPath = dirPath;
      const verified = await db.verifyPermission(true);
      if (verified) {
        await db.setSetting('local_dir_path', dirPath);
        await db.setSetting('local_dir_autosave', db.isLocalDirAutoSave);
        await db.setLocalDirHandle(null);
        db.localDirPath = dirPath;
        app.showToast('Folder Connected', `Connected via server API to: ${dirPath}`, 'success');

        const res = await fetch(`/api/local-db/check?path=${encodeURIComponent(dirPath)}`);
        const json = await res.json();
        const hasFiles = json.files && json.files.length > 0;

        if (hasFiles) {
          const modalContent = `
            <div style="display:flex; flex-direction:column; gap:16px;">
              <p>The folder <strong>${dirPath}</strong> contains existing database files. How would you like to initialize the database?</p>
              <div style="display:flex; flex-direction:column; gap:12px; margin-top:10px;">
                <button id="modal-import-btn" class="btn btn-primary" style="text-align:left; justify-content:flex-start; padding:12px; display:block; width:100%;">
                  📥 <strong>Import from Folder</strong>
                  <div style="font-size:11px; font-weight:normal; opacity:0.8; margin-top:4px;">Overwrite the current browser database with the data from the folder.</div>
                </button>
                <button id="modal-export-btn" class="btn btn-secondary" style="text-align:left; justify-content:flex-start; padding:12px; display:block; width:100%;">
                  📤 <strong>Export to Folder</strong>
                  <div style="font-size:11px; font-weight:normal; opacity:0.8; margin-top:4px;">Keep the browser database and overwrite the files in the folder.</div>
                </button>
              </div>
            </div>
          `;
          app.openModal('Database Sync Choice', modalContent);

          document.getElementById('modal-import-btn')?.addEventListener('click', async () => {
            app.closeModal();
            app.showToast('Importing', 'Loading data from local folder...', 'info');
            try {
              const importedCount = await db.importAllFromFolder();
              app.showToast('Import Complete', `Successfully loaded ${importedCount} tables from folder.`, 'success');
            } catch (err) {
              app.showToast('Import Failed', err.message, 'danger');
            }
            await renderSettings(container);
          });

          document.getElementById('modal-export-btn')?.addEventListener('click', async () => {
            app.closeModal();
            app.showToast('Exporting', 'Writing database to local folder...', 'info');
            try {
              await db.exportAllToFolder();
              app.showToast('Export Complete', 'Successfully exported all tables to folder.', 'success');
            } catch (err) {
              app.showToast('Export Failed', err.message, 'danger');
            }
            await renderSettings(container);
          });
        } else {
          app.showToast('Exporting', 'Empty folder. Writing initial database schema...', 'info');
          await db.exportAllToFolder();
          app.showToast('Export Complete', 'Exported initial database state to local folder.', 'success');
        }
      } else {
        db.localDirPath = tempPath;
        app.showToast('Connection Failed', `Folder path does not exist on your computer. Please create the folder first or verify the path: ${dirPath}`, 'danger');
      }
      await renderSettings(container);
    } catch (e) {
      console.error(e);
      app.showToast('Connection Error', e.message, 'danger');
    }
  });

  // Import from Folder
  document.getElementById('local-folder-import-btn')?.addEventListener('click', async () => {
    const confirm = window.confirm('Are you sure you want to IMPORT? This will OVERWRITE all your current browser data with data from the folder!');
    if (!confirm) return;

    try {
      app.showToast('Importing', 'Loading data from local folder...', 'info');
      const importedCount = await db.importAllFromFolder();
      app.showToast('Import Complete', `Successfully loaded ${importedCount} tables from folder.`, 'success');
      await renderSettings(container);
    } catch (e) {
      app.showToast('Import Failed', e.message, 'danger');
    }
  });

  // Export to Folder
  document.getElementById('local-folder-export-btn')?.addEventListener('click', async () => {
    try {
      app.showToast('Exporting', 'Writing all tables to folder...', 'info');
      await db.exportAllToFolder();
      app.showToast('Export Complete', 'Successfully exported all tables to folder.', 'success');
    } catch (e) {
      app.showToast('Export Failed', e.message, 'danger');
    }
  });

  // Toggle Auto-save
  document.getElementById('local-folder-autosave-check')?.addEventListener('change', async (e) => {
    db.isLocalDirAutoSave = e.target.checked;
    await db.setSetting('local_dir_autosave', db.isLocalDirAutoSave);
    app.showToast('Setting Saved', `Auto-save ${db.isLocalDirAutoSave ? 'enabled' : 'disabled'}.`, 'success');
  });
}
