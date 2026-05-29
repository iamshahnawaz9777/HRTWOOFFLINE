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

  container.innerHTML = `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px;">
      <!-- Column 1: Supabase integration credentials and manual sync -->
      <div style="display:flex; flex-direction:column; gap:24px;">
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
}
