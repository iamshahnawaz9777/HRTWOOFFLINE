/* ==========================================================================
   AeroGlass ERP Supabase + Google Sheets + Turso Triple-Sync Service
   ========================================================================== */

import { db } from './db.js';

class SyncService {
  constructor() {
    this.configKey = 'aeroglass_supabase_config';
    this.tursoConfigKey = 'aeroglass_turso_config';
    this.syncListeners = [];
    this.isOnline = navigator.onLine;

    // Listen to browser network triggers
    window.addEventListener('online', () => this.handleNetworkChange(true));
    window.addEventListener('offline', () => this.handleNetworkChange(false));
  }

  /**
   * Subscribes to sync status shifts (to update UI indicators)
   */
  subscribe(callback) {
    this.syncListeners.push(callback);
    callback(this.getStatus());
  }

  notifyListeners() {
    const status = this.getStatus();
    this.syncListeners.forEach(cb => cb(status));
    // Also update the sidebar sync health widget
    this.updateSyncWidget();
  }

  /**
   * Save Supabase API config parameters
   */
  saveConfig(url, key) {
    if (!url || !key) {
      localStorage.removeItem(this.configKey);
    } else {
      localStorage.setItem(this.configKey, JSON.stringify({ url, key }));
    }
    this.notifyListeners();
  }

  /**
   * Read configuration
   */
  getConfig() {
    const raw = localStorage.getItem(this.configKey);
    if (!raw) {
      // Fallback to environment configuration or default sandbox credentials
      return {
        url: import.meta.env.VITE_SUPABASE_URL || 'https://oajpasqndvwahswgorzg.supabase.co',
        key: import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_bOHbvYedy_frmMTcOYit2Q_jej1_hGv'
      };
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  /**
   * Save Turso config parameters
   */
  saveTursoConfig(url, authToken) {
    if (!url || !authToken) {
      localStorage.removeItem(this.tursoConfigKey);
    } else {
      localStorage.setItem(this.tursoConfigKey, JSON.stringify({ url, authToken }));
    }
    this.notifyListeners();
  }

  /**
   * Read Turso configuration — falls back to pre-configured default credentials
   */
  getTursoConfig() {
    const raw = localStorage.getItem(this.tursoConfigKey);
    if (!raw) {
      // Fallback to environment configuration or default sandbox credentials
      return {
        url: import.meta.env.VITE_TURSO_DATABASE_URL || 'https://hronelocal-iamshahnawaz9777.turso.io',
        authToken: import.meta.env.VITE_TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJyaVM3Smx3Z0VmR1NUaGFDMTk5U3VnIiwib3JnX2lkIjoxMDAwMTczNzk2fQ.J8Iko9R4mkKOVPG-RLfzZW8HQjkoc5vmxjLWUeN3L5LpdLotKuZ501_NHHtkW2bZ04xJCW9ePEckdJv1Y91jCA'
      };
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  /**
   * Initializes all required tables in Turso cloud database.
   * Safe to call multiple times (uses CREATE TABLE IF NOT EXISTS).
   */
  async createTursoTables() {
    const tursoConfig = this.getTursoConfig();
    if (!tursoConfig || !tursoConfig.url || !tursoConfig.authToken) return;

    const tables = [
      `CREATE TABLE IF NOT EXISTS inventory (
        id TEXT PRIMARY KEY,
        code TEXT,
        name TEXT,
        category TEXT,
        unit TEXT,
        currentStock REAL DEFAULT 0,
        minStock REAL DEFAULT 0,
        description TEXT,
        syncDate TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        itemId TEXT,
        type TEXT,
        quantity REAL,
        date TEXT,
        sourceOrPurpose TEXT,
        hardwareName TEXT,
        partyName TEXT,
        fitterName TEXT,
        syncDate TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        name TEXT,
        role TEXT,
        department TEXT,
        phone TEXT,
        email TEXT,
        joinDate TEXT,
        syncDate TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS gatepasses (
        id TEXT PRIMARY KEY,
        vehicleNo TEXT,
        driverName TEXT,
        purpose TEXT,
        entryTime TEXT,
        exitTime TEXT,
        status TEXT,
        syncDate TEXT
      )`
    ];

    try {
      const requests = tables.map(sql => ({
        type: 'execute',
        stmt: { sql }
      }));

      const res = await fetch(`${tursoConfig.url}/v2/pipeline`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tursoConfig.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requests })
      });

      if (res.ok) {
        console.log('✓ Turso tables initialized successfully.');
      } else {
        const err = await res.text();
        console.warn('Turso table init warning:', err);
      }
    } catch (e) {
      console.warn('Turso table creation skipped (offline or config issue):', e.message);
    }
  }

  /**
   * Network & config state getter
   */
  getStatus() {
    const config = this.getConfig();
    if (!config) {
      return 'local-only'; // Operational local-first, no cloud sync active
    }
    if (!this.isOnline) {
      return 'offline'; // Backend configured but network is severed
    }
    return 'online'; // Connected and syncable
  }

  /**
   * Returns health status object for the triple-database sync widget
   */
  getHealthStatus() {
    const supabaseConfig = this.getConfig();
    const gsheetWebhook = localStorage.getItem('aeroglass_gsheet_webhook');
    const tursoConfig = this.getTursoConfig();

    return {
      supabase: !!(supabaseConfig && supabaseConfig.url && supabaseConfig.url.includes('supabase.co') && this.isOnline),
      googleSheets: !!(gsheetWebhook && gsheetWebhook.length > 10),
      turso: !!(tursoConfig && tursoConfig.url && tursoConfig.url.includes('turso.io') && this.isOnline)
    };
  }

  /**
   * Updates the sidebar sync status widget DOM elements
   */
  updateSyncWidget() {
    const health = this.getHealthStatus();
    const allHealthy = Object.values(health).every(s => s === true);

    // Master dot
    const masterDot = document.getElementById('db-sync-master-dot');
    if (masterDot) {
      masterDot.className = `db-sync-master-dot ${allHealthy ? 'all-online' : ''}`;
    }

    // Individual status rows
    const statusMap = {
      'sync-status-supabase': health.supabase,
      'sync-status-gsheets': health.googleSheets,
      'sync-status-turso': health.turso
    };

    for (const [id, isOnline] of Object.entries(statusMap)) {
      const el = document.getElementById(id);
      if (!el) continue;
      const dot = el.querySelector('.db-sync-dot');
      const text = el.querySelector('.db-sync-status-text');
      if (dot) {
        dot.className = `db-sync-dot ${isOnline ? 'online' : 'offline'}`;
      }
      if (text) {
        text.textContent = isOnline ? '● Online' : '○ Offline';
      }
    }
  }

  handleNetworkChange(status) {
    this.isOnline = status;
    console.log(`Network status changed: ${status ? 'ONLINE' : 'OFFLINE'}`);
    this.notifyListeners();
    if (status && this.getConfig()) {
      // Trigger auto sync queue clearing when connection restored
      this.syncQueue();
    }
  }

  /**
   * Add operations to the sync queue for eventual backend sync
   * @param {string} store ObjectStore name
   * @param {string} action 'insert' | 'update' | 'delete'
   * @param {object} data Object content
   */
  async queueOperation(store, action, data) {
    const id = `sq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const syncItem = {
      id,
      store,
      action,
      data,
      timestamp: new Date().toISOString()
    };
    
    await db.put('syncQueue', syncItem);
    console.log(`Queued transaction for store [${store}] action [${action}]`);

    // Auto-sync if online and backend credentials are configured
    if (this.getStatus() === 'online') {
      this.syncQueue();
    }

    // Fire triple pipeline for insert/update operations
    if (action !== 'delete' && typeof data === 'object') {
      this.saveToTriplePipeline(data, store);
    }
  }

  /**
   * Triple-Database Pipeline: Saves to Supabase + Google Sheets + Turso simultaneously
   */
  async saveToTriplePipeline(payload, tableName) {
    const mdyDate = new Date().toLocaleDateString('en-US', {
      month: '2-digit', day: '2-digit', year: 'numeric'
    }).replace(/\//g, '-');

    const finalData = { ...payload, syncDate: mdyDate };

    // 1. Supabase Upsert (merge-duplicates strategy)
    try {
      const supaConfig = this.getConfig();
      if (supaConfig && supaConfig.url && supaConfig.url.includes('supabase.co') && this.isOnline) {
        fetch(`${supaConfig.url}/rest/v1/${tableName}`, {
          method: 'POST',
          headers: {
            'apikey': supaConfig.key,
            'Authorization': `Bearer ${supaConfig.key}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(finalData)
        }).catch(e => console.warn('Supabase pipeline write skipped:', e.message));
      }
    } catch (e) { /* silent */ }

    // 2. Google Sheets Webhook Write (fire-and-forget)
    try {
      const webhookUrl = localStorage.getItem('aeroglass_gsheet_webhook');
      if (webhookUrl && webhookUrl.length > 10) {
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table: tableName, ...finalData }),
          mode: 'no-cors'
        }).catch(e => console.warn('G-Sheets write skipped:', e.message));
      }
    } catch (e) { /* silent */ }

    // 3. Turso Cloud Distributed Write (libSQL HTTP API)
    try {
      const tursoConfig = this.getTursoConfig();
      if (tursoConfig && tursoConfig.url && tursoConfig.authToken && this.isOnline) {
        // Build safe INSERT OR REPLACE using positional args
        const cols = Object.keys(finalData);
        const vals = Object.values(finalData).map(v =>
          typeof v === 'object' && v !== null ? JSON.stringify(v) : v
        );
        const columnNames = cols.join(', ');
        const placeholders = cols.map(() => '?').join(', ');

        fetch(`${tursoConfig.url}/v2/pipeline`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tursoConfig.authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            requests: [{
              type: 'execute',
              stmt: {
                sql: `INSERT OR REPLACE INTO ${tableName} (${columnNames}) VALUES (${placeholders})`,
                args: vals.map(v => ({ type: 'text', value: String(v ?? '') }))
              }
            }]
          })
        }).catch(e => console.warn('Turso write skipped:', e.message));
      }
    } catch (e) { /* silent */ }

    console.log(`✓ Triple-pipeline dispatched for [${tableName}] at ${mdyDate}`);
  }

  /**
   * Performs full synchronization logic
   */
  async syncQueue() {
    const config = this.getConfig();
    if (!config || !this.isOnline) {
      console.log('Sync skipped: Cloud settings not set or device offline.');
      return false;
    }

    try {
      this.syncListeners.forEach(cb => cb('syncing'));
      
      const queue = await db.getAll('syncQueue');
      if (queue.length === 0) {
        console.log('Sync complete: Queue is empty.');
        this.notifyListeners();
        return true;
      }

      console.log(`Processing ${queue.length} queued records for Supabase sync...`);

      // Conflict Resolution: Sort items chronologically
      queue.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      for (const item of queue) {
        let success = false;
        
        try {
          // If a real Supabase endpoint exists, we send an HTTP request
          // Since Supabase provides a Postgrest REST interface, we can target `/rest/v1/{tableName}`
          let url = `${config.url}/rest/v1/${item.store}`;
          const headers = {
            'apikey': config.key,
            'Authorization': `Bearer ${config.key}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates' // Last-write-wins resolver
          };

          let method = 'POST';
          let body = JSON.stringify(item.data);

          // Conflict Detection
          if (item.action !== 'delete' && config.url && config.url.includes('supabase.co')) {
            const keyName = item.store === 'users' ? 'username' : 'id';
            const keyValue = item.store === 'users' ? item.data.username : item.data.id;
            const checkUrl = `${config.url}/rest/v1/${item.store}?${keyName}=eq.${encodeURIComponent(keyValue)}`;
            
            try {
              const checkRes = await fetch(checkUrl, {
                method: 'GET',
                headers: {
                  'apikey': config.key,
                  'Authorization': `Bearer ${config.key}`
                }
              });

              if (checkRes.ok) {
                const cloudRecords = await checkRes.json();
                if (cloudRecords && cloudRecords.length > 0) {
                  const cloudRecord = cloudRecords[0];
                  
                  // Compare updatedAt timestamps to detect a collision
                  if (cloudRecord.updatedAt && item.data.updatedAt && cloudRecord.updatedAt !== item.data.updatedAt) {
                    console.log(`Conflict detected in store ${item.store} for key ${keyValue}. Opening resolver...`);
                    
                    if (window.app && typeof window.app.showConflictResolver === 'function') {
                      const resolution = await window.app.showConflictResolver(item.store, item.data, cloudRecord);
                      
                      if (resolution) {
                        // User chose Local or Merge. Update local DB and write it to the cloud.
                        item.data = resolution;
                        await db.putDirectly(item.store, resolution);
                        body = JSON.stringify(resolution);
                      } else {
                        // User chose Cloud. Overwrite local with cloud and delete from sync queue.
                        await db.putDirectly(item.store, cloudRecord);
                        await db.delete('syncQueue', item.id);
                        continue;
                      }
                    }
                  }
                }
              }
            } catch (checkErr) {
              console.warn('Conflict detection check failed:', checkErr.message);
            }
          }

          if (item.action === 'delete') {
            method = 'DELETE';
            // In a delete, key is checked depending on the store path
            const keyName = item.store === 'users' ? 'username' : 'id';
            url += `?${keyName}=eq.${item.data}`;
            body = null;
          }

          // Fetch simulation / integration
          // If URLs are mock placeholders (like standard localhost or test URLs), we simulate progress.
          // Otherwise, we perform the actual fetch.
          if (config.url.includes('example.com') || config.url.includes('supabase.co') === false) {
            // Simulated network latency
            await new Promise(r => setTimeout(r, 400));
            success = true;
          } else {
            const res = await fetch(url, {
              method,
              headers,
              body
            });
            if (res.ok) {
              success = true;
            } else {
              const errTxt = await res.text();
              console.error(`Supabase rejected request: ${errTxt}`);
            }
          }
        } catch (fetchErr) {
          console.error('Fetch execution failed in syncer:', fetchErr);
          // If offline sync fails here due to server drop, keep queued items and abort
          break;
        }

        if (success) {
          // Clear item from local sync queue
          await db.delete('syncQueue', item.id);
        }
      }

      console.log('Synchronization queue execution finished.');
      this.notifyListeners();
      return true;
    } catch (err) {
      console.error('Sync queue loop failure:', err);
      this.notifyListeners();
      return false;
    }
  }

  /**
   * Pulls and refreshes local store entries from Supabase tables
   * This is triggered manually during setting resets
   */
  async pullAllFromCloud() {
    const config = this.getConfig();
    if (!config || !this.isOnline) return false;

    console.log('Initiating full data pull from Supabase backend...');
    const stores = ['projects', 'tasks', 'employees', 'attendance', 'leaves', 'inventory', 'transactions', 'gatepasses'];

    for (const storeName of stores) {
      try {
        const url = `${config.url}/rest/v1/${storeName}`;
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'apikey': config.key,
            'Authorization': `Bearer ${config.key}`
          }
        });
        
        if (res.ok) {
          const cloudData = await res.json();
          if (Array.isArray(cloudData)) {
            for (const item of cloudData) {
              await db.put(storeName, item);
            }
          }
        }
      } catch (err) {
        console.error(`Error pulling store [${storeName}] from Supabase:`, err);
      }
    }
    return true;
  }
}

export const sync = new SyncService();

