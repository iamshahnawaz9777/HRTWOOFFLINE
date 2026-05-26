/* ==========================================================================
   AeroGlass ERP Local-First IndexedDB Store Engine
   ========================================================================== */

const DB_NAME = 'AeroGlassERP_DB';
const DB_VERSION = 1;

class IndexedDBStore {
  constructor() {
    this.db = null;
  }

  /**
   * Initializes and opens connection to IndexedDB
   */
  async open() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error('IndexedDB open error:', event.target.error);
        reject(event.target.error);
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // 1. Users Store
        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'username' });
        }
        
        // 2. Projects Store
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }
        
        // 3. Tasks Store
        if (!db.objectStoreNames.contains('tasks')) {
          db.createObjectStore('tasks', { keyPath: 'id' });
        }
        
        // 4. Employees Store
        if (!db.objectStoreNames.contains('employees')) {
          db.createObjectStore('employees', { keyPath: 'id' });
        }
        
        // 5. Attendance Store
        if (!db.objectStoreNames.contains('attendance')) {
          db.createObjectStore('attendance', { keyPath: 'id' });
        }
        
        // 6. Leaves Store
        if (!db.objectStoreNames.contains('leaves')) {
          db.createObjectStore('leaves', { keyPath: 'id' });
        }
        
        // 7. Inventory Store
        if (!db.objectStoreNames.contains('inventory')) {
          db.createObjectStore('inventory', { keyPath: 'id' });
        }
        
        // 8. Inventory Transactions Store
        if (!db.objectStoreNames.contains('transactions')) {
          db.createObjectStore('transactions', { keyPath: 'id' });
        }
        
        // 9. Gate Pass Store
        if (!db.objectStoreNames.contains('gatepasses')) {
          db.createObjectStore('gatepasses', { keyPath: 'id' });
        }

        // 10. Sync Queue Store
        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Safe transaction runner utility
   */
  async getTransaction(storeName, mode = 'readonly') {
    const db = await this.open();
    return db.transaction(storeName, mode).objectStore(storeName);
  }

  /**
   * Fetch single item by key
   */
  async get(storeName, key) {
    const store = await this.getTransaction(storeName);
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Fetch all items in store
   */
  async getAll(storeName) {
    const store = await this.getTransaction(storeName);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save (Insert/Update) item in store
   */
  async put(storeName, data) {
    const store = await this.getTransaction(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete item from store
   */
  async delete(storeName, key) {
    const store = await this.getTransaction(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all records in store
   */
  async clear(storeName) {
    const store = await this.getTransaction(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Seeding routine to auto-populate default databases on first launch
   */
  async seed() {
    const users = await this.getAll('users');
    if (users.length > 0) {
      console.log('IndexedDB database already contains seeded data.');
      return;
    }

    console.log('Seeding initial demo databases...');

    // 1. Users & Roles
    const defaultUsers = [
      { username: 'admin', password: 'admin123', role: 'Admin', status: 'Active' },
      { username: 'manager', password: 'manager123', role: 'Manager', status: 'Active' },
      { username: 'storekeeper', password: 'store123', role: 'Store Keeper', status: 'Active' },
      { username: 'hr', password: 'hr123', role: 'HR', status: 'Active' },
      { username: 'employee', password: 'emp123', role: 'Employee', status: 'Active' },
      { username: 'inactive_user', password: 'user123', role: 'Employee', status: 'Inactive' }
    ];
    for (const u of defaultUsers) await this.put('users', u);

    // 2. Projects
    const defaultProjects = [
      { id: 'proj-1', name: 'Glass Facade Installation - Tower A', description: 'Design, cut, and mount premium reflective glass panels for corporate skyscraper block A.', status: 'Active', createdAt: '2026-05-10T08:00:00.000Z' },
      { id: 'proj-2', name: 'Façade Partitioning - Residence Block B', description: 'Interior acoustic glass partitioning with structural pivot hinge systems.', status: 'Active', createdAt: '2026-05-15T09:30:00.000Z' },
      { id: 'proj-3', name: 'Smart Glass Retrofitting - Executive Lounge', description: 'Upgrade double-glazed windows with polymer dispersed liquid crystal (PDLC) switchable glasses.', status: 'Archived', createdAt: '2026-04-01T10:00:00.000Z' }
    ];
    for (const p of defaultProjects) await this.put('projects', p);

    // 3. Project Tasks
    const defaultTasks = [
      {
        id: 'task-101',
        projectId: 'proj-1',
        name: 'Design Glass Facade Engineering Blueprints',
        description: 'Prepare detailed structural sizing, wind-load resistance values, and anchoring brackets.',
        assignees: ['admin', 'employee'],
        deadline: '2026-05-30',
        priority: 'high',
        status: 'done',
        subtasks: [
          { text: 'Draft CAD sketches', completed: true },
          { text: 'Verify tensile limits', completed: true },
          { text: 'Submit architect approval', completed: true }
        ],
        activityLog: [
          { time: '2026-05-12T10:00:00Z', user: 'admin', action: 'Created task' },
          { time: '2026-05-20T14:30:00Z', user: 'employee', action: 'Finished all engineering designs' }
        ]
      },
      {
        id: 'task-102',
        projectId: 'proj-1',
        name: 'Install Reflective Glass Sheets - Section A',
        description: 'Mount structural silicone-glazed double glass units onto aluminum mullions for floors 1 to 5.',
        assignees: ['employee'],
        deadline: '2026-06-15',
        priority: 'high',
        status: 'in-progress',
        subtasks: [
          { text: 'Deliver sheets to staging area', completed: true },
          { text: 'Verify hoist crane rig integrity', completed: false },
          { text: 'Fasten aluminum support anchors', completed: false }
        ],
        activityLog: [
          { time: '2026-05-14T09:00:00Z', user: 'admin', action: 'Created task' },
          { time: '2026-05-25T11:00:00Z', user: 'employee', action: 'Moved panels to ground floor staging' }
        ]
      },
      {
        id: 'task-201',
        projectId: 'proj-2',
        name: 'Procure Heavy Duty Pivot Hinges (SS304)',
        description: 'Source premium grade stainless steel pivots and anchors from core inventory stocks.',
        assignees: ['storekeeper'],
        deadline: '2026-05-29',
        priority: 'medium',
        status: 'review',
        subtasks: [
          { text: 'Check current inventory stock levels', completed: true },
          { text: 'Create gate pass for material haulage', completed: false }
        ],
        activityLog: [
          { time: '2026-05-18T14:00:00Z', user: 'manager', action: 'Created task' }
        ]
      },
      {
        id: 'task-202',
        projectId: 'proj-2',
        name: 'Precision Glass Slicing & Edge Polishing - Suite B',
        description: 'Slice 12mm frosted glass sheets to specification layout profiles and flat-polish all structural outer corners.',
        assignees: ['employee'],
        deadline: '2026-06-10',
        priority: 'low',
        status: 'todo',
        subtasks: [
          { text: 'Verify measurement offsets on-site', completed: false },
          { text: 'Perform water-jet CNC slicing', completed: false },
          { text: 'Polishing machine runs', completed: false }
        ],
        activityLog: [
          { time: '2026-05-20T10:00:00Z', user: 'admin', action: 'Created task' }
        ]
      }
    ];
    for (const t of defaultTasks) await this.put('tasks', t);

    // 4. Employees Database
    const defaultEmployees = [
      { id: 'EMP-1001', name: 'John Doe', role: 'Employee', department: 'Operations', contact: 'john.doe@aeglas.com', joiningDate: '2025-01-15', documents: [{ name: 'ID_Passport.pdf' }], leaveBalance: 15, salary: '4500' },
      { id: 'EMP-1002', name: 'Jane Smith', role: 'HR', department: 'Human Resources', contact: 'jane.smith@aeglas.com', joiningDate: '2024-03-01', documents: [{ name: 'Degree_HR.pdf' }], leaveBalance: 18, salary: '6500' },
      { id: 'EMP-1003', name: 'Bob Miller', role: 'Store Keeper', department: 'Logistics', contact: 'bob.miller@aeglas.com', joiningDate: '2024-11-10', documents: [{ name: 'Logistics_Cert.pdf' }], leaveBalance: 14, salary: '3800' },
      { id: 'EMP-1004', name: 'Alice Johnson', role: 'Employee', department: 'Projects & Engineering', contact: 'alice.j@aeglas.com', joiningDate: '2025-06-01', documents: [{ name: 'Civil_Degree.pdf' }], leaveBalance: 12, salary: '4000' },
      { id: 'EMP-1005', name: 'Charles Xavier', role: 'Manager', department: 'Operations', contact: 'charles.x@aeglas.com', joiningDate: '2023-05-15', documents: [], leaveBalance: 20, salary: '8000' }
    ];
    for (const emp of defaultEmployees) await this.put('employees', emp);

    // 5. Attendance (Current Day Check-ins)
    const todayStr = '2026-05-26';
    const defaultAttendance = [
      { id: `att-1-${todayStr}`, employeeId: 'EMP-1001', date: todayStr, checkIn: '08:15', checkOut: '17:30', status: 'Present' },
      { id: `att-3-${todayStr}`, employeeId: 'EMP-1003', date: todayStr, checkIn: '08:25', checkOut: '', status: 'Present' },
      { id: `att-4-${todayStr}`, employeeId: 'EMP-1004', date: todayStr, checkIn: '08:30', checkOut: '', status: 'Present' }
    ];
    for (const att of defaultAttendance) await this.put('attendance', att);

    // 6. Leave Management Entries
    const defaultLeaves = [
      { id: 'lv-001', employeeId: 'EMP-1004', type: 'Medical Leave', startDate: '2026-05-20', endDate: '2026-05-22', reason: 'Severe dental surgery and recovery recovery.', status: 'Approved', approvedBy: 'Jane Smith' },
      { id: 'lv-002', employeeId: 'EMP-1001', type: 'Annual Leave', startDate: '2026-06-01', endDate: '2026-06-05', reason: 'Family summer vacation plan.', status: 'Pending', approvedBy: '' }
    ];
    for (const lv of defaultLeaves) await this.put('leaves', lv);

    // 7. Inventory Items List
    const defaultInventory = [
      { id: 'inv-gls10', code: 'GLS-10MM-CLR', name: '10mm Clear Tempered Glass Sheet', category: 'glass sheets', unit: 'SqFt', description: 'Standard high tensile safety structural paneling.', minStock: 100, currentStock: 240 },
      { id: 'inv-gls12', code: 'GLS-12MM-FRT', name: '12mm Frosted Glass Sheet', category: 'glass sheets', unit: 'SqFt', description: 'Opal blasted decorative sound insulation glass panel.', minStock: 90, currentStock: 85 }, // Low stock condition!
      { id: 'inv-hdw01', code: 'HDW-HNG-SS304', name: 'SS304 Glass Pivot Hinge', category: 'hardware', unit: 'Pcs', description: 'Grade 304 stainless wall to glass pivoting anchor hinges.', minStock: 150, currentStock: 450 },
      { id: 'inv-tool01', code: 'TL-GL-CUT', name: 'Professional Glass Cutter', category: 'tools', unit: 'Pcs', description: 'Tungsten carbide alloy head cutter with lubricating reservoir.', minStock: 5, currentStock: 12 },
      { id: 'inv-chem01', code: 'CHM-ADH-SC2', name: 'Heavy Duty Silicon Adhesive', category: 'chemicals', unit: 'Bottles', description: 'High performance quick curing architectural structural adhesive.', minStock: 50, currentStock: 120 }
    ];
    for (const item of defaultInventory) await this.put('inventory', item);

    // 8. Inward/Outward Ledger Transactions
    const defaultTransactions = [
      { id: 'tx-1', itemId: 'inv-gls10', type: 'inward', quantity: 300, sourceOrPurpose: 'Seeded Opening Stock (Vendor: GlassCorp Ltd)', date: '2026-05-01' },
      { id: 'tx-2', itemId: 'inv-gls10', type: 'outward', quantity: 60, sourceOrPurpose: 'Project site delivery - Tower A Section A', date: '2026-05-20' },
      { id: 'tx-3', itemId: 'inv-gls12', type: 'inward', quantity: 100, sourceOrPurpose: 'Purchase invoice P-0199', date: '2026-05-05' },
      { id: 'tx-4', itemId: 'inv-gls12', type: 'outward', quantity: 15, sourceOrPurpose: 'Interior partitions residence Suite B', date: '2026-05-24' }
    ];
    for (const tx of defaultTransactions) await this.put('transactions', tx);

    // 9. Gate Passes Logs
    const defaultGatePasses = [
      {
        id: 'gp-1',
        gatePassNo: 'GP-2026-0001',
        date: '2026-05-25',
        status: 'Approved',
        person: { name: 'Jack Vance', designation: 'Delivery Driver', contact: '+1-555-0199' },
        vehicle: { vehicleNo: 'KA-01-E-7890', driverName: 'Jack Vance', vehicleType: 'Staging Delivery Truck' },
        items: [
          { code: 'HDW-HNG-SS304', name: 'SS304 Glass Pivot Hinge', quantity: 10, description: 'Fittings for structural partition Suite B' }
        ],
        returnable: true,
        returns: [
          { code: 'HDW-HNG-SS304', returnedQty: 0, date: '' }
        ]
      },
      {
        id: 'gp-2',
        gatePassNo: 'GP-2026-0002',
        date: '2026-05-26',
        status: 'Closed',
        person: { name: 'Marcus Aurelius', designation: 'Client Engineer', contact: '+1-555-0811' },
        vehicle: { vehicleNo: 'Private Car', driverName: 'Marcus Aurelius', vehicleType: 'SUV' },
        items: [
          { code: 'TL-GL-CUT', name: 'Professional Glass Cutter', quantity: 2, description: 'Urgent temporary cutting kit for VIP suite partitioning' }
        ],
        returnable: false,
        returns: []
      }
    ];
    for (const gp of defaultGatePasses) await this.put('gatepasses', gp);

    console.log('Seeding process completed successfully!');
  }
  async init() {
    await this.open();
    await this.seed();

    // Safety fallback: Force-write root admin user on initialization to guarantee it always exists
    try {
      const admin = await this.get('users', 'admin');
      if (!admin) {
        console.log('AeroGlass Safety Guard: root admin user missing. Force-writing...');
        await this.put('users', { username: 'admin', password: 'admin123', role: 'Admin', status: 'Active' });
      }
    } catch (e) {
      console.error('Safety fallback failed, writing admin directly:', e);
      try {
        await this.put('users', { username: 'admin', password: 'admin123', role: 'Admin', status: 'Active' });
      } catch (e2) {
        console.error('Direct write failed:', e2);
      }
    }

    return this.db;
  }
}

// Global Export instantiation
export const db = new IndexedDBStore();
// Start opening database connection early
db.open().catch(err => console.error('Database pre-open failed:', err));
