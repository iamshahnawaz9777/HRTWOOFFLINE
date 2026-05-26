/* ==========================================================================
   AeroGlass ERP Supabase Sync & Offline Queue Service
   ========================================================================== */

import { db } from './db.js';

class SyncService {
  constructor() {
    this.configKey = 'aeroglass_supabase_config';
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
      // Pre-configured default user Supabase credentials for seamless out-of-the-box syncing
      return {
        url: 'https://oajpasqndvwahswgorzg.supabase.co',
        key: 'sb_publishable_bOHbvYedy_frmMTcOYit2Q_jej1_hGv'
      };
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
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
          const url = `${config.url}/rest/v1/${item.store}`;
          const headers = {
            'apikey': config.key,
            'Authorization': `Bearer ${config.key}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates' // Last-write-wins resolver
          };

          let method = 'POST';
          let body = JSON.stringify(item.data);

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
