(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=`AeroGlassERP_DB`,t=4,n=new class{constructor(){this.db=null,this.localDirHandle=null,this.localDirPath=null,this.isLocalDirAutoSave=!0}async open(){return this.db?this.db:new Promise((n,r)=>{let i=indexedDB.open(e,t);i.onerror=e=>{console.error(`IndexedDB open error:`,e.target.error),r(e.target.error)},i.onsuccess=e=>{this.db=e.target.result,n(this.db)},i.onupgradeneeded=e=>{let t=e.target.result;t.objectStoreNames.contains(`users`)||t.createObjectStore(`users`,{keyPath:`username`}),t.objectStoreNames.contains(`projects`)||t.createObjectStore(`projects`,{keyPath:`id`}),t.objectStoreNames.contains(`tasks`)||t.createObjectStore(`tasks`,{keyPath:`id`}),t.objectStoreNames.contains(`employees`)||t.createObjectStore(`employees`,{keyPath:`id`}),t.objectStoreNames.contains(`attendance`)||t.createObjectStore(`attendance`,{keyPath:`id`}),t.objectStoreNames.contains(`leaves`)||t.createObjectStore(`leaves`,{keyPath:`id`}),t.objectStoreNames.contains(`inventory`)||t.createObjectStore(`inventory`,{keyPath:`id`}),t.objectStoreNames.contains(`transactions`)||t.createObjectStore(`transactions`,{keyPath:`id`}),t.objectStoreNames.contains(`gatepasses`)||t.createObjectStore(`gatepasses`,{keyPath:`id`}),t.objectStoreNames.contains(`syncQueue`)||t.createObjectStore(`syncQueue`,{keyPath:`id`}),t.objectStoreNames.contains(`tools_tracking`)||t.createObjectStore(`tools_tracking`,{keyPath:`id`}),t.objectStoreNames.contains(`inventory_categories`)||t.createObjectStore(`inventory_categories`,{keyPath:`id`}),t.objectStoreNames.contains(`designs`)||t.createObjectStore(`designs`,{keyPath:`id`}),t.objectStoreNames.contains(`fittings`)||t.createObjectStore(`fittings`,{keyPath:`id`}),t.objectStoreNames.contains(`quotes`)||t.createObjectStore(`quotes`,{keyPath:`id`}),t.objectStoreNames.contains(`app_settings`)||t.createObjectStore(`app_settings`,{keyPath:`key`})}})}async getTransaction(e,t=`readonly`){return(await this.open()).transaction(e,t).objectStore(e)}async getSetting(e){try{let t=await this.getTransaction(`app_settings`);return new Promise(n=>{let r=t.get(e);r.onsuccess=()=>n(r.result?r.result.value:null),r.onerror=()=>n(null)})}catch{return null}}async setSetting(e,t){try{let n=await this.getTransaction(`app_settings`,`readwrite`);return new Promise(r=>{let i=n.put({key:e,value:t});i.onsuccess=()=>r(!0),i.onerror=()=>r(!1)})}catch{return!1}}async setLocalDirHandle(e){this.localDirHandle=e,await this.setSetting(`local_dir_handle`,e),await this.setSetting(`local_dir_autosave`,this.isLocalDirAutoSave)}async loadLocalDirHandle(){let e=await this.getSetting(`local_dir_handle`);e&&(this.localDirHandle=e);let t=await this.getSetting(`local_dir_path`);t&&(this.localDirPath=t);let n=await this.getSetting(`local_dir_autosave`);n!==null&&(this.isLocalDirAutoSave=n)}async verifyPermission(e=!0){if(window.showDirectoryPicker&&this.localDirHandle){let t={};e&&(t.mode=`readwrite`);try{return await this.localDirHandle.queryPermission(t)===`granted`}catch{return!1}}else if(this.localDirPath)try{return(await fetch(`/api/local-db/check?path=${encodeURIComponent(this.localDirPath)}`)).ok}catch{return!1}return!1}async requestPermission(e=!0){if(window.showDirectoryPicker&&this.localDirHandle){let t={};e&&(t.mode=`readwrite`);try{return await this.localDirHandle.requestPermission(t)===`granted`}catch{return!1}}else if(this.localDirPath)return this.verifyPermission(e);return!1}async writeStoreToFolder(e){if(window.showDirectoryPicker&&this.localDirHandle){if(!await this.verifyPermission(!0)){console.warn(`Local directory not authorized to write store: ${e}`);return}try{let t=await this.getAll(e),n=await(await this.localDirHandle.getFileHandle(`${e}.json`,{create:!0})).createWritable();await n.write(JSON.stringify(t,null,2)),await n.close(),console.log(`✓ Auto-saved ${e}.json to local directory`)}catch(t){console.error(`Failed to auto-save store ${e}:`,t)}}else if(this.localDirPath)try{let t=await this.getAll(e);await fetch(`/api/local-db/write`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({dirPath:this.localDirPath,file:`${e}.json`,data:t})}),console.log(`✓ Auto-saved ${e}.json to local directory via server API`)}catch(t){console.error(`Failed to auto-save store ${e} via server API:`,t)}}async exportAllToFolder(){if(!this.localDirHandle&&!this.localDirPath)throw Error(`No local folder connected.`);if(!await this.requestPermission(!0))throw Error(`Directory write permission denied.`);for(let e of[`users`,`projects`,`tasks`,`employees`,`attendance`,`leaves`,`inventory`,`transactions`,`gatepasses`,`tools_tracking`,`inventory_categories`,`designs`,`fittings`,`quotes`])await this.writeStoreToFolder(e)}async importAllFromFolder(){if(!this.localDirHandle&&!this.localDirPath)throw Error(`No local folder connected.`);if(!await this.requestPermission(!0))throw Error(`Directory read/write permission denied.`);let e=[`users`,`projects`,`tasks`,`employees`,`attendance`,`leaves`,`inventory`,`transactions`,`gatepasses`,`tools_tracking`,`inventory_categories`,`designs`,`fittings`,`quotes`],t=0;for(let n of e)try{let e=null;if(window.showDirectoryPicker&&this.localDirHandle){let t=await(await(await this.localDirHandle.getFileHandle(`${n}.json`)).getFile()).text();e=JSON.parse(t)}else if(this.localDirPath){let t=await fetch(`/api/local-db/read`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({dirPath:this.localDirPath,file:`${n}.json`})});t.ok&&(e=(await t.json()).data)}if(Array.isArray(e)){await this.clearDirectly(n);for(let t of e)await this.putDirectly(n,t);t++}}catch(e){console.warn(`Could not import store ${n}:`,e.message)}return t}async get(e,t){let n=await this.getTransaction(e);return new Promise((e,r)=>{let i=n.get(t);i.onsuccess=()=>e(i.result),i.onerror=()=>r(i.error)})}async getAll(e){let t=await this.getTransaction(e);return new Promise((e,n)=>{let r=t.getAll();r.onsuccess=()=>e(r.result||[]),r.onerror=()=>n(r.error)})}async put(e,t){t&&typeof t==`object`&&e!==`app_settings`&&e!==`syncQueue`&&(t.updatedAt=new Date().toISOString());let n=await this.getTransaction(e,`readwrite`);return new Promise((r,i)=>{let a=n.put(t);a.onsuccess=async()=>{(this.localDirHandle||this.localDirPath)&&this.isLocalDirAutoSave&&e!==`app_settings`&&e!==`syncQueue`&&this.writeStoreToFolder(e).catch(e=>console.warn(e)),r(a.result)},a.onerror=()=>i(a.error)})}async putDirectly(e,t){let n=await this.getTransaction(e,`readwrite`);return new Promise((e,r)=>{let i=n.put(t);i.onsuccess=()=>e(i.result),i.onerror=()=>r(i.error)})}async delete(e,t){let n=await this.getTransaction(e,`readwrite`);return new Promise((r,i)=>{let a=n.delete(t);a.onsuccess=async()=>{(this.localDirHandle||this.localDirPath)&&this.isLocalDirAutoSave&&e!==`app_settings`&&e!==`syncQueue`&&this.writeStoreToFolder(e).catch(e=>console.warn(e)),r(!0)},a.onerror=()=>i(a.error)})}async clear(e){let t=await this.getTransaction(e,`readwrite`);return new Promise((n,r)=>{let i=t.clear();i.onsuccess=async()=>{(this.localDirHandle||this.localDirPath)&&this.isLocalDirAutoSave&&e!==`app_settings`&&e!==`syncQueue`&&this.writeStoreToFolder(e).catch(e=>console.warn(e)),n(!0)},i.onerror=()=>r(i.error)})}async clearDirectly(e){let t=await this.getTransaction(e,`readwrite`);return new Promise((e,n)=>{let r=t.clear();r.onsuccess=()=>e(!0),r.onerror=()=>n(r.error)})}async seed(){if((await this.getAll(`users`)).length>0){console.log(`IndexedDB database already contains seeded data.`);return}console.log(`Seeding initial demo databases...`);for(let e of[{username:`admin`,password:`admin123`,role:`Admin`,status:`Active`},{username:`manager`,password:`manager123`,role:`Manager`,status:`Active`},{username:`storekeeper`,password:`store123`,role:`Store Keeper`,status:`Active`},{username:`hr`,password:`hr123`,role:`HR`,status:`Active`},{username:`employee`,password:`emp123`,role:`Employee`,status:`Active`},{username:`inactive_user`,password:`user123`,role:`Employee`,status:`Inactive`}])await this.put(`users`,e);for(let e of[{id:`proj-1`,name:`Glass Facade Installation - Tower A`,description:`Design, cut, and mount premium reflective glass panels for corporate skyscraper block A.`,status:`Active`,createdAt:`2026-05-10T08:00:00.000Z`},{id:`proj-2`,name:`Façade Partitioning - Residence Block B`,description:`Interior acoustic glass partitioning with structural pivot hinge systems.`,status:`Active`,createdAt:`2026-05-15T09:30:00.000Z`},{id:`proj-3`,name:`Smart Glass Retrofitting - Executive Lounge`,description:`Upgrade double-glazed windows with polymer dispersed liquid crystal (PDLC) switchable glasses.`,status:`Archived`,createdAt:`2026-04-01T10:00:00.000Z`}])await this.put(`projects`,e);for(let e of[{id:`task-101`,projectId:`proj-1`,name:`Design Glass Facade Engineering Blueprints`,description:`Prepare detailed structural sizing, wind-load resistance values, and anchoring brackets.`,assignees:[`admin`,`employee`],deadline:`2026-05-30`,priority:`high`,status:`done`,subtasks:[{text:`Draft CAD sketches`,completed:!0},{text:`Verify tensile limits`,completed:!0},{text:`Submit architect approval`,completed:!0}],activityLog:[{time:`2026-05-12T10:00:00Z`,user:`admin`,action:`Created task`},{time:`2026-05-20T14:30:00Z`,user:`employee`,action:`Finished all engineering designs`}]},{id:`task-102`,projectId:`proj-1`,name:`Install Reflective Glass Sheets - Section A`,description:`Mount structural silicone-glazed double glass units onto aluminum mullions for floors 1 to 5.`,assignees:[`employee`],deadline:`2026-06-15`,priority:`high`,status:`in-progress`,subtasks:[{text:`Deliver sheets to staging area`,completed:!0},{text:`Verify hoist crane rig integrity`,completed:!1},{text:`Fasten aluminum support anchors`,completed:!1}],activityLog:[{time:`2026-05-14T09:00:00Z`,user:`admin`,action:`Created task`},{time:`2026-05-25T11:00:00Z`,user:`employee`,action:`Moved panels to ground floor staging`}]},{id:`task-201`,projectId:`proj-2`,name:`Procure Heavy Duty Pivot Hinges (SS304)`,description:`Source premium grade stainless steel pivots and anchors from core inventory stocks.`,assignees:[`storekeeper`],deadline:`2026-05-29`,priority:`medium`,status:`review`,subtasks:[{text:`Check current inventory stock levels`,completed:!0},{text:`Create gate pass for material haulage`,completed:!1}],activityLog:[{time:`2026-05-18T14:00:00Z`,user:`manager`,action:`Created task`}]},{id:`task-202`,projectId:`proj-2`,name:`Precision Glass Slicing & Edge Polishing - Suite B`,description:`Slice 12mm frosted glass sheets to specification layout profiles and flat-polish all structural outer corners.`,assignees:[`employee`],deadline:`2026-06-10`,priority:`low`,status:`todo`,subtasks:[{text:`Verify measurement offsets on-site`,completed:!1},{text:`Perform water-jet CNC slicing`,completed:!1},{text:`Polishing machine runs`,completed:!1}],activityLog:[{time:`2026-05-20T10:00:00Z`,user:`admin`,action:`Created task`}]}])await this.put(`tasks`,e);for(let e of[{id:`EMP-1001`,name:`John Doe`,role:`Employee`,department:`Operations`,contact:`john.doe@aeglas.com`,joiningDate:`2025-01-15`,documents:[{name:`ID_Passport.pdf`}],leaveBalance:15,salary:`4500`},{id:`EMP-1002`,name:`Jane Smith`,role:`HR`,department:`Human Resources`,contact:`jane.smith@aeglas.com`,joiningDate:`2024-03-01`,documents:[{name:`Degree_HR.pdf`}],leaveBalance:18,salary:`6500`},{id:`EMP-1003`,name:`Bob Miller`,role:`Store Keeper`,department:`Logistics`,contact:`bob.miller@aeglas.com`,joiningDate:`2024-11-10`,documents:[{name:`Logistics_Cert.pdf`}],leaveBalance:14,salary:`3800`},{id:`EMP-1004`,name:`Alice Johnson`,role:`Employee`,department:`Projects & Engineering`,contact:`alice.j@aeglas.com`,joiningDate:`2025-06-01`,documents:[{name:`Civil_Degree.pdf`}],leaveBalance:12,salary:`4000`},{id:`EMP-1005`,name:`Charles Xavier`,role:`Manager`,department:`Operations`,contact:`charles.x@aeglas.com`,joiningDate:`2023-05-15`,documents:[],leaveBalance:20,salary:`8000`}])await this.put(`employees`,e);let e=`2026-05-26`,t=[{id:`att-1-${e}`,employeeId:`EMP-1001`,date:e,checkIn:`08:15`,checkOut:`17:30`,status:`Present`},{id:`att-3-${e}`,employeeId:`EMP-1003`,date:e,checkIn:`08:25`,checkOut:``,status:`Present`},{id:`att-4-${e}`,employeeId:`EMP-1004`,date:e,checkIn:`08:30`,checkOut:``,status:`Present`}];for(let e of t)await this.put(`attendance`,e);for(let e of[{id:`lv-001`,employeeId:`EMP-1004`,type:`Medical Leave`,startDate:`2026-05-20`,endDate:`2026-05-22`,reason:`Severe dental surgery and recovery recovery.`,status:`Approved`,approvedBy:`Jane Smith`},{id:`lv-002`,employeeId:`EMP-1001`,type:`Annual Leave`,startDate:`2026-06-01`,endDate:`2026-06-05`,reason:`Family summer vacation plan.`,status:`Pending`,approvedBy:``}])await this.put(`leaves`,e);for(let e of[{id:`inv-gls10`,code:`GLS-10MM-CLR`,name:`10mm Clear Tempered Glass Sheet`,category:`glass sheets`,unit:`SqFt`,description:`Standard high tensile safety structural paneling.`,minStock:100,currentStock:240},{id:`inv-gls12`,code:`GLS-12MM-FRT`,name:`12mm Frosted Glass Sheet`,category:`glass sheets`,unit:`SqFt`,description:`Opal blasted decorative sound insulation glass panel.`,minStock:90,currentStock:85},{id:`inv-hdw01`,code:`HDW-HNG-SS304`,name:`SS304 Glass Pivot Hinge`,category:`hardware`,unit:`Pcs`,description:`Grade 304 stainless wall to glass pivoting anchor hinges.`,minStock:150,currentStock:450},{id:`inv-tool01`,code:`TL-GL-CUT`,name:`Professional Glass Cutter`,category:`tools`,unit:`Pcs`,description:`Tungsten carbide alloy head cutter with lubricating reservoir.`,minStock:5,currentStock:12},{id:`inv-chem01`,code:`CHM-ADH-SC2`,name:`Heavy Duty Silicon Adhesive`,category:`chemicals`,unit:`Bottles`,description:`High performance quick curing architectural structural adhesive.`,minStock:50,currentStock:120}])await this.put(`inventory`,e);for(let e of[{id:`tx-1`,itemId:`inv-gls10`,type:`inward`,quantity:300,sourceOrPurpose:`Seeded Opening Stock (Vendor: GlassCorp Ltd)`,date:`2026-05-01`},{id:`tx-2`,itemId:`inv-gls10`,type:`outward`,quantity:60,sourceOrPurpose:`Project site delivery - Tower A Section A`,date:`2026-05-20`},{id:`tx-3`,itemId:`inv-gls12`,type:`inward`,quantity:100,sourceOrPurpose:`Purchase invoice P-0199`,date:`2026-05-05`},{id:`tx-4`,itemId:`inv-gls12`,type:`outward`,quantity:15,sourceOrPurpose:`Interior partitions residence Suite B`,date:`2026-05-24`}])await this.put(`transactions`,e);for(let e of[{id:`gp-1`,gatePassNo:`GP-2026-0001`,date:`2026-05-25`,status:`Approved`,person:{name:`Jack Vance`,designation:`Delivery Driver`,contact:`+1-555-0199`},vehicle:{vehicleNo:`KA-01-E-7890`,driverName:`Jack Vance`,vehicleType:`Staging Delivery Truck`},items:[{code:`HDW-HNG-SS304`,name:`SS304 Glass Pivot Hinge`,quantity:10,description:`Fittings for structural partition Suite B`}],returnable:!0,returns:[{code:`HDW-HNG-SS304`,returnedQty:0,date:``}]},{id:`gp-2`,gatePassNo:`GP-2026-0002`,date:`2026-05-26`,status:`Closed`,person:{name:`Marcus Aurelius`,designation:`Client Engineer`,contact:`+1-555-0811`},vehicle:{vehicleNo:`Private Car`,driverName:`Marcus Aurelius`,vehicleType:`SUV`},items:[{code:`TL-GL-CUT`,name:`Professional Glass Cutter`,quantity:2,description:`Urgent temporary cutting kit for VIP suite partitioning`}],returnable:!1,returns:[]}])await this.put(`gatepasses`,e);for(let e of[{id:`cat-1`,name:`Glass Sheets`},{id:`cat-2`,name:`Hardware Fittings`},{id:`cat-3`,name:`Tools & Kits`},{id:`cat-4`,name:`Chemicals`},{id:`cat-5`,name:`Others`}])await this.put(`inventory_categories`,e);for(let e of[{id:`fit-1`,name:`Heavy Duty Pivot Hinge`,code:`HINGE-HD-PIVOT`,category:`hinge`,price:45,unit:`pcs`},{id:`fit-2`,name:`Stainless Steel D-Handle 300mm`,code:`HANDLE-SS-D300`,category:`handle`,price:25,unit:`pcs`},{id:`fit-3`,name:`Multi-point Lock System`,code:`LOCK-MULTIPNT`,category:`lock`,price:60,unit:`pcs`},{id:`fit-4`,name:`Nylon Double Roller Wheel`,code:`ROLLER-NYLON-DBL`,category:`roller`,price:8.5,unit:`pcs`},{id:`fit-5`,name:`Dow Corning 791 Silicon Sealant`,code:`SEAL-SILICON-DC791`,category:`sealant`,price:12,unit:`tube`},{id:`fit-6`,name:`EPDM Weather Gasket`,code:`GASKET-EPDM-WEATHER`,category:`sealant`,price:1.5,unit:`meter`}])await this.put(`fittings`,e);console.log(`Seeding process completed successfully!`)}async init(){await this.open(),await this.loadLocalDirHandle(),await this.seed();try{await this.get(`users`,`admin`)||(console.log(`AeroGlass Safety Guard: root admin user missing. Force-writing...`),await this.put(`users`,{username:`admin`,password:`admin123`,role:`Admin`,status:`Active`}))}catch(e){console.error(`Safety fallback failed, writing admin directly:`,e);try{await this.put(`users`,{username:`admin`,password:`admin123`,role:`Admin`,status:`Active`})}catch(e){console.error(`Direct write failed:`,e)}}return this.db}};n.open().catch(e=>console.error(`Database pre-open failed:`,e));var r=new class{constructor(){this.configKey=`aeroglass_supabase_config`,this.tursoConfigKey=`aeroglass_turso_config`,this.syncListeners=[],this.isOnline=navigator.onLine,window.addEventListener(`online`,()=>this.handleNetworkChange(!0)),window.addEventListener(`offline`,()=>this.handleNetworkChange(!1))}subscribe(e){this.syncListeners.push(e),e(this.getStatus())}notifyListeners(){let e=this.getStatus();this.syncListeners.forEach(t=>t(e)),this.updateSyncWidget()}saveConfig(e,t){!e||!t?localStorage.removeItem(this.configKey):localStorage.setItem(this.configKey,JSON.stringify({url:e,key:t})),this.notifyListeners()}getConfig(){let e=localStorage.getItem(this.configKey);if(!e)return{url:`https://gdptkknhzduahvmkbkej.supabase.co`,key:`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkcHRra25oemR1YWh2bWtia2VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MjM4NTYsImV4cCI6MjA5NTM5OTg1Nn0.JQBLVDDgai8ya5fCgV3oI4nvj0cXbe2kM6l4VH5Wkis`};try{return JSON.parse(e)}catch{return null}}saveTursoConfig(e,t){!e||!t?localStorage.removeItem(this.tursoConfigKey):localStorage.setItem(this.tursoConfigKey,JSON.stringify({url:e,authToken:t})),this.notifyListeners()}getTursoConfig(){let e=localStorage.getItem(this.tursoConfigKey);if(!e)return{url:`libsql://hr-glass-iamshahnawaz9777.aws-ap-south-1.turso.io`,authToken:`eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODAyOTAwNDIsImlkIjoiMDE5ZTc5MWYtZDMwMS03MGMyLTg5ZjUtYWFmMmM4ODU3YTVkIiwicmlkIjoiMzJmNDIzODYtYWE0ZS00OWU0LThhNWYtNWE3Yjg2NGUxZWI5In0.S5euvu8Eu1KK8_sBTZoHeOXLmw5YtG9Xt0x-8Sv8qlahc-3qvlpawT8nCDdz9PzqttFrxQmKQ0bjOCQkRIjDAw`};try{return JSON.parse(e)}catch{return null}}async createTursoTables(){let e=this.getTursoConfig();if(!e||!e.url||!e.authToken)return;let t=[`CREATE TABLE IF NOT EXISTS inventory (
        id TEXT PRIMARY KEY,
        code TEXT,
        name TEXT,
        category TEXT,
        unit TEXT,
        currentStock REAL DEFAULT 0,
        minStock REAL DEFAULT 0,
        description TEXT,
        syncDate TEXT
      )`,`CREATE TABLE IF NOT EXISTS transactions (
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
      )`,`CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        name TEXT,
        role TEXT,
        department TEXT,
        phone TEXT,
        email TEXT,
        joinDate TEXT,
        syncDate TEXT
      )`,`CREATE TABLE IF NOT EXISTS gatepasses (
        id TEXT PRIMARY KEY,
        vehicleNo TEXT,
        driverName TEXT,
        purpose TEXT,
        entryTime TEXT,
        exitTime TEXT,
        status TEXT,
        syncDate TEXT
      )`];try{let n=t.map(e=>({type:`execute`,stmt:{sql:e}})),r=await fetch(`${e.url}/v2/pipeline`,{method:`POST`,headers:{Authorization:`Bearer ${e.authToken}`,"Content-Type":`application/json`},body:JSON.stringify({requests:n})});if(r.ok)console.log(`✓ Turso tables initialized successfully.`);else{let e=await r.text();console.warn(`Turso table init warning:`,e)}}catch(e){console.warn(`Turso table creation skipped (offline or config issue):`,e.message)}}getStatus(){return this.getConfig()?this.isOnline?`online`:`offline`:`local-only`}getHealthStatus(){let e=this.getConfig(),t=localStorage.getItem(`aeroglass_gsheet_webhook`),n=this.getTursoConfig();return{supabase:!!(e&&e.url&&e.url.includes(`supabase.co`)&&this.isOnline),googleSheets:!!(t&&t.length>10),turso:!!(n&&n.url&&n.url.includes(`turso.io`)&&this.isOnline)}}updateSyncWidget(){let e=this.getHealthStatus(),t=Object.values(e).every(e=>e===!0),n=document.getElementById(`db-sync-master-dot`);n&&(n.className=`db-sync-master-dot ${t?`all-online`:``}`);let r={"sync-status-supabase":e.supabase,"sync-status-gsheets":e.googleSheets,"sync-status-turso":e.turso};for(let[e,t]of Object.entries(r)){let n=document.getElementById(e);if(!n)continue;let r=n.querySelector(`.db-sync-dot`),i=n.querySelector(`.db-sync-status-text`);r&&(r.className=`db-sync-dot ${t?`online`:`offline`}`),i&&(i.textContent=t?`● Online`:`○ Offline`)}}handleNetworkChange(e){this.isOnline=e,console.log(`Network status changed: ${e?`ONLINE`:`OFFLINE`}`),this.notifyListeners(),e&&this.getConfig()&&this.syncQueue()}async queueOperation(e,t,r){let i={id:`sq-${Date.now()}-${Math.random().toString(36).substr(2,9)}`,store:e,action:t,data:r,timestamp:new Date().toISOString()};await n.put(`syncQueue`,i),console.log(`Queued transaction for store [${e}] action [${t}]`),this.getStatus()===`online`&&this.syncQueue(),t!==`delete`&&typeof r==`object`&&this.saveToTriplePipeline(r,e)}async saveToTriplePipeline(e,t){let n=new Date().toLocaleDateString(`en-US`,{month:`2-digit`,day:`2-digit`,year:`numeric`}).replace(/\//g,`-`),r={...e,syncDate:n};try{let e=this.getConfig();e&&e.url&&e.url.includes(`supabase.co`)&&this.isOnline&&fetch(`${e.url}/rest/v1/${t}`,{method:`POST`,headers:{apikey:e.key,Authorization:`Bearer ${e.key}`,"Content-Type":`application/json`,Prefer:`resolution=merge-duplicates`},body:JSON.stringify(r)}).catch(e=>console.warn(`Supabase pipeline write skipped:`,e.message))}catch{}try{let e=localStorage.getItem(`aeroglass_gsheet_webhook`);e&&e.length>10&&fetch(e,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({table:t,...r}),mode:`no-cors`}).catch(e=>console.warn(`G-Sheets write skipped:`,e.message))}catch{}try{let e=this.getTursoConfig();if(e&&e.url&&e.authToken&&this.isOnline){let n=Object.keys(r),i=Object.values(r).map(e=>typeof e==`object`&&e?JSON.stringify(e):e),a=n.join(`, `),o=n.map(()=>`?`).join(`, `);fetch(`${e.url}/v2/pipeline`,{method:`POST`,headers:{Authorization:`Bearer ${e.authToken}`,"Content-Type":`application/json`},body:JSON.stringify({requests:[{type:`execute`,stmt:{sql:`INSERT OR REPLACE INTO ${t} (${a}) VALUES (${o})`,args:i.map(e=>({type:`text`,value:String(e??``)}))}}]})}).catch(e=>console.warn(`Turso write skipped:`,e.message))}}catch{}console.log(`✓ Triple-pipeline dispatched for [${t}] at ${n}`)}async syncQueue(){let e=this.getConfig();if(!e||!this.isOnline)return console.log(`Sync skipped: Cloud settings not set or device offline.`),!1;try{this.syncListeners.forEach(e=>e(`syncing`));let t=await n.getAll(`syncQueue`);if(t.length===0)return console.log(`Sync complete: Queue is empty.`),this.notifyListeners(),!0;console.log(`Processing ${t.length} queued records for Supabase sync...`),t.sort((e,t)=>new Date(e.timestamp)-new Date(t.timestamp));for(let r of t){let t=!1;try{let i=`${e.url}/rest/v1/${r.store}`,a={apikey:e.key,Authorization:`Bearer ${e.key}`,"Content-Type":`application/json`,Prefer:`resolution=merge-duplicates`},o=`POST`,s=JSON.stringify(r.data);if(r.action!==`delete`&&e.url&&e.url.includes(`supabase.co`)){let t=r.store===`users`?`username`:`id`,i=r.store===`users`?r.data.username:r.data.id,a=`${e.url}/rest/v1/${r.store}?${t}=eq.${encodeURIComponent(i)}`;try{let t=await fetch(a,{method:`GET`,headers:{apikey:e.key,Authorization:`Bearer ${e.key}`}});if(t.ok){let e=await t.json();if(e&&e.length>0){let t=e[0];if(t.updatedAt&&r.data.updatedAt&&t.updatedAt!==r.data.updatedAt&&(console.log(`Conflict detected in store ${r.store} for key ${i}. Opening resolver...`),window.app&&typeof window.app.showConflictResolver==`function`)){let e=await window.app.showConflictResolver(r.store,r.data,t);if(e)r.data=e,await n.putDirectly(r.store,e),s=JSON.stringify(e);else{await n.putDirectly(r.store,t),await n.delete(`syncQueue`,r.id);continue}}}}}catch(e){console.warn(`Conflict detection check failed:`,e.message)}}if(r.action===`delete`){o=`DELETE`;let e=r.store===`users`?`username`:`id`;i+=`?${e}=eq.${r.data}`,s=null}if(e.url.includes(`example.com`)||e.url.includes(`supabase.co`)===!1)await new Promise(e=>setTimeout(e,400)),t=!0;else{let e=await fetch(i,{method:o,headers:a,body:s});if(e.ok)t=!0;else{let t=await e.text();console.error(`Supabase rejected request: ${t}`)}}}catch(e){console.error(`Fetch execution failed in syncer:`,e);break}t&&await n.delete(`syncQueue`,r.id)}return console.log(`Synchronization queue execution finished.`),this.notifyListeners(),!0}catch(e){return console.error(`Sync queue loop failure:`,e),this.notifyListeners(),!1}}async pullAllFromCloud(){let e=this.getConfig();if(!e||!this.isOnline)return!1;console.log(`Initiating full data pull from Supabase backend...`);for(let t of[`projects`,`tasks`,`employees`,`attendance`,`leaves`,`inventory`,`transactions`,`gatepasses`])try{let r=`${e.url}/rest/v1/${t}`,i=await fetch(r,{method:`GET`,headers:{apikey:e.key,Authorization:`Bearer ${e.key}`}});if(i.ok){let e=await i.json();if(Array.isArray(e))for(let r of e)await n.put(t,r)}}catch(e){console.error(`Error pulling store [${t}] from Supabase:`,e)}return!0}},i=new class{constructor(){this.currentUser=null}async login(e,t){let i=navigator.onLine,a=r.getConfig();if(i&&a&&a.url&&a.url.includes(`supabase.co`))try{let r=await fetch(`${a.url}/rest/v1/users?username=eq.${encodeURIComponent(e)}&password=eq.${encodeURIComponent(t)}`,{method:`GET`,headers:{apikey:a.key,Authorization:`Bearer ${a.key}`}});if(r.ok){let e=await r.json();if(e&&e.length>0){let t=e[0];if(t.status===`Inactive`)throw Error(`This operator profile is currently inactive.`);return this.currentUser={username:t.username,role:t.role,initials:this.getInitials(t.username)},await n.putDirectly(`users`,t),this.currentUser}}}catch(e){console.warn(`Online credentials check failed. Attempting local offline verification...`,e.message)}let o=await n.get(`users`,e);if(o)if(o.password===t){if(o.status===`Inactive`)throw Error(`This operator profile is currently inactive.`);return this.currentUser={username:o.username,role:o.role,initials:this.getInitials(o.username)},this.currentUser}else throw Error(`Invalid credentials provided.`);throw Error(`Operator profile not found. Please check your credentials.`)}getInitials(e){let t=e.split(/\s+/);return t.length>=2?(t[0][0]+t[1][0]).toUpperCase():e.slice(0,2).toUpperCase()}logout(){this.currentUser=null,sessionStorage.removeItem(`aeroglass_user`)}getCurrentUser(){if(this.currentUser)return this.currentUser;let e=sessionStorage.getItem(`aeroglass_user`);return e?(this.currentUser=JSON.parse(e),this.currentUser):null}hasAccess(e){let t=this.getCurrentUser();return t?t.role===`Admin`?!0:e.includes(t.role):!1}canAccessView(e){let t=this.getCurrentUser();return t?t.role===`Admin`?!0:({Manager:[`dashboard`,`projects`,`inventory`,`gatepass`,`tools`,`settings`],HR:[`dashboard`,`hr`,`settings`],"Store Keeper":[`dashboard`,`inventory`,`gatepass`,`tools`,`settings`],Employee:[`dashboard`,`projects`]}[t.role]||[]).includes(e):!1}},a=new Proxy({},{get:(e,t)=>window.app?window.app[t]:void 0}),o={search:``,priority:``,status:``,project:``,sort:`priority-desc`};async function s(e){let t=await n.getAll(`projects`),r=await n.getAll(`tasks`),i=await n.getAll(`employees`),a=await n.getAll(`attendance`),s=await n.getAll(`inventory`),u=await n.getAll(`gatepasses`),d=t.filter(e=>e.status===`Active`).length,f=new Date().toISOString().split(`T`)[0],p=a.filter(e=>e.date===f),m=i.length,h=m>0?Math.round(p.length/m*100):0,g=s.filter(e=>e.currentStock<=e.minStock).length,_=u.filter(e=>e.status===`Pending`).length,v=r.length,y=r.filter(e=>e.priority===`high`&&e.status!==`done`).length;r.filter(e=>e.status===`in-progress`).length;let ee=r.filter(e=>e.status===`done`).length,b=t.filter(e=>e.status===`Active`).map(e=>{let t=r.filter(t=>t.projectId===e.id),n=t.filter(e=>e.status===`done`).length,i=t.length>0?Math.round(n/t.length*100):0;return{name:e.name,count:t.length,progress:i}}),x=[];r.forEach(e=>{e.activityLog&&e.activityLog.forEach(t=>{x.push({type:`project`,text:`Task <strong>"${e.name}"</strong>: ${t.action} by ${t.user}`,time:t.time})})}),u.forEach(e=>{x.push({type:`gatepass`,text:`Gate Pass <strong>${e.gatePassNo}</strong> for <strong>${e.person?.name||`Site`}</strong> status: <strong>${e.status}</strong>`,time:`${e.date||f}T10:00:00Z`})}),x.sort((e,t)=>new Date(t.time)-new Date(e.time));let te=x.slice(0,6);e.innerHTML=`
    <!-- Top KPI Grid: Emphasizing Tasks & Operations -->
    <div class="dashboard-grid" style="grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 16px; margin-bottom: 20px;">
      
      <!-- Primary Tasks KPI -->
      <div class="glass-card kpi-card blue" style="border-left: 4px solid var(--primary-color);">
        <div class="kpi-icon" style="background: var(--primary-glow); color: var(--primary-color);">
          <i data-lucide="check-square"></i>
        </div>
        <div class="kpi-info">
          <h3>Operational Tasks</h3>
          <div class="kpi-value">${v}</div>
          <p style="display:flex; gap:8px; align-items:center;">
            <span style="color:var(--danger); font-weight:700;">🔥 ${y} High</span>
            <span>·</span>
            <span style="color:var(--success);">${ee} Done</span>
          </p>
        </div>
      </div>

      <!-- Active Projects KPI -->
      <div class="glass-card kpi-card purple">
        <div class="kpi-icon">
          <i data-lucide="folder-kanban"></i>
        </div>
        <div class="kpi-info">
          <h3>Active Projects</h3>
          <div class="kpi-value">${d}</div>
          <p>Running customer sites</p>
        </div>
      </div>

      <!-- HR Attendance KPI -->
      <div class="glass-card kpi-card" style="border-left: 4px solid var(--accent-color);">
        <div class="kpi-icon" style="background: rgba(168, 85, 247, 0.15); color: #c084fc;">
          <i data-lucide="user-check"></i>
        </div>
        <div class="kpi-info">
          <h3>HR Attendance</h3>
          <div class="kpi-value">${h}%</div>
          <p>${p.length} / ${m} staff checked-in</p>
        </div>
      </div>

      <!-- Low Stock Alerts KPI -->
      <div class="glass-card kpi-card green">
        <div class="kpi-icon">
          <i data-lucide="alert-circle"></i>
        </div>
        <div class="kpi-info">
          <h3>Low Stock Alerts</h3>
          <div class="kpi-value ${g>0?`danger-text`:``}">${g}</div>
          <p>Items below minimum</p>
        </div>
      </div>

      <!-- Pending Gate Pass-PI KPI -->
      <div class="glass-card kpi-card orange">
        <div class="kpi-icon">
          <i data-lucide="file-check-2"></i>
        </div>
        <div class="kpi-info">
          <h3>Pending Gate Pass-PI</h3>
          <div class="kpi-value">${_}</div>
          <p>Requires manager signoff</p>
        </div>
      </div>
    </div>

    <!-- Alert Bar for Low Stock items -->
    ${g>0?`
      <div class="alert-bar" style="margin-bottom: 20px;">
        <i data-lucide="alert-triangle"></i>
        <span>Critical: ${g} inventory items have fallen below their safety threshold! Check the Inventory Store module to log Stock Inward receipts.</span>
      </div>
    `:``}

    <!-- PRIORITY GIVEN TO TASKS: OPERATIONAL TASKS COMMAND CENTER -->
    <div class="glass-card section-card" style="margin-bottom: 24px; padding: 20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; margin-bottom:18px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:40px; height:40px; border-radius:10px; background:var(--primary-glow); display:flex; align-items:center; justify-content:center; color:var(--primary-color);">
            <i data-lucide="list-todo" style="width:22px; height:22px;"></i>
          </div>
          <div>
            <h3 style="font-size:17px; font-family:var(--font-heading); font-weight:700; margin:0; display:flex; align-items:center; gap:8px;">
              <span>Operational Tasks & Priority Queue</span>
              <span class="badge primary" id="dash-tasks-badge" style="font-size:11px;">${r.length} Total</span>
            </h3>
            <p class="muted-text" style="font-size:12px; margin:2px 0 0;">Priority-driven task queue with connected projects, assignees, and live status editing.</p>
          </div>
        </div>

        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          <a href="#projects" class="btn btn-secondary" style="padding:8px 14px; font-size:12px; text-decoration:none; display:flex; align-items:center; gap:6px;">
            <i data-lucide="kanban-square" style="width:14px; height:14px;"></i>
            <span>Kanban Board</span>
          </a>
          <button id="dash-add-task-btn" class="btn btn-primary" style="padding:8px 16px; font-size:12px; display:flex; align-items:center; gap:6px; font-weight:600;">
            <i data-lucide="plus-circle" style="width:15px; height:15px;"></i>
            <span>Add New Task</span>
          </button>
        </div>
      </div>

      <!-- Interactive Filters & Search Controls -->
      <div style="display:flex; flex-wrap:wrap; gap:10px; align-items:center; margin-bottom:16px; background:rgba(0,0,0,0.12); padding:10px 14px; border-radius:var(--radius-md); border:1px solid var(--glass-border);">
        <div class="search-input-wrapper" style="flex:1; min-width:200px;">
          <i data-lucide="search"></i>
          <input type="text" id="dash-task-search" placeholder="Search tasks, details, assignees..." class="form-control" style="font-size:12px; padding-top:7px; padding-bottom:7px;" value="${o.search}">
        </div>

        <!-- Priority Filter -->
        <select id="dash-task-priority-filter" class="form-control-noicon" style="font-size:12px; padding:7px 10px; width:140px;">
          <option value="" ${o.priority===``?`selected`:``}>All Priorities</option>
          <option value="high" ${o.priority===`high`?`selected`:``}>🔥 High Priority</option>
          <option value="medium" ${o.priority===`medium`?`selected`:``}>⚡ Medium Priority</option>
          <option value="low" ${o.priority===`low`?`selected`:``}>🌱 Low Priority</option>
        </select>

        <!-- Status Filter -->
        <select id="dash-task-status-filter" class="form-control-noicon" style="font-size:12px; padding:7px 10px; width:130px;">
          <option value="" ${o.status===``?`selected`:``}>All Statuses</option>
          <option value="todo" ${o.status===`todo`?`selected`:``}>To Do</option>
          <option value="in-progress" ${o.status===`in-progress`?`selected`:``}>In Progress</option>
          <option value="review" ${o.status===`review`?`selected`:``}>Review</option>
          <option value="done" ${o.status===`done`?`selected`:``}>Completed</option>
        </select>

        <!-- Project Connection Filter -->
        <select id="dash-task-project-filter" class="form-control-noicon" style="font-size:12px; padding:7px 10px; max-width:200px;">
          <option value="" ${o.project===``?`selected`:``}>All Projects</option>
          <option value="__none__" ${o.project===`__none__`?`selected`:``}>— Independent (No Project) —</option>
          ${t.map(e=>`<option value="${e.id}" ${o.project===e.id?`selected`:``}>🏗️ ${e.name}</option>`).join(``)}
        </select>

        <!-- Sorting -->
        <select id="dash-task-sort" class="form-control-noicon" style="font-size:12px; padding:7px 10px; width:150px;">
          <option value="priority-desc" ${o.sort===`priority-desc`?`selected`:``}>Priority: High → Low</option>
          <option value="deadline-asc" ${o.sort===`deadline-asc`?`selected`:``}>Deadline: Soonest</option>
          <option value="newest" ${o.sort===`newest`?`selected`:``}>Recently Created</option>
        </select>
      </div>

      <!-- Tasks List Table -->
      <div class="table-responsive" style="max-height: 480px; overflow-y: auto;">
        <table class="custom-table" style="font-size:12px; margin:0;">
          <thead>
            <tr>
              <th style="width:100px;">Priority</th>
              <th style="min-width:250px;">Task Title & Details</th>
              <th style="width:170px;">Connected Project</th>
              <th style="width:140px;">Assigned To</th>
              <th style="width:110px;">Deadline</th>
              <th style="width:140px;">Status</th>
              <th style="text-align:center; width:90px;">Actions</th>
            </tr>
          </thead>
          <tbody id="dash-tasks-tbody">
            <!-- Rendered dynamically -->
          </tbody>
        </table>
      </div>
    </div>

    <!-- Double Column Main Section: Project Milestones, Passes, Activities -->
    <div class="dashboard-sections">
      <!-- Column 1: Projects Progress & Pending Gate Passes -->
      <div style="display: flex; flex-direction: column; gap: 24px;">
        <!-- Active Projects Milestones -->
        <div class="glass-card section-card">
          <div class="section-card-header">
            <h3>Active Project Milestones</h3>
            <a href="#projects" class="primary-text" style="font-size:12px; font-weight:600; text-decoration:none;">View All Projects</a>
          </div>
          <div style="display:flex; flex-direction:column; gap: 16px;">
            ${b.length>0?b.map(e=>`
              <div>
                <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:6px;">
                  <strong>${e.name}</strong>
                  <span class="muted-text">${e.progress}% completed (${e.count} tasks)</span>
                </div>
                <div style="width:100%; height:8px; background:var(--glass-border); border-radius:4px; overflow:hidden;">
                  <div style="width:${e.progress}%; height:100%; background:linear-gradient(90deg, var(--primary-color) 0%, var(--accent-color) 100%); border-radius:4px;"></div>
                </div>
              </div>
            `).join(``):`<p class="muted-text text-center" style="padding:20px 0;">No active projects found.</p>`}
          </div>
        </div>

        <!-- Gate Passes Awaiting Authorization -->
        <div class="glass-card section-card">
          <div class="section-card-header">
            <h3>Gate Pass-PI Awaiting Authorization</h3>
            <a href="#gatepass" class="primary-text" style="font-size:12px; font-weight:600; text-decoration:none;">View Pass Ledger</a>
          </div>
          <div class="table-responsive">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Pass Number</th>
                  <th>Recipient</th>
                  <th>Vehicle</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${u.filter(e=>e.status===`Pending`).length>0?u.filter(e=>e.status===`Pending`).map(e=>`
                  <tr>
                    <td><strong>${e.gatePassNo}</strong></td>
                    <td>${e.person?.name||`—`} (${e.person?.designation||`Staff`})</td>
                    <td><code>${e.vehicle?.vehicleNo||`—`}</code></td>
                    <td><span class="badge warning">Pending Signoff</span></td>
                    <td>
                      <a href="#gatepass" class="btn btn-secondary" style="padding: 4px 10px; font-size: 11px;">Inspect</a>
                    </td>
                  </tr>
                `).join(``):`
                  <tr>
                    <td colspan="5" class="text-center muted-text" style="padding:20px 0;">All gate passes have been authorized and closed.</td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Column 2: Activity logs & Quick Operations -->
      <div style="display: flex; flex-direction: column; gap: 24px;">
        <!-- Recent Operations Feed -->
        <div class="glass-card section-card">
          <div class="section-card-header">
            <h3>Recent Operations Log</h3>
          </div>
          <div class="activity-list">
            ${te.length>0?te.map(e=>`
              <div class="activity-item">
                <div class="activity-badge ${e.type}">
                  <i data-lucide="${e.type===`project`?`kanban-square`:e.type===`hr`?`user-check`:e.type===`inventory`?`package`:`ticket`}"></i>
                </div>
                <div class="activity-details">
                  <div class="activity-text">${e.text}</div>
                  <div class="activity-time">${new Date(e.time).toLocaleString()}</div>
                </div>
              </div>
            `).join(``):`<p class="muted-text text-center" style="padding:40px 0;">No logged operations yet.</p>`}
          </div>
        </div>

        <!-- Quick Access Widget -->
        <div class="glass-card section-card">
          <div class="section-card-header">
            <h3>Quick Actions</h3>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <a href="#projects" class="btn btn-secondary" style="flex-direction:column; padding:16px; gap:8px;">
              <i data-lucide="folder-plus" style="width:24px; height:24px; color:var(--primary-color);"></i>
              <span style="font-size:12px;">Project Tasks</span>
            </a>
            <a href="#inventory" class="btn btn-secondary" style="flex-direction:column; padding:16px; gap:8px;">
              <i data-lucide="package-plus" style="width:24px; height:24px; color:var(--success);"></i>
              <span style="font-size:12px;">Inventory Store</span>
            </a>
            <a href="#gatepass" class="btn btn-secondary" style="flex-direction:column; padding:16px; gap:8px;">
              <i data-lucide="file-check-2" style="width:24px; height:24px; color:var(--warning);"></i>
              <span style="font-size:12px;">Gate Pass-PI</span>
            </a>
            <a href="#tools" class="btn btn-secondary" style="flex-direction:column; padding:16px; gap:8px;">
              <i data-lucide="clipboard-list" style="width:24px; height:24px; color:var(--accent-color);"></i>
              <span style="font-size:12px;">Order Tracking</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  `,await c(e,t,r),l(e,t),lucide.createIcons()}async function c(e,t=null,c=null){let l=document.getElementById(`dash-tasks-tbody`);if(!l)return;t||=await n.getAll(`projects`),c||=await n.getAll(`tasks`);let u=[...c];if(o.search){let e=o.search.toLowerCase();u=u.filter(t=>(t.name||``).toLowerCase().includes(e)||(t.description||``).toLowerCase().includes(e)||(t.assignees||[]).some(t=>t.toLowerCase().includes(e)))}o.priority&&(u=u.filter(e=>e.priority===o.priority)),o.status&&(u=u.filter(e=>e.status===o.status)),o.project&&(u=o.project===`__none__`?u.filter(e=>!e.projectId):u.filter(e=>e.projectId===o.project));let f={high:3,medium:2,low:1};o.sort===`priority-desc`?u.sort((e,t)=>{let n=f[e.priority]||0,r=f[t.priority]||0;return r===n?e.status===`done`&&t.status!==`done`?1:t.status===`done`&&e.status!==`done`?-1:(t.id||``).localeCompare(e.id||``):r-n}):o.sort===`deadline-asc`?u.sort((e,t)=>e.deadline?t.deadline?e.deadline.localeCompare(t.deadline):-1:1):o.sort===`newest`&&u.sort((e,t)=>(t.id||``).localeCompare(e.id||``));let p=document.getElementById(`dash-tasks-badge`);if(p&&(p.textContent=`${u.length} of ${c.length} Tasks`),u.length===0){l.innerHTML=`
      <tr>
        <td colspan="7" class="text-center muted-text" style="padding:40px 20px;">
          <i data-lucide="check-circle-2" style="width:36px; height:36px; margin-bottom:8px; opacity:0.4; display:block; margin:0 auto 8px;"></i>
          No tasks match the active filters.
          <div style="margin-top:8px;">
            <button id="dash-clear-filters-btn" class="btn btn-secondary" style="padding:4px 10px; font-size:11px;">Clear Filters</button>
          </div>
        </td>
      </tr>
    `,document.getElementById(`dash-clear-filters-btn`)?.addEventListener(`click`,()=>{o={search:``,priority:``,status:``,project:``,sort:`priority-desc`},s(e)}),lucide.createIcons();return}l.innerHTML=u.map(e=>{let n=t.find(t=>t.id===e.projectId),r=n?n.name:e.projectName||``,i=(e.subtasks||[]).filter(e=>e.completed).length,a=(e.subtasks||[]).length,o=(e.assignees||[]).join(`, `)||`Unassigned`,s=``;return s=e.priority===`high`?`<span class="task-priority-badge high" style="margin:0; font-size:9px;">🔥 HIGH</span>`:e.priority===`medium`?`<span class="task-priority-badge medium" style="margin:0; font-size:9px;">⚡ MEDIUM</span>`:`<span class="task-priority-badge low" style="margin:0; font-size:9px;">🌱 LOW</span>`,`
      <tr data-task-id="${e.id}">
        <td>${s}</td>
        <td>
          <div style="font-weight:600; color:var(--text-primary); cursor:pointer;" class="dash-task-title-link" data-id="${e.id}">
            ${e.name}
          </div>
          ${e.description?`<div style="font-size:11px; color:var(--text-secondary); max-width:320px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${e.description}</div>`:``}
          ${a>0?`
            <div style="font-size:10px; color:var(--text-muted); margin-top:2px; display:flex; align-items:center; gap:4px;">
              <i data-lucide="check-square" style="width:11px; height:11px;"></i>
              <span>${i}/${a} checklist items</span>
            </div>
          `:``}
        </td>
        <td>
          ${r?`
            <span class="badge secondary" style="font-size:10px; white-space:nowrap; max-width:160px; overflow:hidden; text-overflow:ellipsis; display:inline-block;" title="${r}">
              🏗️ ${r}
            </span>
          `:`
            <span class="badge" style="font-size:10px; background:rgba(255,255,255,0.06); color:var(--text-secondary);">
              Independent
            </span>
          `}
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:6px;">
            <div class="assignee-avatar" style="width:20px; height:20px; font-size:9px;" title="${o}">
              ${o.substring(0,2).toUpperCase()}
            </div>
            <span style="font-size:11px; max-width:110px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${o}</span>
          </div>
        </td>
        <td>
          <span style="font-size:11px; color:${e.deadline?`var(--text-primary)`:`var(--text-muted)`};">
            ${e.deadline||`—`}
          </span>
        </td>
        <td>
          <select class="form-control-noicon dash-task-status-changer" data-id="${e.id}" style="padding:3px 6px; font-size:11px; height:26px; border-radius:4px; font-weight:600; 
            ${e.status===`done`?`color:var(--success); border-color:rgba(16,185,129,0.4);`:e.status===`in-progress`?`color:var(--primary-color); border-color:rgba(59,130,246,0.4);`:e.status===`review`?`color:var(--warning); border-color:rgba(245,158,11,0.4);`:`color:var(--text-secondary);`}">
            <option value="todo" ${e.status===`todo`?`selected`:``}>To Do</option>
            <option value="in-progress" ${e.status===`in-progress`?`selected`:``}>In Progress</option>
            <option value="review" ${e.status===`review`?`selected`:``}>Review</option>
            <option value="done" ${e.status===`done`?`selected`:``}>Completed</option>
          </select>
        </td>
        <td style="text-align:center;">
          <div style="display:flex; justify-content:center; gap:4px;">
            <button class="btn btn-secondary dash-inspect-task-btn" data-id="${e.id}" title="View Details" style="padding:3px 6px; font-size:11px;">
              <i data-lucide="eye" style="width:12px; height:12px;"></i>
            </button>
            <button class="btn btn-danger dash-delete-task-btn" data-id="${e.id}" title="Delete Task" style="padding:3px 6px; font-size:11px;">
              <i data-lucide="trash-2" style="width:12px; height:12px;"></i>
            </button>
          </div>
        </td>
      </tr>
    `}).join(``),l.querySelectorAll(`.dash-task-status-changer`).forEach(t=>{t.addEventListener(`change`,async t=>{let o=t.target.getAttribute(`data-id`),c=t.target.value,l=await n.get(`tasks`,o);if(l){let t=l.status;l.status=c,l.activityLog||=[],l.activityLog.push({time:new Date().toISOString(),user:i.getCurrentUser()?.username||`Admin`,action:`Shifted status from ${t} to ${c} on Dashboard`}),await n.put(`tasks`,l),await r.queueOperation(`tasks`,`update`,l),a.showToast(`Task Updated`,`"${l.name}" marked as ${c}.`,`success`),await s(e)}})});let m=async r=>{let i=await n.get(`tasks`,r);i&&d(i,e,t)};l.querySelectorAll(`.dash-task-title-link`).forEach(e=>{e.addEventListener(`click`,()=>m(e.getAttribute(`data-id`)))}),l.querySelectorAll(`.dash-inspect-task-btn`).forEach(e=>{e.addEventListener(`click`,()=>m(e.getAttribute(`data-id`)))}),l.querySelectorAll(`.dash-delete-task-btn`).forEach(t=>{t.addEventListener(`click`,async()=>{let i=t.getAttribute(`data-id`),o=await n.get(`tasks`,i);o&&confirm(`Delete task: "${o.name}"?`)&&(await n.delete(`tasks`,i),await r.queueOperation(`tasks`,`delete`,i),a.showToast(`Task Deleted`,`Removed "${o.name}".`,`success`),await s(e))})}),lucide.createIcons()}function l(e,t){document.getElementById(`dash-task-search`)?.addEventListener(`input`,n=>{o.search=n.target.value,c(e,t)}),document.getElementById(`dash-task-priority-filter`)?.addEventListener(`change`,n=>{o.priority=n.target.value,c(e,t)}),document.getElementById(`dash-task-status-filter`)?.addEventListener(`change`,n=>{o.status=n.target.value,c(e,t)}),document.getElementById(`dash-task-project-filter`)?.addEventListener(`change`,n=>{o.project=n.target.value,c(e,t)}),document.getElementById(`dash-task-sort`)?.addEventListener(`change`,n=>{o.sort=n.target.value,c(e,t)}),document.getElementById(`dash-add-task-btn`)?.addEventListener(`click`,()=>{u(e,t)})}async function u(e,t){let o=await n.getAll(`employees`),c=new Date().toISOString().split(`T`)[0],l=`
    <form id="dash-new-task-form" style="display:flex; flex-direction:column; gap:16px; padding:10px;">
      
      <!-- Task Name -->
      <div class="input-group" style="margin-bottom:0;">
        <label style="font-weight:700;">Task Name / Title <span style="color:var(--danger); font-size:11px;">*required</span></label>
        <input type="text" id="dash-new-task-name" class="form-control-noicon" required placeholder="e.g. Cut 12mm Toughened Glass for Partition Suite A" />
      </div>

      <!-- Task Details / Description -->
      <div class="input-group" style="margin-bottom:0;">
        <label>Task Instructions & Details <span class="muted-text" style="font-size:11px;">(optional)</span></label>
        <textarea id="dash-new-task-desc" class="form-control-noicon" rows="3" placeholder="Provide operational instructions, dimensions, specific site requirements..."></textarea>
      </div>

      <!-- Connected Project Selection (or Manual Independent Task) -->
      <div class="input-group" style="margin-bottom:0;">
        <label style="font-weight:700; display:flex; justify-content:space-between; align-items:center;">
          <span>Connected Project</span>
          <span class="muted-text" style="font-size:11px; font-weight:400;">Optional project link</span>
        </label>
        <select id="dash-new-task-project" class="form-control-noicon" style="border-color:var(--primary-color);">
          <option value="">— Independent Task (No Project Connected) —</option>
          ${t.map(e=>`<option value="${e.id}">🏗️ ${e.name} (${e.status})</option>`).join(``)}
        </select>
        <span class="muted-text" style="font-size:11px; margin-top:3px; display:block;">
          Choose a project to place this on its Kanban board, or leave as Independent for general factory/workshop duties.
        </span>
      </div>

      <!-- Assignee and Priority Grid -->
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px;">
        <!-- Assignee Selection -->
        <div class="input-group" style="margin-bottom:0;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <label>Assigned To</label>
            <button type="button" id="dash-assign-toggle-btn" style="background:none; border:none; color:var(--primary-color); font-size:11px; cursor:pointer; padding:0;">
              Enter Manually
            </button>
          </div>
          <div id="dash-assign-select-wrapper">
            <select id="dash-new-task-assignee" class="form-control-noicon">
              <option value="">-- Choose Employee --</option>
              ${o.map(e=>`<option value="${e.name}">${e.name} (${e.role||`Staff`})</option>`).join(``)}
            </select>
          </div>
          <div id="dash-assign-input-wrapper" style="display:none;">
            <input type="text" id="dash-new-task-manual-assignee" class="form-control-noicon" placeholder="Type custom assignee / contractor name..." />
          </div>
        </div>

        <!-- Priority Selection -->
        <div class="input-group" style="margin-bottom:0;">
          <label>Priority *</label>
          <select id="dash-new-task-priority" class="form-control-noicon" required>
            <option value="high">🔥 High Priority (Urgent)</option>
            <option value="medium" selected>⚡ Medium Priority (Standard)</option>
            <option value="low">🌱 Low Priority (Routine)</option>
          </select>
        </div>
      </div>

      <!-- Status and Deadline Grid -->
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px;">
        <!-- Initial Status -->
        <div class="input-group" style="margin-bottom:0;">
          <label>Initial Status *</label>
          <select id="dash-new-task-status" class="form-control-noicon" required>
            <option value="todo" selected>To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Completed</option>
          </select>
        </div>

        <!-- Deadline -->
        <div class="input-group" style="margin-bottom:0;">
          <label>Deadline Date</label>
          <input type="date" id="dash-new-task-deadline" class="form-control-noicon" value="${c}" />
        </div>
      </div>

      <button type="submit" class="btn btn-primary btn-block" style="margin-top:8px; padding:10px; font-weight:600;">
        Create & Log Task
      </button>
    </form>
  `;a.openModal(`Create Operational Task`,l,`520px`);let u=!1,d=document.getElementById(`dash-assign-toggle-btn`),f=document.getElementById(`dash-assign-select-wrapper`),p=document.getElementById(`dash-assign-input-wrapper`);d?.addEventListener(`click`,()=>{u=!u,u?(f.style.display=`none`,p.style.display=`block`,d.textContent=`Select from List`):(f.style.display=`block`,p.style.display=`none`,d.textContent=`Enter Manually`)}),document.getElementById(`dash-new-task-form`)?.addEventListener(`submit`,async o=>{o.preventDefault();let c=document.getElementById(`dash-new-task-name`)?.value.trim(),l=document.getElementById(`dash-new-task-desc`)?.value.trim()||``,d=document.getElementById(`dash-new-task-project`)?.value||null,f=t.find(e=>e.id===d),p=f?f.name:``,m=``;m=u?document.getElementById(`dash-new-task-manual-assignee`)?.value.trim()||`General Operations`:document.getElementById(`dash-new-task-assignee`)?.value||`General Operations`;let h=document.getElementById(`dash-new-task-priority`)?.value||`medium`,g=document.getElementById(`dash-new-task-status`)?.value||`todo`,_=document.getElementById(`dash-new-task-deadline`)?.value||``;if(!c){a.showToast(`Validation Error`,`Task Name is mandatory!`,`warning`);return}let v={id:`task-${Date.now()}`,projectId:d||null,projectName:p||``,name:c,description:l,assignees:[m],deadline:_,priority:h,status:g,subtasks:[],activityLog:[{time:new Date().toISOString(),user:i.getCurrentUser()?.username||`Admin`,action:`Created task from Dashboard${p?` for ${p}`:` (Independent)`}`}]};await n.put(`tasks`,v),await r.queueOperation(`tasks`,`insert`,v),a.closeModal(),a.showToast(`Task Created`,`"${c}" added successfully.`,`success`),await s(e)})}function d(e,t,o){let l=o.find(t=>t.id===e.projectId),u=l?l.name:e.projectName||`Independent (No Project)`,d=`
    <div style="display:flex; flex-direction:column; gap:18px;">
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <span class="task-priority-badge ${e.priority}">${e.priority.toUpperCase()} PRIORITY</span>
          <span class="badge ${e.status===`done`?`success`:e.status===`in-progress`?`primary`:`warning`}">${e.status}</span>
        </div>
        <h2 style="font-size:18px; font-family:var(--font-heading); font-weight:700; margin:4px 0;">${e.name}</h2>
        <p class="muted-text" style="font-size:13px; margin:0;">${e.description||`No detailed instructions provided.`}</p>
      </div>

      <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; border-top:1px solid var(--glass-border); padding-top:14px;">
        <div>
          <span style="font-size:11px; color:var(--text-muted); display:block; text-transform:uppercase;">Connected Project</span>
          <strong style="font-size:12px;">${u}</strong>
        </div>
        <div>
          <span style="font-size:11px; color:var(--text-muted); display:block; text-transform:uppercase;">Deadline</span>
          <strong style="font-size:12px;">${e.deadline||`None`}</strong>
        </div>
        <div>
          <span style="font-size:11px; color:var(--text-muted); display:block; text-transform:uppercase;">Assignees</span>
          <strong style="font-size:12px;">${(e.assignees||[]).join(`, `)||`Unassigned`}</strong>
        </div>
      </div>

      <!-- Checklist Section -->
      <div style="border-top:1px solid var(--glass-border); padding-top:14px;">
        <h4 style="font-size:13px; font-weight:600; margin-bottom:8px; display:flex; justify-content:space-between;">
          <span>Subtasks Checklist</span>
          <span style="font-size:11px;" id="dash-modal-subtasks-count"></span>
        </h4>
        <div id="dash-modal-subtask-list" class="subtasks-list">
          <!-- Rendered dynamically -->
        </div>
        <div style="display:flex; gap:8px; margin-top:10px;">
          <input type="text" id="dash-add-subtask-input" class="form-control-noicon" style="padding:5px 10px; font-size:12px;" placeholder="Add new checklist item...">
          <button id="dash-add-subtask-btn" class="btn btn-secondary" style="padding:5px 12px; font-size:12px;">Add</button>
        </div>
      </div>

      <!-- Activity Log & Comments -->
      <div style="border-top:1px solid var(--glass-border); padding-top:14px;">
        <h4 style="font-size:13px; font-weight:600; margin-bottom:8px;">Activity Log & Comments</h4>
        <div id="dash-modal-activities" style="max-height:140px; overflow-y:auto; display:flex; flex-direction:column; gap:6px; background:rgba(0,0,0,0.12); padding:10px; border-radius:6px; border:1px solid var(--glass-border);">
          <!-- Rendered dynamically -->
        </div>
        <div style="display:flex; gap:8px; margin-top:10px;">
          <input type="text" id="dash-comment-input" class="form-control-noicon" style="padding:5px 10px; font-size:12px;" placeholder="Type progress comment...">
          <button id="dash-comment-btn" class="btn btn-primary" style="padding:5px 12px; font-size:12px;">Comment</button>
        </div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--glass-border); padding-top:14px;">
        <button id="dash-modal-delete-btn" class="btn btn-danger" style="padding:6px 14px; font-size:12px;">Delete Task</button>
        <button id="dash-modal-close-btn" class="btn btn-secondary" style="padding:6px 14px; font-size:12px;">Close</button>
      </div>
    </div>
  `;a.openModal(`Task Details & Progress`,d,`560px`);let f=()=>{let a=document.getElementById(`dash-modal-subtask-list`),s=document.getElementById(`dash-modal-subtasks-count`);if(!a)return;if(!e.subtasks||e.subtasks.length===0){a.innerHTML=`<p class="muted-text" style="font-size:12px; margin:4px 0;">No subtasks configured.</p>`,s&&(s.textContent=`0%`);return}let l=e.subtasks.filter(e=>e.completed).length,u=e.subtasks.length,d=Math.round(l/u*100);s&&(s.textContent=`${d}% completed (${l}/${u})`),a.innerHTML=e.subtasks.map((e,t)=>`
      <label class="subtask-item ${e.completed?`completed`:``}" style="cursor:pointer; display:flex; align-items:center; gap:8px; font-size:12px; padding:4px 0;">
        <input type="checkbox" class="dash-modal-subtask-chk" data-idx="${t}" ${e.completed?`checked`:``}>
        <span>${e.text}</span>
      </label>
    `).join(``),a.querySelectorAll(`.dash-modal-subtask-chk`).forEach(a=>{a.addEventListener(`change`,async s=>{let l=parseInt(a.getAttribute(`data-idx`));e.subtasks[l].completed=s.target.checked,e.activityLog||=[],e.activityLog.push({time:new Date().toISOString(),user:i.getCurrentUser()?.username||`User`,action:`${s.target.checked?`Checked`:`Unchecked`} checklist item: "${e.subtasks[l].text}"`}),await n.put(`tasks`,e),await r.queueOperation(`tasks`,`update`,e),f(),p(),await c(t,o)})})},p=()=>{let t=document.getElementById(`dash-modal-activities`);t&&(t.innerHTML=(e.activityLog||[]).map(e=>`
      <div style="font-size:11px; display:flex; justify-content:space-between;">
        <span><strong>${e.user}</strong>: ${e.action}</span>
        <span class="muted-text" style="font-size:10px;">${new Date(e.time).toLocaleTimeString()}</span>
      </div>
    `).reverse().join(``))};f(),p();let m=document.getElementById(`dash-add-subtask-input`),h=document.getElementById(`dash-add-subtask-btn`),g=async()=>{let a=m?.value.trim();a&&(e.subtasks||=[],e.subtasks.push({text:a,completed:!1}),e.activityLog||=[],e.activityLog.push({time:new Date().toISOString(),user:i.getCurrentUser()?.username||`Admin`,action:`Added checklist item: "${a}"`}),await n.put(`tasks`,e),await r.queueOperation(`tasks`,`update`,e),m.value=``,f(),p(),await c(t,o))};h?.addEventListener(`click`,g),m?.addEventListener(`keypress`,e=>{e.key===`Enter`&&g()});let _=document.getElementById(`dash-comment-input`),v=document.getElementById(`dash-comment-btn`),y=async()=>{let t=_?.value.trim();t&&(e.activityLog||=[],e.activityLog.push({time:new Date().toISOString(),user:i.getCurrentUser()?.username||`User`,action:`Added comment: "${t}"`}),await n.put(`tasks`,e),await r.queueOperation(`tasks`,`update`,e),_.value=``,p())};v?.addEventListener(`click`,y),_?.addEventListener(`keypress`,e=>{e.key===`Enter`&&y()}),document.getElementById(`dash-modal-close-btn`)?.addEventListener(`click`,()=>{a.closeModal()}),document.getElementById(`dash-modal-delete-btn`)?.addEventListener(`click`,async()=>{confirm(`Delete task "${e.name}"?`)&&(await n.delete(`tasks`,e.id),await r.queueOperation(`tasks`,`delete`,e.id),a.closeModal(),a.showToast(`Task Deleted`,`Removed task "${e.name}".`,`success`),await s(t))})}var f=new Proxy({},{get:(e,t)=>window.app?window.app[t]:void 0}),p={companyName:`GLASSOLOGY`,logoUrl:``,addressLine1:`Plot 42, GIA/4, Govindpura Industrial Area, Bhopal, Madhya Pradesh 462023`,addressLine2:`DC Industrial Estate, Sector 26, Gandhinagar, Gujarat - 382028`,contact:`+91 9826330806 , +91 9425821171`,email:`glassology.bpl@gmail.com`,bankName:`State Bank of India`,accountNo:`123456789012`,ifscCode:`SBIN0001234`,branch:`Gandhinagar`,qrCodeUrl:``,showBankDetails:!0,defaultGSTRate:18,terms:[`1. Price is ex-factory. Transportation and installation/labour charges are extra.`,`2. 50% advance along with order purchase, balance 50% before delivery.`,`3. Goods once sold will not be taken back or exchanged.`,`4. Glass breakage after delivery is not our responsibility.`,`5. Any disputes are subject to local jurisdiction only.`]},m={category:!0,size:!0,qty:!0,rate:!0},h=`list`,g=null,_=null,v={search:``,status:``,type:``},y=null;function ee(e){if(typeof e==`number`)return isNaN(e)?0:e;if(!e)return 0;let t=e.toString().replace(/₹|,/g,``).trim().match(/-?\d+(\.\d+)?/);return t?parseFloat(t[0]):0}async function b(){try{let e=await n.get(`app_settings`,`quotation_settings`);if(e&&e.value)return{...p,...e.value}}catch(e){console.warn(`Could not load quotation settings:`,e)}return{...p}}async function x(e){let t={key:`quotation_settings`,value:e,updatedAt:new Date().toISOString()};await n.put(`app_settings`,t),await r.queueOperation(`app_settings`,`update`,t)}async function te(){if((await n.getAll(`quotes`)).length===0){let e=[{id:`quote-2026-3907`,quotationNo:`GQ-2026-3907`,type:`INVOICE`,date:`6 Jul 2026, 12:08 pm`,partyName:`Amit Glass (GST- 23AUTTS5015C2ZR)`,mobile:`N/A`,email:`N/A`,projectId:null,status:`Confirmed`,columns:{category:!0,size:!0,qty:!0,rate:!0},items:[{description:`Mirror With Black Frame 72 x 17 = 3 pcs
Mirror With Black Frame 36 x 17 = 1 pcs
Mirror With Black Frame 36 x 26 = 1 pcs
Total 5 Mirrors`,category:`Mirror`,size:`—`,qty:`—`,rate:`₹11,567.80 / pcs`,amount:11567.8}],subtotal:11567.8,applyGST:!0,gstRate:18,gstAmount:2082.2,total:13650,terms:[...p.terms],createdAt:`2026-07-06T12:08:00Z`},{id:`quote-2026-0024`,quotationNo:`GQ-2026-24`,type:`QUOTATION`,date:`20 Jul 2026, 05:53 pm`,partyName:`Mr. Shashank ji 8MM Toughened Quotation`,mobile:`N/A`,email:`N/A`,projectId:null,status:`Not Confirmed`,columns:{category:!0,size:!0,qty:!0,rate:!0},items:[{description:`Fixed Window With Z 40 MM series make alucoat
With 8 micron powder coating
with 8 MM Clear Toughened Glass make saint gobain ,
Transport Extra`,category:`Window`,size:`378.80 sq.ft`,qty:`1 pcs`,rate:`₹400.00 / sq.ft`,amount:151520}],subtotal:151520,applyGST:!1,gstRate:0,gstAmount:0,total:151520,terms:[...p.terms],createdAt:`2026-07-20T17:53:00Z`}];for(let t of e)await n.put(`quotes`,t),await r.queueOperation(`quotes`,`insert`,t)}}async function S(e,t=[]){await te(),t[1]===`preview`&&t[2]?(h=`preview`,g=t[2]):t[1]===`create`?(h=`create`,_=null):t[1]===`edit`&&t[2]?(h=`create`,_=t[2]):t[1]===`settings`?h=`settings`:t[1]===`list`&&(h=`list`);let r=await n.getAll(`quotes`);e.innerHTML=`
    <div style="display:flex; flex-direction:column; gap:16px;">
      <!-- Module Navigation Header -->
      <div class="glass-card" style="padding: 10px 18px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <button id="quotation-tab-list" class="btn ${h===`list`?`btn-primary`:`btn-secondary`}" style="padding: 7px 16px; font-size:12px; display:flex; align-items:center; gap:6px; ${h===`list`?`background:var(--primary-color);`:`background:transparent;`}">
            <i data-lucide="file-spreadsheet" style="width:14px; height:14px;"></i>
            <span>Quotations Ledger (${r.length})</span>
          </button>
          <button id="quotation-tab-create" class="btn ${h===`create`?`btn-primary`:`btn-secondary`}" style="padding: 7px 16px; font-size:12px; display:flex; align-items:center; gap:6px; ${h===`create`?`background:var(--primary-color);`:`background:transparent;`}">
            <i data-lucide="plus-circle" style="width:14px; height:14px;"></i>
            <span>${_?`Edit Quotation`:`Create Quotation`}</span>
          </button>
          ${g?`
            <button id="quotation-tab-preview" class="btn ${h===`preview`?`btn-primary`:`btn-secondary`}" style="padding: 7px 16px; font-size:12px; display:flex; align-items:center; gap:6px; ${h===`preview`?`background:var(--primary-color);`:`background:transparent;`}">
              <i data-lucide="eye" style="width:14px; height:14px;"></i>
              <span>Print / View Sheet</span>
            </button>
          `:``}
          <button id="quotation-tab-settings" class="btn ${h===`settings`?`btn-primary`:`btn-secondary`}" style="padding: 7px 16px; font-size:12px; display:flex; align-items:center; gap:6px; ${h===`settings`?`background:var(--primary-color);`:`background:transparent;`}">
            <i data-lucide="sliders" style="width:14px; height:14px;"></i>
            <span>Company & Bank Settings</span>
          </button>
        </div>

        <div>
          ${h===`create`?``:`
            <button id="quotation-quick-new-btn" class="btn btn-primary" style="padding: 8px 16px; font-size:12px; display:flex; align-items:center; gap:6px; font-weight:600;">
              <i data-lucide="plus"></i>
              <span>New Quotation</span>
            </button>
          `}
        </div>
      </div>

      <!-- Active Content Workspace -->
      <div id="quotation-workspace" style="min-height: calc(100vh - 220px);">
        <!-- Injected dynamically -->
      </div>
    </div>
  `,document.getElementById(`quotation-tab-list`)?.addEventListener(`click`,()=>{h=`list`,S(e)}),document.getElementById(`quotation-tab-create`)?.addEventListener(`click`,()=>{h=`create`,_=null,y=null,S(e)}),document.getElementById(`quotation-tab-preview`)?.addEventListener(`click`,()=>{g&&(h=`preview`,S(e))}),document.getElementById(`quotation-tab-settings`)?.addEventListener(`click`,()=>{h=`settings`,S(e)}),document.getElementById(`quotation-quick-new-btn`)?.addEventListener(`click`,()=>{h=`create`,_=null,y=null,S(e)});let i=document.getElementById(`quotation-workspace`);h===`list`?await ne(i,e):h===`create`?await re(i,e):h===`preview`?await ae(i,e):h===`settings`&&await oe(i,e),lucide.createIcons()}async function ne(e,t){let i=await n.getAll(`quotes`),a=[...i];if(v.search){let e=v.search.toLowerCase();a=a.filter(t=>(t.quotationNo||``).toLowerCase().includes(e)||(t.partyName||``).toLowerCase().includes(e)||(t.items||[]).some(t=>(t.description||``).toLowerCase().includes(e)))}v.status&&(a=a.filter(e=>e.status===v.status)),v.type&&(a=a.filter(e=>e.type===v.type)),a.sort((e,t)=>(t.id||``).localeCompare(e.id||``)),e.innerHTML=`
    <div class="glass-card" style="display:flex; flex-direction:column; gap:16px; padding:20px;">
      <!-- Filter Bar -->
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; gap:10px; align-items:center; flex:1; min-width:240px;">
          <div class="search-input-wrapper" style="flex:1;">
            <i data-lucide="search"></i>
            <input type="text" id="quote-search-input" placeholder="Search by Party Name, Quote No, or Item..." class="form-control" style="font-size:12px; padding-top:7px; padding-bottom:7px;" value="${v.search}">
          </div>

          <!-- Status Filter -->
          <select id="quote-status-filter" class="form-control-noicon" style="font-size:12px; padding:7px 10px; width:160px;">
            <option value="">All Statuses</option>
            <option value="Confirmed" ${v.status===`Confirmed`?`selected`:``}>✅ Confirmed</option>
            <option value="Not Confirmed" ${v.status===`Not Confirmed`?`selected`:``}>⏳ Not Confirmed</option>
          </select>

          <!-- Type Filter -->
          <select id="quote-type-filter" class="form-control-noicon" style="font-size:12px; padding:7px 10px; width:140px;">
            <option value="">All Types</option>
            <option value="QUOTATION" ${v.type===`QUOTATION`?`selected`:``}>QUOTATION</option>
            <option value="INVOICE" ${v.type===`INVOICE`?`selected`:``}>INVOICE</option>
          </select>
        </div>

        <div style="font-size:12px; color:var(--text-secondary);">
          Showing <strong>${a.length}</strong> of ${i.length} Records
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
            ${a.length===0?`
              <tr>
                <td colspan="8" class="text-center muted-text" style="padding:60px 20px;">
                  <i data-lucide="file-x" style="width:40px; height:40px; margin-bottom:8px; opacity:0.4; display:block; margin:0 auto 8px;"></i>
                  No quotations found. Click <strong>"+ Create New Quotation"</strong> to initialize a new sheet.
                </td>
              </tr>
            `:a.map(e=>{let t=e.status===`Confirmed`,n=(e.items||[]).map(e=>`${(e.description||``).split(`
`)[0]}${e.qty&&e.qty!==`—`?` (${e.qty})`:``}`).join(`, `);return`
                <tr>
                  <td>
                    <strong style="color:var(--primary-color); cursor:pointer;" class="quote-view-link" data-id="${e.id}">
                      ${e.quotationNo}
                    </strong>
                  </td>
                  <td>
                    <span class="badge ${e.type===`INVOICE`?`primary`:`secondary`}" style="font-size:10px;">
                      ${e.type}
                    </span>
                  </td>
                  <td><span style="font-size:11px; color:var(--text-secondary);">${e.date}</span></td>
                  <td>
                    <div style="font-weight:600; color:var(--text-primary);">${e.partyName}</div>
                    ${e.mobile&&e.mobile!==`N/A`?`<span style="font-size:10px; color:var(--text-muted);">📱 ${e.mobile}</span>`:``}
                  </td>
                  <td style="max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${n}">
                    ${n||`<span class="muted-text">—</span>`}
                  </td>
                  <td style="font-weight:700; color:var(--text-primary);">
                    ₹${Number(e.total||0).toLocaleString(`en-IN`,{minimumFractionDigits:2})}
                  </td>
                  <td style="text-align:center;">
                    <div style="display:inline-flex; align-items:center; gap:6px;">
                      <span class="badge ${t?`success`:`warning`}" style="font-size:10px; cursor:pointer;" title="Click to toggle status" data-action="toggle-status" data-id="${e.id}">
                        ${t?`✅ Confirmed`:`⏳ Not Confirmed`}
                      </span>
                    </div>
                  </td>
                  <td style="text-align:center;">
                    <div style="display:flex; justify-content:center; gap:6px;">
                      <button class="btn btn-secondary quote-preview-btn" data-id="${e.id}" title="View & Print Quotation" style="padding:4px 8px; font-size:11px;">
                        <i data-lucide="eye" style="width:13px; height:13px;"></i>
                      </button>
                      <button class="btn btn-secondary quote-edit-btn" data-id="${e.id}" title="Edit Quotation" style="padding:4px 8px; font-size:11px;">
                        <i data-lucide="edit" style="width:13px; height:13px;"></i>
                      </button>
                      <button class="btn btn-danger quote-delete-btn" data-id="${e.id}" title="Delete" style="padding:4px 8px; font-size:11px;">
                        <i data-lucide="trash-2" style="width:13px; height:13px;"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              `}).join(``)}
          </tbody>
        </table>
      </div>
    </div>
  `,document.getElementById(`quote-search-input`)?.addEventListener(`input`,n=>{v.search=n.target.value,ne(e,t)}),document.getElementById(`quote-status-filter`)?.addEventListener(`change`,n=>{v.status=n.target.value,ne(e,t)}),document.getElementById(`quote-type-filter`)?.addEventListener(`change`,n=>{v.type=n.target.value,ne(e,t)}),e.querySelectorAll(`[data-action="toggle-status"]`).forEach(i=>{i.addEventListener(`click`,async()=>{let a=i.getAttribute(`data-id`),o=await n.get(`quotes`,a);o&&(o.status=o.status===`Confirmed`?`Not Confirmed`:`Confirmed`,await n.put(`quotes`,o),await r.queueOperation(`quotes`,`update`,o),f.showToast(`Status Updated`,`${o.quotationNo} is now ${o.status}.`,`success`),ne(e,t))})});let o=e=>{g=e,h=`preview`,S(t)};e.querySelectorAll(`.quote-view-link`).forEach(e=>{e.addEventListener(`click`,()=>o(e.getAttribute(`data-id`)))}),e.querySelectorAll(`.quote-preview-btn`).forEach(e=>{e.addEventListener(`click`,()=>o(e.getAttribute(`data-id`)))}),e.querySelectorAll(`.quote-edit-btn`).forEach(e=>{e.addEventListener(`click`,()=>{_=e.getAttribute(`data-id`),h=`create`,y=null,S(t)})}),e.querySelectorAll(`.quote-delete-btn`).forEach(e=>{e.addEventListener(`click`,async()=>{let i=e.getAttribute(`data-id`),a=await n.get(`quotes`,i);a&&confirm(`Are you sure you want to permanently delete ${a.quotationNo}?`)&&(await n.delete(`quotes`,i),await r.queueOperation(`quotes`,`delete`,i),f.showToast(`Quotation Deleted`,`Removed ${a.quotationNo}.`,`success`),S(t))})}),lucide.createIcons()}async function re(e,t){let i=await b(),a=await n.getAll(`projects`),o=await n.getAll(`quotes`),s=null;if(_&&(s=await n.get(`quotes`,_)),!y)if(s)y=JSON.parse(JSON.stringify(s)),y.applyGST===void 0&&(y.applyGST=y.gstRate>0||y.gstAmount>0);else{let e=o.length+1,t=`GQ-${new Date().getFullYear()}-${e.toString().padStart(4,`0`)}`,n=new Date,r=n.toLocaleDateString(`en-GB`,{day:`numeric`,month:`short`,year:`numeric`})+`, `+n.toLocaleTimeString(`en-US`,{hour:`2-digit`,minute:`2-digit`,hour12:!0}).toLowerCase();y={id:`quote-${Date.now()}`,quotationNo:t,type:`QUOTATION`,date:r,partyName:``,mobile:`N/A`,email:`N/A`,projectId:null,status:`Not Confirmed`,columns:{...m},items:[{description:``,category:`Window`,size:``,qty:`1 pcs`,rate:``,amount:0}],subtotal:0,applyGST:!1,gstRate:18,gstAmount:0,total:0,terms:[...i.terms]}}let c=y;e.innerHTML=`
    <div class="glass-card" style="display:flex; flex-direction:column; gap:20px; padding:24px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; border-bottom:1px solid var(--glass-border); padding-bottom:14px;">
        <div>
          <h3 style="font-size:18px; font-family:var(--font-heading); font-weight:700; margin:0;">
            ${_?`Edit Document: ${c.quotationNo}`:`New Quotation & Invoice Creator`}
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
            <option value="QUOTATION" ${c.type===`QUOTATION`?`selected`:``}>QUOTATION</option>
            <option value="INVOICE" ${c.type===`INVOICE`?`selected`:``}>INVOICE</option>
          </select>
        </div>

        <div class="input-group" style="margin-bottom:0;">
          <label style="font-weight:700;">Quotation / Invoice No. *</label>
          <input type="text" id="quote-input-no" class="form-control-noicon" value="${c.quotationNo}" required />
        </div>

        <div class="input-group" style="margin-bottom:0;">
          <label style="font-weight:700;">Date & Time *</label>
          <input type="text" id="quote-input-date" class="form-control-noicon" value="${c.date}" required />
        </div>

        <div class="input-group" style="margin-bottom:0;">
          <label style="font-weight:700;">Status</label>
          <select id="quote-input-status" class="form-control-noicon">
            <option value="Not Confirmed" ${c.status===`Not Confirmed`?`selected`:``}>⏳ Not Confirmed (Draft)</option>
            <option value="Confirmed" ${c.status===`Confirmed`?`selected`:``}>✅ Confirmed (Finalized)</option>
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
            <input type="text" id="quote-input-party" class="form-control-noicon" placeholder="e.g. Amit Glass (GST- 23AUTTS5015C2ZR)" value="${c.partyName}" required />
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Mobile No</label>
            <input type="text" id="quote-input-mobile" class="form-control-noicon" placeholder="N/A or Phone" value="${c.mobile}" />
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Email Id</label>
            <input type="text" id="quote-input-email" class="form-control-noicon" placeholder="N/A or Email" value="${c.email}" />
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Connected Project (Optional)</label>
            <select id="quote-input-project" class="form-control-noicon">
              <option value="">— No Project Connect —</option>
              ${a.map(e=>`<option value="${e.id}" ${e.id===c.projectId?`selected`:``}>🏗️ ${e.name}</option>`).join(``)}
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
          ${c.columns.category?``:`
            <button type="button" class="btn btn-secondary col-restore-btn" data-col="category" style="padding:3px 8px; font-size:11px;">
              <i data-lucide="plus" style="width:12px; height:12px;"></i> Add Category
            </button>
          `}
          ${c.columns.size?``:`
            <button type="button" class="btn btn-secondary col-restore-btn" data-col="size" style="padding:3px 8px; font-size:11px;">
              <i data-lucide="plus" style="width:12px; height:12px;"></i> Add Size (Sq.Ft.)
            </button>
          `}
          ${c.columns.qty?``:`
            <button type="button" class="btn btn-secondary col-restore-btn" data-col="qty" style="padding:3px 8px; font-size:11px;">
              <i data-lucide="plus" style="width:12px; height:12px;"></i> Add Qty (Units)
            </button>
          `}
          ${c.columns.rate?``:`
            <button type="button" class="btn btn-secondary col-restore-btn" data-col="rate" style="padding:3px 8px; font-size:11px;">
              <i data-lucide="plus" style="width:12px; height:12px;"></i> Add Rate / Size
            </button>
          `}
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
                
                ${c.columns.category?`
                  <th style="width:125px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <span>Category</span>
                      <button type="button" class="col-remove-header-btn" data-col="category" title="Remove Category column from this quotation" style="background:transparent; border:none; color:#f87171; cursor:pointer; padding:0 4px; font-size:13px; font-weight:bold; line-height:1;">
                        ✕
                      </button>
                    </div>
                  </th>
                `:``}

                ${c.columns.size?`
                  <th style="width:120px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <span>Size (Sq.Ft.)</span>
                      <button type="button" class="col-remove-header-btn" data-col="size" title="Remove Size column from this quotation" style="background:transparent; border:none; color:#f87171; cursor:pointer; padding:0 4px; font-size:13px; font-weight:bold; line-height:1;">
                        ✕
                      </button>
                    </div>
                  </th>
                `:``}

                ${c.columns.qty?`
                  <th style="width:105px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <span>Qty (Units)</span>
                      <button type="button" class="col-remove-header-btn" data-col="qty" title="Remove Qty column from this quotation" style="background:transparent; border:none; color:#f87171; cursor:pointer; padding:0 4px; font-size:13px; font-weight:bold; line-height:1;">
                        ✕
                      </button>
                    </div>
                  </th>
                `:``}

                ${c.columns.rate?`
                  <th style="width:145px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <span>Rate / Size</span>
                      <button type="button" class="col-remove-header-btn" data-col="rate" title="Remove Rate column from this quotation" style="background:transparent; border:none; color:#f87171; cursor:pointer; padding:0 4px; font-size:13px; font-weight:bold; line-height:1;">
                        ✕
                      </button>
                    </div>
                  </th>
                `:``}

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
          <textarea id="quote-input-terms" class="form-control-noicon" rows="6" style="font-size:11.5px; line-height:1.5;">${c.terms.join(`
`)}</textarea>
          <span class="muted-text" style="font-size:11px; margin-top:4px;">One term clause per line. Pre-populated from company defaults.</span>
        </div>

        <!-- Totals Calculation Box with GST Selector Box -->
        <div class="glass-card" style="padding:16px; background:rgba(0,0,0,0.18); display:flex; flex-direction:column; gap:12px;">
          <!-- Items Subtotal -->
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:13px;">
            <span class="muted-text">Items Subtotal:</span>
            <strong id="creator-subtotal-display">₹${Number(c.subtotal).toLocaleString(`en-IN`,{minimumFractionDigits:2})}</strong>
          </div>

          <!-- GST Selector Box: Excluded by Default -->
          <div style="background:rgba(255,255,255,0.03); padding:10px 12px; border-radius:6px; border:1px solid var(--glass-border);">
            <label style="cursor:pointer; display:flex; align-items:center; justify-content:space-between; font-size:12.5px; font-weight:600; margin-bottom:0;">
              <div style="display:flex; align-items:center; gap:8px;">
                <input type="checkbox" id="quote-apply-gst-chk" ${c.applyGST?`checked`:``} style="width:16px; height:16px; cursor:pointer;" />
                <span>Include GST Tax</span>
              </div>
              <span class="badge ${c.applyGST?`primary`:`secondary`}" style="font-size:10px;" id="gst-status-badge">
                ${c.applyGST?`GST Enabled`:`Excluded (0%)`}
              </span>
            </label>

            <!-- GST Rate Controls (shown when checked) -->
            <div id="quote-gst-rate-row" style="display:${c.applyGST?`flex`:`none`}; justify-content:space-between; align-items:center; margin-top:10px; padding-top:8px; border-top:1px dashed var(--glass-border);">
              <div style="display:flex; align-items:center; gap:8px; font-size:12px;">
                <span class="muted-text">GST Rate:</span>
                <select id="quote-input-gst-rate" class="form-control-noicon" style="padding:3px 8px; font-size:11.5px; width:75px;">
                  <option value="5" ${c.gstRate===5?`selected`:``}>5%</option>
                  <option value="12" ${c.gstRate===12?`selected`:``}>12%</option>
                  <option value="18" ${c.gstRate===18||!c.gstRate?`selected`:``}>18%</option>
                  <option value="28" ${c.gstRate===28?`selected`:``}>28%</option>
                </select>
              </div>
              <strong id="creator-gst-display" style="font-size:13px;">₹${Number(c.gstAmount).toLocaleString(`en-IN`,{minimumFractionDigits:2})}</strong>
            </div>
          </div>

          <div style="height:1px; background:var(--glass-border); margin:2px 0;"></div>

          <!-- Grand Total -->
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:16px;">
            <span style="font-weight:700; color:var(--text-primary);">Grand Total:</span>
            <strong style="color:var(--primary-color); font-size:18px;" id="creator-total-display">
              ₹${Number(c.total).toLocaleString(`en-IN`,{minimumFractionDigits:2})}
            </strong>
          </div>
        </div>
      </div>
    </div>
  `,ie(),e.querySelectorAll(`.col-remove-header-btn`).forEach(n=>{n.addEventListener(`click`,r=>{r.stopPropagation();let i=n.getAttribute(`data-col`);i&&y.columns[i]!==void 0&&(C(),y.columns[i]=!1,f.showToast(`Column Removed`,`Removed "${i}" column from this quotation.`,`info`),re(e,t))})}),e.querySelectorAll(`.col-restore-btn`).forEach(n=>{n.addEventListener(`click`,()=>{let r=n.getAttribute(`data-col`);r&&y.columns[r]!==void 0&&(C(),y.columns[r]=!0,f.showToast(`Column Added`,`Restored "${r}" column to quotation.`,`success`),re(e,t))})}),document.getElementById(`creator-add-line-btn`)?.addEventListener(`click`,()=>{C(),y.items.push({description:``,category:`Window`,size:``,qty:`1 pcs`,rate:``,amount:0}),ie(),w(),lucide.createIcons()}),document.getElementById(`quote-apply-gst-chk`)?.addEventListener(`change`,e=>{let t=e.target.checked;y.applyGST=t;let n=document.getElementById(`quote-gst-rate-row`),r=document.getElementById(`gst-status-badge`);if(n&&(n.style.display=t?`flex`:`none`),r&&(r.className=t?`badge primary`:`badge secondary`,r.textContent=t?`GST Enabled`:`Excluded (0%)`),t){let e=parseFloat(document.getElementById(`quote-input-gst-rate`)?.value||`18`)||18;y.gstRate=e}else y.gstRate=0;w()}),document.getElementById(`quote-input-gst-rate`)?.addEventListener(`change`,e=>{y.gstRate=parseFloat(e.target.value||`18`)||18,w()}),document.getElementById(`creator-cancel-btn`)?.addEventListener(`click`,()=>{h=`list`,y=null,_=null,S(t)});let l=async(e=!1)=>{C();let i=y;if(!i.partyName||!i.quotationNo){f.showToast(`Required Information`,`Party Name and Quotation No are mandatory.`,`warning`);return}if(i.items.length===0){f.showToast(`No Line Items`,`Please add at least one line item to the quotation.`,`warning`);return}await n.put(`quotes`,i),await r.queueOperation(`quotes`,_?`update`:`insert`,i),f.showToast(`Quotation Saved`,`${i.quotationNo} successfully recorded.`,`success`),e?(g=i.id,h=`preview`):h=`list`,y=null,_=null,S(t)};document.getElementById(`creator-save-btn`)?.addEventListener(`click`,()=>l(!1)),document.getElementById(`creator-save-preview-btn`)?.addEventListener(`click`,()=>l(!0)),lucide.createIcons()}function ie(){let e=document.getElementById(`creator-items-tbody`);if(!e||!y)return;let t=y;e.innerHTML=t.items.map((e,n)=>`
    <tr data-row-idx="${n}">
      <td style="text-align:center; font-weight:700; color:var(--text-muted); vertical-align:middle;">${n+1}</td>
      <td>
        <textarea class="form-control-noicon item-desc" rows="2" style="font-size:11.5px; padding:6px 8px; width:100%;" placeholder="Glass specifications, thickness, series, transport...">${e.description||``}</textarea>
      </td>
      ${t.columns.category?`
        <td>
          <input type="text" class="form-control-noicon item-category" value="${e.category||``}" placeholder="Window, Mirror..." style="font-size:11.5px; padding:6px 8px;" />
        </td>
      `:``}
      ${t.columns.size?`
        <td>
          <input type="text" class="form-control-noicon item-size" value="${e.size||``}" placeholder="378.80 sq.ft" style="font-size:11.5px; padding:6px 8px;" />
        </td>
      `:``}
      ${t.columns.qty?`
        <td>
          <input type="text" class="form-control-noicon item-qty" value="${e.qty||``}" placeholder="1 pcs" style="font-size:11.5px; padding:6px 8px;" />
        </td>
      `:``}
      ${t.columns.rate?`
        <td>
          <input type="text" class="form-control-noicon item-rate" value="${e.rate||``}" placeholder="400.00" style="font-size:11.5px; padding:6px 8px;" />
        </td>
      `:``}
      <td>
        <input type="number" step="0.01" class="form-control-noicon item-amount" value="${e.amount===void 0?0:e.amount}" style="font-size:12px; font-weight:700; text-align:right; padding:6px 8px; color:var(--primary-color);" required />
      </td>
      <td style="text-align:center; vertical-align:middle;">
        <button type="button" class="btn btn-secondary creator-remove-row-btn" data-idx="${n}" title="Delete Row" style="padding:4px 6px; font-size:11px; color:var(--danger); border:none; background:transparent;">
          <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
        </button>
      </td>
    </tr>
  `).join(``),e.querySelectorAll(`.creator-remove-row-btn`).forEach(e=>{e.addEventListener(`click`,()=>{let t=parseInt(e.getAttribute(`data-idx`));C(),y.items.splice(t,1),ie(),w(),lucide.createIcons()})}),e.querySelectorAll(`tr`).forEach((e,n)=>{let r=e.querySelector(`.item-size`),i=e.querySelector(`.item-qty`),a=e.querySelector(`.item-rate`),o=e.querySelector(`.item-amount`),s=()=>{let e=r?ee(r.value):0,s=i?ee(i.value):0,c=a?ee(a.value):0;if(c>0){let r=1;e>0&&s>0?r=e*s:e>0?r=e:s>0&&(r=s);let i=Math.round(r*c*100)/100;o&&(o.value=i,t.items[n]&&(t.items[n].amount=i))}w()};r?.addEventListener(`input`,s),i?.addEventListener(`input`,s),a?.addEventListener(`input`,s),o?.addEventListener(`input`,()=>{t.items[n]&&(t.items[n].amount=parseFloat(o.value||`0`)||0),w()})}),lucide.createIcons()}function C(){if(!y)return;let e=y;e.type=document.getElementById(`quote-input-type`)?.value||`QUOTATION`,e.quotationNo=document.getElementById(`quote-input-no`)?.value?.trim()||e.quotationNo,e.date=document.getElementById(`quote-input-date`)?.value?.trim()||e.date,e.status=document.getElementById(`quote-input-status`)?.value||`Not Confirmed`,e.partyName=document.getElementById(`quote-input-party`)?.value?.trim()||``,e.mobile=document.getElementById(`quote-input-mobile`)?.value?.trim()||`N/A`,e.email=document.getElementById(`quote-input-email`)?.value?.trim()||`N/A`,e.projectId=document.getElementById(`quote-input-project`)?.value||null,e.terms=(document.getElementById(`quote-input-terms`)?.value||``).split(`
`).map(e=>e.trim()).filter(e=>e.length>0),document.querySelectorAll(`#creator-items-tbody tr`).forEach((t,n)=>{e.items[n]&&(e.items[n].description=t.querySelector(`.item-desc`)?.value?.trim()||``,e.columns.category&&(e.items[n].category=t.querySelector(`.item-category`)?.value?.trim()||``),e.columns.size&&(e.items[n].size=t.querySelector(`.item-size`)?.value?.trim()||``),e.columns.qty&&(e.items[n].qty=t.querySelector(`.item-qty`)?.value?.trim()||``),e.columns.rate&&(e.items[n].rate=t.querySelector(`.item-rate`)?.value?.trim()||``),e.items[n].amount=parseFloat(t.querySelector(`.item-amount`)?.value||`0`)||0)}),e.applyGST=document.getElementById(`quote-apply-gst-chk`)?.checked||!1,e.applyGST?e.gstRate=parseFloat(document.getElementById(`quote-input-gst-rate`)?.value||`18`)||18:e.gstRate=0}function w(){if(!y)return;let e=y,t=0;document.querySelectorAll(`#creator-items-tbody .item-amount`).forEach(e=>{t+=parseFloat(e.value||`0`)||0}),t=Math.round(t*100)/100;let n=document.getElementById(`quote-apply-gst-chk`)?.checked??e.applyGST,r=n?parseFloat(document.getElementById(`quote-input-gst-rate`)?.value||`18`)||18:0,i=n?Math.round(r/100*t*100)/100:0,a=Math.round((t+i)*100)/100;e.subtotal=t,e.applyGST=n,e.gstRate=r,e.gstAmount=i,e.total=a;let o=document.getElementById(`creator-subtotal-display`),s=document.getElementById(`creator-gst-display`),c=document.getElementById(`creator-total-display`);o&&(o.textContent=`₹${t.toLocaleString(`en-IN`,{minimumFractionDigits:2})}`),s&&(s.textContent=`₹${i.toLocaleString(`en-IN`,{minimumFractionDigits:2})}`),c&&(c.textContent=`₹${a.toLocaleString(`en-IN`,{minimumFractionDigits:2})}`)}async function ae(e,t){let i=await n.get(`quotes`,g);if(!i){e.innerHTML=`<div class="glass-card text-center muted-text" style="padding:60px;">Quotation not found.</div>`;return}let a=await b(),o=i.columns||m;e.innerHTML=`
    <div>
      <!-- Top Action Toolbar -->
      <div class="quotation-toolbar">
        <div style="display:flex; align-items:center; gap:10px;">
          <button id="preview-back-btn" class="btn btn-secondary" style="padding:6px 14px; font-size:12px; display:flex; align-items:center; gap:6px;">
            <i data-lucide="arrow-left"></i> Back to Ledger
          </button>
          <span style="font-size:13px; font-weight:700; color:var(--text-primary);">
            ${i.quotationNo} (${i.type})
          </span>
          <span class="badge ${i.status===`Confirmed`?`success`:`warning`}" style="font-size:10px;">
            ${i.status}
          </span>
        </div>

        <div style="display:flex; gap:8px; align-items:center;">
          <button id="preview-toggle-status-btn" class="btn btn-secondary" style="padding:6px 12px; font-size:11px;">
            ${i.status===`Confirmed`?`Mark as Not Confirmed`:`Mark as Confirmed`}
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
                  ${a.logoUrl?`
                    <img src="${a.logoUrl}" alt="Logo" style="max-height:54px; max-width:80px; object-fit:contain;" />
                  `:`
                    <div style="width:48px; height:48px; background:#0052cc; border-radius:6px; display:flex; align-items:center; justify-content:center; color:#ffffff; font-weight:900; font-size:26px; font-family:sans-serif; letter-spacing:-1px;">
                      g
                    </div>
                  `}
                </div>

                <!-- Company Details -->
                <div>
                  <h1 style="margin:0 0 4px 0; font-size:21px; font-weight:800; color:#111827; letter-spacing:0.5px; font-family:sans-serif;">
                    ${a.companyName}
                  </h1>
                  <div style="font-size:11px; color:#4b5563; line-height:1.45;">
                    ${a.addressLine1?`<div>${a.addressLine1}</div>`:``}
                    ${a.addressLine2?`<div>${a.addressLine2}</div>`:``}
                    <div style="margin-top:2px;">
                      <strong>Contact:</strong> ${a.contact} • <strong>Email:</strong> ${a.email}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Right: Document Title & Identifiers -->
              <div style="text-align:right;">
                <h2 style="margin:0 0 4px 0; font-size:22px; font-weight:800; color:#16396b; letter-spacing:0.5px; font-family:sans-serif;">
                  ${i.type}
                </h2>
                <div style="font-size:13px; font-weight:700; color:#1f2937; margin-bottom:4px;">
                  ${i.quotationNo}
                </div>
                <div style="font-size:11px; color:#6b7280; line-height:1.4;">
                  Date: ${i.date}
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
                  ${i.partyName}
                </div>
                <div style="font-size:11.5px; color:#4b5563; line-height:1.5;">
                  <div>Mobile No: ${i.mobile||`N/A`}</div>
                  <div>Email Id: ${i.email||`N/A`}</div>
                </div>
              </div>

              <!-- Right: Bank Details & QR Code -->
              <div style="border-left:3px solid #16396b; padding-left:12px;">
                <div style="font-size:11px; font-weight:700; color:#16396b; text-transform:uppercase; letter-spacing:0.4px; margin-bottom:6px;">
                  BANK DETAILS:
                </div>
                ${a.showBankDetails?`
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
                    <div style="font-size:11.5px; color:#4b5563; line-height:1.5; flex:1;">
                      <div>Bank Name: <strong>${a.bankName}</strong></div>
                      <div>Account No: <strong>${a.accountNo}</strong></div>
                      <div>IFSC Code: <strong>${a.ifscCode}</strong></div>
                      <div>Branch: <strong>${a.branch}</strong></div>
                    </div>
                    ${a.qrCodeUrl?`
                      <div style="display:flex; flex-direction:column; align-items:center; flex-shrink:0; text-align:center;">
                        <img src="${a.qrCodeUrl}" alt="Payment QR Code" style="width:72px; height:72px; object-fit:contain; border:1px solid #d1d5db; border-radius:4px; padding:3px; background:#ffffff;" />
                        <span style="font-size:8.5px; font-weight:700; color:#16396b; margin-top:2px; letter-spacing:0.3px;">SCAN TO PAY</span>
                      </div>
                    `:``}
                  </div>
                `:`
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
                  ${o.category?`<th style="width:14%;">Category</th>`:``}
                  ${o.size?`<th class="text-center" style="width:14%;">Size<br><span style="font-size:9.5px; opacity:0.85;">(Sq.Ft.)</span></th>`:``}
                  ${o.qty?`<th class="text-center" style="width:12%;">Qty<br><span style="font-size:9.5px; opacity:0.85;">(Units)</span></th>`:``}
                  ${o.rate?`<th class="text-right" style="width:18%;">Rate / Size<br><span style="font-size:9.5px; opacity:0.85;">(Sq.Ft.)</span></th>`:``}
                  <th class="text-right" style="width:18%;">Final Amount</th>
                </tr>
              </thead>
              <tbody>
                ${(i.items||[]).map(e=>`
                  <tr>
                    <td style="white-space:pre-line; font-weight:600; color:#111827;">${e.description}</td>
                    ${o.category?`<td style="color:#4b5563;">${e.category||`—`}</td>`:``}
                    ${o.size?`<td class="text-center" style="color:#4b5563;">${e.size||`—`}</td>`:``}
                    ${o.qty?`<td class="text-center" style="color:#4b5563;">${e.qty||`—`}</td>`:``}
                    ${o.rate?`<td class="text-right" style="color:#4b5563; font-family:monospace;">${e.rate||`—`}</td>`:``}
                    <td class="text-right" style="font-weight:700; color:#111827; font-family:monospace;">
                      ₹${Number(e.amount||0).toLocaleString(`en-IN`,{minimumFractionDigits:2})}
                    </td>
                  </tr>
                `).join(``)}
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
                ${(i.terms||p.terms).map(e=>`<div>${e}</div>`).join(``)}
              </div>

              <!-- Right: Totals Light Blue Box -->
              <div class="quotation-summary-box">
                <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:12px; color:#1f2937;">
                  <span>Items Subtotal:</span>
                  <span style="font-weight:700; font-family:monospace;">
                    ₹${Number(i.subtotal||0).toLocaleString(`en-IN`,{minimumFractionDigits:2})}
                  </span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:12px; color:${i.applyGST?`#1f2937`:`#6b7280`};">
                  <span>GST (${i.applyGST&&i.gstRate||0}%):</span>
                  <span style="font-weight:700; font-family:monospace;">
                    ₹${Number(i.applyGST&&i.gstAmount||0).toLocaleString(`en-IN`,{minimumFractionDigits:2})}
                  </span>
                </div>
                <div style="height:1px; background:#bfdbfe; margin-bottom:10px;"></div>
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:14.5px;">
                  <span style="font-weight:800; color:#16396b;">Total:</span>
                  <span style="font-weight:800; color:#16396b; font-size:17px; font-family:monospace;">
                    ₹${Number(i.total||i.subtotal||0).toLocaleString(`en-IN`,{minimumFractionDigits:2})}
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
  `,document.getElementById(`preview-back-btn`)?.addEventListener(`click`,()=>{h=`list`,S(t)}),document.getElementById(`preview-edit-btn`)?.addEventListener(`click`,()=>{_=i.id,h=`create`,y=null,S(t)}),document.getElementById(`preview-print-btn`)?.addEventListener(`click`,()=>{window.print()}),document.getElementById(`preview-toggle-status-btn`)?.addEventListener(`click`,async()=>{i.status=i.status===`Confirmed`?`Not Confirmed`:`Confirmed`,await n.put(`quotes`,i),await r.queueOperation(`quotes`,`update`,i),f.showToast(`Status Updated`,`${i.quotationNo} is now ${i.status}.`,`success`),ae(e,t)}),lucide.createIcons()}async function oe(e,t){let n=await b();e.innerHTML=`
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
              <input type="text" id="set-company-name" class="form-control-noicon" value="${n.companyName}" required />
            </div>

            <div class="input-group" style="margin-bottom:0;">
              <label>Company Logo</label>
              <div style="display:flex; gap:8px;">
                <input type="text" id="set-company-logo" class="form-control-noicon" placeholder="Image URL or upload below..." value="${n.logoUrl||``}" style="flex:1;" />
                <label class="btn btn-secondary" style="padding:6px 12px; font-size:11px; cursor:pointer; display:flex; align-items:center; gap:4px; white-space:nowrap;">
                  <i data-lucide="upload"></i> Upload
                  <input type="file" id="set-logo-file-input" accept="image/*" style="display:none;" />
                </label>
              </div>
              <div id="set-logo-preview" style="margin-top:6px; display:${n.logoUrl?`block`:`none`};">
                <img src="${n.logoUrl||``}" alt="Logo Preview" style="max-height:40px; max-width:80px; object-fit:contain; border:1px solid var(--glass-border); border-radius:4px; padding:2px; background:#fff;" />
              </div>
            </div>
          </div>

          <div class="input-group" style="margin-bottom:12px;">
            <label>Address Line 1</label>
            <input type="text" id="set-company-addr1" class="form-control-noicon" value="${n.addressLine1||``}" />
          </div>

          <div class="input-group" style="margin-bottom:12px;">
            <label>Address Line 2 (Optional)</label>
            <input type="text" id="set-company-addr2" class="form-control-noicon" value="${n.addressLine2||``}" />
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px;">
            <div class="input-group" style="margin-bottom:0;">
              <label>Contact Phone Number(s)</label>
              <input type="text" id="set-company-contact" class="form-control-noicon" value="${n.contact||``}" />
            </div>

            <div class="input-group" style="margin-bottom:0;">
              <label>Official Email</label>
              <input type="email" id="set-company-email" class="form-control-noicon" value="${n.email||``}" />
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
              <input type="checkbox" id="set-show-bank" ${n.showBankDetails?`checked`:``}>
              <span>Display Bank Details on Quotation Sheet</span>
            </label>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px; margin-bottom:14px;">
            <div class="input-group" style="margin-bottom:0;">
              <label>Bank Name</label>
              <input type="text" id="set-bank-name" class="form-control-noicon" value="${n.bankName||``}" />
            </div>

            <div class="input-group" style="margin-bottom:0;">
              <label>Account Number</label>
              <input type="text" id="set-bank-acc" class="form-control-noicon" value="${n.accountNo||``}" />
            </div>

            <div class="input-group" style="margin-bottom:0;">
              <label>IFSC Code</label>
              <input type="text" id="set-bank-ifsc" class="form-control-noicon" value="${n.ifscCode||``}" />
            </div>

            <div class="input-group" style="margin-bottom:0;">
              <label>Branch Name</label>
              <input type="text" id="set-bank-branch" class="form-control-noicon" value="${n.branch||``}" />
            </div>
          </div>

          <!-- Payment QR Code Uploader Field -->
          <div style="background:rgba(255,255,255,0.03); padding:12px 14px; border-radius:6px; border:1px dashed var(--glass-border);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <label style="font-weight:700; font-size:12px; margin-bottom:0; display:flex; align-items:center; gap:6px;">
                <i data-lucide="qr-code" style="width:15px; height:15px; color:var(--primary-color);"></i>
                <span>Payment QR Code (Displays by the side of Bank Details in Quotation)</span>
              </label>
              <button type="button" id="set-qr-remove-btn" class="btn btn-secondary" style="padding:2px 8px; font-size:10.5px; color:var(--danger); display:${n.qrCodeUrl?`inline-flex`:`none`}; align-items:center; gap:4px;">
                <i data-lucide="trash-2" style="width:11px; height:11px;"></i> Remove QR
              </button>
            </div>

            <div style="display:flex; gap:12px; align-items:center;">
              <div style="flex:1; display:flex; gap:8px;">
                <input type="text" id="set-qr-code-url" class="form-control-noicon" placeholder="Image URL or upload QR Code image file..." value="${n.qrCodeUrl||``}" style="flex:1;" />
                <label class="btn btn-secondary" style="padding:6px 12px; font-size:11px; cursor:pointer; display:flex; align-items:center; gap:4px; white-space:nowrap;">
                  <i data-lucide="upload"></i> Upload QR Code
                  <input type="file" id="set-qr-file-input" accept="image/*" style="display:none;" />
                </label>
              </div>

              <!-- QR Code Live Preview Box -->
              <div id="set-qr-preview" style="width:60px; height:60px; border:1px solid var(--glass-border); border-radius:4px; display:flex; align-items:center; justify-content:center; background:#ffffff; overflow:hidden; flex-shrink:0;">
                ${n.qrCodeUrl?`
                  <img src="${n.qrCodeUrl}" alt="QR Preview" style="width:100%; height:100%; object-fit:contain;" />
                `:`
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
            <input type="number" id="set-default-gst" class="form-control-noicon" value="${n.defaultGSTRate||18}" style="width:120px;" />
          </div>

          <div class="input-group" style="margin-bottom:0;">
            <label>Standard Terms & Conditions (One per line)</label>
            <textarea id="set-default-terms" class="form-control-noicon" rows="5" style="font-size:12px; line-height:1.5;">${n.terms.join(`
`)}</textarea>
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:8px;">
          <button type="submit" class="btn btn-primary" style="padding:9px 24px; font-size:13px; font-weight:700;">
            Save Settings
          </button>
        </div>
      </form>
    </div>
  `,document.getElementById(`set-back-btn`)?.addEventListener(`click`,()=>{h=`list`,S(t)});let r=document.getElementById(`set-logo-file-input`),i=document.getElementById(`set-company-logo`),a=document.getElementById(`set-logo-preview`);r?.addEventListener(`change`,e=>{let t=e.target.files?.[0];if(t){let e=new FileReader;e.onload=e=>{let t=e.target.result;i.value=t,a.style.display=`block`,a.innerHTML=`<img src="${t}" alt="Logo Preview" style="max-height:40px; max-width:80px; object-fit:contain; border:1px solid var(--glass-border); border-radius:4px; padding:2px; background:#fff;" />`,f.showToast(`Logo Loaded`,`Image ready to save.`,`info`)},e.readAsDataURL(t)}}),i?.addEventListener(`input`,e=>{let t=e.target.value.trim();t?(a.style.display=`block`,a.innerHTML=`<img src="${t}" alt="Logo Preview" style="max-height:40px; max-width:80px; object-fit:contain; border:1px solid var(--glass-border); border-radius:4px; padding:2px; background:#fff;" />`):a.style.display=`none`});let o=document.getElementById(`set-qr-file-input`),s=document.getElementById(`set-qr-code-url`),c=document.getElementById(`set-qr-preview`),l=document.getElementById(`set-qr-remove-btn`);o?.addEventListener(`change`,e=>{let t=e.target.files?.[0];if(t){let e=new FileReader;e.onload=e=>{let t=e.target.result;s.value=t,c.innerHTML=`<img src="${t}" alt="QR Preview" style="width:100%; height:100%; object-fit:contain;" />`,l&&(l.style.display=`inline-flex`),f.showToast(`QR Code Loaded`,`QR code image ready to save.`,`info`)},e.readAsDataURL(t)}}),s?.addEventListener(`input`,e=>{let t=e.target.value.trim();t?(c.innerHTML=`<img src="${t}" alt="QR Preview" style="width:100%; height:100%; object-fit:contain;" />`,l&&(l.style.display=`inline-flex`)):(c.innerHTML=`<span style="font-size:9.5px; color:#9ca3af; text-align:center; line-height:1.2;">No QR</span>`,l&&(l.style.display=`none`))}),l?.addEventListener(`click`,()=>{s.value=``,c.innerHTML=`<span style="font-size:9.5px; color:#9ca3af; text-align:center; line-height:1.2;">No QR</span>`,l.style.display=`none`,f.showToast(`QR Code Removed`,`Click Save Settings to apply.`,`info`)}),document.getElementById(`quote-settings-form`)?.addEventListener(`submit`,async e=>{e.preventDefault();let n=document.getElementById(`set-default-terms`)?.value||``;await x({companyName:document.getElementById(`set-company-name`)?.value?.trim()||`GLASSOLOGY`,logoUrl:document.getElementById(`set-company-logo`)?.value?.trim()||``,addressLine1:document.getElementById(`set-company-addr1`)?.value?.trim()||``,addressLine2:document.getElementById(`set-company-addr2`)?.value?.trim()||``,contact:document.getElementById(`set-company-contact`)?.value?.trim()||``,email:document.getElementById(`set-company-email`)?.value?.trim()||``,showBankDetails:document.getElementById(`set-show-bank`)?.checked||!1,bankName:document.getElementById(`set-bank-name`)?.value?.trim()||``,accountNo:document.getElementById(`set-bank-acc`)?.value?.trim()||``,ifscCode:document.getElementById(`set-bank-ifsc`)?.value?.trim()||``,branch:document.getElementById(`set-bank-branch`)?.value?.trim()||``,qrCodeUrl:document.getElementById(`set-qr-code-url`)?.value?.trim()||``,defaultGSTRate:parseFloat(document.getElementById(`set-default-gst`)?.value||`18`)||0,terms:n.split(`
`).map(e=>e.trim()).filter(e=>e.length>0)}),f.showToast(`Settings Saved`,`Quotation branding and QR Code settings updated.`,`success`),h=`list`,S(t)}),lucide.createIcons()}var T={stringify:e=>{if(!e)return``;let t=new Date(e);if(isNaN(t.getTime())){if(typeof e==`string`&&e.includes(`-`)){let t=e.split(`-`);if(t[0].length===4)return`${t[1]}-${t[2]}-${t[0]}`}return e}return`${String(t.getMonth()+1).padStart(2,`0`)}-${String(t.getDate()).padStart(2,`0`)}-${t.getFullYear()}`},toPickerFormat:e=>{if(!e||!e.includes(`-`))return``;let[t,n,r]=e.split(`-`);return t.length===4?e:`${r}-${t}-${n}`}},E={toSystemFormat:e=>{let t=new Date(e);return isNaN(t.getTime())?e:`${String(t.getMonth()+1).padStart(2,`0`)}-${String(t.getDate()).padStart(2,`0`)}-${t.getFullYear()}`}},D=new Proxy({},{get:(e,t)=>window.app?window.app[t]:void 0}),O=null,k={search:``,status:``},A=[],j=new Date().toISOString().split(`T`)[0];async function M(e,t=[]){let r=await n.getAll(`gatepasses`);!O&&r.length>0&&(O=r[0].id),e.innerHTML=`
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
            <input type="text" id="gp-search-input" placeholder="Search pass no, driver, or item name..." class="form-control" style="padding-top:6px; padding-bottom:6px; font-size:12px;" value="${k.search}">
          </div>
          <select id="gp-status-filter" class="form-control-noicon" style="padding: 6px 10px; font-size:12px;">
            <option value="">All Statuses</option>
            <option value="Pending" ${k.status===`Pending`?`selected`:``}>Pending Approval</option>
            <option value="Approved" ${k.status===`Approved`?`selected`:``}>Approved Out</option>
            <option value="Returned" ${k.status===`Returned`?`selected`:``}>Items Returned</option>
            <option value="Closed" ${k.status===`Closed`?`selected`:``}>Closed / Complete</option>
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
  `;try{await se()}catch(e){console.error(`Pass list error:`,e)}try{await ce()}catch(e){console.error(`Pass details error:`,e)}ue(e),lucide.createIcons()}async function se(){let e=document.getElementById(`gatepass-ledger-list`);if(!e)return;let t=await n.getAll(`gatepasses`);if(k.search){let e=k.search.toLowerCase();t=t.filter(t=>{let n=(t.gatePassNo||``).toLowerCase().includes(e)||(t.person?.name||``).toLowerCase().includes(e)||(t.vehicle?.driverName||``).toLowerCase().includes(e),r=(t.items||[]).some(t=>(t.name||``).toLowerCase().includes(e)||(t.code||``).toLowerCase().includes(e));return n||r})}if(k.status&&(t=t.filter(e=>e.status===k.status)),t.length===0){e.innerHTML=`<div class="text-center muted-text" style="padding:40px 0; font-size:13px;">
      <i data-lucide="file-x" style="width:32px; height:32px; display:block; margin:0 auto 8px;"></i>
      No gate passes match your search.
    </div>`,lucide.createIcons();return}e.innerHTML=t.map(e=>{let t=e.id===O,n=`warning`;e.status===`Approved`&&(n=`primary`),e.status===`Returned`&&(n=`success`),e.status===`Closed`&&(n=`secondary`);let r=(e.items||[]).slice(0,2).map(e=>e.name).join(`, `),i=(e.items||[]).length>2?` +${e.items.length-2} more`:``,a=e.pricing?.totalAmount?` · ₹${Number(e.pricing.totalAmount).toLocaleString()}`:``;return`
      <div class="gp-ledger-card pointer ${t?`active-gp`:``}" data-id="${e.id}"
           style="padding:12px; border-radius:var(--radius-md); border:1px solid ${t?`var(--primary-color)`:`var(--glass-border)`}; 
           background:${t?`var(--primary-glow)`:`rgba(255,255,255,0.01)`}; transition:all var(--transition-fast); cursor:pointer;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
          <strong style="font-size:13px; font-family:var(--font-heading);">${e.gatePassNo}</strong>
          <span class="badge ${n}" style="font-size:9px;">${e.status}</span>
        </div>
        <div style="font-size:11px; color:var(--text-secondary); margin-bottom:3px;">
          ${e.vehicle?.driverName?`🚛 ${e.vehicle.driverName}`:`—`} · ${e.date||``}${a}
        </div>
        ${e.projectName?`
          <div style="font-size:10px; color:var(--primary-color); margin-bottom:3px; display:flex; align-items:center; gap:4px;">
            <i data-lucide="kanban-square" style="width:11px; height:11px;"></i>
            <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${e.projectName}</span>
          </div>
        `:``}
        ${r?`<div style="font-size:10px; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          📦 ${r}${i}
        </div>`:``}
      </div>
    `}).join(``)}async function ce(){let e=document.getElementById(`gatepass-details-viewport`);if(!e)return;if(!O){e.innerHTML=`
      <div class="glass-card text-center muted-text" style="padding:80px 40px; display:flex; flex-direction:column; align-items:center; gap:16px;">
        <i data-lucide="file-check-2" style="width:48px; height:48px; opacity:0.3;"></i>
        <p>Select a gate pass from the left panel or create a new one.</p>
      </div>`,lucide.createIcons();return}let t=await n.get(`gatepasses`,O);if(!t){e.innerHTML=`<div class="glass-card text-center danger-text" style="padding:80px;">Gate pass not found in database.</div>`;return}let r=t.status===`Pending`,i=t.status===`Approved`,a=t.returnable,o=`badge warning`;t.status===`Approved`&&(o=`badge primary`),t.status===`Returned`&&(o=`badge success`),t.status===`Closed`&&(o=`badge secondary`);let s=t.items||[],c=s.reduce((e,t)=>e+(t.price||0)*(t.quantity||0),0),l=t.pricing?.totalAmount||c,u=t.pricing?.amountPaid||0,d=t.pricing?.paymentMode||`—`,f=t.pricing?.remarks||``,p=l-u,m=e.dataset.itemSearch||``;e.innerHTML=`
    <div class="glass-card" style="display:flex; flex-direction:column; gap:20px;">
      <!-- Header -->
      <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid var(--glass-border); padding-bottom:16px; flex-wrap:wrap; gap:12px;">
        <div>
          <span style="font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; display:block; margin-bottom:4px;">Gate Pass Record</span>
          <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
            <h2 style="font-family:var(--font-heading); font-size:24px; font-weight:800;">${t.gatePassNo}</h2>
            <span class="${o}">${t.status}</span>
            ${a?`<span class="badge success" style="font-size:10px;">Returnable</span>`:`<span class="badge secondary" style="font-size:10px;">Non-Returnable</span>`}
          </div>
          <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">Issued: ${t.date||`—`}</div>
        </div>

        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          ${r?`
            <button id="gp-approve-btn" class="btn btn-success" style="padding:8px 14px; font-size:13px;">
              <i data-lucide="check-circle"></i><span>Approve</span>
            </button>
          `:``}
          <button id="gp-edit-btn" class="btn btn-primary" style="padding:8px 14px; font-size:13px;">
            <i data-lucide="edit"></i><span>Edit Pass</span>
          </button>
          <button id="gp-print-btn" class="btn btn-secondary" style="padding:8px 14px; font-size:13px;">
            <i data-lucide="printer"></i><span>Print PDF</span>
          </button>
          ${i||t.status===`Returned`?`
            <button id="gp-close-btn" class="btn btn-primary" style="padding:8px 14px; font-size:13px;">
              <i data-lucide="folder-lock"></i><span>Close Pass</span>
            </button>
          `:``}
          <button id="gp-delete-btn" class="btn btn-danger" style="padding:8px 14px; font-size:13px;">
            <i data-lucide="trash-2"></i><span>Delete</span>
          </button>
        </div>
      </div>

      <!-- Info Grid -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:16px;">
        <div style="background:rgba(0,0,0,0.12); border:1px solid var(--glass-border); padding:14px; border-radius:10px;">
          <h4 style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-muted); margin-bottom:10px; letter-spacing:0.5px;">👤 Recipient</h4>
          <div style="display:flex; flex-direction:column; gap:5px; font-size:13px;">
            <span><strong>Name:</strong> ${t.person?.name||`—`}</span>
            <span><strong>Designation:</strong> ${t.person?.designation||`—`}</span>
            <span><strong>Contact:</strong> ${t.person?.contact||`—`}</span>
          </div>
        </div>
        <div style="background:rgba(0,0,0,0.12); border:1px solid var(--glass-border); padding:14px; border-radius:10px;">
          <h4 style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-muted); margin-bottom:10px; letter-spacing:0.5px;">🚛 Vehicle / Logistics</h4>
          <div style="display:flex; flex-direction:column; gap:5px; font-size:13px;">
            <span><strong>Vehicle No:</strong> <code>${t.vehicle?.vehicleNo||`—`}</code></span>
            <span><strong>Driver:</strong> ${t.vehicle?.driverName||`—`}</span>
            <span><strong>Type:</strong> ${t.vehicle?.vehicleType||`—`}</span>
          </div>
        </div>
        <div style="background:rgba(0,0,0,0.12); border:1px solid var(--glass-border); padding:14px; border-radius:10px;">
          <h4 style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-muted); margin-bottom:10px; letter-spacing:0.5px;">🏗️ Connected Project</h4>
          <div style="display:flex; flex-direction:column; gap:5px; font-size:13px;">
            ${t.projectName?`
              <strong style="color:var(--primary-color);">${t.projectName}</strong>
              <a href="#projects" style="font-size:11px; color:var(--text-secondary); text-decoration:none; display:inline-flex; align-items:center; gap:4px; margin-top:2px;">
                <i data-lucide="external-link" style="width:11px; height:11px;"></i> Open in Projects
              </a>
            `:`
              <span class="muted-text">General Dispatch</span>
              <span style="font-size:11px; color:var(--text-muted);">No specific project linked</span>
            `}
          </div>
        </div>
      </div>

      <!-- Items Section with search bar -->
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
          <h4 style="font-size:14px; font-weight:700;">📦 Material Items (${s.length})</h4>
          <div class="search-input-wrapper" style="max-width:260px; flex-grow:1;">
            <i data-lucide="search"></i>
            <input type="text" id="gp-detail-item-search" placeholder="Filter items by name or code..." class="form-control" style="padding-top:5px; padding-bottom:5px; font-size:12px;" value="${m}">
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
                ${a?`<th style="text-align:center;">Returned</th><th style="text-align:center;">Pending</th>`:``}
                <th>Usage Note</th>
              </tr>
            </thead>
            <tbody id="gp-items-detail-body">
              ${le(s,t,a,m)}
            </tbody>
          </table>
        </div>

        ${s.length===0?`<div class="text-center muted-text" style="padding:20px; font-size:13px;">No items added to this gate pass.</div>`:``}
      </div>

      <!-- Financial Summary -->
      <div style="background:linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.08) 100%); border:1px solid var(--primary-color); border-radius:12px; padding:18px;">
        <h4 style="font-size:13px; font-weight:700; margin-bottom:14px; color:var(--primary-color);">💰 Financial Summary</h4>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:16px;">
          <div>
            <div style="font-size:11px; color:var(--text-muted); margin-bottom:3px;">Total Amount</div>
            <div style="font-size:20px; font-weight:700; font-family:var(--font-heading);">₹${Number(l).toLocaleString(`en-IN`,{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
          </div>
          <div>
            <div style="font-size:11px; color:var(--text-muted); margin-bottom:3px;">Amount Paid</div>
            <div style="font-size:20px; font-weight:700; font-family:var(--font-heading); color:var(--success);">₹${Number(u).toLocaleString(`en-IN`,{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
          </div>
          <div>
            <div style="font-size:11px; color:var(--text-muted); margin-bottom:3px;">Balance Due</div>
            <div style="font-size:20px; font-weight:700; font-family:var(--font-heading); color:${p>0?`var(--warning)`:`var(--success)`};">₹${Number(p).toLocaleString(`en-IN`,{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
          </div>
          <div>
            <div style="font-size:11px; color:var(--text-muted); margin-bottom:3px;">Payment Mode</div>
            <div style="font-size:15px; font-weight:600;">${d}</div>
          </div>
        </div>
        ${f?`<div style="margin-top:10px; font-size:12px; color:var(--text-muted);">Remarks: ${f}</div>`:``}
      </div>

      <!-- Return Logger (for approved returnable passes) -->
      ${a&&i?`
        <div style="border-top:1px dashed var(--glass-border); padding-top:18px; display:flex; flex-direction:column; gap:14px;">
          <h4 style="font-size:14px; font-weight:700;">↩ Log Material Return</h4>
          <div style="display:flex; align-items:flex-end; gap:12px; flex-wrap:wrap;">
            <div class="input-group" style="margin-bottom:0; width:220px;">
              <label>Select Item</label>
              <select id="return-item-select" class="form-control-noicon">
                ${s.map(e=>{let n=t.returns?.find(t=>t.code===e.code),r=e.quantity-(n?n.returnedQty:0);return r>0?`<option value="${e.code}">${e.code} – ${e.name} (max: ${r})</option>`:``}).join(``)}
              </select>
            </div>
            <div class="input-group" style="margin-bottom:0; width:110px;">
              <label>Return Qty</label>
              <input type="number" id="return-quantity-input" class="form-control-noicon" min="1" value="1">
            </div>
            <div class="input-group" style="margin-bottom:0; width:150px;">
              <label>Return Date</label>
              <input type="date" id="return-date-input" class="form-control-noicon" value="${j}">
            </div>
            <button id="commit-return-btn" class="btn btn-success" style="padding: 10px 18px;">
              <i data-lucide="rotate-ccw"></i>
              <span>Log Return</span>
            </button>
          </div>
        </div>
      `:``}
    </div>
  `,ye(t);let h=document.getElementById(`gp-detail-item-search`);h&&h.addEventListener(`input`,n=>{e.dataset.itemSearch=n.target.value;let r=n.target.value.toLowerCase();document.getElementById(`gp-items-detail-body`).innerHTML=le(s,t,a,r)}),lucide.createIcons()}function le(e,t,n,r=``){let i=e;return r&&(i=e.filter(e=>(e.name||``).toLowerCase().includes(r)||(e.code||``).toLowerCase().includes(r))),i.length===0?`<tr><td colspan="${n?9:7}" class="text-center muted-text" style="padding:16px;">No items match your filter.</td></tr>`:i.map(e=>{let r=t.returns?t.returns.find(t=>t.code===e.code):null,i=r?r.returnedQty:0,a=(e.quantity||0)-i,o=e.price||0,s=o*(e.quantity||0),c=e.source===`manual`?`<span class="badge warning" style="font-size:9px;">Manual</span>`:`<span class="badge secondary" style="font-size:9px;">Store</span>`;return`
      <tr>
        <td><code>${e.code||`—`}</code></td>
        <td><strong>${e.name}</strong></td>
        <td>${c}</td>
        <td style="text-align:center;">${e.quantity}</td>
        <td style="text-align:right;">${o>0?`₹`+o.toLocaleString(`en-IN`):`—`}</td>
        <td style="text-align:right; font-weight:600;">${s>0?`₹`+s.toLocaleString(`en-IN`):`—`}</td>
        ${n?`
          <td style="text-align:center;"><span class="success-text">${i}</span></td>
          <td style="text-align:center;"><span class="${a>0?`warning-text`:`muted-text`}">${a}</span></td>
        `:``}
        <td style="color:var(--text-muted); font-size:12px;">${e.description||`—`}</td>
      </tr>
    `}).join(``)}function ue(e){document.getElementById(`gp-search-input`)?.addEventListener(`input`,async e=>{k.search=e.target.value,await se(),lucide.createIcons()}),document.getElementById(`gp-status-filter`)?.addEventListener(`change`,async e=>{k.status=e.target.value,await se()});let t=document.getElementById(`gatepass-ledger-list`);t&&t.addEventListener(`click`,async e=>{let t=e.target.closest(`.gp-ledger-card`);t&&(O=t.getAttribute(`data-id`),await se(),await ce())}),document.getElementById(`add-gatepass-btn`)?.addEventListener(`click`,async()=>{await de(e)})}async function de(e,t=null){A=[];let r=await n.getAll(`inventory`),i=await n.getAll(`projects`),a=`
    <div style="display:flex; flex-direction:column; gap:20px;">

      <!-- Section 1: Project & Person -->
      <div>
        <h4 style="font-size:12px; font-weight:700; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.5px; margin-bottom:12px; border-bottom:1px solid var(--glass-border); padding-bottom:6px;">
          1. Destination & Person Responsible
        </h4>
        <div class="gp-form-sections">
          <!-- Project Selection -->
          <div class="input-group" style="margin-bottom:0; grid-column: span 2;">
            <label style="font-weight:700; color:var(--text-primary); display:flex; justify-content:space-between; align-items:center;">
              <span>Connected Project</span>
              <span class="muted-text" style="font-size:11px; font-weight:400;">Links dispatch directly into Project & Tasks</span>
            </label>
            <select id="gp-new-project-id" class="form-control-noicon" style="border-color:var(--primary-color);">
              <option value="">— General Dispatch / No Project —</option>
              ${i.map(e=>`<option value="${e.id}" ${e.id===t?`selected`:``}>🏗️ ${e.name} (${e.status})</option>`).join(``)}
            </select>
          </div>

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
            <input type="text" id="gp-new-person-remarks" class="form-control-noicon" placeholder="Any delivery notes...">
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
            <input type="date" id="gp-new-date" class="form-control-noicon" value="${j}">
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
            ${pe(r,``)}
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
  `;D.openModal(`New Gate Pass`,a,`800px`),_e(r,e,i)}async function fe(e,t){A=JSON.parse(JSON.stringify(t.items||[])),await n.getAll(`inventory`);let i=await n.getAll(`projects`),a=`
    <div style="display:flex; flex-direction:column; gap:20px;">

      <!-- Section 1: Project & Person -->
      <div>
        <h4 style="font-size:12px; font-weight:700; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.5px; margin-bottom:12px; border-bottom:1px solid var(--glass-border); padding-bottom:6px;">
          1. Destination & Person Responsible
        </h4>
        <div class="gp-form-sections">
          <!-- Project Selection -->
          <div class="input-group" style="margin-bottom:0; grid-column: span 2;">
            <label style="font-weight:700; color:var(--text-primary);">Connected Project</label>
            <select id="gp-edit-project-id" class="form-control-noicon" style="border-color:var(--primary-color);">
              <option value="">— General Dispatch / No Project —</option>
              ${i.map(e=>`<option value="${e.id}" ${e.id===t.projectId?`selected`:``}>🏗️ ${e.name} (${e.status})</option>`).join(``)}
            </select>
          </div>

          <div class="input-group" style="margin-bottom:0;">
            <label>Recipient Name</label>
            <input type="text" id="gp-edit-name" class="form-control-noicon" value="${t.person?.name||``}">
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Contact Phone</label>
            <input type="text" id="gp-edit-contact" class="form-control-noicon" value="${t.person?.contact||``}">
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Designation</label>
            <input type="text" id="gp-edit-designation" class="form-control-noicon" value="${t.person?.designation||``}">
          </div>
        </div>
      </div>

      <!-- Section 2: Transport -->
      <div>
        <h4 style="font-size:12px; font-weight:700; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.5px; margin-bottom:12px; border-bottom:1px solid var(--glass-border); padding-bottom:6px;">
          2. Transportation Details
        </h4>
        <div class="gp-form-sections">
          <div class="input-group" style="margin-bottom:0;">
            <label>Vehicle Plate No.</label>
            <input type="text" id="gp-edit-vehno" class="form-control-noicon" value="${t.vehicle?.vehicleNo||``}">
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Driver Full Name</label>
            <input type="text" id="gp-edit-driver" class="form-control-noicon" value="${t.vehicle?.driverName||``}">
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Vehicle Type</label>
            <input type="text" id="gp-edit-vehtype" class="form-control-noicon" value="${t.vehicle?.vehicleType||``}">
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Pass Date</label>
            <input type="date" id="gp-edit-date" class="form-control-noicon" value="${t.date||j}">
          </div>
        </div>
      </div>

      <!-- Section 3: Items (Only viewable here to keep returns logic intact, unless Pending) -->
      ${t.status===`Pending`?`
      <div>
        <h4 style="font-size:12px; font-weight:700; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.5px; margin-bottom:12px; border-bottom:1px solid var(--glass-border); padding-bottom:6px;">
          3. Modify Items
        </h4>
        <div id="gp-queued-section" style="border:1px solid var(--glass-border); border-radius:var(--radius-md); overflow:hidden;">
          <div style="padding:10px 14px; background:rgba(0,0,0,0.15); border-bottom:1px solid var(--glass-border); display:flex; justify-content:space-between; align-items:center;">
            <h5 style="font-size:12px; font-weight:700; margin:0;">Items</h5>
            <span id="gp-items-count" style="font-size:11px; color:var(--text-muted);"></span>
          </div>
          <div style="overflow-x:auto; max-height:200px; overflow-y:auto;">
            <table class="custom-table" style="font-size:11px;" id="gp-queued-items-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Item Name</th>
                  <th>Qty</th>
                  <th>Remove</th>
                </tr>
              </thead>
              <tbody id="gp-queued-items-body"></tbody>
            </table>
          </div>
        </div>
      </div>
      `:`
      <div style="padding:10px; background:rgba(255,255,255,0.05); border-radius:8px; font-size:12px;">
        <em>Items cannot be modified because the gate pass is ${t.status}.</em>
      </div>
      `}

      <!-- Section 5: Payment / Amount -->
      <div>
        <h4 style="font-size:12px; font-weight:700; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.5px; margin-bottom:12px; border-bottom:1px solid var(--glass-border); padding-bottom:6px;">
          4. Payment & Amount
        </h4>
        <div class="gp-form-sections">
          <div class="input-group" style="margin-bottom:0;">
            <label>Total Amount (₹)</label>
            <input type="number" id="gp-edit-total-amount" class="form-control-noicon" min="0" step="0.01" value="${t.pricing?.totalAmount||0}">
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Amount Paid (₹)</label>
            <input type="number" id="gp-edit-amount-paid" class="form-control-noicon" min="0" step="0.01" value="${t.pricing?.amountPaid||0}">
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Payment Mode</label>
            <select id="gp-edit-payment-mode" class="form-control-noicon">
              <option value="" ${t.pricing?.paymentMode===``?`selected`:``}>— Select Mode —</option>
              <option value="Cash" ${t.pricing?.paymentMode===`Cash`?`selected`:``}>Cash</option>
              <option value="Cheque" ${t.pricing?.paymentMode===`Cheque`?`selected`:``}>Cheque</option>
              <option value="Bank Transfer" ${t.pricing?.paymentMode===`Bank Transfer`?`selected`:``}>Bank Transfer</option>
              <option value="UPI" ${t.pricing?.paymentMode===`UPI`?`selected`:``}>UPI</option>
              <option value="Credit" ${t.pricing?.paymentMode===`Credit`?`selected`:``}>Credit / Due</option>
            </select>
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Payment Remarks</label>
            <input type="text" id="gp-edit-payment-remarks" class="form-control-noicon" value="${t.pricing?.remarks||``}">
          </div>
        </div>
      </div>

      <div style="border-top:1px solid var(--glass-border); padding-top:16px; text-align:right;">
        <button type="button" id="gp-update-btn" class="btn btn-primary" style="padding:10px 28px;">
          <i data-lucide="save"></i>
          <span>Save Changes</span>
        </button>
      </div>
    </div>
  `;D.openModal(`Edit Gate Pass`,a,`700px`),t.status===`Pending`&&ge(),document.getElementById(`gp-update-btn`).addEventListener(`click`,async()=>{let a=document.getElementById(`gp-edit-project-id`)?.value||null,o=i.find(e=>e.id===a);if(t.projectId=a,t.projectName=o?o.name:``,t.person={name:document.getElementById(`gp-edit-name`).value.trim(),contact:document.getElementById(`gp-edit-contact`).value.trim(),designation:document.getElementById(`gp-edit-designation`).value.trim()},t.vehicle={vehicleNo:document.getElementById(`gp-edit-vehno`).value.trim().toUpperCase(),driverName:document.getElementById(`gp-edit-driver`).value.trim(),vehicleType:document.getElementById(`gp-edit-vehtype`).value.trim()},t.date=document.getElementById(`gp-edit-date`).value,t.pricing={totalAmount:parseFloat(document.getElementById(`gp-edit-total-amount`).value||`0`),amountPaid:parseFloat(document.getElementById(`gp-edit-amount-paid`).value||`0`),paymentMode:document.getElementById(`gp-edit-payment-mode`).value,remarks:document.getElementById(`gp-edit-payment-remarks`).value.trim()},t.status===`Pending`&&(t.items=[...A],t.returnable)){let e=t.returns||[];t.returns=A.filter(e=>e.source===`store`).map(t=>e.find(e=>e.code===t.code)||{code:t.code,returnedQty:0,date:``})}await n.put(`gatepasses`,t),await r.queueOperation(`gatepasses`,`update`,t),D.closeModal(),D.showToast(`Updated`,`Gate Pass ${t.gatePassNo} updated successfully.`,`success`),await M(e)}),lucide.createIcons()}function pe(e,t){let n=e;if(t){let r=t.toLowerCase();n=e.filter(e=>(e.name||``).toLowerCase().includes(r)||(e.code||``).toLowerCase().includes(r)||(e.category||``).toLowerCase().includes(r))}return n.length===0?`<div class="text-center muted-text" style="padding:20px; font-size:12px;">No matching items found in store.</div>`:n.map(e=>{let t=e.currentStock<=e.minStock;return`
      <div class="gp-store-item-row pointer" data-code="${e.code}" data-name="${e.name}" data-stock="${e.currentStock}"
           style="padding:8px 12px; border-bottom:1px solid var(--glass-border); display:flex; justify-content:space-between; align-items:center; cursor:pointer; transition:background var(--transition-fast);"
           onmouseover="this.style.background='rgba(59,130,246,0.08)'" onmouseout="this.style.background='transparent'">
        <div>
          <code style="font-size:11px; color:var(--primary-color);">${e.code}</code>
          <strong style="font-size:12px; margin-left:8px;">${e.name}</strong>
          <span class="badge secondary" style="font-size:9px; margin-left:6px;">${e.category}</span>
        </div>
        <div style="text-align:right; font-size:11px;">
          <span class="${t?`danger-text`:`success-text`}" style="font-weight:600;">${e.currentStock} ${e.unit}</span>
          ${t?`<span class="badge danger" style="font-size:8px; margin-left:4px;">LOW</span>`:``}
        </div>
      </div>
    `}).join(``)}function me(){let e=A.reduce((e,t)=>e+(t.price||0)*(t.quantity||0),0),t=document.getElementById(`gp-total-amount`);return t&&(t.value=e.toFixed(2)),e}function he(){let e=me(),t=document.getElementById(`gp-items-count`);t&&(t.textContent=`${A.length} item${A.length===1?``:`s`} · Total: ₹${e.toLocaleString(`en-IN`,{minimumFractionDigits:2})}`)}function ge(){let e=document.getElementById(`gp-queued-items-body`);if(e){if(A.length===0){e.innerHTML=`<tr><td colspan="8" class="text-center muted-text" style="padding:16px;">No items added yet.</td></tr>`,he();return}e.innerHTML=A.map((e,t)=>{let n=(e.price||0)*(e.quantity||0),r=e.source===`manual`?`<span class="badge warning" style="font-size:8px;">Manual</span>`:`<span class="badge secondary" style="font-size:8px;">Store</span>`;return`
      <tr>
        <td><code>${e.code||`—`}</code></td>
        <td><strong>${e.name}</strong></td>
        <td>${r}</td>
        <td>${e.quantity}</td>
        <td>${e.price>0?`₹`+e.price:`—`}</td>
        <td style="font-weight:600;">${n>0?`₹`+n.toLocaleString(`en-IN`):`—`}</td>
        <td style="color:var(--text-muted); max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${e.description||`—`}</td>
        <td>
          <button type="button" class="btn btn-danger gp-remove-item-btn" data-idx="${t}" style="padding:2px 7px; font-size:10px;">&times;</button>
        </td>
      </tr>
    `}).join(``),e.querySelectorAll(`.gp-remove-item-btn`).forEach(e=>{e.addEventListener(`click`,()=>{A.splice(parseInt(e.getAttribute(`data-idx`)),1),ge()})}),he()}}function _e(e,t,a=[]){let o=document.getElementById(`gp-tab-store-btn`),s=document.getElementById(`gp-tab-manual-btn`),c=document.getElementById(`gp-store-panel`),l=document.getElementById(`gp-manual-panel`);o?.addEventListener(`click`,()=>{c.style.display=`flex`,l.style.display=`none`,o.className=`btn btn-primary`,o.style.cssText=`padding:6px 14px; font-size:12px;`,s.className=`btn btn-secondary`,s.style.cssText=`padding:6px 14px; font-size:12px;`}),s?.addEventListener(`click`,()=>{c.style.display=`none`,l.style.display=`flex`,s.className=`btn btn-accent`,s.style.cssText=`padding:6px 14px; font-size:12px;`,o.className=`btn btn-secondary`,o.style.cssText=`padding:6px 14px; font-size:12px;`}),document.getElementById(`gp-store-search`)?.addEventListener(`input`,t=>{let n=document.getElementById(`gp-store-results`);n&&(n.innerHTML=pe(e,t.target.value)),ve()}),ve(),document.getElementById(`gp-store-add-btn`)?.addEventListener(`click`,()=>{let t=document.getElementById(`gp-store-selected-code`)?.value?.trim(),n=document.getElementById(`gp-store-selected-name`)?.value?.trim(),r=parseInt(document.getElementById(`gp-store-qty`)?.value||`1`),i=parseFloat(document.getElementById(`gp-store-price`)?.value||`0`)||0,a=document.getElementById(`gp-store-desc`)?.value?.trim()||``;if(!t||!n){D.showToast(`Select Item`,`Please click an item from the store list first.`,`warning`);return}if(r<1){D.showToast(`Invalid Qty`,`Quantity must be at least 1.`,`warning`);return}let o=e.find(e=>e.code===t),s=A.filter(e=>e.code===t).reduce((e,t)=>e+t.quantity,0);o&&s+r>o.currentStock&&D.showToast(`Low Stock Alert`,`Requested ${s+r} but only ${o.currentStock} in store!`,`warning`),A.push({code:t,name:n,quantity:r,price:i,description:a,source:`store`}),document.getElementById(`gp-store-selected-code`).value=``,document.getElementById(`gp-store-selected-name`).value=``,document.getElementById(`gp-store-selected-display`).value=``,document.getElementById(`gp-store-qty`).value=1,document.getElementById(`gp-store-price`).value=``,document.getElementById(`gp-store-desc`).value=``,document.querySelectorAll(`.gp-store-item-row`).forEach(e=>e.style.background=`transparent`),ge(),D.showToast(`Item Added`,`${n} × ${r} added to pass.`,`success`)}),document.getElementById(`gp-manual-add-btn`)?.addEventListener(`click`,()=>{let e=document.getElementById(`gp-manual-code`)?.value?.trim()||`MANUAL`,t=document.getElementById(`gp-manual-name`)?.value?.trim(),n=parseInt(document.getElementById(`gp-manual-qty`)?.value||`1`),r=parseFloat(document.getElementById(`gp-manual-price`)?.value||`0`)||0,i=document.getElementById(`gp-manual-desc`)?.value?.trim()||``;if(!t){D.showToast(`Item Name Required`,`Please enter a name for the manual item.`,`warning`);return}if(n<1){D.showToast(`Invalid Qty`,`Quantity must be at least 1.`,`warning`);return}A.push({code:e,name:t,quantity:n,price:r,description:i,source:`manual`}),document.getElementById(`gp-manual-code`).value=``,document.getElementById(`gp-manual-name`).value=``,document.getElementById(`gp-manual-qty`).value=1,document.getElementById(`gp-manual-price`).value=``,document.getElementById(`gp-manual-desc`).value=``,ge(),D.showToast(`Manual Item Added`,`${t} × ${n} added as manual entry.`,`success`)}),document.getElementById(`gp-submit-btn`)?.addEventListener(`click`,async()=>{let e=document.getElementById(`gp-new-project-id`)?.value||null,o=a.find(t=>t.id===e),s=o?o.name:``,c=document.getElementById(`gp-new-name`)?.value?.trim()||``,l=document.getElementById(`gp-new-designation`)?.value?.trim()||``,u=document.getElementById(`gp-new-contact`)?.value?.trim()||``,d=(document.getElementById(`gp-new-vehno`)?.value?.trim()||``).toUpperCase(),f=document.getElementById(`gp-new-driver`)?.value?.trim()||``,p=document.getElementById(`gp-new-vehtype`)?.value?.trim()||``,m=document.getElementById(`gp-new-date`)?.value||j,h=document.getElementById(`gp-new-returnable`)?.checked||!1,g=parseFloat(document.getElementById(`gp-total-amount`)?.value||`0`)||0,_=parseFloat(document.getElementById(`gp-amount-paid`)?.value||`0`)||0,v=document.getElementById(`gp-payment-mode`)?.value||``,y=document.getElementById(`gp-payment-remarks`)?.value?.trim()||``,ee=(await n.getAll(`gatepasses`)).length+1,b=`GP-${new Date().getFullYear()}-${ee.toString().padStart(4,`0`)}`,x=`gp-${Date.now()}`,te=h?A.filter(e=>e.source===`store`).map(e=>({code:e.code,returnedQty:0,date:``})):[],S={id:x,gatePassNo:b,date:m,projectId:e||null,projectName:s||``,status:`Pending`,person:{name:c,designation:l,contact:u},vehicle:{vehicleNo:d,driverName:f,vehicleType:p},items:[...A],returnable:h,returns:te,pricing:{totalAmount:g,amountPaid:_,paymentMode:v,remarks:y}};if(await n.put(`gatepasses`,S),await r.queueOperation(`gatepasses`,`insert`,S),e)try{let t=A.length,a=A.map(e=>({text:`${e.name} (${e.code||`N/A`}) × ${e.quantity} [${e.source===`store`?`Store`:`Manual`}]`,completed:!1})),o={id:`task-gp-${Date.now()}`,projectId:e,name:`📦 Material Dispatch: ${b}`,description:`Gate Pass ${b} issued on ${m} for ${t} items to ${c||`Site`}. Driver: ${f||`N/A`}, Vehicle: ${d||`N/A`}. Total value: ₹${g.toLocaleString(`en-IN`)}.`,assignees:[c||f||`storekeeper`],deadline:m,priority:`medium`,status:`in-progress`,subtasks:a,activityLog:[{time:new Date().toISOString(),user:i.getCurrentUser()?.username||`System`,action:`Created material dispatch task from Gate Pass ${b}`}]};await n.put(`tasks`,o),await r.queueOperation(`tasks`,`insert`,o)}catch(e){console.warn(`Could not auto-create project task for gate pass:`,e)}D.closeModal(),D.showToast(`Gate Pass Created`,`${b} created successfully${s?` for ${s}`:``}${A.length>0?` with ${A.length} items`:``}.`,`success`),O=x,await M(t)})}function ve(){document.querySelectorAll(`.gp-store-item-row`).forEach(e=>{e.addEventListener(`click`,()=>{let t=e.getAttribute(`data-code`),n=e.getAttribute(`data-name`),r=document.getElementById(`gp-store-selected-code`),i=document.getElementById(`gp-store-selected-name`),a=document.getElementById(`gp-store-selected-display`);r&&(r.value=t),i&&(i.value=n),a&&(a.value=`${t} — ${n}`),document.querySelectorAll(`.gp-store-item-row`).forEach(e=>e.style.background=`transparent`),e.style.background=`rgba(59,130,246,0.15)`})})}function ye(e){document.getElementById(`gp-edit-btn`)?.addEventListener(`click`,async()=>{await fe(document.getElementById(`view-content`),e)});let t=document.getElementById(`gp-approve-btn`);t&&t.addEventListener(`click`,async()=>{e.status=`Approved`,await n.put(`gatepasses`,e),await r.queueOperation(`gatepasses`,`update`,e);let t=await n.getAll(`inventory`);for(let i of e.items||[]){if(i.source===`manual`)continue;let a=t.find(e=>e.code===i.code);if(a){a.currentStock=Math.max(0,a.currentStock-i.quantity),await n.put(`inventory`,a),await r.queueOperation(`inventory`,`update`,a);let t=`tx-${Date.now()}-${Math.random().toString(36).substr(2,5)}`;await n.put(`transactions`,{id:t,itemId:a.id,type:`outward`,quantity:i.quantity,sourceOrPurpose:`Gate pass dispatch: ${e.gatePassNo}`,date:j})}}D.showToast(`Approved`,`Gate pass ${e.gatePassNo} approved. Store stock updated.`,`success`),await M(document.getElementById(`view-content`))}),document.getElementById(`gp-print-btn`)?.addEventListener(`click`,()=>{let t=e.items||[],n=e.pricing?.totalAmount||0,r=e.pricing?.amountPaid||0,i=`
      <div class="gp-print-view">
        <div class="gp-print-header">
          <div>
            <h2 style="margin:0; font-weight:800; font-family:var(--font-heading); letter-spacing:-0.5px;">AEROGLASS INDUSTRIES</h2>
            <span style="font-size:11px; text-transform:uppercase; color:#666;">Glass Engineering & Logistics ERP</span>
          </div>
          <div style="text-align:right;">
            <h3 style="margin:0; font-weight:800;">OUTWARD GATE PASS</h3>
            <span style="font-size:12px;">Pass No: <strong>${e.gatePassNo}</strong></span><br>
            <span style="font-size:11px; color:#777;">Date: ${e.date||`—`}</span>
          </div>
        </div>

        <div class="gp-print-body-sections">
          <div>
            <h4 style="margin:0 0 8px; font-size:12px; text-transform:uppercase; color:#777; border-bottom:1.5px solid #000; padding-bottom:4px;">RECIPIENT</h4>
            <div style="font-size:12px; line-height:1.8;">
              <strong>Name:</strong> ${e.person?.name||`—`}<br>
              <strong>Designation:</strong> ${e.person?.designation||`—`}<br>
              <strong>Contact:</strong> ${e.person?.contact||`—`}
            </div>
          </div>
          <div>
            <h4 style="margin:0 0 8px; font-size:12px; text-transform:uppercase; color:#777; border-bottom:1.5px solid #000; padding-bottom:4px;">TRANSPORT</h4>
            <div style="font-size:12px; line-height:1.8;">
              <strong>Vehicle No:</strong> ${e.vehicle?.vehicleNo||`—`}<br>
              <strong>Driver:</strong> ${e.vehicle?.driverName||`—`}<br>
              <strong>Type:</strong> ${e.vehicle?.vehicleType||`—`}
            </div>
          </div>
          <div>
            <h4 style="margin:0 0 8px; font-size:12px; text-transform:uppercase; color:#777; border-bottom:1.5px solid #000; padding-bottom:4px;">PROJECT / SITE</h4>
            <div style="font-size:12px; line-height:1.8;">
              <strong>Project:</strong> ${e.projectName||`General Dispatch`}<br>
              <strong>Reference:</strong> ${e.projectId||`Site Direct`}<br>
              <strong>Status:</strong> Authorized Outward
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
              ${t.map(t=>`
                <tr>
                  <td><code>${t.code||`—`}</code></td>
                  <td><strong>${t.name}</strong></td>
                  <td style="text-align:center;">${t.quantity}</td>
                  <td style="text-align:right;">${t.price>0?`₹`+t.price:`—`}</td>
                  <td style="text-align:right; font-weight:600;">${(t.price||0)*t.quantity>0?`₹`+((t.price||0)*t.quantity).toLocaleString(`en-IN`):`—`}</td>
                  <td>${e.returnable&&t.source!==`manual`?`Returnable`:`Non-Returnable`}</td>
                  <td style="font-size:11px;">${t.description||`—`}</td>
                </tr>
              `).join(``)}
              <tr style="border-top:2px solid #000; font-weight:700;">
                <td colspan="4" style="text-align:right; padding-right:8px;">TOTAL AMOUNT:</td>
                <td style="text-align:right;">₹${Number(n).toLocaleString(`en-IN`,{minimumFractionDigits:2})}</td>
                <td colspan="2"></td>
              </tr>
              <tr style="font-weight:600; color:#444;">
                <td colspan="4" style="text-align:right; padding-right:8px;">AMOUNT PAID:</td>
                <td style="text-align:right;">₹${Number(r).toLocaleString(`en-IN`,{minimumFractionDigits:2})}</td>
                <td colspan="2" style="font-size:11px;">${e.pricing?.paymentMode||`—`}</td>
              </tr>
              <tr style="font-weight:700; color:${n-r>0?`#d97706`:`#059669`};">
                <td colspan="4" style="text-align:right; padding-right:8px;">BALANCE DUE:</td>
                <td style="text-align:right;">₹${Number(n-r).toLocaleString(`en-IN`,{minimumFractionDigits:2})}</td>
                <td colspan="2"></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="gp-print-body-sections" style="font-size:11px; color:#555; margin-bottom:20px;">
          <div><strong>Declaration:</strong> Items logged under this pass are verified and cleared for gate dispatch.</div>
          <div style="text-align:right;"><strong>System Issued:</strong> ${new Date().toLocaleDateString(`en-IN`)}</div>
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
    `;D.openModal(`Print Preview — Gate Pass`,i,`900px`),setTimeout(()=>window.print(),450)}),document.getElementById(`gp-close-btn`)?.addEventListener(`click`,async()=>{e.status=`Closed`,await n.put(`gatepasses`,e),await r.queueOperation(`gatepasses`,`update`,e),D.showToast(`Pass Closed`,`${e.gatePassNo} closed successfully.`,`success`),await M(document.getElementById(`view-content`))}),document.getElementById(`gp-delete-btn`)?.addEventListener(`click`,async()=>{confirm(`Are you sure you want to delete gate pass "${e.gatePassNo}"? This cannot be undone.`)&&(await n.delete(`gatepasses`,e.id),await r.queueOperation(`gatepasses`,`delete`,e.id),D.showToast(`Gate Pass Deleted`,`"${e.gatePassNo}" has been removed.`,`info`),O=null,await M(document.getElementById(`view-content`)))});let i=document.getElementById(`commit-return-btn`);i&&i.addEventListener(`click`,async()=>{let t=document.getElementById(`return-item-select`)?.value,i=parseInt(document.getElementById(`return-quantity-input`)?.value||`0`),a=document.getElementById(`return-date-input`)?.value||j;if(!t||i<1)return;let o=e.items.find(e=>e.code===t);if(!o)return;let s=e.returns?.find(e=>e.code===t),c=s?s.returnedQty:0,l=o.quantity-c;if(i>l){D.showToast(`Exceeded Limit`,`Cannot return ${i}. Only ${l} pending.`,`danger`);return}s&&(s.returnedQty+=i,s.date=a);let u=(await n.getAll(`inventory`)).find(e=>e.code===t);u&&(u.currentStock+=i,await n.put(`inventory`,u),await r.queueOperation(`inventory`,`update`,u),await n.put(`transactions`,{id:`tx-${Date.now()}-${Math.random().toString(36).substr(2,5)}`,itemId:u.id,type:`inward`,quantity:i,sourceOrPurpose:`Return under gate pass: ${e.gatePassNo}`,date:a})),e.items.filter(e=>e.source!==`manual`).every(t=>{let n=e.returns?.find(e=>e.code===t.code);return n&&n.returnedQty>=t.quantity})?(e.status=`Returned`,D.showToast(`All Returned`,`All items under ${e.gatePassNo} are returned. Stock updated.`,`success`)):D.showToast(`Return Logged`,`${i} × ${t} returned successfully.`,`success`),await n.put(`gatepasses`,e),await r.queueOperation(`gatepasses`,`update`,e),await M(document.getElementById(`view-content`))})}var N=new Proxy({},{get:(e,t)=>window.app?window.app[t]:void 0}),P=!1;async function F(e){let t=await n.getAll(`employees`),r=await n.getAll(`tools_tracking`),i=await n.getAll(`projects`),a=new Date().toISOString().split(`T`)[0];e.innerHTML=`
    <div style="display:grid; grid-template-columns: 1fr 2fr; gap: 24px; align-items: start;">
      <!-- ISSUE TOOL FORM -->
      <div class="glass-card" style="display:flex; flex-direction:column; gap:16px;">
        <h3 style="font-size:16px; font-family:var(--font-heading); font-weight:700;">🔧 Issue Tool Registry</h3>
        <form id="issue-tool-form" style="display:flex; flex-direction:column; gap:14px;">
          
          <!-- Project Selection -->
          <div class="input-group" style="margin-bottom:0;">
            <label style="font-weight:700; color:var(--text-primary); display:flex; justify-content:space-between;">
              <span>Connected Project / Site</span>
              <span class="muted-text" style="font-size:11px; font-weight:400;">Links to Project & Tasks</span>
            </label>
            <select id="tool-project-select" class="form-control-noicon" style="border-color:var(--primary-color);">
              <option value="">— Workshop / No Project —</option>
              ${i.map(e=>`<option value="${e.id}">🏗️ ${e.name} (${e.status})</option>`).join(``)}
            </select>
          </div>

          <!-- Employee Field -->
          <div class="input-group" style="margin-bottom:0;">
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <label>Employee *</label>
              <button type="button" id="toggle-emp-mode" style="background:none; border:none; color:var(--primary-color); font-size:11px; cursor:pointer; padding:0;">
                ${P?`Select from List`:`Enter Manually`}
              </button>
            </div>
            ${P?`
              <input type="text" id="tool-emp-input" class="form-control-noicon" placeholder="Type employee's full name..." required />
            `:`
              <select id="tool-emp-select" class="form-control-noicon" required>
                <option value="">-- Choose Employee --</option>
                ${t.map(e=>`<option value="${e.name}">${e.name}</option>`).join(``)}
              </select>
            `}
          </div>

          <!-- Tool Details -->
          <div class="input-group" style="margin-bottom:0;">
            <label>Tool Details *</label>
            <input type="text" id="tool-details-input" class="form-control-noicon" placeholder="Item name, serial tracking numbers..." required />
          </div>

          <!-- Date Taken -->
          <div class="input-group" style="margin-bottom:0;">
            <label>Date Taken (Optional)</label>
            <input type="date" id="tool-date-taken" class="form-control-noicon" value="${a}" />
          </div>

          <!-- Expected Return Date -->
          <div class="input-group" style="margin-bottom:0;">
            <label>Expected Return Date (Optional)</label>
            <input type="date" id="tool-date-expected" class="form-control-noicon" />
          </div>

          <button type="submit" class="btn btn-primary btn-block" style="margin-top:8px;">
            Log Tool Allotment
          </button>
        </form>
      </div>

      <!-- ACTIVE LOGS MATRIX -->
      <div class="glass-card" style="display:flex; flex-direction:column; gap:16px;">
        <h3 style="font-size:16px; font-family:var(--font-heading); font-weight:700;">Active Allotments & Return Grid</h3>
        <div class="table-responsive">
          <table class="custom-table" style="font-size:13px;">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Project / Site</th>
                <th>Tool Set</th>
                <th>Issued</th>
                <th>Returned</th>
                <th>Status</th>
                <th style="text-align:center;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${r.length===0?`<tr><td colspan="7" class="text-center muted-text" style="padding:20px;">No tools issued yet.</td></tr>`:``}
              ${r.sort((e,t)=>t.id.localeCompare(e.id)).map(e=>`
                <tr>
                  <td style="font-weight:600;">${e.employeeName}</td>
                  <td>
                    ${e.projectName?`<span class="badge secondary" style="font-size:10px; white-space:nowrap;">🏗️ ${e.projectName}</span>`:`<span class="muted-text">—</span>`}
                  </td>
                  <td style="font-family:monospace; color:var(--text-secondary);">${e.toolDetails}</td>
                  <td>${e.dateTaken||`—`}</td>
                  <td>${e.dateReturned||`—`}</td>
                  <td>
                    <span class="badge ${e.status===`Returned`?`success`:`warning`}">${e.status}</span>
                  </td>
                  <td style="text-align:center;">
                    ${e.status===`Issued`?`
                      <button class="btn btn-secondary mark-returned-btn" data-id="${e.id}" style="padding:4px 8px; font-size:11px;">
                        Mark Returned
                      </button>
                    `:``}
                    <button class="btn btn-primary edit-tool-btn" data-id="${e.id}" style="padding:4px 8px; font-size:11px; margin-left:4px;">
                      Edit
                    </button>
                  </td>
                </tr>
              `).join(``)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,be(e,i),lucide.createIcons()}function be(e,t=[]){document.getElementById(`toggle-emp-mode`)?.addEventListener(`click`,()=>{P=!P,F(e)}),document.getElementById(`issue-tool-form`)?.addEventListener(`submit`,async a=>{a.preventDefault();let o=``;o=P?document.getElementById(`tool-emp-input`)?.value.trim():document.getElementById(`tool-emp-select`)?.value.trim();let s=document.getElementById(`tool-project-select`)?.value||null,c=t.find(e=>e.id===s),l=c?c.name:``,u=document.getElementById(`tool-details-input`)?.value.trim(),d=document.getElementById(`tool-date-taken`)?.value,f=document.getElementById(`tool-date-expected`)?.value;if(!o||!u){N.showToast(`Validation Error`,`Employee Name and Tool Details are mandatory!`,`warning`);return}let p={id:`TL-`+Date.now(),employeeName:o,projectId:s||null,projectName:l||``,toolDetails:u,dateTaken:T.stringify(d),dateReturned:``,expectedReturn:T.stringify(f),status:`Issued`};if(await n.put(`tools_tracking`,p),await r.queueOperation(`tools_tracking`,`insert`,p),s)try{let e={id:`task-tl-${Date.now()}`,projectId:s,name:`🔧 Tool Allocated: ${u}`,description:`Equipment "${u}" allocated to technician ${o}. Issued on ${p.dateTaken||`Today`}, Expected return: ${p.expectedReturn||`Unspecified`}.`,assignees:[o],deadline:p.expectedReturn||p.dateTaken,priority:`low`,status:`in-progress`,subtasks:[{text:`Return ${u} in good condition`,completed:!1}],activityLog:[{time:new Date().toISOString(),user:i.getCurrentUser()?.username||`System`,action:`Issued equipment "${u}" to ${o}`}]};await n.put(`tasks`,e),await r.queueOperation(`tasks`,`insert`,e)}catch(e){console.warn(`Could not auto-create tool task in project:`,e)}N.showToast(`Tool Issued`,`Successfully logged allotment for ${o}${l?` on ${l}`:``}.`,`success`),F(e)}),document.querySelectorAll(`.mark-returned-btn`).forEach(t=>{t.addEventListener(`click`,async t=>{let i=t.target.getAttribute(`data-id`)||t.target.closest(`button`).getAttribute(`data-id`);if(!i)return;let a=await n.get(`tools_tracking`,i);a&&(a.status=`Returned`,a.dateReturned=T.stringify(new Date().toISOString().split(`T`)[0]),await n.put(`tools_tracking`,a),await r.queueOperation(`tools_tracking`,`update`,a),N.showToast(`Tool Returned`,`Marked ${a.toolDetails} as returned.`,`success`),F(e))})}),document.querySelectorAll(`.edit-tool-btn`).forEach(i=>{i.addEventListener(`click`,async i=>{let a=i.target.getAttribute(`data-id`)||i.target.closest(`button`).getAttribute(`data-id`);if(!a)return;let o=await n.get(`tools_tracking`,a);if(o){let i=`
          <form id="edit-tool-form" style="display:flex; flex-direction:column; gap:14px; padding:10px;">
            <div class="input-group" style="margin-bottom:0;">
              <label>Connected Project / Site</label>
              <select id="edit-tool-project" class="form-control-noicon" style="border-color:var(--primary-color);">
                <option value="">— Workshop / No Project —</option>
                ${t.map(e=>`<option value="${e.id}" ${e.id===o.projectId?`selected`:``}>🏗️ ${e.name} (${e.status})</option>`).join(``)}
              </select>
            </div>
            <div class="input-group" style="margin-bottom:0;">
              <label>Employee</label>
              <input type="text" id="edit-tool-emp" class="form-control-noicon" value="${o.employeeName}" required />
            </div>
            <div class="input-group" style="margin-bottom:0;">
              <label>Tool Details</label>
              <input type="text" id="edit-tool-details" class="form-control-noicon" value="${o.toolDetails}" required />
            </div>
            <div class="input-group" style="margin-bottom:0;">
              <label>Date Taken</label>
              <input type="date" id="edit-tool-taken" class="form-control-noicon" value="${o.dateTaken||``}" />
            </div>
            <div class="input-group" style="margin-bottom:0;">
              <label>Expected Return Date</label>
              <input type="date" id="edit-tool-expected" class="form-control-noicon" value="${o.expectedReturn||``}" />
            </div>
            <div class="input-group" style="margin-bottom:0;">
              <label>Status</label>
              <select id="edit-tool-status" class="form-control-noicon">
                <option value="Issued" ${o.status===`Issued`?`selected`:``}>Issued</option>
                <option value="Returned" ${o.status===`Returned`?`selected`:``}>Returned</option>
              </select>
            </div>
            <button type="submit" class="btn btn-primary btn-block" style="margin-top:8px;">
              Save Changes
            </button>
          </form>
        `;N.openModal(`Edit Tool Allotment`,i,`420px`),document.getElementById(`edit-tool-form`).addEventListener(`submit`,async i=>{i.preventDefault();let a=document.getElementById(`edit-tool-project`)?.value||null,s=t.find(e=>e.id===a);o.projectId=a,o.projectName=s?s.name:``,o.employeeName=document.getElementById(`edit-tool-emp`).value.trim(),o.toolDetails=document.getElementById(`edit-tool-details`).value.trim(),o.dateTaken=document.getElementById(`edit-tool-taken`).value,o.expectedReturn=document.getElementById(`edit-tool-expected`).value,o.status=document.getElementById(`edit-tool-status`).value,o.status===`Returned`&&!o.dateReturned&&(o.dateReturned=T.stringify(new Date().toISOString().split(`T`)[0])),await n.put(`tools_tracking`,o),await r.queueOperation(`tools_tracking`,`update`,o),N.closeModal(),N.showToast(`Tool Updated`,`Successfully updated tool allotment.`,`success`),F(e)})}})})}async function xe(e,t=null,a=null){let o=await n.getAll(`employees`),s=await n.getAll(`projects`),c=new Date().toISOString().split(`T`)[0],l=`
    <form id="modal-issue-tool-form" style="display:flex; flex-direction:column; gap:14px; padding:10px;">
      <div class="input-group" style="margin-bottom:0;">
        <label style="font-weight:700; color:var(--text-primary);">Connected Project / Site</label>
        <select id="modal-tool-project" class="form-control-noicon" style="border-color:var(--primary-color);">
          <option value="">— Workshop / No Project —</option>
          ${s.map(e=>`<option value="${e.id}" ${e.id===t?`selected`:``}>🏗️ ${e.name} (${e.status})</option>`).join(``)}
        </select>
      </div>

      <div class="input-group" style="margin-bottom:0;">
        <label>Employee / Technician *</label>
        <select id="modal-tool-emp" class="form-control-noicon" required>
          <option value="">-- Choose Employee --</option>
          ${o.map(e=>`<option value="${e.name}">${e.name}</option>`).join(``)}
        </select>
      </div>

      <div class="input-group" style="margin-bottom:0;">
        <label>Tool Details / Serial No. *</label>
        <input type="text" id="modal-tool-details" class="form-control-noicon" placeholder="e.g. Suction Lifter Pair, Diamond Glass Cutter" required />
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div class="input-group" style="margin-bottom:0;">
          <label>Date Taken</label>
          <input type="date" id="modal-tool-taken" class="form-control-noicon" value="${c}" />
        </div>
        <div class="input-group" style="margin-bottom:0;">
          <label>Expected Return</label>
          <input type="date" id="modal-tool-expected" class="form-control-noicon" />
        </div>
      </div>

      <button type="submit" class="btn btn-primary btn-block" style="margin-top:8px;">
        Issue Equipment
      </button>
    </form>
  `;N.openModal(`Issue Equipment / Tool`,l,`450px`),document.getElementById(`modal-issue-tool-form`)?.addEventListener(`submit`,async e=>{e.preventDefault();let t=document.getElementById(`modal-tool-project`)?.value||null,o=s.find(e=>e.id===t),c=o?o.name:``,l=document.getElementById(`modal-tool-emp`)?.value.trim(),u=document.getElementById(`modal-tool-details`)?.value.trim(),d=document.getElementById(`modal-tool-taken`)?.value,f=document.getElementById(`modal-tool-expected`)?.value;if(!l||!u){N.showToast(`Error`,`Employee and Tool Details are required`,`warning`);return}let p={id:`TL-`+Date.now(),employeeName:l,projectId:t||null,projectName:c||``,toolDetails:u,dateTaken:T.stringify(d),dateReturned:``,expectedReturn:T.stringify(f),status:`Issued`};if(await n.put(`tools_tracking`,p),await r.queueOperation(`tools_tracking`,`insert`,p),t)try{let e={id:`task-tl-${Date.now()}`,projectId:t,name:`🔧 Tool Allocated: ${u}`,description:`Equipment "${u}" allocated to technician ${l}. Issued on ${p.dateTaken||`Today`}, Expected return: ${p.expectedReturn||`Unspecified`}.`,assignees:[l],deadline:p.expectedReturn||p.dateTaken,priority:`low`,status:`in-progress`,subtasks:[{text:`Return ${u} in good condition`,completed:!1}],activityLog:[{time:new Date().toISOString(),user:i.getCurrentUser()?.username||`System`,action:`Issued equipment "${u}" to ${l}`}]};await n.put(`tasks`,e),await r.queueOperation(`tasks`,`insert`,e)}catch(e){console.warn(`Could not auto-create tool task in project:`,e)}N.closeModal(),N.showToast(`Tool Issued`,`Successfully logged allotment for ${l}${c?` on ${c}`:``}.`,`success`),typeof a==`function`&&a()})}var I=new Proxy({},{get:(e,t)=>window.app?window.app[t]:void 0}),L=null,R={assignee:``,priority:``,search:``,projectSearch:``},z=`tasks`;async function Se(e,t=[]){let r=await n.getAll(`projects`),i=await n.getAll(`tasks`),a=await n.getAll(`gatepasses`),o=await n.getAll(`tools_tracking`);!L&&r.length>0&&(L=r[0].id);let s=i.filter(e=>e.projectId===L).length,c=a.filter(e=>e.projectId===L).length,l=o.filter(e=>e.projectId===L).length,u=null;t[1]===`task`&&t[2]&&(u=t[2]),e.innerHTML=`
    <div style="display: grid; grid-template-columns: 300px 1fr; gap: 24px; height: calc(100vh - 150px);">
      <!-- Left side: Project Selection List -->
      <div class="glass-card" style="display:flex; flex-direction:column; padding: 20px; overflow-y:hidden; gap: 16px;">
        <div style="display:flex; flex-direction:column; gap:12px;">
          <h3 style="font-size:15px; font-family:var(--font-heading); font-weight:700;">Projects List</h3>
          <button id="add-project-btn" class="btn btn-primary btn-block" style="padding:10px; font-size:12px; display:flex; align-items:center; justify-content:center; gap:8px;">
            <i data-lucide="plus-circle" style="width:16px; height:16px;"></i>
            <span>Add New Project</span>
          </button>
        </div>
        
        <div class="search-input-wrapper">
          <i data-lucide="search"></i>
          <input type="text" id="project-search-input" placeholder="Search projects..." class="form-control" style="padding-top:6px; padding-bottom:6px; font-size:12px;" value="${R.projectSearch}">
        </div>

        <div id="project-roster-list" style="display:flex; flex-direction:column; gap:10px; flex-grow:1; overflow-y:auto; padding-right:4px;">
          <!-- Projects list loaded dynamically -->
        </div>
      </div>

      <!-- Right side: Workspaces with Tab Switchers -->
      <div style="display:flex; flex-direction:column; gap: 16px; height:100%; overflow:hidden;">
        <!-- Tabs Header -->
        <div class="glass-card" style="padding: 6px 12px; display:flex; gap:8px; align-items:center; flex-shrink:0; overflow-x:auto;">
          <button id="project-tab-tasks" class="btn ${z===`tasks`?`btn-primary`:`btn-secondary`}" style="padding: 6px 14px; font-size:12px; display:flex; align-items:center; gap:6px; ${z===`tasks`?`background:var(--primary-color);`:`background:transparent;`}">
            <i data-lucide="kanban-square" style="width:14px; height:14px;"></i>
            <span id="tab-label-tasks">Tasks Kanban (${s})</span>
          </button>
          <button id="project-tab-gatepasses" class="btn ${z===`gatepasses`?`btn-primary`:`btn-secondary`}" style="padding: 6px 14px; font-size:12px; display:flex; align-items:center; gap:6px; ${z===`gatepasses`?`background:var(--primary-color);`:`background:transparent;`}">
            <i data-lucide="file-check-2" style="width:14px; height:14px;"></i>
            <span id="tab-label-gatepasses">Gate Passes (${c})</span>
          </button>
          <button id="project-tab-tools" class="btn ${z===`tools`?`btn-primary`:`btn-secondary`}" style="padding: 6px 14px; font-size:12px; display:flex; align-items:center; gap:6px; ${z===`tools`?`background:var(--primary-color);`:`background:transparent;`}">
            <i data-lucide="clipboard-list" style="width:14px; height:14px;"></i>
            <span id="tab-label-tools">Order Tracking (${l})</span>
          </button>
        </div>

        <!-- Tab 1: Kanban Board workspace -->
        <div id="project-tasks-view" style="display: ${z===`tasks`?`flex`:`none`}; flex-direction:column; gap: 14px; height:100%; overflow:hidden;">
          <!-- Filters header panel -->
          <div class="glass-card" style="padding: 14px 16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; flex-shrink:0;">
            <div class="filter-group">
              <div class="search-input-wrapper">
                <i data-lucide="search"></i>
                <input type="text" id="task-search-input" placeholder="Search tasks..." class="form-control" style="padding-top:7px; padding-bottom:7px; font-size:12px;" value="${R.search}">
              </div>
              
              <select id="task-assignee-filter" class="form-control-noicon" style="padding: 7px 10px; width:150px; font-size:12px;">
                <option value="">All Assignees</option>
                <!-- Populated dynamically -->
              </select>

              <select id="task-priority-filter" class="form-control-noicon" style="padding: 7px 10px; width:130px; font-size:12px;">
                <option value="">All Priorities</option>
                <option value="low" ${R.priority===`low`?`selected`:``}>Low Priority</option>
                <option value="medium" ${R.priority===`medium`?`selected`:``}>Medium Priority</option>
                <option value="high" ${R.priority===`high`?`selected`:``}>High Priority</option>
              </select>
            </div>

            <div>
              <button id="add-task-btn" class="btn btn-primary" style="padding: 8px 16px; font-size:12px;">
                <i data-lucide="plus"></i>
                <span>Create Task</span>
              </button>
            </div>
          </div>

          <!-- Scrollable Kanban workspace columns + Logistics Header -->
          <div id="kanban-workspace" style="flex-grow:1; overflow-y:auto; padding-bottom: 20px;">
            <!-- Loaded dynamically -->
          </div>
        </div>

        <!-- Tab 2: Connected Gate Passes Ledger Workspace -->
        <div id="project-gatepasses-view" style="display: ${z===`gatepasses`?`flex`:`none`}; flex-direction:column; gap: 14px; height:100%; overflow:hidden;">
          <!-- Gate Passes Ledger loaded dynamically -->
        </div>

        <!-- Tab 3: Connected Tools Tracking Workspace -->
        <div id="project-tools-view" style="display: ${z===`tools`?`flex`:`none`}; flex-direction:column; gap: 14px; height:100%; overflow:hidden;">
          <!-- Tools Tracking loaded dynamically -->
        </div>

      </div>
    </div>
  `;try{await V()}catch(e){console.error(`Failed to refresh project roster:`,e)}if(await Ce(e),je(e),u){let e=await n.get(`tasks`,u);e&&Me(e)}}async function Ce(e){if(await B(),z===`tasks`){try{await H(e)}catch(e){console.error(`Failed to refresh Kanban board:`,e)}try{await we()}catch(e){console.error(`Failed to populate assignee filters:`,e)}}else if(z===`gatepasses`)try{await Te(e)}catch(e){console.error(`Failed to refresh project gate passes:`,e)}else if(z===`tools`)try{await Ee(e)}catch(e){console.error(`Failed to refresh project tools:`,e)}lucide.createIcons()}async function B(){if(!L)return;let e=await n.getAll(`tasks`),t=await n.getAll(`gatepasses`),r=await n.getAll(`tools_tracking`),i=e.filter(e=>e.projectId===L).length,a=t.filter(e=>e.projectId===L).length,o=r.filter(e=>e.projectId===L).length,s=document.getElementById(`tab-label-tasks`),c=document.getElementById(`tab-label-gatepasses`),l=document.getElementById(`tab-label-tools`);s&&(s.textContent=`Tasks Kanban (${i})`),c&&(c.textContent=`Gate Passes (${a})`),l&&(l.textContent=`Order Tracking (${o})`)}async function V(){let e=document.getElementById(`project-roster-list`);if(!e)return;let t=await n.getAll(`projects`),r=await n.getAll(`tasks`),i=await n.getAll(`gatepasses`),a=await n.getAll(`tools_tracking`),o=t;if(R.projectSearch){let e=R.projectSearch.toLowerCase();o=o.filter(t=>t.name.toLowerCase().includes(e)||(t.description||``).toLowerCase().includes(e))}e.innerHTML=o.map(e=>{let t=r.filter(t=>t.projectId===e.id),n=i.filter(t=>t.projectId===e.id),o=a.filter(t=>t.projectId===e.id),s=t.filter(e=>e.status===`done`).length,c=t.length>0?Math.round(s/t.length*100):0,l=e.id===L;return`
      <div class="project-selector-item pointer ${l?`active-project`:``}" data-id="${e.id}" 
           style="padding:12px; border-radius:var(--radius-md); border:1px solid ${l?`var(--primary-color)`:`var(--glass-border)`}; 
           background:${l?`var(--primary-glow)`:`rgba(255,255,255,0.01)`}; transition:all var(--transition-fast);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
          <strong style="font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:80%;">${e.name}</strong>
          ${e.status===`Archived`?`<span class="badge secondary" style="font-size:8px;">Archived</span>`:``}
        </div>
        <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-secondary); margin-bottom:4px;">
          <span>${t.length} tasks</span>
          <span>${c}% done</span>
        </div>
        <div style="display:flex; gap:6px; font-size:10px; color:var(--text-muted); margin-bottom:6px;">
          <span>📦 ${n.length} passes</span>
          <span>·</span>
          <span>🔧 ${o.length} tools</span>
        </div>
        <div style="width:100%; height:4px; background:var(--glass-border); border-radius:2px; overflow:hidden;">
          <div style="width:${c}%; height:100%; background:${l?`var(--primary-color)`:`var(--text-muted)`};"></div>
        </div>
      </div>
    `}).join(``)}async function we(){let e=document.getElementById(`task-assignee-filter`);if(!e)return;let t=await n.getAll(`employees`);e.innerHTML=`<option value="">All Assignees</option>`,t.forEach(t=>{let n=t.name,r=t.contact&&typeof t.contact==`string`&&t.contact.includes(`@`)?t.contact.split(`@`)[0]:t.id.toLowerCase(),i=R.assignee===r?`selected`:``;e.innerHTML+=`<option value="${r}" ${i}>${n}</option>`})}async function H(e){let t=document.getElementById(`kanban-workspace`);if(!t)return;if(!L){t.innerHTML=`<div class="glass-card text-center muted-text" style="padding:100px;">Please create or select a project.</div>`;return}let r=await n.getAll(`tasks`),i=await n.getAll(`gatepasses`),a=await n.getAll(`tools_tracking`),o=i.filter(e=>e.projectId===L),s=a.filter(e=>e.projectId===L),c=r.filter(e=>e.projectId===L);if(R.search){let e=R.search.toLowerCase();c=c.filter(t=>t.name.toLowerCase().includes(e)||t.description.toLowerCase().includes(e))}R.assignee&&(c=c.filter(e=>e.assignees.includes(R.assignee))),R.priority&&(c=c.filter(e=>e.priority===R.priority));let l=c.filter(e=>e.status===`todo`),u=c.filter(e=>e.status===`in-progress`),d=c.filter(e=>e.status===`review`),f=c.filter(e=>e.status===`done`);t.innerHTML=`
    <!-- Connected Logistics & Assets Overview Banner -->
    <div class="glass-card" style="padding: 14px 18px; margin-bottom: 16px; border: 1px solid var(--glass-border); background: rgba(255,255,255,0.015); border-radius: var(--radius-md);">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:12px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <i data-lucide="truck" style="width:16px; height:16px; color:var(--primary-color);"></i>
          <h4 style="font-size:13px; font-weight:700; margin:0; text-transform:uppercase; letter-spacing:0.5px;">Connected Project Logistics & Assets</h4>
        </div>
        <div style="display:flex; gap:8px;">
          <button id="project-banner-new-gp" class="btn btn-secondary" style="padding:5px 12px; font-size:11px; display:flex; align-items:center; gap:4px;">
            <i data-lucide="file-plus" style="width:12px; height:12px;"></i> New Pass
          </button>
          <button id="project-banner-new-tool" class="btn btn-secondary" style="padding:5px 12px; font-size:11px; display:flex; align-items:center; gap:4px;">
            <i data-lucide="wrench" style="width:12px; height:12px;"></i> Issue Tool
          </button>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
        <!-- Gate Passes column summary -->
        <div style="background:rgba(0,0,0,0.14); border-radius:8px; padding:10px 14px; border:1px solid var(--glass-border);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-size:11px; font-weight:700; color:var(--text-secondary); text-transform:uppercase;">
              📦 Dispatched Passes (${o.length})
            </span>
            <button id="banner-view-passes-btn" style="background:none; border:none; color:var(--primary-color); font-size:11px; cursor:pointer; padding:0; display:flex; align-items:center; gap:2px;">
              <span>View Ledger</span> <i data-lucide="chevron-right" style="width:12px; height:12px;"></i>
            </button>
          </div>
          ${o.length===0?`
            <div style="font-size:11px; color:var(--text-muted); padding:4px 0;">No gate passes issued for this project yet.</div>
          `:`
            <div style="display:flex; flex-direction:column; gap:6px; max-height:100px; overflow-y:auto;">
              ${o.slice(0,3).map(e=>{let t=`warning`;return e.status===`Approved`&&(t=`primary`),e.status===`Returned`&&(t=`success`),`
                  <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; padding:4px 8px; background:rgba(255,255,255,0.03); border-radius:4px;">
                    <span><strong>${e.gatePassNo}</strong> · ${e.date||`—`} · ${(e.items||[]).length} items</span>
                    <span class="badge ${t}" style="font-size:9px;">${e.status}</span>
                  </div>
                `}).join(``)}
            </div>
          `}
        </div>

        <!-- Tools column summary -->
        <div style="background:rgba(0,0,0,0.14); border-radius:8px; padding:10px 14px; border:1px solid var(--glass-border);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-size:11px; font-weight:700; color:var(--text-secondary); text-transform:uppercase;">
              🔧 Allocated Equipment (${s.length})
            </span>
            <button id="banner-view-tools-btn" style="background:none; border:none; color:var(--primary-color); font-size:11px; cursor:pointer; padding:0; display:flex; align-items:center; gap:2px;">
              <span>View Registry</span> <i data-lucide="chevron-right" style="width:12px; height:12px;"></i>
            </button>
          </div>
          ${s.length===0?`
            <div style="font-size:11px; color:var(--text-muted); padding:4px 0;">No tools currently allotted to this site.</div>
          `:`
            <div style="display:flex; flex-direction:column; gap:6px; max-height:100px; overflow-y:auto;">
              ${s.slice(0,3).map(e=>`
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; padding:4px 8px; background:rgba(255,255,255,0.03); border-radius:4px;">
                  <span><strong>${e.toolDetails}</strong> (${e.employeeName})</span>
                  <span class="badge ${e.status===`Returned`?`success`:`warning`}" style="font-size:9px;">${e.status}</span>
                </div>
              `).join(``)}
            </div>
          `}
        </div>
      </div>
    </div>

    <!-- Kanban Columns Grid -->
    <div class="kanban-board">
      <!-- 1. TO DO -->
      <div class="kanban-column" data-status="todo">
        <div class="column-header todo" style="display:flex; justify-content:space-between; align-items:center; width:100%; padding-right:12px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <h3>To Do</h3>
            <span class="task-count">${l.length}</span>
          </div>
          <button class="add-column-task-btn" data-status="todo" title="Add task to To Do" style="background:transparent; border:none; color:var(--text-secondary); cursor:pointer; display:flex; align-items:center; padding:4px; border-radius:4px; transition:all 0.2s;">
            <i data-lucide="plus-circle" style="width:16px; height:16px;"></i>
          </button>
        </div>
        <div class="column-cards" id="column-todo">
          ${l.map(e=>De(e)).join(``)}
        </div>
      </div>

      <!-- 2. IN PROGRESS -->
      <div class="kanban-column" data-status="in-progress">
        <div class="column-header in-progress" style="display:flex; justify-content:space-between; align-items:center; width:100%; padding-right:12px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <h3>In Progress</h3>
            <span class="task-count">${u.length}</span>
          </div>
          <button class="add-column-task-btn" data-status="in-progress" title="Add task to In Progress" style="background:transparent; border:none; color:var(--text-secondary); cursor:pointer; display:flex; align-items:center; padding:4px; border-radius:4px; transition:all 0.2s;">
            <i data-lucide="plus-circle" style="width:16px; height:16px;"></i>
          </button>
        </div>
        <div class="column-cards" id="column-inprogress">
          ${u.map(e=>De(e)).join(``)}
        </div>
      </div>

      <!-- 3. IN REVIEW -->
      <div class="kanban-column" data-status="review">
        <div class="column-header review" style="display:flex; justify-content:space-between; align-items:center; width:100%; padding-right:12px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <h3>Review</h3>
            <span class="task-count">${d.length}</span>
          </div>
          <button class="add-column-task-btn" data-status="review" title="Add task to Review" style="background:transparent; border:none; color:var(--text-secondary); cursor:pointer; display:flex; align-items:center; padding:4px; border-radius:4px; transition:all 0.2s;">
            <i data-lucide="plus-circle" style="width:16px; height:16px;"></i>
          </button>
        </div>
        <div class="column-cards" id="column-review">
          ${d.map(e=>De(e)).join(``)}
        </div>
      </div>

      <!-- 4. DONE -->
      <div class="kanban-column" data-status="done">
        <div class="column-header done" style="display:flex; justify-content:space-between; align-items:center; width:100%; padding-right:12px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <h3>Completed</h3>
            <span class="task-count">${f.length}</span>
          </div>
          <button class="add-column-task-btn" data-status="done" title="Add task to Completed" style="background:transparent; border:none; color:var(--text-secondary); cursor:pointer; display:flex; align-items:center; padding:4px; border-radius:4px; transition:all 0.2s;">
            <i data-lucide="plus-circle" style="width:16px; height:16px;"></i>
          </button>
        </div>
        <div class="column-cards" id="column-done">
          ${f.map(e=>De(e)).join(``)}
        </div>
      </div>
    </div>
  `,document.getElementById(`banner-view-passes-btn`)?.addEventListener(`click`,()=>Oe(`gatepasses`,e)),document.getElementById(`banner-view-tools-btn`)?.addEventListener(`click`,()=>Oe(`tools`,e)),document.getElementById(`project-banner-new-gp`)?.addEventListener(`click`,()=>{de(e,L)}),document.getElementById(`project-banner-new-tool`)?.addEventListener(`click`,()=>{xe(e,L,async()=>{await V(),await Ce(e)})}),ke(),lucide.createIcons()}async function Te(e){let t=document.getElementById(`project-gatepasses-view`);if(!t)return;let r=(await n.getAll(`gatepasses`)).filter(e=>e.projectId===L);t.innerHTML=`
    <div class="glass-card" style="display:flex; flex-direction:column; gap:16px; padding:20px; height:100%; overflow:hidden;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div>
          <h3 style="font-size:16px; font-family:var(--font-heading); font-weight:700; display:flex; align-items:center; gap:8px;">
            <i data-lucide="file-check-2" style="width:18px; height:18px; color:var(--primary-color);"></i>
            <span>Project Material Dispatches & Gate Passes</span>
          </h3>
          <p class="muted-text" style="font-size:12px; margin-top:2px;">Showing all outward material vouchers issued for this site.</p>
        </div>
        <button id="proj-new-gatepass-btn" class="btn btn-primary" style="padding:8px 16px; font-size:12px; display:flex; align-items:center; gap:6px;">
          <i data-lucide="plus"></i>
          <span>Create Gate Pass for Project</span>
        </button>
      </div>

      <div class="table-responsive" style="flex-grow:1; overflow-y:auto;">
        <table class="custom-table" style="font-size:12px;">
          <thead>
            <tr>
              <th>Pass No</th>
              <th>Date</th>
              <th>Recipient / Phone</th>
              <th>Vehicle / Driver</th>
              <th>Dispatched Items</th>
              <th>Total (₹)</th>
              <th>Type</th>
              <th>Status</th>
              <th style="text-align:center;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${r.length===0?`
              <tr>
                <td colspan="9" class="text-center muted-text" style="padding:60px 20px;">
                  <i data-lucide="package-x" style="width:40px; height:40px; margin-bottom:8px; opacity:0.4; display:block; margin:0 auto 8px;"></i>
                  No gate passes created for this project yet.
                  <div style="margin-top:10px;">
                    <button id="empty-proj-gp-btn" class="btn btn-primary" style="padding:6px 14px; font-size:11px;">
                      + Create First Gate Pass
                    </button>
                  </div>
                </td>
              </tr>
            `:r.map(e=>{let t=`warning`;e.status===`Approved`&&(t=`primary`),e.status===`Returned`&&(t=`success`),e.status===`Closed`&&(t=`secondary`);let n=(e.items||[]).map(e=>`${e.name} × ${e.quantity}`).join(`, `);return`
                <tr>
                  <td><strong>${e.gatePassNo}</strong></td>
                  <td>${e.date||`—`}</td>
                  <td>
                    <div><strong>${e.person?.name||`—`}</strong></div>
                    <span style="font-size:10px; color:var(--text-muted);">${e.person?.contact||``}</span>
                  </td>
                  <td>
                    <div><code>${e.vehicle?.vehicleNo||`—`}</code></div>
                    <span style="font-size:10px; color:var(--text-muted);">${e.vehicle?.driverName||``}</span>
                  </td>
                  <td style="max-width:240px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${n}">
                    📦 ${n||`No items`}
                  </td>
                  <td style="font-weight:600;">₹${Number(e.pricing?.totalAmount||0).toLocaleString(`en-IN`)}</td>
                  <td>${e.returnable?`<span class="badge warning" style="font-size:9px;">Returnable</span>`:`<span class="badge secondary" style="font-size:9px;">Standard</span>`}</td>
                  <td><span class="badge ${t}" style="font-size:9px;">${e.status}</span></td>
                  <td style="text-align:center;">
                    <a href="#gatepass" class="btn btn-secondary" style="padding:4px 8px; font-size:11px; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
                      <i data-lucide="external-link" style="width:12px; height:12px;"></i> View Pass
                    </a>
                  </td>
                </tr>
              `}).join(``)}
          </tbody>
        </table>
      </div>
    </div>
  `,document.getElementById(`proj-new-gatepass-btn`)?.addEventListener(`click`,()=>{de(e,L)}),document.getElementById(`empty-proj-gp-btn`)?.addEventListener(`click`,()=>{de(e,L)}),lucide.createIcons()}async function Ee(e){let t=document.getElementById(`project-tools-view`);if(!t)return;let i=(await n.getAll(`tools_tracking`)).filter(e=>e.projectId===L);t.innerHTML=`
    <div class="glass-card" style="display:flex; flex-direction:column; gap:16px; padding:20px; height:100%; overflow:hidden;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div>
          <h3 style="font-size:16px; font-family:var(--font-heading); font-weight:700; display:flex; align-items:center; gap:8px;">
            <i data-lucide="wrench" style="width:18px; height:18px; color:var(--primary-color);"></i>
            <span>Project Allocated Tools & Equipment</span>
          </h3>
          <p class="muted-text" style="font-size:12px; margin-top:2px;">Track specialized tools and equipment deployed to this construction site.</p>
        </div>
        <button id="proj-new-tool-btn" class="btn btn-primary" style="padding:8px 16px; font-size:12px; display:flex; align-items:center; gap:6px;">
          <i data-lucide="plus"></i>
          <span>Issue Tool to this Project</span>
        </button>
      </div>

      <div class="table-responsive" style="flex-grow:1; overflow-y:auto;">
        <table class="custom-table" style="font-size:12px;">
          <thead>
            <tr>
              <th>Technician / Employee</th>
              <th>Tool Set / Serial Tracking</th>
              <th>Date Issued</th>
              <th>Expected Return</th>
              <th>Date Returned</th>
              <th>Status</th>
              <th style="text-align:center;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${i.length===0?`
              <tr>
                <td colspan="7" class="text-center muted-text" style="padding:60px 20px;">
                  <i data-lucide="wrench" style="width:40px; height:40px; margin-bottom:8px; opacity:0.4; display:block; margin:0 auto 8px;"></i>
                  No tools currently allocated to this project.
                  <div style="margin-top:10px;">
                    <button id="empty-proj-tool-btn" class="btn btn-primary" style="padding:6px 14px; font-size:11px;">
                      + Issue Equipment to Project
                    </button>
                  </div>
                </td>
              </tr>
            `:i.map(e=>`
              <tr>
                <td><strong>${e.employeeName}</strong></td>
                <td style="font-family:monospace; color:var(--text-secondary);">${e.toolDetails}</td>
                <td>${e.dateTaken||`—`}</td>
                <td>${e.expectedReturn||`—`}</td>
                <td>${e.dateReturned||`—`}</td>
                <td>
                  <span class="badge ${e.status===`Returned`?`success`:`warning`}" style="font-size:9px;">${e.status}</span>
                </td>
                <td style="text-align:center;">
                  ${e.status===`Issued`?`
                    <button class="btn btn-secondary mark-tool-proj-returned-btn" data-id="${e.id}" style="padding:4px 8px; font-size:11px;">
                      Mark Returned
                    </button>
                  `:`
                    <span style="font-size:11px; color:var(--success);">Returned</span>
                  `}
                </td>
              </tr>
            `).join(``)}
          </tbody>
        </table>
      </div>
    </div>
  `,t.querySelectorAll(`.mark-tool-proj-returned-btn`).forEach(t=>{t.addEventListener(`click`,async t=>{let i=t.target.getAttribute(`data-id`);if(!i)return;let a=await n.get(`tools_tracking`,i);a&&(a.status=`Returned`,a.dateReturned=T.stringify(new Date().toISOString().split(`T`)[0]),await n.put(`tools_tracking`,a),await r.queueOperation(`tools_tracking`,`update`,a),I.showToast(`Tool Returned`,`Marked ${a.toolDetails} as returned.`,`success`),await Ee(e),await B(),await V())})});let a=()=>{xe(e,L,async()=>{await Ee(e),await B(),await V()})};document.getElementById(`proj-new-tool-btn`)?.addEventListener(`click`,a),document.getElementById(`empty-proj-tool-btn`)?.addEventListener(`click`,a),lucide.createIcons()}function De(e){let t=(e.subtasks||[]).filter(e=>e.completed).length,n=(e.subtasks||[]).length;return`
    <div class="task-card" draggable="true" data-id="${e.id}">
      <span class="task-priority-badge ${e.priority}">${e.priority}</span>
      <h4>${e.name}</h4>
      <p>${e.description}</p>
      
      ${n>0?`
        <div style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-secondary); margin-bottom:12px;">
          <i data-lucide="check-square" style="width:13px; height:13px;"></i>
          <span>${t} / ${n} checklist</span>
        </div>
      `:``}

      <div class="task-card-meta">
        <span style="display:flex; align-items:center; gap:4px;">
          <i data-lucide="calendar" style="width:12px; height:12px;"></i>
          <span>${e.deadline||`No date`}</span>
        </span>
        
        <div class="task-assignees">
          ${(e.assignees||[]).map(e=>`
            <div class="assignee-avatar" title="${e}">${e.substring(0,2).toUpperCase()}</div>
          `).join(``)}
        </div>
      </div>
    </div>
  `}async function Oe(e,t){z=e;let n=document.getElementById(`project-tab-tasks`),r=document.getElementById(`project-tab-gatepasses`),i=document.getElementById(`project-tab-tools`),a=document.getElementById(`project-tasks-view`),o=document.getElementById(`project-gatepasses-view`),s=document.getElementById(`project-tools-view`);[n,r,i].forEach(e=>{e&&(e.className=`btn btn-secondary`,e.style.background=`transparent`)}),a&&(a.style.display=`none`),o&&(o.style.display=`none`),s&&(s.style.display=`none`),e===`tasks`?(n&&(n.className=`btn btn-primary`,n.style.background=`var(--primary-color)`),a&&(a.style.display=`flex`),await H(t)):e===`gatepasses`?(r&&(r.className=`btn btn-primary`,r.style.background=`var(--primary-color)`),o&&(o.style.display=`flex`),await Te(t)):e===`tools`&&(i&&(i.className=`btn btn-primary`,i.style.background=`var(--primary-color)`),s&&(s.style.display=`flex`),await Ee(t)),await B(),lucide.createIcons()}function ke(){let e=document.querySelectorAll(`.task-card`),t=document.querySelectorAll(`.kanban-column`),a=null;e.forEach(e=>{e.addEventListener(`dragstart`,t=>{a=e,e.classList.add(`dragging`)}),e.addEventListener(`dragend`,()=>{e.classList.remove(`dragging`),a=null}),e.addEventListener(`click`,async t=>{if(t.target.closest(`[draggable]`)?.classList.contains(`dragging`))return;let r=e.getAttribute(`data-id`),i=await n.get(`tasks`,r);i&&Me(i)})}),t.forEach(e=>{e.addEventListener(`dragover`,t=>{t.preventDefault(),e.classList.add(`drag-over`)}),e.addEventListener(`dragleave`,()=>{e.classList.remove(`drag-over`)}),e.addEventListener(`drop`,async t=>{if(t.preventDefault(),e.classList.remove(`drag-over`),!a)return;let o=a.getAttribute(`data-id`),s=e.getAttribute(`data-status`),c=await n.get(`tasks`,o);if(c&&c.status!==s){let e=c.status;c.status=s,c.activityLog.push({time:new Date().toISOString(),user:i.getCurrentUser()?.username||`System`,action:`Shifted status from ${e} to ${s}`}),await n.put(`tasks`,c),await r.queueOperation(`tasks`,`update`,c),await V(),await H(document.getElementById(`view-content`)),I.showToast(`Task Shifted`,`"${c.name}" is now in ${s}.`,`success`)}})})}async function Ae(e,t=`todo`){if(!L){I.showToast(`Action Blocked`,`Please create a project first before adding tasks.`,`warning`);return}let a=`
    <form id="create-task-form" class="login-form" style="padding:0;">
      <div class="input-group">
        <label>Task Name <span style="color:var(--danger); font-size:11px;">*required</span></label>
        <input type="text" id="new-task-name" class="form-control-noicon" required placeholder="Enter task title...">
      </div>
      <div class="input-group">
        <label>Description <span class="muted-text" style="font-size:10px;">(optional)</span></label>
        <textarea id="new-task-desc" class="form-control-noicon" rows="2" placeholder="Task instruction detail..."></textarea>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
        <div class="input-group">
          <label>Deadline <span class="muted-text" style="font-size:10px;">(optional)</span></label>
          <input type="date" id="new-task-deadline" class="form-control-noicon" value="2026-05-30">
        </div>
        <div class="input-group">
          <label>Priority <span class="muted-text" style="font-size:10px;">(optional)</span></label>
          <select id="new-task-priority" class="form-control-noicon">
            <option value="low">Low</option>
            <option value="medium" selected>Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>
      <div class="input-group">
        <label>Assign to Team Member</label>
        <div style="display:flex; gap:8px; align-items:center;">
          <select id="new-task-assignee" class="form-control-noicon" style="flex-grow:1;" required>
            ${(await n.getAll(`employees`)).map(e=>`<option value="${e.contact&&typeof e.contact==`string`&&e.contact.includes(`@`)?e.contact.split(`@`)[0]:e.id.toLowerCase()}">${e.name}</option>`).join(``)}
          </select>
          <button type="button" id="task-manual-toggle-btn" class="btn btn-secondary" style="padding:6px 10px; font-size:11px; white-space:nowrap;">
            <i data-lucide="pencil" style="width:12px; height:12px;"></i> Manual
          </button>
        </div>
        <div id="task-manual-assign-wrapper" style="display:none; margin-top:8px;">
          <input type="text" id="new-task-manual-assignee" class="form-control-noicon" placeholder="Enter custom assignee name...">
        </div>
      </div>
      <button type="submit" class="btn btn-primary btn-block">Create Kanban Task</button>
    </form>
  `;I.openModal(`Create Project Task`,a),document.getElementById(`task-manual-toggle-btn`)?.addEventListener(`click`,()=>{let e=document.getElementById(`task-manual-assign-wrapper`),t=document.getElementById(`new-task-assignee`),n=document.getElementById(`new-task-manual-assignee`);e.style.display===`none`?(e.style.display=`block`,t.style.display=`none`,t.required=!1):(e.style.display=`none`,t.style.display=`block`,t.required=!0,n.value=``)}),document.getElementById(`create-task-form`).addEventListener(`submit`,async a=>{a.preventDefault();let o=document.getElementById(`new-task-name`).value,s=document.getElementById(`new-task-desc`).value||``,c=document.getElementById(`new-task-deadline`).value||``,l=document.getElementById(`new-task-priority`).value||`medium`,u=document.getElementById(`task-manual-assign-wrapper`)?.style?.display===`block`?document.getElementById(`new-task-manual-assignee`)?.value?.trim()||`Unassigned`:document.getElementById(`new-task-assignee`).value,d={id:`task-${Date.now()}`,projectId:L,name:o,description:s,assignees:[u],deadline:c,priority:l,status:t,subtasks:[],activityLog:[{time:new Date().toISOString(),user:i.getCurrentUser()?.username||`Admin`,action:`Created task`}]};await n.put(`tasks`,d),await r.queueOperation(`tasks`,`insert`,d),I.closeModal(),I.showToast(`Task Created`,`Added task "${o}" to ${t} column.`,`success`),await H(e),await V(),await B()})}function je(e){let t=document.getElementById(`project-roster-list`);t&&t.addEventListener(`click`,async t=>{let n=t.target.closest(`.project-selector-item`);n&&(L=n.getAttribute(`data-id`),await V(),await Ce(e))}),document.getElementById(`project-tab-tasks`)?.addEventListener(`click`,()=>Oe(`tasks`,e)),document.getElementById(`project-tab-gatepasses`)?.addEventListener(`click`,()=>Oe(`gatepasses`,e)),document.getElementById(`project-tab-tools`)?.addEventListener(`click`,()=>Oe(`tools`,e));let i=document.getElementById(`project-search-input`);i&&i.addEventListener(`input`,e=>{R.projectSearch=e.target.value,V()}),document.getElementById(`task-search-input`)?.addEventListener(`input`,t=>{R.search=t.target.value,H(e)}),document.getElementById(`task-assignee-filter`)?.addEventListener(`change`,t=>{R.assignee=t.target.value,H(e)}),document.getElementById(`task-priority-filter`)?.addEventListener(`change`,t=>{R.priority=t.target.value,H(e)}),document.getElementById(`add-project-btn`)?.addEventListener(`click`,()=>{I.openModal(`Initialize New Project`,`
      <form id="create-project-form" class="login-form" style="padding:0;">
        <div class="input-group">
          <label>Project Name <span style="color:var(--danger); font-size:11px;">*required</span></label>
          <input type="text" id="new-proj-name" class="form-control-noicon" required placeholder="e.g. Glass Partition Suite C...">
        </div>
        <div class="input-group">
          <label>Description <span class="muted-text" style="font-size:10px;">(optional)</span></label>
          <textarea id="new-proj-desc" class="form-control-noicon" rows="3" placeholder="Describe the project objective..."></textarea>
        </div>
        <button type="submit" class="btn btn-primary btn-block">Initialize Project</button>
      </form>
    `),document.getElementById(`create-project-form`).addEventListener(`submit`,async t=>{t.preventDefault();let i=document.getElementById(`new-proj-name`).value,a=document.getElementById(`new-proj-desc`).value||``,o=`proj-${Date.now()}`,s={id:o,name:i,description:a,status:`Active`,createdAt:new Date().toISOString()};await n.put(`projects`,s),await r.queueOperation(`projects`,`insert`,s),L=o,I.closeModal(),I.showToast(`Project Created`,`Initialized milestone project: "${i}"`,`success`),Se(e)})}),document.getElementById(`add-task-btn`)?.addEventListener(`click`,()=>{Ae(e,`todo`)}),document.getElementById(`kanban-workspace`)?.addEventListener(`click`,t=>{let n=t.target.closest(`.add-column-task-btn`);n&&Ae(e,n.getAttribute(`data-status`)||`todo`)})}function Me(e){let t=`
    <div style="display:flex; flex-direction:column; gap:20px;">
      <!-- Title Block -->
      <div>
        <span class="task-priority-badge ${e.priority}">${e.priority}</span>
        <h2 style="font-size:20px; font-family:var(--font-heading); font-weight:700; margin:6px 0;">${e.name}</h2>
        <p class="muted-text" style="font-size:13px;">${e.description}</p>
      </div>

      <!-- Parameters Row -->
      <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:16px; border-top:1px solid var(--glass-border); padding-top:16px;">
        <div>
          <span style="font-size:11px; color:var(--text-muted); display:block; text-transform:uppercase;">Deadline</span>
          <strong style="font-size:13px;">${e.deadline||`No date`}</strong>
        </div>
        <div>
          <span style="font-size:11px; color:var(--text-muted); display:block; text-transform:uppercase;">Status</span>
          <span class="badge ${e.status===`done`?`success`:e.status===`review`?`warning`:`primary`}">${e.status}</span>
        </div>
        <div>
          <span style="font-size:11px; color:var(--text-muted); display:block; text-transform:uppercase;">Assignees</span>
          <strong style="font-size:13px;">${(e.assignees||[]).join(`, `)}</strong>
        </div>
      </div>

      <!-- Checklist Section -->
      <div style="border-top:1px solid var(--glass-border); padding-top:16px;">
        <h4 style="font-size:14px; font-weight:600; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
          <span>Subtasks Checklist</span>
          <span style="font-size:11px;" id="modal-subtasks-count"></span>
        </h4>
        <div id="modal-subtask-list" class="subtasks-list">
          <!-- Populated by loop -->
        </div>

        <div style="display:flex; gap:10px; margin-top:12px;">
          <input type="text" id="add-subtask-input" class="form-control-noicon" style="padding:6px 12px; font-size:13px;" placeholder="Add new check item...">
          <button id="add-subtask-btn" class="btn btn-secondary" style="padding:6px 12px;">Add</button>
        </div>
      </div>

      <!-- Activities and Comments Logs -->
      <div style="border-top:1px solid var(--glass-border); padding-top:16px;">
        <h4 style="font-size:14px; font-weight:600; margin-bottom:10px;">Activity Log</h4>
        <div id="modal-task-activities" style="max-height:180px; overflow-y:auto; display:flex; flex-direction:column; gap:8px; background:rgba(0,0,0,0.1); padding:10px; border-radius:6px; border:1px solid var(--glass-border);">
          <!-- Activities list -->
        </div>

        <div style="display:flex; gap:10px; margin-top:12px;">
          <input type="text" id="task-comment-input" class="form-control-noicon" style="padding:6px 12px; font-size:13px;" placeholder="Add progress comment...">
          <button id="task-comment-btn" class="btn btn-primary" style="padding:6px 12px;">Send</button>
        </div>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px; border-top:1px solid var(--glass-border); padding-top:16px;">
        <button id="task-delete-btn" class="btn btn-danger" style="padding:8px 16px;">Delete Task</button>
      </div>
    </div>
  `;I.openModal(`Task Verification Detail`,t,`580px`);let a=()=>{let t=document.getElementById(`modal-subtask-list`),s=document.getElementById(`modal-subtasks-count`);if(!e.subtasks||e.subtasks.length===0){t.innerHTML=`<p class="muted-text" style="font-size:12px;">No subtasks checklist configured for this task.</p>`,s.textContent=`0%`;return}let c=e.subtasks.filter(e=>e.completed).length,l=e.subtasks.length;s.textContent=`${Math.round(c/l*100)}% completed (${c}/${l})`,t.innerHTML=e.subtasks.map((e,t)=>`
      <label class="subtask-item ${e.completed?`completed`:``}" style="cursor:pointer; display:flex; align-items:center; gap:10px;">
        <input type="checkbox" class="subtask-chk" data-idx="${t}" ${e.completed?`checked`:``}>
        <span>${e.text}</span>
      </label>
    `).join(``),t.querySelectorAll(`.subtask-chk`).forEach(t=>{t.addEventListener(`change`,async s=>{let c=parseInt(t.getAttribute(`data-idx`));e.subtasks[c].completed=s.target.checked,e.activityLog.push({time:new Date().toISOString(),user:i.getCurrentUser()?.username||`User`,action:`${s.target.checked?`Checked`:`Unchecked`} item: "${e.subtasks[c].text}"`}),await n.put(`tasks`,e),await r.queueOperation(`tasks`,`update`,e),a(),o(),await H(document.getElementById(`view-content`)),await V()})})},o=()=>{let t=document.getElementById(`modal-task-activities`);t.innerHTML=(e.activityLog||[]).map(e=>`
      <div style="font-size:12px; display:flex; justify-content:space-between;">
        <span><strong>${e.user}</strong>: ${e.action}</span>
        <span class="muted-text" style="font-size:10px;">${new Date(e.time).toLocaleTimeString()}</span>
      </div>
    `).reverse().join(``)};a(),o();let s=document.getElementById(`add-subtask-input`),c=document.getElementById(`add-subtask-btn`),l=async()=>{let t=s.value.trim();t&&(e.subtasks||=[],e.subtasks.push({text:t,completed:!1}),e.activityLog.push({time:new Date().toISOString(),user:i.getCurrentUser()?.username||`Admin`,action:`Added checklist item: "${t}"`}),await n.put(`tasks`,e),await r.queueOperation(`tasks`,`update`,e),s.value=``,a(),o(),await H(document.getElementById(`view-content`)),await V())};c?.addEventListener(`click`,l),s?.addEventListener(`keypress`,e=>{e.key===`Enter`&&l()});let u=document.getElementById(`task-comment-input`),d=document.getElementById(`task-comment-btn`),f=async()=>{let t=u.value.trim();t&&(e.activityLog.push({time:new Date().toISOString(),user:i.getCurrentUser()?.username||`User`,action:`Added comment: "${t}"`}),await n.put(`tasks`,e),await r.queueOperation(`tasks`,`update`,e),u.value=``,o())};d?.addEventListener(`click`,f),u?.addEventListener(`keypress`,e=>{e.key===`Enter`&&f()}),document.getElementById(`task-delete-btn`)?.addEventListener(`click`,async()=>{confirm(`Are you absolutely sure you want to delete task: "${e.name}"?`)&&(await n.delete(`tasks`,e.id),await r.queueOperation(`tasks`,`delete`,e.id),I.closeModal(),I.showToast(`Task Deleted`,`Successfully deleted task from Kanban board.`,`success`),await H(document.getElementById(`view-content`)),await V(),await B())})}var U=new Proxy({},{get:(e,t)=>window.app?window.app[t]:void 0}),W=`directory`;function G(){let e=new Date;return`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,`0`)}-${String(e.getDate()).padStart(2,`0`)}`}var K=G();async function Ne(e){let t=await n.getAll(`users`),i=null;if(e.username&&(i=t.find(t=>t.username.toLowerCase()===e.username.toLowerCase())),i||=t.find(t=>t.employeeId===e.id),!i){let n=(e.name||``).toLowerCase().replace(/[^a-z0-9]/g,``);i=t.find(e=>e.username.toLowerCase()===n)}if(i)e.username||(e.username=i.username,await n.put(`employees`,e));else{let t=(e.username||(e.name||``).toLowerCase().replace(/[^a-z0-9]/g,``)||`emp_${e.id.toLowerCase().replace(/[^a-z0-9]/g,``)}`).trim();i={username:t,password:`user123`,role:e.role||`Employee`,status:`Active`,employeeId:e.id},await n.put(`users`,i),await r.queueOperation(`users`,`insert`,i),e.username=t,await n.put(`employees`,e),await r.queueOperation(`employees`,`update`,e)}return i}async function Pe(){try{if((await n.getAll(`employees`)).length===0)for(let e of[{id:`EMP-1001`,name:`John Doe`,username:`employee`,role:`Operations Lead`,department:`Operations`,contact:`john.doe@aeglas.com`,phone:`+91 9826011223`,joiningDate:`2025-01-15`,documents:[{name:`ID_Passport.pdf`}],leaveBalance:15,salary:45e3},{id:`EMP-1002`,name:`Jane Smith`,username:`hr`,role:`HR Manager`,department:`Human Resources`,contact:`jane.smith@aeglas.com`,phone:`+91 9826011224`,joiningDate:`2024-03-01`,documents:[{name:`Degree_HR.pdf`}],leaveBalance:18,salary:65e3},{id:`EMP-1003`,name:`Bob Miller`,username:`storekeeper`,role:`Store Keeper`,department:`Logistics`,contact:`bob.miller@aeglas.com`,phone:`+91 9826011225`,joiningDate:`2024-11-10`,documents:[{name:`Logistics_Cert.pdf`}],leaveBalance:14,salary:38e3},{id:`EMP-1004`,name:`Alice Johnson`,username:`alicejohnson`,role:`Structural Engineer`,department:`Projects & Engineering`,contact:`alice.j@aeglas.com`,phone:`+91 9826011226`,joiningDate:`2025-06-01`,documents:[{name:`Civil_Degree.pdf`}],leaveBalance:12,salary:5e4},{id:`EMP-1005`,name:`Charles Xavier`,username:`manager`,role:`Operations Director`,department:`Operations`,contact:`charles.x@aeglas.com`,phone:`+91 9826011227`,joiningDate:`2023-05-15`,documents:[],leaveBalance:20,salary:8e4}])await n.put(`employees`,e),await r.queueOperation(`employees`,`insert`,e)}catch(e){console.warn(`Error verifying employee seed:`,e)}}async function Fe(e,t=[]){await Pe(),t[1]&&[`directory`,`attendance`,`credentials`,`leaves`,`payroll`].includes(t[1])&&(W=t[1]),e.innerHTML=`
    <div style="display:flex; flex-direction:column; gap:20px; height:100%;">
      <!-- Internal Tab Navigation -->
      <div class="glass-card" style="padding:12px 20px;">
        <div class="tabs-navigation" style="margin-bottom:0; border-bottom:none; padding-bottom:0;">
          <button class="tab-btn ${W===`directory`?`active`:``}" data-tab="directory">
            <i data-lucide="contact" style="width:16px; height:16px; display:inline-block; vertical-align:middle; margin-right:6px;"></i>
            <span>Staff Directory</span>
          </button>
          <button class="tab-btn ${W===`attendance`?`active`:``}" data-tab="attendance">
            <i data-lucide="calendar-check-2" style="width:16px; height:16px; display:inline-block; vertical-align:middle; margin-right:6px;"></i>
            <span>Daily Attendance</span>
          </button>
          <button class="tab-btn ${W===`credentials`?`active`:``}" data-tab="credentials">
            <i data-lucide="key-round" style="width:16px; height:16px; display:inline-block; vertical-align:middle; margin-right:6px;"></i>
            <span>Usernames & Passwords</span>
          </button>
          <button class="tab-btn ${W===`leaves`?`active`:``}" data-tab="leaves">
            <i data-lucide="banknote" style="width:16px; height:16px; display:inline-block; vertical-align:middle; margin-right:6px;"></i>
            <span>Salary Advances</span>
          </button>
          <button class="tab-btn ${W===`payroll`?`active`:``}" data-tab="payroll">
            <i data-lucide="wallet" style="width:16px; height:16px; display:inline-block; vertical-align:middle; margin-right:6px;"></i>
            <span>Departments & Payroll</span>
          </button>
        </div>
      </div>

      <!-- Tab View Content Container -->
      <div id="hr-tab-viewport" style="flex-grow:1;">
        <!-- Injected Dynamically -->
      </div>
    </div>
  `,Ie(e),await q()}function Ie(e){e.querySelectorAll(`.tab-btn`).forEach(t=>{t.addEventListener(`click`,async()=>{e.querySelectorAll(`.tab-btn`).forEach(e=>e.classList.remove(`active`)),t.classList.add(`active`),W=t.getAttribute(`data-tab`),await q()})})}async function q(){let e=document.getElementById(`hr-tab-viewport`);if(e){e.innerHTML=`
    <div class="text-center muted-text" style="padding: 50px 0;">
      <i data-lucide="loader" class="spinning" style="width: 32px; height: 32px; margin-bottom: 12px;"></i>
      <p>Loading HR Subsystem...</p>
    </div>
  `,lucide.createIcons();try{switch(W){case`directory`:await Le(e);break;case`attendance`:await Be(e);break;case`credentials`:await He(e);break;case`leaves`:await Ue(e);break;case`payroll`:await We(e);break;default:await Le(e);break}}catch(t){console.error(`Failed to render HR tab [${W}]:`,t),e.innerHTML=`
      <div class="glass-card text-center" style="margin: 20px auto; max-width: 500px; padding:30px;">
        <i data-lucide="alert-triangle" class="danger-text" style="width: 36px; height: 36px; margin-bottom: 12px;"></i>
        <h3 class="danger-text" style="margin:0 0 8px;">HR View Load Error</h3>
        <p class="muted-text" style="font-size: 13px;">${t.message}</p>
        <button class="btn btn-secondary" onclick="location.reload()" style="margin-top:16px; padding:6px 16px;">
          Reload View
        </button>
      </div>
    `}lucide.createIcons()}}async function Le(e){let t=await n.getAll(`employees`);e.innerHTML=`
    <div class="glass-card" style="display:flex; flex-direction:column; gap:20px; padding:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div class="search-input-wrapper" style="min-width:280px;">
          <i data-lucide="search"></i>
          <input type="text" id="emp-search" placeholder="Search by name, role, department..." class="form-control" style="padding-top:8px; padding-bottom:8px; font-size:12.5px;">
        </div>
        
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <button id="batch-delete-employees-btn" class="btn btn-danger hidden" style="padding: 8px 16px; display:flex; align-items:center; gap:6px;">
            <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
            <span id="batch-delete-emp-text">Delete Selected (0)</span>
          </button>
          <input type="file" id="hr-csv-upload" accept=".csv" style="display:none;" />
          <button id="import-employees-btn" class="btn btn-secondary" style="padding: 8px 16px; display:flex; align-items:center; gap:6px;">
            <i data-lucide="upload-cloud"></i>
            <span>Import CSV</span>
          </button>
          <button id="add-employee-btn" class="btn btn-primary" style="padding: 8px 16px; display:flex; align-items:center; gap:6px; font-weight:600;">
            <i data-lucide="user-plus"></i>
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      <div class="table-responsive">
        <table class="custom-table" id="employees-table" style="font-size:12.5px;">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;"><input type="checkbox" id="select-all-employees" /></th>
              <th style="width: 100px;">ID Number</th>
              <th>Personnel Name</th>
              <th>Designation Role</th>
              <th>Department</th>
              <th>Email / Contact</th>
              <th style="width: 120px;">Salary (₹)</th>
              <th style="text-align:center; width: 170px;">Actions</th>
            </tr>
          </thead>
          <tbody id="employees-list-body">
            ${t.length===0?`
              <tr>
                <td colspan="8" class="text-center muted-text" style="padding:40px 0;">
                  No employee records found. Click <strong>"Add Employee"</strong> above to register staff.
                </td>
              </tr>
            `:t.map(e=>`
              <tr data-id="${e.id}">
                <td style="text-align: center;" class="noclick"><input type="checkbox" class="emp-select-checkbox" data-id="${e.id}" /></td>
                <td><code>${e.id}</code></td>
                <td>
                  <div style="display:flex; align-items:center; gap:10px;">
                    <div style="width:30px; height:30px; border-radius:50%; background:rgba(0,82,204,0.15); color:var(--primary-color); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:11px;">
                      ${(e.name||`E`).substring(0,2).toUpperCase()}
                    </div>
                    <strong>${e.name}</strong>
                  </div>
                </td>
                <td>${e.role||`Employee`}</td>
                <td><span class="badge primary">${e.department||`Operations`}</span></td>
                <td>
                  <div>${e.contact||`N/A`}</div>
                  ${e.phone?`<span style="font-size:10.5px; color:var(--text-muted);">📱 ${e.phone}</span>`:``}
                </td>
                <td style="font-weight:700;">₹${Number(e.salary||0).toLocaleString()}</td>
                <td style="text-align:center;" class="noclick">
                  <div style="display:flex; justify-content:center; gap:6px;">
                    <button class="btn btn-secondary view-profile-btn" data-id="${e.id}" title="View Dossier" style="padding: 4px 8px; font-size:11.5px; display:flex; align-items:center; gap:4px;">
                      <i data-lucide="eye" style="width:13px; height:13px;"></i> View
                    </button>
                    <button class="btn btn-secondary edit-profile-btn" data-id="${e.id}" title="Edit Profile & Credentials" style="padding: 4px 8px; font-size:11.5px; display:flex; align-items:center; gap:4px; color:var(--primary-color);">
                      <i data-lucide="edit" style="width:13px; height:13px;"></i> Edit
                    </button>
                    <button class="btn btn-secondary delete-emp-btn" data-id="${e.id}" title="Delete" style="padding: 4px 8px; font-size:11.5px; color:var(--danger); border:none;">
                      <i data-lucide="trash-2" style="width:13px; height:13px;"></i>
                    </button>
                  </div>
                </td>
              </tr>
            `).join(``)}
          </tbody>
        </table>
      </div>
    </div>
  `,document.getElementById(`emp-search`)?.addEventListener(`input`,e=>{let t=e.target.value.toLowerCase();document.querySelectorAll(`#employees-list-body tr`).forEach(e=>{e.innerText.toLowerCase().includes(t)?e.classList.remove(`hidden`):e.classList.add(`hidden`)})}),e.querySelectorAll(`.view-profile-btn`).forEach(e=>{e.addEventListener(`click`,async()=>{let t=e.getAttribute(`data-id`),r=await n.get(`employees`,t);r&&ze(r)})}),e.querySelectorAll(`.edit-profile-btn`).forEach(e=>{e.addEventListener(`click`,async()=>{let t=e.getAttribute(`data-id`),r=await n.get(`employees`,t);r&&Re(r)})}),e.querySelectorAll(`.delete-emp-btn`).forEach(e=>{e.addEventListener(`click`,async()=>{let t=e.getAttribute(`data-id`),i=await n.get(`employees`,t);i&&confirm(`Are you sure you want to delete employee record for ${i.name}?`)&&(await n.delete(`employees`,t),await r.queueOperation(`employees`,`delete`,t),U.showToast(`Employee Removed`,`Deleted ${i.name}.`,`success`),await q())})}),document.getElementById(`add-employee-btn`)?.addEventListener(`click`,()=>{let e=`
      <form id="create-employee-form" class="login-form" style="padding:0; display:flex; flex-direction:column; gap:14px;">
        <div class="input-group" style="margin-bottom:0;">
          <label>Full Name <span style="color:var(--danger); font-size:11px;">*required</span></label>
          <input type="text" id="new-emp-name" class="form-control-noicon" required placeholder="e.g. Rahul Sharma">
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
          <div class="input-group" style="margin-bottom:0;">
            <label>Email Address</label>
            <input type="email" id="new-emp-email" class="form-control-noicon" placeholder="rahul@example.com">
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Mobile / Phone Number</label>
            <input type="text" id="new-emp-phone" class="form-control-noicon" placeholder="+91 98260XXXXX">
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
          <div class="input-group" style="margin-bottom:0;">
            <label>Designation Role</label>
            <input type="text" id="new-emp-role" class="form-control-noicon" placeholder="e.g. Glass Cutter, Lead Installer" value="Employee">
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Department</label>
            <select id="new-emp-dept" class="form-control-noicon">
              <option value="Operations">Operations</option>
              <option value="Logistics">Logistics</option>
              <option value="Human Resources">Human Resources</option>
              <option value="Projects & Engineering">Projects & Engineering</option>
              <option value="Accounts & Sales">Accounts & Sales</option>
            </select>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
          <div class="input-group" style="margin-bottom:0;">
            <label>Joining Date</label>
            <input type="date" id="new-emp-join" class="form-control-noicon" value="${G()}">
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Monthly Salary (₹)</label>
            <input type="number" id="new-emp-salary" class="form-control-noicon" value="35000">
          </div>
        </div>

        <!-- Initial Login Account Setup -->
        <div style="background:rgba(0,0,0,0.15); padding:12px 14px; border-radius:6px; border:1px solid var(--glass-border); display:flex; flex-direction:column; gap:10px;">
          <span style="font-size:12px; font-weight:700; color:var(--primary-color); text-transform:uppercase;">
            System Login Credentials
          </span>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
            <div class="input-group" style="margin-bottom:0;">
              <label>System Username</label>
              <input type="text" id="new-emp-username" class="form-control-noicon" placeholder="auto-generated if empty" style="font-family:monospace;">
            </div>
            <div class="input-group" style="margin-bottom:0;">
              <label>Login Password</label>
              <input type="text" id="new-emp-password" class="form-control-noicon" value="user123" style="font-family:monospace;">
            </div>
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:8px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary" style="font-weight:700;">Save & Register Profile</button>
        </div>
      </form>
    `;U.openModal(`Register New Employee`,e,`620px`),document.getElementById(`create-employee-form`)?.addEventListener(`submit`,async e=>{e.preventDefault();let t=document.getElementById(`new-emp-name`).value.trim(),i=document.getElementById(`new-emp-email`).value.trim()||``,a=document.getElementById(`new-emp-phone`).value.trim()||``,o=document.getElementById(`new-emp-role`).value.trim()||`Employee`,s=document.getElementById(`new-emp-dept`).value||`Operations`,c=document.getElementById(`new-emp-join`).value||G(),l=parseFloat(document.getElementById(`new-emp-salary`).value)||0,u=`EMP-${Math.floor(1e3+Math.random()*9e3)}`,d=document.getElementById(`new-emp-username`)?.value.trim().toLowerCase();d||=t.toLowerCase().replace(/[^a-z0-9]/g,``)||`user_${u.toLowerCase()}`;let f=document.getElementById(`new-emp-password`)?.value.trim()||`user123`,p={id:u,name:t,username:d,role:o,department:s,contact:i,phone:a,joiningDate:c,documents:[],leaveBalance:15,salary:l};await n.put(`employees`,p),await r.queueOperation(`employees`,`insert`,p);let m={username:d,password:f,role:o,status:`Active`,employeeId:u};await n.put(`users`,m),await r.queueOperation(`users`,`insert`,m),U.closeModal(),U.showToast(`Employee Registered`,`Profile created with login username: "${d}" and password: "${f}".`,`success`,6e3),await q()})}),document.getElementById(`import-employees-btn`)?.addEventListener(`click`,()=>{document.getElementById(`hr-csv-upload`)?.click()}),document.getElementById(`hr-csv-upload`)?.addEventListener(`change`,async e=>{let t=e.target.files[0];if(t){if(typeof Papa>`u`){U.showToast(`Error`,`CSV parser library is not loaded.`,`danger`);return}Papa.parse(t,{header:!0,dynamicTyping:!0,skipEmptyLines:!0,complete:async t=>{let i=0;for(let e of t.data){let t=e.name||e.Name||e[`Full Name`];if(!t)continue;let a=e.contact||e.Contact||e.email||e.Email||``,o=e.phone||e.Phone||e.mobile||``,s=e.role||e.Role||e.Designation||`Employee`,c=e.department||e.Department||`Operations`,l=e.joiningDate||e[`Joining Date`]||G(),u=parseFloat(e.salary||e.Salary)||0,d=`EMP-${Math.floor(1e3+Math.random()*9e3)}`,f=(e.username||t.toLowerCase().replace(/[^a-z0-9]/g,``)||`user_${d.toLowerCase()}`).trim(),p=e.password||`user123`,m={id:d,name:t,username:f,role:s,department:c,contact:a,phone:o,joiningDate:l,documents:[],leaveBalance:15,salary:u};await n.put(`employees`,m),await r.queueOperation(`employees`,`insert`,m);let h={username:f,password:p,role:s,status:`Active`,employeeId:d};await n.put(`users`,h),await r.queueOperation(`users`,`insert`,h),i++}i>0?(U.showToast(`Import Successful`,`Imported ${i} employee records with login accounts.`,`success`),await q()):U.showToast(`Import Warning`,`No valid records found in CSV file.`,`warning`),e.target.value=``},error:e=>{U.showToast(`Import Error`,e.message||`Failed to parse CSV.`,`danger`)}})}});let i=()=>{let e=document.querySelectorAll(`.emp-select-checkbox`),t=Array.from(e).filter(e=>e.checked),n=document.getElementById(`select-all-employees`),r=document.getElementById(`batch-delete-employees-btn`),i=document.getElementById(`batch-delete-emp-text`);n&&(n.checked=e.length>0&&t.length===e.length),r&&i&&(t.length>0?(r.classList.remove(`hidden`),i.textContent=`Remove Selected (${t.length})`):r.classList.add(`hidden`))};document.getElementById(`select-all-employees`)?.addEventListener(`change`,e=>{let t=e.target.checked;document.querySelectorAll(`.emp-select-checkbox`).forEach(e=>{e.checked=t}),i()}),document.getElementById(`employees-list-body`)?.addEventListener(`change`,e=>{e.target.classList.contains(`emp-select-checkbox`)&&i()}),document.getElementById(`batch-delete-employees-btn`)?.addEventListener(`click`,async()=>{let e=document.querySelectorAll(`.emp-select-checkbox:checked`),t=Array.from(e).map(e=>e.getAttribute(`data-id`));if(t.length!==0&&confirm(`Are you sure you want to remove ${t.length} selected employee records?`)){for(let e of t)await n.delete(`employees`,e),await r.queueOperation(`employees`,`delete`,e);U.showToast(`Employees Deleted`,`Removed ${t.length} employee records.`,`success`),await q()}}),lucide.createIcons()}async function Re(e){let t=await Ne(e),i=`
    <form id="edit-employee-form" class="login-form" style="padding:0; display:flex; flex-direction:column; gap:14px;">
      <div class="input-group" style="margin-bottom:0;">
        <label>Full Name <span style="color:var(--danger); font-size:11px;">*required</span></label>
        <input type="text" id="edit-emp-name" class="form-control-noicon" required value="${e.name||``}">
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
        <div class="input-group" style="margin-bottom:0;">
          <label>Email Address</label>
          <input type="email" id="edit-emp-email" class="form-control-noicon" value="${e.contact||``}">
        </div>
        <div class="input-group" style="margin-bottom:0;">
          <label>Mobile / Phone Number</label>
          <input type="text" id="edit-emp-phone" class="form-control-noicon" value="${e.phone||``}">
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
        <div class="input-group" style="margin-bottom:0;">
          <label>Designation Role</label>
          <input type="text" id="edit-emp-role" class="form-control-noicon" value="${e.role||`Employee`}">
        </div>
        <div class="input-group" style="margin-bottom:0;">
          <label>Department</label>
          <select id="edit-emp-dept" class="form-control-noicon">
            <option value="Operations" ${e.department===`Operations`?`selected`:``}>Operations</option>
            <option value="Logistics" ${e.department===`Logistics`?`selected`:``}>Logistics</option>
            <option value="Human Resources" ${e.department===`Human Resources`?`selected`:``}>Human Resources</option>
            <option value="Projects & Engineering" ${e.department===`Projects & Engineering`?`selected`:``}>Projects & Engineering</option>
            <option value="Accounts & Sales" ${e.department===`Accounts & Sales`?`selected`:``}>Accounts & Sales</option>
          </select>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
        <div class="input-group" style="margin-bottom:0;">
          <label>Joining Date</label>
          <input type="date" id="edit-emp-join" class="form-control-noicon" value="${e.joiningDate||``}">
        </div>
        <div class="input-group" style="margin-bottom:0;">
          <label>Monthly Salary (₹)</label>
          <input type="number" id="edit-emp-salary" class="form-control-noicon" value="${e.salary||0}">
        </div>
      </div>

      <!-- System Login Credentials Section -->
      <div style="background:rgba(0,0,0,0.15); padding:14px; border-radius:6px; border:1px solid var(--glass-border); display:flex; flex-direction:column; gap:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:12px; font-weight:700; color:var(--primary-color); text-transform:uppercase; display:flex; align-items:center; gap:6px;">
            <i data-lucide="key-round" style="width:14px; height:14px;"></i>
            System Username & Password
          </span>
          <span class="muted-text" style="font-size:11px;">Operator Login Account</span>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
          <div class="input-group" style="margin-bottom:0;">
            <label>Login Username *</label>
            <input type="text" id="edit-emp-username" class="form-control-noicon" required value="${t.username}" style="font-family:monospace; font-weight:600;">
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Login Password *</label>
            <div style="display:flex; gap:6px;">
              <input type="password" id="edit-emp-password" class="form-control-noicon" required value="${t.password}" style="font-family:monospace; flex:1;">
              <button type="button" id="edit-pwd-toggle-btn" class="btn btn-secondary" style="padding:4px 8px;" title="Show/Hide Password">
                <i data-lucide="eye" style="width:14px; height:14px;"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:8px;">
        <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary" style="font-weight:700;">Save Profile & Credentials</button>
      </div>
    </form>
  `;U.openModal(`Edit Profile: ${e.name}`,i,`620px`),document.getElementById(`edit-pwd-toggle-btn`)?.addEventListener(`click`,()=>{let e=document.getElementById(`edit-emp-password`);e&&(e.type=e.type===`password`?`text`:`password`)}),document.getElementById(`edit-employee-form`)?.addEventListener(`submit`,async i=>{i.preventDefault(),e.name=document.getElementById(`edit-emp-name`).value.trim(),e.contact=document.getElementById(`edit-emp-email`).value.trim(),e.phone=document.getElementById(`edit-emp-phone`).value.trim(),e.role=document.getElementById(`edit-emp-role`).value.trim()||`Employee`,e.department=document.getElementById(`edit-emp-dept`).value||`Operations`,e.joiningDate=document.getElementById(`edit-emp-join`).value||``,e.salary=parseFloat(document.getElementById(`edit-emp-salary`).value)||0;let a=document.getElementById(`edit-emp-username`).value.trim().toLowerCase(),o=document.getElementById(`edit-emp-password`).value.trim();if(!a||!o){U.showToast(`Validation Error`,`Username and Password cannot be empty.`,`danger`);return}let s=t.username;if(a!==s){let e=await n.get(`users`,a);if(e&&e.username!==s){U.showToast(`Username Taken`,`The username "${a}" is already in use by another user.`,`warning`);return}await n.delete(`users`,s),await r.queueOperation(`users`,`delete`,s)}let c={username:a,password:o,role:e.role||`Employee`,status:t.status||`Active`,employeeId:e.id};await n.put(`users`,c),await r.queueOperation(`users`,`update`,c),e.username=a,await n.put(`employees`,e),await r.queueOperation(`employees`,`update`,e),U.closeModal(),U.showToast(`Profile & Credentials Saved`,`Updated ${e.name} with username "${a}".`,`success`),await q()}),lucide.createIcons()}async function ze(e){e.documents=e.documents||[];let t=await Ne(e),i=`info`;U.openModal(`Employee Dossier: ${e.name}`,`
    <div style="display:flex; flex-direction:column; gap:18px;">
      <!-- Profile Card Summary -->
      <div style="display:flex; align-items:center; gap:16px; justify-content:space-between; flex-wrap:wrap; border-bottom:1px solid var(--glass-border); padding-bottom:14px;">
        <div style="display:flex; align-items:center; gap:16px;">
          <div style="width:60px; height:60px; border-radius:50%; background:var(--primary-color); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:22px;">
            ${(e.name||`E`).substring(0,2).toUpperCase()}
          </div>
          <div>
            <h2 style="font-size:18px; font-family:var(--font-heading); font-weight:800; margin:0 0 4px 0;">${e.name}</h2>
            <span class="badge primary">${e.department||`Operations`}</span>
            <span class="badge secondary" style="margin-left:4px;">${e.role||`Employee`}</span>
            <span class="muted-text" style="font-size:11.5px; margin-left:8px;">ID: <code>${e.id}</code></span>
          </div>
        </div>
        <button id="modal-edit-emp-btn" class="btn btn-primary" style="padding:6px 14px; font-size:12px; display:flex; align-items:center; gap:6px;">
          <i data-lucide="edit"></i> Edit Profile
        </button>
      </div>

      <!-- Nested modal profile tabs -->
      <div style="display:flex; gap:6px; border-bottom:1px solid var(--glass-border); padding-bottom:6px; flex-wrap:wrap;">
        <button class="tab-btn modal-prof-tab ${i===`info`?`active`:``}" data-ptab="info" style="padding:5px 12px; font-size:12px;">General Info</button>
        <button class="tab-btn modal-prof-tab ${i===`credentials`?`active`:``}" data-ptab="credentials" style="padding:5px 12px; font-size:12px;">Login Account</button>
        <button class="tab-btn modal-prof-tab ${i===`attendance`?`active`:``}" data-ptab="attendance" style="padding:5px 12px; font-size:12px;">Attendance History</button>
        <button class="tab-btn modal-prof-tab ${i===`leaves`?`active`:``}" data-ptab="leaves" style="padding:5px 12px; font-size:12px;">Advances Taken</button>
        <button class="tab-btn modal-prof-tab ${i===`documents`?`active`:``}" data-ptab="documents" style="padding:5px 12px; font-size:12px;">Documents (${e.documents.length})</button>
      </div>

      <!-- Nested tab contents -->
      <div id="modal-profile-tab-viewport" style="min-height:220px;">
        <!-- Rendered dynamically -->
      </div>
    </div>
  `,`680px`);let a=async()=>{let o=document.getElementById(`modal-profile-tab-viewport`);if(!o)return;let s=(await n.getAll(`leaves`)).filter(t=>t.employeeId===e.id),c=s.filter(e=>e.status===`Outstanding`).reduce((e,t)=>e+parseFloat(t.amount||0),0);if(i===`info`)o.innerHTML=`
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; font-size:12.5px;">
          <div class="info-field-item"><label>ID Number</label><span>${e.id}</span></div>
          <div class="info-field-item"><label>Email Contact</label><span>${e.contact||`N/A`}</span></div>
          <div class="info-field-item"><label>Mobile Phone</label><span>${e.phone||`N/A`}</span></div>
          <div class="info-field-item"><label>Joining Date</label><span>${e.joiningDate||`N/A`}</span></div>
          <div class="info-field-item"><label>Assigned Role</label><span>${e.role||`Employee`}</span></div>
          <div class="info-field-item"><label>Base Monthly Salary</label><span style="font-weight:700;">₹${Number(e.salary||0).toLocaleString()}</span></div>
          <div class="info-field-item"><label>Outstanding Advance</label><span class="danger-text" style="font-weight:700;">₹${c.toLocaleString()}</span></div>
          <div class="info-field-item"><label>System Username</label><span><code>${t.username}</code></span></div>
        </div>
      `;else if(i===`credentials`){o.innerHTML=`
        <div style="background:rgba(0,0,0,0.12); padding:16px; border-radius:6px; border:1px solid var(--glass-border); display:flex; flex-direction:column; gap:14px;">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; font-size:12.5px;">
            <div class="info-field-item">
              <label>System Username</label>
              <span style="font-family:monospace; font-weight:700; font-size:13px; color:var(--primary-color);">${t.username}</span>
            </div>
            <div class="info-field-item">
              <label>Current Password</label>
              <div style="display:flex; align-items:center; gap:8px;">
                <span id="prof-pwd-display" style="font-family:monospace; font-weight:700;">••••••••</span>
                <button type="button" id="prof-pwd-reveal-btn" class="btn btn-secondary" style="padding:2px 8px; font-size:11px;">Show</button>
              </div>
            </div>
            <div class="info-field-item">
              <label>Account Role</label>
              <span><span class="badge primary">${t.role||e.role}</span></span>
            </div>
            <div class="info-field-item">
              <label>Account Status</label>
              <span><span class="badge ${t.status===`Active`?`success`:`danger`}">${t.status||`Active`}</span></span>
            </div>
          </div>

          <div style="border-top:1px dashed var(--glass-border); padding-top:12px; display:flex; justify-content:flex-end;">
            <button type="button" id="prof-quick-edit-creds-btn" class="btn btn-primary" style="font-size:12px; padding:6px 14px;">
              <i data-lucide="edit"></i> Change Username / Password
            </button>
          </div>
        </div>
      `,lucide.createIcons();let n=!1;document.getElementById(`prof-pwd-reveal-btn`)?.addEventListener(`click`,()=>{n=!n;let e=document.getElementById(`prof-pwd-display`),r=document.getElementById(`prof-pwd-reveal-btn`);e&&r&&(e.textContent=n?t.password:`••••••••`,r.textContent=n?`Hide`:`Show`)}),document.getElementById(`prof-quick-edit-creds-btn`)?.addEventListener(`click`,()=>{Re(e)})}else if(i===`attendance`){o.innerHTML=`<div id="employee-calendar-widget" style="padding: 6px 0;"></div>`;let t=document.getElementById(`employee-calendar-widget`),n=new Date;Ve(e,t,n.getFullYear(),n.getMonth())}else i===`leaves`?o.innerHTML=`
        <div style="margin-bottom:10px; font-weight:600; font-size:12.5px;">Total Outstanding Advance: <span class="danger-text">₹${c.toLocaleString()}</span></div>
        <div class="table-responsive" style="max-height:200px; overflow-y:auto;">
          <table class="custom-table" style="font-size:12px;">
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Purpose</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${s.length>0?s.map(e=>`
                <tr>
                  <td><code>${e.date}</code></td>
                  <td><strong>₹${parseFloat(e.amount||0).toLocaleString()}</strong></td>
                  <td>${e.purpose||`N/A`}</td>
                  <td><span class="badge ${e.status===`Outstanding`?`warning`:`success`}">${e.status}</span></td>
                </tr>
              `).join(``):`<tr><td colspan="4" class="text-center muted-text" style="padding:16px;">No advance records in database.</td></tr>`}
            </tbody>
          </table>
        </div>
      `:i===`documents`&&(o.innerHTML=`
        <div class="documents-list">
          ${(e.documents||[]).map(e=>`
            <div class="document-item" style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:rgba(0,0,0,0.1); border-radius:6px; margin-bottom:8px;">
              <span style="display:flex; align-items:center; gap:8px; font-size:12.5px;">
                <i data-lucide="file-text" style="width:16px; height:16px; color:var(--primary-color);"></i>
                <strong>${e.name}</strong>
              </span>
              <span class="badge secondary" style="font-size:10px;">Stored Locally</span>
            </div>
          `).join(``)}

          <div style="border:1px dashed var(--glass-border); padding:16px; border-radius:8px; text-align:center; margin-top:8px;">
            <i data-lucide="upload-cloud" style="width:28px; height:28px; color:var(--text-muted); margin-bottom:6px;"></i>
            <p style="font-size:12px; margin:0 0 8px;" class="muted-text">Upload verification or credential documents</p>
            <input type="file" id="document-upload-mock" style="display:none;">
            <button class="btn btn-secondary" style="padding:5px 14px; font-size:11.5px;" onclick="document.getElementById('document-upload-mock').click()">Browse Document</button>
          </div>
        </div>
      `,lucide.createIcons(),document.getElementById(`document-upload-mock`)?.addEventListener(`change`,async t=>{if(t.target.files.length>0){let i=t.target.files[0].name;e.documents.push({name:i}),await n.put(`employees`,e),await r.queueOperation(`employees`,`update`,e),U.showToast(`Document Uploaded`,`Attached file: ${i}`,`success`),a()}}));lucide.createIcons()};a(),document.querySelectorAll(`.modal-prof-tab`).forEach(e=>{e.addEventListener(`click`,()=>{document.querySelectorAll(`.modal-prof-tab`).forEach(e=>e.classList.remove(`active`)),e.classList.add(`active`),i=e.getAttribute(`data-ptab`),a()})}),document.getElementById(`modal-edit-emp-btn`)?.addEventListener(`click`,()=>{Re(e)}),lucide.createIcons()}async function Be(e){let t=await n.getAll(`employees`),i=(await n.getAll(`attendance`)).filter(e=>e.date===K),a=new Map;i.forEach(e=>a.set(e.employeeId,e));let o=0,s=0,c=0,l=0;t.forEach(e=>{let t=a.get(e.id);t&&t.status&&(t.status===`Present`?o++:t.status===`Half Day`?s++:t.status===`Absent`?c++:t.status===`Leave`&&l++)});let u=t.length,d=u>0?Math.round((o+s*.5)/u*100):0;e.innerHTML=`
    <div style="display:flex; flex-direction:column; gap:20px;">
      <!-- Date Bar & Fast Actions -->
      <div class="glass-card" style="padding:16px 20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <!-- Left: Date Selector & Quick Toggles -->
        <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
          <div style="display:flex; align-items:center; gap:6px;">
            <i data-lucide="calendar" style="width:18px; height:18px; color:var(--primary-color);"></i>
            <span style="font-size:13px; font-weight:700;">Date:</span>
            <input type="date" id="attendance-date-picker" class="form-control-noicon" value="${K}" style="padding:6px 10px; font-size:12.5px; font-weight:600; width:150px;">
          </div>

          <button id="att-btn-today" class="btn btn-secondary" style="padding:6px 12px; font-size:12px;">Today</button>
          <button id="att-btn-yesterday" class="btn btn-secondary" style="padding:6px 12px; font-size:12px;">Yesterday</button>
        </div>

        <!-- Right: Bulk Actions -->
        <div style="display:flex; align-items:center; gap:10px;">
          <button id="att-mark-all-present" class="btn btn-success" style="padding:7px 16px; font-size:12px; font-weight:700; display:flex; align-items:center; gap:6px;">
            <i data-lucide="check-check"></i>
            <span>Mark All Present</span>
          </button>
          <button id="att-reset-all" class="btn btn-secondary" style="padding:7px 12px; font-size:12px; color:var(--danger); border:none;" title="Clear records for this date">
            <i data-lucide="rotate-ccw"></i>
          </button>
        </div>
      </div>

      <!-- KPI Statistics Cards -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:14px;">
        <div class="kpi-card glass-card" style="padding:14px; text-align:center;">
          <span class="muted-text" style="font-size:11px; text-transform:uppercase; font-weight:700;">Total Staff</span>
          <div style="font-size:22px; font-weight:800; color:var(--text-primary); margin-top:2px;">${u}</div>
        </div>
        <div class="kpi-card glass-card" style="padding:14px; text-align:center; border-bottom:3px solid #22c55e;">
          <span class="muted-text" style="font-size:11px; text-transform:uppercase; font-weight:700; color:#22c55e;">Present</span>
          <div style="font-size:22px; font-weight:800; color:#22c55e; margin-top:2px;">${o}</div>
        </div>
        <div class="kpi-card glass-card" style="padding:14px; text-align:center; border-bottom:3px solid #eab308;">
          <span class="muted-text" style="font-size:11px; text-transform:uppercase; font-weight:700; color:#eab308;">Half Day</span>
          <div style="font-size:22px; font-weight:800; color:#eab308; margin-top:2px;">${s}</div>
        </div>
        <div class="kpi-card glass-card" style="padding:14px; text-align:center; border-bottom:3px solid #ef4444;">
          <span class="muted-text" style="font-size:11px; text-transform:uppercase; font-weight:700; color:#ef4444;">Absent</span>
          <div style="font-size:22px; font-weight:800; color:#ef4444; margin-top:2px;">${c}</div>
        </div>
        <div class="kpi-card glass-card" style="padding:14px; text-align:center; border-bottom:3px solid #3b82f6;">
          <span class="muted-text" style="font-size:11px; text-transform:uppercase; font-weight:700; color:#3b82f6;">On Leave</span>
          <div style="font-size:22px; font-weight:800; color:#3b82f6; margin-top:2px;">${l}</div>
        </div>
        <div class="kpi-card glass-card" style="padding:14px; text-align:center;">
          <span class="muted-text" style="font-size:11px; text-transform:uppercase; font-weight:700;">Attendance %</span>
          <div style="font-size:22px; font-weight:800; color:var(--primary-color); margin-top:2px;">${d}%</div>
        </div>
      </div>

      <!-- Attendance Register Table -->
      <div class="glass-card" style="padding:20px; display:flex; flex-direction:column; gap:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div class="search-input-wrapper" style="min-width:260px;">
            <i data-lucide="search"></i>
            <input type="text" id="att-emp-search" placeholder="Search employee in register..." class="form-control" style="padding-top:7px; padding-bottom:7px; font-size:12px;">
          </div>

          <div style="font-size:12px; color:var(--text-secondary);">
            Click <strong>P</strong>, <strong>H</strong>, <strong>A</strong>, or <strong>L</strong> to mark attendance instantly.
          </div>
        </div>

        <div class="table-responsive">
          <table class="custom-table" id="attendance-register-table" style="font-size:12.5px;">
            <thead>
              <tr>
                <th style="width:36px; text-align:center;">#</th>
                <th>Employee Name</th>
                <th>Department</th>
                <th style="width:130px;">Check-In</th>
                <th style="width:130px;">Check-Out</th>
                <th style="width:120px; text-align:center;">Current Status</th>
                <th style="width:230px; text-align:center;">Quick Mark Attendance</th>
              </tr>
            </thead>
            <tbody id="attendance-register-tbody">
              ${t.map((e,t)=>{let n=a.get(e.id)||{status:`Not Recorded`,checkIn:``,checkOut:``},r=n.status||`Not Recorded`,i=`secondary`;return r===`Present`?i=`success`:r===`Half Day`?i=`warning`:r===`Absent`?i=`danger`:r===`Leave`&&(i=`primary`),`
                  <tr data-emp-id="${e.id}">
                    <td style="text-align:center; font-weight:700; color:var(--text-muted);">${t+1}</td>
                    <td>
                      <div style="font-weight:700; color:var(--text-primary);">${e.name}</div>
                      <span class="muted-text" style="font-size:11px;"><code>${e.id}</code> • ${e.role||`Employee`}</span>
                    </td>
                    <td><span class="badge primary">${e.department||`Operations`}</span></td>
                    <td>
                      <input type="time" class="form-control-noicon att-in-time" data-emp-id="${e.id}" value="${n.checkIn||``}" style="padding:4px 6px; font-size:11.5px; width:110px;" />
                    </td>
                    <td>
                      <input type="time" class="form-control-noicon att-out-time" data-emp-id="${e.id}" value="${n.checkOut||``}" style="padding:4px 6px; font-size:11.5px; width:110px;" />
                    </td>
                    <td style="text-align:center;">
                      <span class="badge ${i}" style="font-size:11px; padding:4px 8px;" id="att-badge-${e.id}">
                        ${r}
                      </span>
                    </td>
                    <td style="text-align:center;">
                      <div style="display:flex; justify-content:center; gap:4px;">
                        <button type="button" class="btn att-mark-btn ${r===`Present`?`btn-success`:`btn-secondary`}" data-emp-id="${e.id}" data-status="Present" title="Mark Present" style="padding:4px 10px; font-size:11px; font-weight:700;">
                          P
                        </button>
                        <button type="button" class="btn att-mark-btn ${r===`Half Day`?`btn-warning`:`btn-secondary`}" data-emp-id="${e.id}" data-status="Half Day" title="Mark Half Day" style="padding:4px 10px; font-size:11px; font-weight:700;">
                          H
                        </button>
                        <button type="button" class="btn att-mark-btn ${r===`Absent`?`btn-danger`:`btn-secondary`}" data-emp-id="${e.id}" data-status="Absent" title="Mark Absent" style="padding:4px 10px; font-size:11px; font-weight:700;">
                          A
                        </button>
                        <button type="button" class="btn att-mark-btn ${r===`Leave`?`btn-primary`:`btn-secondary`}" data-emp-id="${e.id}" data-status="Leave" title="Mark On Leave" style="padding:4px 10px; font-size:11px; font-weight:700;">
                          L
                        </button>
                      </div>
                    </td>
                  </tr>
                `}).join(``)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,document.getElementById(`att-emp-search`)?.addEventListener(`input`,e=>{let t=e.target.value.toLowerCase();document.querySelectorAll(`#attendance-register-tbody tr`).forEach(e=>{e.innerText.toLowerCase().includes(t)?e.classList.remove(`hidden`):e.classList.add(`hidden`)})}),document.getElementById(`attendance-date-picker`)?.addEventListener(`change`,async e=>{K=e.target.value,await q()}),document.getElementById(`att-btn-today`)?.addEventListener(`click`,async()=>{K=G(),await q()}),document.getElementById(`att-btn-yesterday`)?.addEventListener(`click`,async()=>{let e=new Date;e.setDate(e.getDate()-1),K=`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,`0`)}-${String(e.getDate()).padStart(2,`0`)}`,await q()});let f=async(t,i)=>{let a=`att-${t}-${K}`,o=e.querySelector(`.att-in-time[data-emp-id="${t}"]`)?.value||``,s=e.querySelector(`.att-out-time[data-emp-id="${t}"]`)?.value||``;if(i===`Present`&&!o){o=`09:00`;let n=e.querySelector(`.att-in-time[data-emp-id="${t}"]`);n&&(n.value=`09:00`)}let c={id:a,employeeId:t,date:K,checkIn:o,checkOut:s,status:i};await n.put(`attendance`,c),await r.queueOperation(`attendance`,`update`,c);let l=document.getElementById(`att-badge-${t}`);if(l){l.textContent=i;let e=`secondary`;i===`Present`?e=`success`:i===`Half Day`?e=`warning`:i===`Absent`?e=`danger`:i===`Leave`&&(e=`primary`),l.className=`badge ${e}`}let u=e.querySelector(`tr[data-emp-id="${t}"]`);u&&u.querySelectorAll(`.att-mark-btn`).forEach(e=>{let t=e.getAttribute(`data-status`);e.className=`btn att-mark-btn btn-secondary`,t===i&&(i===`Present`?e.className=`btn att-mark-btn btn-success`:i===`Half Day`?e.className=`btn att-mark-btn btn-warning`:i===`Absent`?e.className=`btn att-mark-btn btn-danger`:i===`Leave`&&(e.className=`btn att-mark-btn btn-primary`))}),U.showToast(`Attendance Marked`,`Marked as ${i} on ${K}.`,`success`,2e3)};e.querySelectorAll(`.att-mark-btn`).forEach(e=>{e.addEventListener(`click`,async()=>{await f(e.getAttribute(`data-emp-id`),e.getAttribute(`data-status`)),await q()})}),e.querySelectorAll(`.att-in-time, .att-out-time`).forEach(t=>{t.addEventListener(`change`,async()=>{let i=t.getAttribute(`data-emp-id`),a=`att-${i}-${K}`,o=await n.get(`attendance`,a)||{id:a,employeeId:i,date:K,status:`Present`};o.checkIn=e.querySelector(`.att-in-time[data-emp-id="${i}"]`)?.value||``,o.checkOut=e.querySelector(`.att-out-time[data-emp-id="${i}"]`)?.value||``,await n.put(`attendance`,o),await r.queueOperation(`attendance`,`update`,o),U.showToast(`Time Recorded`,`Updated shift times for ${i}.`,`info`,1500)})}),document.getElementById(`att-mark-all-present`)?.addEventListener(`click`,async()=>{for(let e of t){let t=`att-${e.id}-${K}`,i=await n.get(`attendance`,t)||{},a={id:t,employeeId:e.id,date:K,checkIn:i.checkIn||`09:00`,checkOut:i.checkOut||`18:00`,status:`Present`};await n.put(`attendance`,a),await r.queueOperation(`attendance`,`update`,a)}U.showToast(`Attendance Registered`,`All ${t.length} employees marked Present on ${K}.`,`success`),await q()}),document.getElementById(`att-reset-all`)?.addEventListener(`click`,async()=>{if(confirm(`Clear all attendance records for ${K}?`)){for(let e of t){let t=`att-${e.id}-${K}`;await n.delete(`attendance`,t),await r.queueOperation(`attendance`,`delete`,t)}U.showToast(`Attendance Reset`,`Cleared records for ${K}.`,`info`),await q()}}),lucide.createIcons()}async function Ve(e,t,r,i){let a=(await n.getAll(`attendance`)).filter(t=>t.employeeId===e.id),o=[`January`,`February`,`March`,`April`,`May`,`June`,`July`,`August`,`September`,`October`,`November`,`December`],s=new Date(r,i,1).getDay(),c=new Date(r,i+1,0).getDate(),l=0,u=0,d=0,f=0,p=``;for(let e=0;e<s;e++)p+=`<div style="padding:10px; border:1px solid var(--glass-border); opacity:0.15;"></div>`;for(let e=1;e<=c;e++){let t=`${r}-${String(i+1).padStart(2,`0`)}-${String(e).padStart(2,`0`)}`,n=a.find(e=>e.date===t),o=`Unrecorded`,s=`rgba(255,255,255,0.02)`,c=`var(--text-muted)`,m=`—`;n&&(o=n.status,o===`Present`?(s=`rgba(34,197,94,0.15)`,c=`#22c55e`,m=`P`,d++):o===`Absent`?(s=`rgba(239,68,68,0.15)`,c=`#ef4444`,m=`A`,l++):o===`Half Day`?(s=`rgba(234,179,8,0.15)`,c=`#eab308`,m=`H`,u++):o===`Leave`&&(s=`rgba(59,130,246,0.15)`,c=`#3b82f6`,m=`L`,f++)),p+=`
      <div style="padding:6px 4px; border:1px solid var(--glass-border); background:${s}; border-radius:4px; display:flex; flex-direction:column; align-items:center; gap:2px; min-height:42px; justify-content:center;">
        <span style="font-size:10px; font-weight:700; color:var(--text-primary);">${e}</span>
        <span style="font-size:10px; font-weight:800; color:${c};" title="${o}">${m}</span>
      </div>
    `}t.innerHTML=`
    <div style="display:flex; flex-direction:column; gap:14px;">
      <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.15); padding:8px 12px; border-radius:6px; border:1px solid var(--glass-border);">
        <button id="cal-prev-month" class="btn btn-secondary" style="padding:4px 10px; font-size:11px;">&lt; Prev</button>
        <strong style="font-size:13px; font-family:var(--font-heading);">${o[i]} ${r}</strong>
        <button id="cal-next-month" class="btn btn-secondary" style="padding:4px 10px; font-size:11px;">Next &gt;</button>
      </div>

      <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:8px; text-align:center;">
        <div style="padding:6px; background:rgba(34,197,94,0.08); border-left:3px solid #22c55e; border-radius:4px;">
          <span class="muted-text" style="font-size:9.5px; text-transform:uppercase;">Present</span>
          <h4 style="margin:2px 0 0 0; color:#22c55e; font-size:14px;">${d}</h4>
        </div>
        <div style="padding:6px; background:rgba(234,179,8,0.08); border-left:3px solid #eab308; border-radius:4px;">
          <span class="muted-text" style="font-size:9.5px; text-transform:uppercase;">Half Day</span>
          <h4 style="margin:2px 0 0 0; color:#eab308; font-size:14px;">${u}</h4>
        </div>
        <div style="padding:6px; background:rgba(239,68,68,0.08); border-left:3px solid #ef4444; border-radius:4px;">
          <span class="muted-text" style="font-size:9.5px; text-transform:uppercase;">Absent</span>
          <h4 style="margin:2px 0 0 0; color:#ef4444; font-size:14px;">${l}</h4>
        </div>
        <div style="padding:6px; background:rgba(59,130,246,0.08); border-left:3px solid #3b82f6; border-radius:4px;">
          <span class="muted-text" style="font-size:9.5px; text-transform:uppercase;">Leave</span>
          <h4 style="margin:2px 0 0 0; color:#3b82f6; font-size:14px;">${f}</h4>
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:4px;">
        <div style="display:grid; grid-template-columns:repeat(7, 1fr); text-align:center; font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:4px;">
          <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
        </div>
        <div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:4px;">
          ${p}
        </div>
      </div>
    </div>
  `,t.querySelector(`#cal-prev-month`)?.addEventListener(`click`,()=>{let n=i-1,a=r;n<0&&(n=11,a--),Ve(e,t,a,n)}),t.querySelector(`#cal-next-month`)?.addEventListener(`click`,()=>{let n=i+1,a=r;n>11&&(n=0,a++),Ve(e,t,a,n)})}async function He(e){let t=await n.getAll(`employees`),i=[];for(let e of t){let t=await Ne(e);i.push({emp:e,user:t})}e.innerHTML=`
    <div class="glass-card" style="display:flex; flex-direction:column; gap:20px; padding:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div>
          <h3 style="font-size:16px; font-family:var(--font-heading); font-weight:700; margin:0 0 4px 0; display:flex; align-items:center; gap:8px;">
            <i data-lucide="shield-check" style="color:var(--primary-color);"></i>
            Staff Usernames & Passwords Manager
          </h3>
          <p class="muted-text" style="font-size:12px; margin:0;">
            Configure system login username and password for each employee profile. Operators use these credentials to sign in.
          </p>
        </div>

        <div class="search-input-wrapper" style="min-width:280px;">
          <i data-lucide="search"></i>
          <input type="text" id="cred-search-inp" placeholder="Search by name, username, or role..." class="form-control" style="padding-top:7px; padding-bottom:7px; font-size:12px;">
        </div>
      </div>

      <div class="table-responsive">
        <table class="custom-table" id="credentials-table" style="font-size:12.5px;">
          <thead>
            <tr>
              <th style="width:36px; text-align:center;">#</th>
              <th>Personnel Profile</th>
              <th style="width:160px;">System Role</th>
              <th style="width:180px;">System Username *</th>
              <th style="width:240px;">Login Password *</th>
              <th style="width:120px;">Account Status</th>
              <th style="width:130px; text-align:center;">Action</th>
            </tr>
          </thead>
          <tbody id="credentials-list-body">
            ${i.length===0?`
              <tr>
                <td colspan="7" class="text-center muted-text" style="padding:40px 0;">
                  No employee profiles found. Register staff in Staff Directory first.
                </td>
              </tr>
            `:i.map(({emp:e,user:t},n)=>`
              <tr data-emp-id="${e.id}" data-current-username="${t.username}">
                <td style="text-align:center; font-weight:700; color:var(--text-muted);">${n+1}</td>
                <td>
                  <div style="display:flex; align-items:center; gap:10px;">
                    <div style="width:32px; height:32px; border-radius:50%; background:rgba(0,82,204,0.15); color:var(--primary-color); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:11px;">
                      ${(e.name||`E`).substring(0,2).toUpperCase()}
                    </div>
                    <div>
                      <strong style="color:var(--text-primary);">${e.name}</strong>
                      <span class="muted-text" style="font-size:11px; display:block;"><code>${e.id}</code> • ${e.department||`Operations`}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <select class="form-control-noicon cred-role-select" data-emp-id="${e.id}" style="padding:5px 8px; font-size:11.5px;">
                    <option value="Employee" ${t.role===`Employee`?`selected`:``}>Employee</option>
                    <option value="Manager" ${t.role===`Manager`?`selected`:``}>Manager</option>
                    <option value="Store Keeper" ${t.role===`Store Keeper`?`selected`:``}>Store Keeper</option>
                    <option value="HR" ${t.role===`HR`?`selected`:``}>HR Manager</option>
                    <option value="Admin" ${t.role===`Admin`?`selected`:``}>Administrator</option>
                  </select>
                </td>
                <td>
                  <input type="text" class="form-control-noicon cred-username-inp" data-emp-id="${e.id}" value="${t.username}" style="padding:5px 8px; font-size:12px; font-family:monospace; font-weight:600;" required />
                </td>
                <td>
                  <div style="display:flex; align-items:center; gap:4px;">
                    <input type="password" class="form-control-noicon cred-password-inp" data-emp-id="${e.id}" value="${t.password}" style="padding:5px 8px; font-size:12px; font-family:monospace; flex:1;" required />
                    <button type="button" class="btn btn-secondary cred-toggle-pwd-btn" data-emp-id="${e.id}" title="Show/Hide Password" style="padding:5px 7px;">
                      <i data-lucide="eye" style="width:13px; height:13px;"></i>
                    </button>
                    <button type="button" class="btn btn-secondary cred-gen-pwd-btn" data-emp-id="${e.id}" title="Auto-generate password" style="padding:5px 7px; font-size:11px;">
                      🎲
                    </button>
                  </div>
                </td>
                <td>
                  <select class="form-control-noicon cred-status-select" data-emp-id="${e.id}" style="padding:5px 8px; font-size:11.5px;">
                    <option value="Active" ${t.status===`Active`?`selected`:``}>Active</option>
                    <option value="Inactive" ${t.status===`Inactive`?`selected`:``}>Inactive</option>
                  </select>
                </td>
                <td style="text-align:center;">
                  <button type="button" class="btn btn-primary cred-save-btn" data-emp-id="${e.id}" style="padding:5px 14px; font-size:11.5px; font-weight:700; display:inline-flex; align-items:center; gap:4px;">
                    <i data-lucide="save" style="width:12px; height:12px;"></i>
                    <span>Save</span>
                  </button>
                </td>
              </tr>
            `).join(``)}
          </tbody>
        </table>
      </div>
    </div>
  `,document.getElementById(`cred-search-inp`)?.addEventListener(`input`,e=>{let t=e.target.value.toLowerCase();document.querySelectorAll(`#credentials-list-body tr`).forEach(e=>{let n=e.innerText.toLowerCase(),r=e.querySelector(`.cred-username-inp`)?.value.toLowerCase()||``;n.includes(t)||r.includes(t)?e.classList.remove(`hidden`):e.classList.add(`hidden`)})}),e.querySelectorAll(`.cred-toggle-pwd-btn`).forEach(t=>{t.addEventListener(`click`,()=>{let n=t.getAttribute(`data-emp-id`),r=e.querySelector(`.cred-password-inp[data-emp-id="${n}"]`);r&&(r.type=r.type===`password`?`text`:`password`)})}),e.querySelectorAll(`.cred-gen-pwd-btn`).forEach(t=>{t.addEventListener(`click`,()=>{let n=t.getAttribute(`data-emp-id`),r=e.querySelector(`.cred-password-inp[data-emp-id="${n}"]`);if(r){let e=Math.floor(1e3+Math.random()*9e3),t=[`Glass`,`Aero`,`Solar`,`Shield`,`Clear`,`Toughened`],n=`${t[Math.floor(Math.random()*t.length)]}#${e}`;r.value=n,r.type=`text`,U.showToast(`Generated Password`,`Created password: "${n}". Click Save to apply.`,`info`)}})}),e.querySelectorAll(`.cred-save-btn`).forEach(t=>{t.addEventListener(`click`,async()=>{let i=t.getAttribute(`data-emp-id`),a=e.querySelector(`tr[data-emp-id="${i}"]`);if(!a)return;let o=a.getAttribute(`data-current-username`),s=a.querySelector(`.cred-username-inp`)?.value.trim().toLowerCase(),c=a.querySelector(`.cred-password-inp`)?.value.trim(),l=a.querySelector(`.cred-role-select`)?.value||`Employee`,u=a.querySelector(`.cred-status-select`)?.value||`Active`;if(!s||!c){U.showToast(`Validation Error`,`Username and Password cannot be empty.`,`danger`);return}let d=await n.get(`employees`,i);if(!d){U.showToast(`Error`,`Employee profile not found.`,`danger`);return}if(s!==o){let e=await n.get(`users`,s);if(e&&e.username!==o){U.showToast(`Username Taken`,`The username "${s}" is already assigned to another account.`,`warning`);return}await n.delete(`users`,o),await r.queueOperation(`users`,`delete`,o)}let f={username:s,password:c,role:l,status:u,employeeId:d.id};await n.put(`users`,f),await r.queueOperation(`users`,`update`,f),d.username=s,d.role=l,await n.put(`employees`,d),await r.queueOperation(`employees`,`update`,d),a.setAttribute(`data-current-username`,s),U.showToast(`Credentials Saved`,`Updated credentials for ${d.name}: Username: "${s}", Password: "${c}".`,`success`,5e3)})}),lucide.createIcons()}async function Ue(e){let t=await n.getAll(`leaves`),i=await n.getAll(`employees`),a=t.filter(e=>e.status===`Outstanding`),o=t.filter(e=>e.status===`Deducted`);e.innerHTML=`
    <div style="display:grid; grid-template-columns:1fr 2fr; gap:24px;">
      <!-- Record Advance Form -->
      <div class="glass-card" style="display:flex; flex-direction:column; gap:16px; height:fit-content; padding:20px;">
        <h3 style="font-size:15px; font-family:var(--font-heading); font-weight:700; border-bottom:1px solid var(--glass-border); padding-bottom:8px; margin:0;">
          Record Salary Advance
        </h3>
        <form id="record-advance-form" style="display:flex; flex-direction:column; gap:12px;">
          <div class="input-group" style="margin-bottom:0;">
            <label>Employee <span style="color:var(--danger); font-size:11px;">*required</span></label>
            <select id="advance-staff" class="form-control-noicon" required>
              ${i.map(e=>`<option value="${e.id}">${e.name} (ID: ${e.id})</option>`).join(``)}
            </select>
          </div>

          <div class="input-group" style="margin-bottom:0;">
            <label>Advance Amount (₹) <span style="color:var(--danger); font-size:11px;">*required</span></label>
            <input type="number" id="advance-amount" class="form-control-noicon" min="1" placeholder="e.g. 5000" required>
          </div>

          <div class="input-group" style="margin-bottom:0;">
            <label>Date</label>
            <input type="date" id="advance-date" class="form-control-noicon" value="${G()}">
          </div>

          <div class="input-group" style="margin-bottom:0;">
            <label>Purpose / Description</label>
            <textarea id="advance-purpose" class="form-control-noicon" rows="2" placeholder="State purpose of advance..."></textarea>
          </div>

          <button type="submit" class="btn btn-primary btn-block" style="font-weight:700;">Record Advance</button>
        </form>
      </div>

      <!-- Advances Ledger -->
      <div style="display:flex; flex-direction:column; gap:20px;">
        <div class="search-input-wrapper">
          <i data-lucide="search"></i>
          <input type="text" id="advances-search" placeholder="Search advances by employee name..." class="form-control" style="padding-top:8px; padding-bottom:8px; font-size:12.5px;">
        </div>

        <!-- Outstanding Queue -->
        <div class="glass-card" style="display:flex; flex-direction:column; gap:16px; padding:20px;">
          <h3 style="font-size:15px; font-family:var(--font-heading); font-weight:700; margin:0;">Outstanding Advances</h3>
          <div class="table-responsive">
            <table class="custom-table" style="font-size:12.5px;">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Purpose</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="advances-outstanding-body">
                ${a.length>0?a.map(e=>{let t=i.find(t=>t.id===e.employeeId);return`
                    <tr>
                      <td><strong>${t?t.name:e.employeeId}</strong> <span class="muted-text" style="font-size:11px; display:block;">ID: ${e.employeeId}</span></td>
                      <td><strong class="warning-text">₹${parseFloat(e.amount||0).toLocaleString()}</strong></td>
                      <td><code>${e.date}</code></td>
                      <td><span style="font-size:11px;" class="muted-text">"${e.purpose||`N/A`}"</span></td>
                      <td>
                        <button class="btn btn-success advance-deduct-btn" data-id="${e.id}" style="padding:4px 8px; font-size:11px;">Deduct from Salary</button>
                      </td>
                    </tr>
                  `}).join(``):`<tr><td colspan="5" class="text-center muted-text" style="padding:16px 0;">No outstanding advances.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Settle Ledger History -->
        <div class="glass-card" style="display:flex; flex-direction:column; gap:16px; padding:20px;">
          <h3 style="font-size:15px; font-family:var(--font-heading); font-weight:700; margin:0;">Deducted / Settle History</h3>
          <div class="table-responsive" style="max-height:200px; overflow-y:auto;">
            <table class="custom-table" style="font-size:12px;">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Purpose</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody id="advances-history-body">
                ${o.length>0?o.map(e=>{let t=i.find(t=>t.id===e.employeeId);return`
                    <tr>
                      <td><strong>${t?t.name:e.employeeId}</strong></td>
                      <td><strong class="success-text">₹${parseFloat(e.amount||0).toLocaleString()}</strong></td>
                      <td><code>${e.date}</code></td>
                      <td><span class="muted-text">${e.purpose||`N/A`}</span></td>
                      <td><span class="badge success">Deducted</span></td>
                    </tr>
                  `}).join(``):`<tr><td colspan="5" class="text-center muted-text" style="padding:16px 0;">No settled advances.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,document.getElementById(`advances-search`)?.addEventListener(`input`,e=>{let t=e.target.value.toLowerCase();document.querySelectorAll(`#advances-outstanding-body tr, #advances-history-body tr`).forEach(e=>{e.querySelector(`td`)?.colSpan>1||(e.innerText.toLowerCase().includes(t)?e.classList.remove(`hidden`):e.classList.add(`hidden`))})}),document.getElementById(`record-advance-form`)?.addEventListener(`submit`,async e=>{e.preventDefault();let t=document.getElementById(`advance-staff`).value,i=parseFloat(document.getElementById(`advance-amount`).value),a=document.getElementById(`advance-date`).value||G(),o=document.getElementById(`advance-purpose`).value.trim(),s={id:`adv-${Date.now()}`,employeeId:t,amount:i,date:a,purpose:o,status:`Outstanding`};await n.put(`leaves`,s),await r.queueOperation(`leaves`,`insert`,s),U.showToast(`Advance Recorded`,`Recorded ₹${i.toLocaleString()} advance.`,`success`),await q()}),e.querySelectorAll(`.advance-deduct-btn`).forEach(e=>{e.addEventListener(`click`,async()=>{let t=e.getAttribute(`data-id`),i=await n.get(`leaves`,t);i&&confirm(`Mark this advance of ₹${parseFloat(i.amount||0).toLocaleString()} as deducted from salary?`)&&(i.status=`Deducted`,await n.put(`leaves`,i),await r.queueOperation(`leaves`,`update`,i),U.showToast(`Advance Settled`,`Advance marked as Deducted.`,`success`),await q())})}),lucide.createIcons()}async function We(e){let t=await n.getAll(`employees`),i=await n.getAll(`leaves`),a={};t.forEach(e=>{let t=e.department||`Operations`;a[t]||(a[t]={name:t,count:0,totalSalary:0}),a[t].count++,a[t].totalSalary+=parseFloat(e.salary||0)}),e.innerHTML=`
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px;">
      <!-- Department breakdown -->
      <div class="glass-card" style="display:flex; flex-direction:column; gap:16px; padding:20px;">
        <h3 style="font-size:15px; font-family:var(--font-heading); font-weight:700; border-bottom:1px solid var(--glass-border); padding-bottom:8px; margin:0;">
          Departmental Payroll Breakdown
        </h3>
        <div class="table-responsive">
          <table class="custom-table" style="font-size:12.5px;">
            <thead>
              <tr>
                <th>Department Name</th>
                <th>Staff Count</th>
                <th>Total Monthly Budget</th>
              </tr>
            </thead>
            <tbody>
              ${Object.values(a).map(e=>`
                <tr>
                  <td><strong>${e.name}</strong></td>
                  <td>${e.count} members</td>
                  <td><strong>₹${e.totalSalary.toLocaleString()}/mo</strong></td>
                </tr>
              `).join(``)}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Quick Salary Adjuster -->
      <div class="glass-card" style="display:flex; flex-direction:column; gap:16px; padding:20px;">
        <h3 style="font-size:15px; font-family:var(--font-heading); font-weight:700; margin:0;">Quick Salary Adjuster</h3>
        <p class="muted-text" style="font-size:12px; margin:0;">Modify employee salary metrics and deduct outstanding salary advances.</p>

        <div class="search-input-wrapper">
          <i data-lucide="search"></i>
          <input type="text" id="payroll-search" placeholder="Search by employee name..." class="form-control" style="padding-top:7px; padding-bottom:7px; font-size:12px;">
        </div>

        <div class="table-responsive" style="max-height:350px; overflow-y:auto;">
          <table class="custom-table" style="font-size:12.5px;">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Base Salary</th>
                <th>Advance</th>
                <th>Net Payable</th>
                <th style="text-align:center;">Action</th>
              </tr>
            </thead>
            <tbody id="payroll-list-body">
              ${t.map(e=>{let t=i.filter(t=>t.employeeId===e.id&&t.status===`Outstanding`).reduce((e,t)=>e+parseFloat(t.amount||0),0),n=Math.max(0,parseFloat(e.salary||0)-t);return`
                  <tr>
                    <td><strong>${e.name}</strong> <span style="font-size:11px;" class="muted-text"><code>${e.id}</code></span></td>
                    <td>
                      <div style="display:flex; align-items:center; gap:4px;">
                        <span style="font-size:12px; color:var(--text-secondary);">₹</span>
                        <input type="number" id="sal-inp-${e.id}" value="${e.salary||0}" class="form-control-noicon" style="width:85px; padding:4px 6px; font-size:11.5px;">
                      </div>
                    </td>
                    <td><strong class="warning-text">₹${t.toLocaleString()}</strong></td>
                    <td><strong class="success-text">₹${n.toLocaleString()}</strong></td>
                    <td style="text-align:center;">
                      <div style="display:flex; justify-content:center; gap:6px;">
                        <button class="btn btn-primary sal-update-btn" data-id="${e.id}" style="padding:4px 8px; font-size:11px;">Update</button>
                        ${t>0?`<button class="btn btn-success sal-deduct-adv-btn" data-id="${e.id}" style="padding:4px 8px; font-size:11px;">Deduct</button>`:``}
                      </div>
                    </td>
                  </tr>
                `}).join(``)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,document.getElementById(`payroll-search`)?.addEventListener(`input`,e=>{let t=e.target.value.toLowerCase();document.querySelectorAll(`#payroll-list-body tr`).forEach(e=>{e.innerText.toLowerCase().includes(t)?e.classList.remove(`hidden`):e.classList.add(`hidden`)})}),e.querySelectorAll(`.sal-update-btn`).forEach(e=>{e.addEventListener(`click`,async()=>{let t=e.getAttribute(`data-id`),i=document.getElementById(`sal-inp-${t}`)?.value;if(!i||parseFloat(i)<0){U.showToast(`Validation Error`,`Salary must be a non-negative amount.`,`danger`);return}let a=await n.get(`employees`,t);a&&(a.salary=parseFloat(i),await n.put(`employees`,a),await r.queueOperation(`employees`,`update`,a),U.showToast(`Salary Updated`,`Updated salary for ${a.name} to ₹${a.salary.toLocaleString()}.`,`success`),await q())})}),e.querySelectorAll(`.sal-deduct-adv-btn`).forEach(e=>{e.addEventListener(`click`,async()=>{let t=e.getAttribute(`data-id`),a=await n.get(`employees`,t),o=i.filter(e=>e.employeeId===t&&e.status===`Outstanding`),s=o.reduce((e,t)=>e+parseFloat(t.amount||0),0);if(s!==0&&confirm(`Deduct ₹${s.toLocaleString()} outstanding advance from ${a.name}'s salary?`)){for(let e of o)e.status=`Deducted`,await n.put(`leaves`,e),await r.queueOperation(`leaves`,`update`,e);U.showToast(`Advance Deducted`,`Deducted ₹${s.toLocaleString()} from ${a.name}.`,`success`),await q()}})}),lucide.createIcons()}var J=new Proxy({},{get:(e,t)=>window.app?window.app[t]:void 0}),Ge=``,Ke=``;async function Y(e,t=[]){let r=await n.getAll(`inventory`),i=await n.getAll(`transactions`),a=await n.getAll(`inventory_categories`),o=new Date().toISOString().split(`T`)[0];e.innerHTML=`
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
            <h2 style="font-family:var(--font-heading); font-size:26px; font-weight:800; margin:4px 0;">${r.length}</h2>
            <p style="font-size:11px; color:var(--text-secondary);">Total catalog entries</p>
          </div>
          <i data-lucide="package" style="width:40px; height:40px; color:var(--primary-color);"></i>
        </div>

        <div class="glass-card" style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <span class="muted-text" style="font-size:11px; text-transform:uppercase;">Transactions</span>
            <h2 style="font-family:var(--font-heading); font-size:26px; font-weight:800; margin:4px 0;">${i.length}</h2>
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
                <input type="text" id="inv-search-input" placeholder="Search by name, code, category, description..." class="form-control" style="padding-top:7px; padding-bottom:7px; font-size:12px;" value="${Ke}">
              </div>
              <select id="inv-category-filter" class="form-control-noicon" style="padding:7px 12px; font-size:12px; min-width:150px;">
                <option value="">All Categories</option>
                ${a.map(e=>`<option value="${e.name.toLowerCase()}" ${Ge===e.name.toLowerCase()?`selected`:``}>${e.name}</option>`).join(``)}
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
              <div style="display:flex; flex-direction:column; gap:6px;">
                <input type="text" id="tx-item-search" class="form-control-noicon" style="padding:6px 12px; font-size:12px;" placeholder="🔍 Type to search items...">
                <select id="tx-item-select" class="form-control-noicon">
                  <option value="">— Select —</option>
                  ${r.map(e=>`<option value="${e.id}">${e.code} - ${e.name} (${e.currentStock} ${e.unit})</option>`).join(``)}
                </select>
              </div>
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
                <input type="date" id="tx-date" class="form-control-noicon" value="${o}">
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
  `;try{await X()}catch(e){console.error(`Inventory table error:`,e)}qe(e),tt(e),lucide.createIcons()}async function X(){let e=document.getElementById(`inventory-table-body`),t=document.getElementById(`inv-no-results`);if(!e)return;let r=await n.getAll(`inventory`),i=await n.getAll(`transactions`),a=r;if(Ge&&(a=a.filter(e=>e.category===Ge)),Ke){let e=Ke.toLowerCase();a=a.filter(t=>(t.name||``).toLowerCase().includes(e)||(t.code||``).toLowerCase().includes(e)||(t.category||``).toLowerCase().includes(e)||(t.description||``).toLowerCase().includes(e))}if(a.length===0){e.innerHTML=``,t&&t.classList.remove(`hidden`);return}t&&t.classList.add(`hidden`),e.innerHTML=a.map(e=>{let t=i.filter(t=>t.itemId===e.id).sort((e,t)=>t.date.localeCompare(e.date)),n=t.length>0?t[0].date:e.createdDate||`N/A`;return`
      <tr>
        <td style="text-align: center;"><input type="checkbox" class="inv-select-checkbox" data-id="${e.id}" /></td>
        <td><code>${e.code}</code></td>
        <td>
          <strong>${e.name}</strong>
          ${e.description?`<span class="muted-text" style="font-size:11px; display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px;">${e.description}</span>`:``}
        </td>
        <td><span class="badge primary">${e.category}</span></td>
        <td>
          <strong class="primary-text" style="font-size:15px;">${e.currentStock}</strong>
          <span style="font-size:10px;" class="muted-text"> ${e.unit}</span>
        </td>
        <td>
          ${n}
        </td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-primary edit-item-btn" data-id="${e.id}" style="padding:4px 8px; font-size:11px;">
              <i data-lucide="pencil" style="width:12px; height:12px;"></i>
              Edit
            </button>
            <button class="btn btn-secondary inspect-tx-btn" data-id="${e.id}" style="padding:4px 8px; font-size:11px;">
              <i data-lucide="history" style="width:12px; height:12px;"></i>
              Logs
            </button>
          </div>
        </td>
      </tr>
    `}).join(``);let o=document.getElementById(`select-all-inv`);o&&(o.checked=!1);let s=document.getElementById(`batch-delete-btn`);s&&s.classList.add(`hidden`)}function qe(e){let t=()=>{let e=document.querySelectorAll(`.inv-select-checkbox`),t=Array.from(e).filter(e=>e.checked),n=document.getElementById(`select-all-inv`),r=document.getElementById(`batch-delete-btn`),i=document.getElementById(`batch-delete-text`);n&&(n.checked=e.length>0&&t.length===e.length),r&&i&&(t.length>0?(r.classList.remove(`hidden`),i.textContent=`Delete Selected (${t.length})`):r.classList.add(`hidden`))};document.getElementById(`inv-search-input`)?.addEventListener(`input`,async e=>{Ke=e.target.value,await X(),$e(),lucide.createIcons()}),document.getElementById(`add-cat-btn`)?.addEventListener(`click`,async()=>{let t=document.getElementById(`new-cat-name`);if(!t)return;let i=t.value.trim();if(!i)return;if((await n.getAll(`inventory_categories`)).some(e=>e.name.toLowerCase()===i.toLowerCase())){J.showToast(`Duplicate Category`,`Category name declaration already verified inside standard register registry.`,`warning`);return}let a={id:`cat-${Date.now()}`,name:i};await n.put(`inventory_categories`,a),await r.queueOperation(`inventory_categories`,`insert`,a),J.showToast(`Category Created`,`Added "${i}" to system categories.`,`success`),t.value=``,Y(e)}),document.getElementById(`inv-category-filter`)?.addEventListener(`change`,async e=>{Ge=e.target.value,await X(),$e(),lucide.createIcons()}),document.getElementById(`add-item-btn`)?.addEventListener(`click`,()=>{Je(e)}),document.getElementById(`tx-item-search`)?.addEventListener(`input`,async e=>{let t=e.target.value.toLowerCase(),r=document.getElementById(`tx-item-select`);r&&(r.innerHTML=`
      <option value="">— Select —</option>
      ${(await n.getAll(`inventory`)).filter(e=>`${e.code} - ${e.name}`.toLowerCase().includes(t)).map(e=>`<option value="${e.id}">${e.code} - ${e.name} (${e.currentStock} ${e.unit})</option>`).join(``)}
    `)}),document.getElementById(`stock-tx-form`)?.addEventListener(`submit`,async t=>{t.preventDefault(),await Xe(e)}),document.getElementById(`select-all-inv`)?.addEventListener(`change`,e=>{let n=e.target.checked;document.querySelectorAll(`.inv-select-checkbox`).forEach(e=>{e.checked=n}),t()}),document.getElementById(`inventory-table-body`)?.addEventListener(`change`,e=>{e.target.classList.contains(`inv-select-checkbox`)&&t()}),document.getElementById(`batch-delete-btn`)?.addEventListener(`click`,async()=>{let t=document.querySelectorAll(`.inv-select-checkbox:checked`),i=Array.from(t).map(e=>e.getAttribute(`data-id`));if(i.length!==0&&confirm(`Are you sure you want to delete ${i.length} selected items from the catalog? This cannot be undone.`)){for(let e of i)await n.delete(`inventory`,e),await r.queueOperation(`inventory`,`delete`,e);J.showToast(`Batch Delete Successful`,`Removed ${i.length} items from inventory.`,`success`),Y(e)}}),$e()}function Je(e){new Date().toISOString().split(`T`)[0],n.getAll(`inventory_categories`).then(t=>{let i=`
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
            ${t.map(e=>`<option value="${e.name.toLowerCase()}">${e.name}</option>`).join(``)}
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
    `;J.openModal(`Register Inventory Item`,i),document.getElementById(`register-item-submit-btn`)?.addEventListener(`click`,async()=>{let t=document.getElementById(`new-item-name`),i=t?.value?.trim();if(!i){J.showToast(`Name Required`,`Item Name is the only required field.`,`warning`),t?.focus();return}let a=document.getElementById(`new-item-code`)?.value?.trim().toUpperCase(),o=a||`ITM-${Date.now()}`,s=document.getElementById(`new-item-category`)?.value||`others`,c=document.getElementById(`new-item-unit`)?.value?.trim()||`Pcs`,l=parseInt(document.getElementById(`new-item-init`)?.value||`0`)||0,u=document.getElementById(`new-item-desc`)?.value?.trim()||``,d=new Date().toISOString().split(`T`)[0],f=await n.getAll(`inventory`);if(a&&f.some(e=>e.code===o)){J.showToast(`Duplicate Code`,`Item code [${o}] already exists. Leave blank for auto-generated code.`,`danger`);return}let p=`inv-${Date.now()}`,m={id:p,code:o,name:i,category:s,unit:c,currentStock:l,description:u,createdDate:d};if(await n.put(`inventory`,m),await r.queueOperation(`inventory`,`insert`,m),l>0){let e=`tx-${Date.now()}`;await n.put(`transactions`,{id:e,itemId:p,type:`inward`,quantity:l,sourceOrPurpose:`Opening balance`,date:E.toSystemFormat(new Date)})}J.closeModal(),J.showToast(`Item Registered`,`"${i}" added to inventory catalog.`,`success`),Y(e)})})}async function Ye(e,t){let i=await n.get(`inventory`,e),a=await n.getAll(`inventory_categories`);if(!i)return;let o=`
    <div style="display:flex; flex-direction:column; gap:16px;">
      <div style="padding:8px 12px; background:rgba(139,92,246,0.08); border-left:3px solid var(--accent-color); border-radius:4px; font-size:12px; color:var(--text-secondary);">
        Editing <strong><code>${i.code}</code> — ${i.name}</strong>. Only Item Name is required.
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
        <div class="input-group" style="margin-bottom:0;">
          <label>Item Code <span class="muted-text" style="font-size:10px;">(editable)</span></label>
          <input type="text" id="edit-item-code" class="form-control-noicon" value="${i.code||``}">
        </div>
        <div class="input-group" style="margin-bottom:0;">
          <label>Item Name <span style="color:var(--danger); font-size:11px;">*required</span></label>
          <input type="text" id="edit-item-name" class="form-control-noicon" required value="${i.name||``}">
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
        <div class="input-group" style="margin-bottom:0;">
          <label>Category</label>
          <select id="edit-item-category" class="form-control-noicon">
            ${a.map(e=>`<option value="${e.name.toLowerCase()}" ${i.category===e.name.toLowerCase()?`selected`:``}>${e.name}</option>`).join(``)}
          </select>
        </div>
        <div class="input-group" style="margin-bottom:0;">
          <label>Unit Measure</label>
          <input type="text" id="edit-item-unit" class="form-control-noicon" value="${i.unit||``}">
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
        <div class="input-group" style="margin-bottom:0;">
          <label>Current Stock <span class="muted-text" style="font-size:10px;">(direct override)</span></label>
          <input type="number" id="edit-item-stock" class="form-control-noicon" min="0" value="${i.currentStock||0}">
        </div>
      </div>

      <div class="input-group" style="margin-bottom:0;">
        <label>Description</label>
        <textarea id="edit-item-desc" class="form-control-noicon" rows="2">${i.description||``}</textarea>
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
  `;J.openModal(`Edit Item — ${i.name}`,o,`600px`),document.getElementById(`edit-item-save-btn`)?.addEventListener(`click`,async()=>{let e=document.getElementById(`edit-item-name`)?.value?.trim();if(!e){J.showToast(`Name Required`,`Item Name cannot be empty.`,`warning`);return}let a={...i,code:document.getElementById(`edit-item-code`)?.value?.trim().toUpperCase()||i.code,name:e,category:document.getElementById(`edit-item-category`)?.value||i.category,unit:document.getElementById(`edit-item-unit`)?.value?.trim()||i.unit,currentStock:parseInt(document.getElementById(`edit-item-stock`)?.value||`0`)||0,description:document.getElementById(`edit-item-desc`)?.value?.trim()||``};await n.put(`inventory`,a),await r.queueOperation(`inventory`,`update`,a),J.closeModal(),J.showToast(`Item Updated`,`"${e}" has been updated successfully.`,`success`),Y(t)}),document.getElementById(`edit-item-delete-btn`)?.addEventListener(`click`,async()=>{confirm(`Are you sure you want to delete "${i.name}" from the catalog? This cannot be undone.`)&&(await n.delete(`inventory`,e),await r.queueOperation(`inventory`,`delete`,e),J.closeModal(),J.showToast(`Item Deleted`,`"${i.name}" removed from inventory.`,`info`),Y(t))})}async function Xe(e){let t=document.getElementById(`tx-item-select`)?.value,i=document.getElementById(`tx-type-select`)?.value||`inward`,a=document.getElementById(`tx-quantity`)?.value,o=document.getElementById(`tx-date`)?.value||new Date,s=E.toSystemFormat(o),c=document.getElementById(`tx-purpose`)?.value?.trim()||`General transaction`,l=document.getElementById(`tx-hardware-name`)?.value?.trim()||``,u=document.getElementById(`tx-party-name`)?.value?.trim()||``,d=document.getElementById(`tx-fitter-name`)?.value?.trim()||``,f=parseInt(a||`0`);if(!t){J.showToast(`Select Item`,`Please select an inventory item for the transaction.`,`warning`);return}if(!f||f<1){J.showToast(`Invalid Quantity`,`Please enter a valid quantity (minimum 1).`,`warning`);return}let p=await n.get(`inventory`,t);if(!p)return;if(i===`outward`&&p.currentStock<f){J.showToast(`Exceeded Stock`,`Only ${p.currentStock} ${p.unit} in stock, cannot issue ${f}.`,`danger`);return}let m=p.currentStock;p.currentStock=i===`inward`?p.currentStock+f:p.currentStock-f,await n.put(`inventory`,p),await r.queueOperation(`inventory`,`update`,p);let h={id:`tx-${Date.now()}`,itemId:t,type:i,quantity:f,sourceOrPurpose:c,hardwareName:l,partyName:u,fitterName:d,date:s};await n.put(`transactions`,h),await r.queueOperation(`transactions`,`insert`,h),J.showToast(`Transaction Logged`,`${i===`inward`?`Received`:`Issued`} ${f} ${p.unit} of ${p.name}. Stock: ${m} → ${p.currentStock}`,`success`),Y(e)}async function Ze(e){let t=await n.get(`inventory`,e),i=(await n.getAll(`transactions`)).filter(t=>t.itemId===e),a=0;return i.forEach(e=>{a+=e.type===`inward`?e.quantity:-e.quantity}),t.currentStock=a,await n.put(`inventory`,t),await r.queueOperation(`inventory`,`update`,t),a}function Qe(e,t,i){let a=document.getElementById(`log-import-studio`);a||(a=document.createElement(`div`),a.id=`log-import-studio`,a.className=`log-import-studio-overlay`,document.body.appendChild(a)),setTimeout(()=>a.classList.add(`active`),20);let o=`new`,s=[...Array(25).fill(null).map(()=>({date:``,hardwareName:``,partyName:``,fitterName:``,input:``,output:``,blank1:``,blank2:``,total:``}))];try{let e=localStorage.getItem(`old_inventory_dump_v2`);if(e){let t=JSON.parse(e);t&&t.length>0&&(s=[...t,...Array(15).fill(null).map(()=>({date:``,hardwareName:``,partyName:``,fitterName:``,input:``,output:``,blank1:``,blank2:``,total:``}))])}}catch{}let c={row:0,col:0},l=Array(12).fill(null).map(()=>({date:``,hardwareName:``,partyName:``,fitterName:``,input:``,output:``})),u={row:0,col:0},d=e=>{if(!e)return E.toSystemFormat(new Date);if(e=String(e).trim(),/^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}$/.test(e)){let t=e.replace(/\//g,`-`).split(`-`);return`${t[0].padStart(2,`0`)}-${t[1].padStart(2,`0`)}-${t[2]}`}if(/^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}$/.test(e)){let t=e.replace(/\//g,`-`).split(`-`);return`${t[1].padStart(2,`0`)}-${t[2].padStart(2,`0`)}-${t[0]}`}return T.stringify(e)||E.toSystemFormat(new Date)},f=e=>e==null?``:String(e).trim(),p=e=>{let t=new FileReader;t.onload=e=>{try{let t=e.target.result,n=XLSX.read(t,{type:`binary`}),r=n.Sheets[n.SheetNames[0]],i=XLSX.utils.sheet_to_json(r,{header:1}).slice(1).map(e=>({date:e[0]||``,hardwareName:String(e[1]||``).trim().toUpperCase(),partyName:String(e[2]||``).trim(),fitterName:String(e[3]||``).trim(),input:e[4]||``,output:e[5]||``})).filter(e=>e.hardwareName||e.date);l=i.length>0?i:Array(12).fill(null).map(()=>({date:``,hardwareName:``,partyName:``,fitterName:``,input:``,output:``})),v(),J.showToast(`Excel Upload Map Success`,`Staged ${i.length} spreadsheet records successfully.`,`success`)}catch(e){console.error(e),J.showToast(`Upload Error`,`Failed to read spreadsheet.`,`danger`)}},t.readAsBinaryString(e)},m=e=>{e.preventDefault(),e.stopPropagation();let t=e.clipboardData.getData(`text`);if(!t)return;let n=t.split(/\r?\n/).filter(e=>e.trim()!==``).map(e=>{let t=e.split(`	`);return{date:f(t[0]),hardwareName:f(t[1]).toUpperCase(),partyName:f(t[2]),fitterName:f(t[3]),input:t[4]===void 0?``:f(t[4]),output:t[5]===void 0?``:f(t[5])}}),r=0;for(let e=u.row;e<l.length&&r<n.length;e++)n[r]&&(l[e]=n[r]),r++;for(;r<n.length;)l.push(n[r]),r++;v(),J.showToast(`Clipboard Import Staging`,`Loaded ${n.length} entries into staging log grid.`,`success`)},h=e=>{e.preventDefault(),e.stopPropagation();let t=e.clipboardData.getData(`text`);if(!t)return;let n=t.split(/\r?\n/);n.length>1&&n[n.length-1].trim()===``&&n.pop();let r=n.map(e=>{let t=e.split(`	`);return{date:t[0]===void 0?``:t[0].trim(),hardwareName:t[1]===void 0?``:t[1].trim(),partyName:t[2]===void 0?``:t[2].trim(),fitterName:t[3]===void 0?``:t[3].trim(),input:t[4]===void 0?``:t[4].trim(),output:t[5]===void 0?``:t[5].trim(),blank1:t[6]===void 0?``:t[6].trim(),blank2:t[7]===void 0?``:t[7].trim(),total:t[8]===void 0?``:t[8].trim()}}),i=[...s],a=0;for(let e=c.row;e<i.length&&a<r.length;e++)i[e]=r[a],a++;for(;a<r.length;)i.push(r[a]),a++;s=i;let o=i.filter(e=>e.date||e.hardwareName||e.partyName||e.input||e.output||e.total);localStorage.setItem(`old_inventory_dump_v2`,JSON.stringify(o)),v(),J.showToast(`Raw Dump Imported`,`Appended ${r.length} raw rows into spreadsheet.`,`success`)},g=()=>{l=Array(12).fill(null).map(()=>({date:``,hardwareName:``,partyName:``,fitterName:``,input:``,output:``})),u={row:0,col:0},v()},_=()=>{window.confirm(`Are you completely sure you want to wipe clean the old data tables?`)&&(s=Array(25).fill(null).map(()=>({date:``,hardwareName:``,partyName:``,fitterName:``,input:``,output:``,blank1:``,blank2:``,total:``})),localStorage.removeItem(`old_inventory_dump_v2`),v())},v=()=>{let e=`
      <div style="background:#FAFAFA; width:100%; height:100%; display:flex; flex-direction:column; padding:24px; box-sizing:border-box;">
        
        <!-- TAB NAVIGATION -->
        <div style="display:flex; gap:8px; margin-bottom:24px; border-bottom:1px solid #e5e7eb; padding-bottom:12px;">
          <button type="button" class="studio-tab-btn" data-tab="new" style="padding:8px 16px; border-radius:8px; font-size:12px; font-weight:bold; text-transform:uppercase; letter-spacing:0.05em; transition:all 0.2s; cursor:pointer; ${o===`new`?`background:#2563eb; color:white; border:none; box-shadow:0 1px 3px rgba(0,0,0,0.1);`:`background:white; color:#4b5563; border:1px solid #e5e7eb;`}">
            ✨ New Database Logs (Smart Tab)
          </button>
          <button type="button" class="studio-tab-btn" data-tab="old" style="padding:8px 16px; border-radius:8px; font-size:12px; font-weight:bold; text-transform:uppercase; letter-spacing:0.05em; transition:all 0.2s; cursor:pointer; ${o===`old`?`background:#b45309; color:white; border:none; box-shadow:0 1px 3px rgba(0,0,0,0.1);`:`background:white; color:#4b5563; border:1px solid #e5e7eb;`}">
            📂 Old Data Archive (Raw Notepad Spreadsheet)
          </button>
          <div style="flex-grow:1;"></div>
          <button type="button" id="studio-close-btn" style="background:transparent; border:none; color:#ef4444; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; cursor:pointer;">
            Close Studio
          </button>
        </div>
    `;o===`new`?e+=`
        <div style="background:white; border-radius:12px; border:1px solid #e5e7eb; padding:16px; display:flex; flex-direction:column; flex-grow:1; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
          <div style="margin-bottom:16px; display:flex; justify-content:space-between;">
            <div>
              <h1 style="font-size:14px; font-weight:900; text-transform:uppercase; color:#1f2937; margin:0;">Operational Store Console</h1>
              <p style="font-size:11px; color:#9ca3af; margin:4px 0 0 0;">Strict chronological indexing active for running inventory checks.</p>
            </div>
            <div style="display:flex; gap:16px; align-items:center;">
              <label style="display:flex; align-items:center; gap:8px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:6px 12px; cursor:pointer; font-size:12px; font-weight:600; color:#4b5563;">
                📥 Upload .xlsx File
                <input type="file" id="studio-xlsx-upload" accept=".xlsx" style="display:none;" />
              </label>
              <button type="button" id="studio-clear-btn" style="background:transparent; border:none; font-size:12px; color:#6b7280; font-weight:500; cursor:pointer;">
                Reset Sheet
              </button>
            </div>
          </div>
          
          <div class="studio-body custom-spreadsheet-scroll" id="studio-paste-zone" tabindex="0" style="flex-grow:1; background:white; border:1px solid #e5e7eb; border-radius:12px; overflow:auto; outline:none; box-shadow:inset 0 2px 4px rgba(0,0,0,0.02);">
            <table style="width:100%; text-align:left; border-collapse:collapse; table-layout:fixed; font-size:11px;">
              <thead style="background:#F1F3F4; color:#4b5563; position:sticky; top:0; font-weight:normal; text-align:center; z-index:10;">
                <tr style="height:24px; border-bottom:1px solid #d1d5db;">
                  <th style="width:40px; background:#E8EAED; border-right:1px solid #d1d5db;"></th>
                  <th style="width:128px; font-weight:normal; border-right:1px solid #d1d5db; font-size:12px;">A (Date)</th>
                  <th style="width:224px; font-weight:normal; border-right:1px solid #d1d5db; font-size:12px;">B (Hardware Name)</th>
                  <th style="width:176px; font-weight:normal; border-right:1px solid #d1d5db; font-size:12px;">C (Party Name)</th>
                  <th style="width:176px; font-weight:normal; border-right:1px solid #d1d5db; font-size:12px;">D (Fitter Name)</th>
                  <th style="width:96px; font-weight:normal; color:#2563eb; border-right:1px solid #d1d5db; font-size:12px;">E (Input)</th>
                  <th style="width:96px; font-weight:normal; color:#dc2626; border-right:1px solid #d1d5db; font-size:12px;">F (Output)</th>
                  <th style="width:auto; background:#F1F3F4;"></th>
                </tr>
              </thead>
              <tbody>
                ${l.map((e,t)=>{let n=e=>u.row===t&&u.col===e,r=`box-shadow: inset 0 0 0 2px #3b82f6; background-color: rgba(239,246,255,0.5);`;return`
                  <tr style="height:28px; border-bottom:1px solid #e5e7eb; transition:background-color 0.15s;" onmouseover="this.style.backgroundColor='rgba(249,250,251,0.4)'" onmouseout="this.style.backgroundColor='transparent'">
                    <td style="background:#F1F3F4; text-align:center; font-size:10px; color:#9ca3af; font-family:monospace; position:sticky; left:0; border-right:1px solid #d1d5db; user-select:none;">${t+1}</td>
                    <td style="padding:4px; border-right:1px solid #e5e7eb; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; ${n(0)?r:``}" class="studio-cell" data-row="${t}" data-col="0">
                      <input type="text" class="studio-row-edit" data-idx="${t}" data-field="date" value="${e.date||``}" style="width:100%; height:100%; background:transparent; border:none; outline:none; font-family:monospace; color:#1f2937;" />
                    </td>
                    <td style="padding:4px; border-right:1px solid #e5e7eb; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; ${n(1)?r:``}" class="studio-cell" data-row="${t}" data-col="1">
                      <input type="text" class="studio-row-edit uppercase" data-idx="${t}" data-field="hardwareName" value="${e.hardwareName||``}" style="width:100%; height:100%; background:transparent; border:none; outline:none; text-transform:uppercase; font-weight:bold; color:#111827;" />
                    </td>
                    <td style="padding:4px; border-right:1px solid #e5e7eb; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; ${n(2)?r:``}" class="studio-cell" data-row="${t}" data-col="2">
                      <input type="text" class="studio-row-edit" data-idx="${t}" data-field="partyName" value="${e.partyName||``}" style="width:100%; height:100%; background:transparent; border:none; outline:none; color:#374151;" />
                    </td>
                    <td style="padding:4px; border-right:1px solid #e5e7eb; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; ${n(3)?r:``}" class="studio-cell" data-row="${t}" data-col="3">
                      <input type="text" class="studio-row-edit" data-idx="${t}" data-field="fitterName" value="${e.fitterName||``}" style="width:100%; height:100%; background:transparent; border:none; outline:none; color:#4b5563;" />
                    </td>
                    <td style="padding:4px; border-right:1px solid #e5e7eb; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; ${n(4)?r:``}" class="studio-cell" data-row="${t}" data-col="4">
                      <input type="text" class="studio-row-edit" data-idx="${t}" data-field="input" value="${e.input!==``&&e.input!==0?e.input:``}" style="width:100%; height:100%; background:transparent; border:none; outline:none; color:#1d4ed8; font-weight:bold; text-align:center;" />
                    </td>
                    <td style="padding:4px; border-right:1px solid #e5e7eb; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; ${n(5)?r:``}" class="studio-cell" data-row="${t}" data-col="5">
                      <input type="text" class="studio-row-edit" data-idx="${t}" data-field="output" value="${e.output!==``&&e.output!==0?e.output:``}" style="width:100%; height:100%; background:transparent; border:none; outline:none; color:#dc2626; font-weight:bold; text-align:center;" />
                    </td>
                    <td style="background:white;"></td>
                  </tr>
                  `}).join(``)}
              </tbody>
            </table>
          </div>
          
          <div class="studio-footer" style="margin-top:16px; display:flex; justify-content:space-between; align-items:center; background:white; padding:12px; border-radius:12px; border:1px solid #e5e7eb; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
            <span style="font-size:11px; color:#9ca3af; font-weight:500;">
              Staging Register Status: ${l.filter(e=>e.date||e.hardwareName||e.partyName).length} active log line elements items parsed.
            </span>
            <button type="button" id="studio-confirm-sync-btn" style="background:#2563eb; color:white; font-weight:bold; font-size:12px; padding:10px 32px; border-radius:8px; border:none; cursor:pointer; box-shadow:0 1px 3px rgba(0,0,0,0.1); transition:all 0.2s;">
              Commit All Staged Logs to Multi-Database Pipeline
            </button>
          </div>
        </div>
      `:e+=`
        <div style="background:white; border-radius:12px; border:1px solid #e5e7eb; padding:16px; display:flex; flex-direction:column; flex-grow:1; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
          <div style="margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; background:#fffbeb; padding:12px; border-radius:12px; border:1px solid #fef3c7;">
            <div>
              <h1 style="font-size:14px; font-weight:900; text-transform:uppercase; color:#78350f; margin:0;">Historical Dump Matrix (Raw Fields)</h1>
              <p style="font-size:11px; color:#b45309; margin:4px 0 0 0;">Select any row cell and hit <b>Ctrl + V</b> to instantly dump data sets. Dates, sequences, and blank spaces are preserved exactly as pasted.</p>
            </div>
            <button type="button" id="old-data-clear-btn" style="background:#dc2626; color:white; font-size:10px; font-weight:bold; text-transform:uppercase; padding:8px 16px; border-radius:8px; border:none; cursor:pointer; box-shadow:0 1px 2px rgba(0,0,0,0.1);">
              Wipe Old Grid Clean
            </button>
          </div>

          <div id="old-data-paste-zone" tabindex="0" style="flex-grow:1; overflow-y:auto; border:1px solid #e5e7eb; border-radius:12px; max-height:600px; outline:none; box-shadow:inset 0 2px 4px rgba(0,0,0,0.02);">
            <table style="width:100%; text-align:left; border-collapse:collapse; table-layout:fixed; font-size:11px;">
              <thead style="background:#2C2520; color:#e5e7eb; font-family:monospace; position:sticky; top:0; z-index:10; text-align:center;">
                <tr style="height:28px; border-bottom:1px solid #374151;">
                  <th style="width:48px; background:#1E1916; border-right:1px solid #374151;">S No</th>
                  <th style="width:128px; border-right:1px solid #374151;">A (Raw Date)</th>
                  <th style="width:224px; border-right:1px solid #374151;">B (Hardware Title)</th>
                  <th style="width:176px; border-right:1px solid #374151;">C (Party Allocation)</th>
                  <th style="width:176px; border-right:1px solid #374151;">D (Fitter/Helper)</th>
                  <th style="width:80px; color:#60a5fa; border-right:1px solid #374151;">E (Input)</th>
                  <th style="width:80px; color:#fb923c; border-right:1px solid #374151;">F (Output)</th>
                  <th style="width:96px; color:#9ca3af; border-right:1px solid #374151;">G (Blank 1)</th>
                  <th style="width:96px; color:#9ca3af; border-right:1px solid #374151;">H (Blank 2)</th>
                  <th style="width:112px; color:#34d399; background:rgba(6,78,59,0.3);">I (Total)</th>
                </tr>
              </thead>
              <tbody style="font-family:monospace; color:#1f2937;">
                ${s.map((e,t)=>{let n=e=>c.row===t&&c.col===e,r=`box-shadow: inset 0 0 0 2px #d97706; background-color: rgba(254,243,199,0.4);`;return`
                  <tr style="height:28px; border-bottom:1px solid #f3f4f6; transition:background-color 0.15s;" onmouseover="this.style.backgroundColor='rgba(254,252,232,0.4)'" onmouseout="this.style.backgroundColor='transparent'">
                    <td style="background:#f3f4f6; text-align:center; font-size:10px; color:#9ca3af; font-weight:bold; position:sticky; left:0; border-right:1px solid #e5e7eb; user-select:none;">${t+1}</td>
                    <td style="padding:4px; border-right:1px solid #f3f4f6; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; ${n(0)?r:``}" class="studio-old-cell" data-row="${t}" data-col="0">
                      <input type="text" class="studio-old-row-edit" data-idx="${t}" data-field="date" value="${e.date||``}" style="width:100%; height:100%; background:transparent; border:none; outline:none; font-family:monospace; font-weight:bold; color:#78350f;" />
                    </td>
                    <td style="padding:4px; border-right:1px solid #f3f4f6; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; ${n(1)?r:``}" class="studio-old-cell" data-row="${t}" data-col="1">
                      <input type="text" class="studio-old-row-edit" data-idx="${t}" data-field="hardwareName" value="${e.hardwareName||``}" style="width:100%; height:100%; background:transparent; border:none; outline:none; text-transform:uppercase; font-family:sans-serif; font-weight:600; color:black;" />
                    </td>
                    <td style="padding:4px; border-right:1px solid #f3f4f6; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; ${n(2)?r:``}" class="studio-old-cell" data-row="${t}" data-col="2">
                      <input type="text" class="studio-old-row-edit" data-idx="${t}" data-field="partyName" value="${e.partyName||``}" style="width:100%; height:100%; background:transparent; border:none; outline:none; font-family:sans-serif;" />
                    </td>
                    <td style="padding:4px; border-right:1px solid #f3f4f6; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; ${n(3)?r:``}" class="studio-old-cell" data-row="${t}" data-col="3">
                      <input type="text" class="studio-old-row-edit" data-idx="${t}" data-field="fitterName" value="${e.fitterName||``}" style="width:100%; height:100%; background:transparent; border:none; outline:none; font-family:sans-serif; color:#4b5563;" />
                    </td>
                    <td style="padding:4px; border-right:1px solid #f3f4f6; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; ${n(4)?r:``}" class="studio-old-cell" data-row="${t}" data-col="4">
                      <input type="text" class="studio-old-row-edit" data-idx="${t}" data-field="input" value="${e.input||``}" style="width:100%; height:100%; background:transparent; border:none; outline:none; color:#2563eb; font-weight:bold; text-align:center;" />
                    </td>
                    <td style="padding:4px; border-right:1px solid #f3f4f6; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; ${n(5)?r:``}" class="studio-old-cell" data-row="${t}" data-col="5">
                      <input type="text" class="studio-old-row-edit" data-idx="${t}" data-field="output" value="${e.output||``}" style="width:100%; height:100%; background:transparent; border:none; outline:none; color:#dc2626; font-weight:bold; text-align:center;" />
                    </td>
                    <td style="padding:4px; border-right:1px solid #f3f4f6; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; background:rgba(249,250,251,0.5); ${n(6)?r:``}" class="studio-old-cell" data-row="${t}" data-col="6">
                      <input type="text" class="studio-old-row-edit" data-idx="${t}" data-field="blank1" value="${e.blank1||``}" style="width:100%; height:100%; background:transparent; border:none; outline:none; color:#9ca3af;" />
                    </td>
                    <td style="padding:4px; border-right:1px solid #f3f4f6; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; background:rgba(249,250,251,0.5); ${n(7)?r:``}" class="studio-old-cell" data-row="${t}" data-col="7">
                      <input type="text" class="studio-old-row-edit" data-idx="${t}" data-field="blank2" value="${e.blank2||``}" style="width:100%; height:100%; background:transparent; border:none; outline:none; color:#9ca3af;" />
                    </td>
                    <td style="padding:4px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; background:rgba(16,185,129,0.1); ${n(8)?r:``}" class="studio-old-cell" data-row="${t}" data-col="8">
                      <input type="text" class="studio-old-row-edit" data-idx="${t}" data-field="total" value="${e.total||``}" style="width:100%; height:100%; background:transparent; border:none; outline:none; color:#047857; font-weight:900; text-align:center;" />
                    </td>
                  </tr>
                  `}).join(``)}
              </tbody>
            </table>
          </div>
          
          <div style="margin-top:12px; font-size:10px; color:#9ca3af; font-weight:500; text-align:right; text-transform:uppercase; letter-spacing:0.05em; user-select:none;">
            ⚡ Dumb Log Data Vault Enabled: String Sequence Extraction Core Active.
          </div>
        </div>
      `,e+=`</div>`,a.innerHTML=e,a.innerHTML=a.innerHTML.replace(/`/g,"`"),y()},y=()=>{if(a.querySelectorAll(`.studio-tab-btn`).forEach(e=>{e.addEventListener(`click`,e=>{o=e.target.getAttribute(`data-tab`),v()})}),document.getElementById(`studio-close-btn`)?.addEventListener(`click`,()=>{a.classList.remove(`active`),setTimeout(()=>a.remove(),300)}),o===`new`){let t=document.getElementById(`studio-paste-zone`);t&&t.focus(),document.getElementById(`studio-xlsx-upload`)?.addEventListener(`change`,p),t?.addEventListener(`paste`,m),document.getElementById(`studio-clear-btn`)?.addEventListener(`click`,g),a.querySelectorAll(`.studio-cell`).forEach(e=>{e.addEventListener(`mousedown`,t=>{let n=parseInt(e.getAttribute(`data-row`)),r=parseInt(e.getAttribute(`data-col`));(u.row!==n||u.col!==r)&&(u={row:n,col:r},v())})}),a.querySelectorAll(`.studio-row-edit`).forEach(e=>{e.addEventListener(`input`,e=>{let t=parseInt(e.target.getAttribute(`data-idx`)),n=e.target.getAttribute(`data-field`),r=e.target.value;l[t]&&(l[t][n]=r)})}),document.getElementById(`studio-confirm-sync-btn`)?.addEventListener(`click`,async()=>{let t=l.filter(e=>e.date!==``||e.hardwareName!==``||e.input!==``||e.output!==``);if(t.length===0){J.showToast(`Empty Staging`,`Spreadsheet staging space contains no data to record!`,`warning`);return}let o=[...t].sort((e,t)=>{let n=e=>{if(!e)return new Date(0);let[t,n,r]=e.split(`-`).map(Number);return new Date(r,n-1,t)};return n(e.date)-n(t.date)}),s=0;for(let t=0;t<o.length;t++){let i=o[t],a=i.hardwareName,c=i.partyName,l=i.fitterName,u=parseInt(i.input)||0,f=parseInt(i.output)||0,p=u>0?u:f>0?f:0;if(p<=0)continue;let m=i.date;m=m?d(m):E.toSystemFormat(new Date);let h=u>0?`inward`:`outward`,g={id:`tx-${Date.now()}-${t}-${Math.floor(Math.random()*1e3)}`,itemId:e,type:h,quantity:p,date:m,sourceOrPurpose:`Log Import Studio`,hardwareName:a,partyName:c,fitterName:l};await n.put(`transactions`,g),await r.queueOperation(`transactions`,`insert`,g),s++}s>0?(J.showToast(`Import Studio Sync Complete`,`Successfully committed ${s} transactions to Triple-Sync!`,`success`),g(),a.classList.remove(`active`),setTimeout(()=>a.remove(),300),i&&await i()):J.showToast(`Staging Sync Failure`,`No valid log rows with quantities detected.`,`danger`)})}else if(o===`old`){let e=document.getElementById(`old-data-paste-zone`);e&&(e.focus(),e.addEventListener(`paste`,h)),document.getElementById(`old-data-clear-btn`)?.addEventListener(`click`,_),a.querySelectorAll(`.studio-old-cell`).forEach(e=>{e.addEventListener(`mousedown`,t=>{let n=parseInt(e.getAttribute(`data-row`)),r=parseInt(e.getAttribute(`data-col`));(c.row!==n||c.col!==r)&&(c={row:n,col:r},v())})}),a.querySelectorAll(`.studio-old-row-edit`).forEach(e=>{e.addEventListener(`input`,e=>{let t=parseInt(e.target.getAttribute(`data-idx`)),n=e.target.getAttribute(`data-field`),r=e.target.value;if(s[t]){s[t][n]=r;let e=s.filter(e=>e.date||e.hardwareName||e.partyName||e.input||e.output||e.total);localStorage.setItem(`old_inventory_dump_v2`,JSON.stringify(e))}})})}};v()}function $e(){document.querySelectorAll(`.edit-item-btn`).forEach(e=>{e.addEventListener(`click`,async()=>{await Ye(e.getAttribute(`data-id`),document.getElementById(`view-content`))})}),document.querySelectorAll(`.inspect-tx-btn`).forEach(e=>{e.addEventListener(`click`,async()=>{let t=e.getAttribute(`data-id`),i=await n.get(`inventory`,t),a=(await n.getAll(`transactions`)).filter(e=>e.itemId===t).sort((e,t)=>t.date.localeCompare(e.date)),o=`
        <div style="display:flex; flex-direction:column; gap:14px; height: 100%;">
          <!-- Item summary bar + Control actions -->
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <div style="display:flex; gap:20px; flex-wrap:wrap; font-size:13px; padding:12px; background:rgba(0,0,0,0.1); border-radius:8px; flex-grow:1;">
              <span><strong>Code:</strong> <code>${i.code}</code></span>
              <span><strong>Unit:</strong> ${i.unit}</span>
              <span><strong>Current Stock:</strong> <span class="primary-text font-bold" id="modal-current-stock">${i.currentStock} ${i.unit}</span></span>
            </div>
            
            <div style="display:flex; gap:8px; align-items:center;">
              <button type="button" id="modal-studio-open-btn" class="btn btn-primary" style="padding:6px 12px; font-size:11px; display:flex; align-items:center; gap:6px; font-weight:700;">
                <i data-lucide="database" style="width:14px; height:14px;"></i>
                <span>📂 Excel/Sheets Log Maintenance</span>
              </button>
              
              <button type="button" id="modal-fullscreen-toggle-btn" class="btn btn-secondary" style="padding:6px 12px; font-size:11px; display:flex; align-items:center; gap:6px;">
                <i data-lucide="expand" style="width:14px; height:14px;"></i>
                <span id="fullscreen-toggle-text">Open Big Screen</span>
              </button>
              
              <button type="button" id="modal-batch-delete-btn" class="btn btn-danger hidden" style="padding:6px 12px; font-size:11px; display:flex; align-items:center; gap:6px; font-weight:700;">
                <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
                <span id="batch-delete-modal-text">Delete Selected (0)</span>
              </button>
            </div>
          </div>

          <!-- Log Management Tools -->
          <div style="display:flex; gap:14px; align-items:center; justify-content:space-between; flex-wrap:wrap; border-bottom:1px solid var(--glass-border); padding-bottom:10px;">
             <div style="display:flex; align-items:center; gap:12px;">
                <label style="font-size:11px; font-weight:600; color:var(--text-secondary);">📂 File Tools:</label>
                <input type="file" id="modal-log-import" accept=".csv" style="font-size:11px; max-width:180px;">
                <button type="button" id="modal-log-export-btn" class="btn btn-secondary" style="padding:4px 10px; font-size:11px;">
                  <i data-lucide="download" style="width:14px; height:14px;"></i> Download Logs
                </button>
             </div>
             
             <!-- Search transactions -->
             <div class="search-input-wrapper" style="min-width:240px; margin-bottom:0;">
               <i data-lucide="search" style="width:14px; height:14px;"></i>
               <input type="text" id="tx-log-search" placeholder="Filter by date, type, supplier..." class="form-control" style="padding-top:6px; padding-bottom:6px; font-size:11px;">
             </div>
          </div>

          <div style="flex-grow:1; max-height:calc(100vh - 200px); overflow-y:auto; border-radius:8px; border:1px solid rgba(0, 0, 0, 0.3);" id="tx-log-table-container">
            <table class="inv-log-table" id="tx-log-table">
              <thead>
                <tr style="background:#000000; color:#ffffff;">
                  <th style="width: 40px; text-align: center;"><input type="checkbox" id="modal-select-all-tx" /></th>
                  <th style="width: 60px; text-align: center;">S NO</th>
                  <th>DATE</th>
                  <th>HARDWARE NAME</th>
                  <th>PARTY NAME</th>
                  <th>FITTER / HELPER</th>
                  <th style="text-align: center;">INPUT</th>
                  <th style="text-align: center;" class="output-col">OUTPUT</th>
                  <th style="text-align: center;">TOTAL</th>
                </tr>
              </thead>
              <tbody id="tx-log-body">
              </tbody>
            </table>
          </div>
        </div>
      `;J.openModal(`Transaction Logs — ${i.name}`,o,`750px`);let s=[],c=e=>{let a=document.getElementById(`tx-log-body`);a&&(a.innerHTML=et(e,s),a.querySelectorAll(`.log-edit`).forEach(e=>{e.addEventListener(`change`,async e=>{let a=e.target.getAttribute(`data-id`),o=e.target.getAttribute(`data-field`),s=e.target.value;o===`quantity`&&(s=parseInt(s)||0),o===`date`&&(s=E.toSystemFormat(s));let l=await n.get(`transactions`,a);if(l){if(l[o]=s,await n.put(`transactions`,l),await r.queueOperation(`transactions`,`update`,l),o===`quantity`||o===`type`){let e=await Ze(t),n=document.getElementById(`modal-current-stock`);n&&(n.innerText=e+` `+i.unit)}c((await n.getAll(`transactions`)).filter(e=>e.itemId===t).sort((e,t)=>t.date.localeCompare(e.date))),X()}})})),l()},l=()=>{let e=document.querySelectorAll(`.modal-tx-select-checkbox`),t=Array.from(e).filter(e=>e.checked);s=t.map(e=>e.getAttribute(`data-id`));let n=document.getElementById(`modal-select-all-tx`);n&&(n.checked=e.length>0&&t.length===e.length);let r=document.getElementById(`modal-batch-delete-btn`),i=document.getElementById(`batch-delete-modal-text`);r&&i&&(s.length>0?(r.classList.remove(`hidden`),i.textContent=`Delete Selected (${s.length})`):r.classList.add(`hidden`))};c(a),document.getElementById(`modal-studio-open-btn`)?.addEventListener(`click`,()=>{Qe(t,i,async()=>{let e=await Ze(t),r=document.getElementById(`modal-current-stock`);r&&(r.innerText=e+` `+i.unit),a=(await n.getAll(`transactions`)).filter(e=>e.itemId===t).sort((e,t)=>t.date.localeCompare(e.date)),c(a),X()})});let u=document.getElementById(`global-modal`),d=document.getElementById(`modal-fullscreen-toggle-btn`),f=document.getElementById(`fullscreen-toggle-text`);d?.addEventListener(`click`,()=>{u?.classList.toggle(`big-screen-mode`);let e=u?.classList.contains(`big-screen-mode`);f&&(f.textContent=e?`Exit Big Screen`:`Open Big Screen`);let t=d.querySelector(`i`);t&&(t.setAttribute(`data-lucide`,e?`minimize`:`expand`),lucide.createIcons())}),document.getElementById(`modal-select-all-tx`)?.addEventListener(`change`,e=>{let t=e.target.checked;document.querySelectorAll(`.modal-tx-select-checkbox`).forEach(e=>{e.checked=t}),l()}),document.getElementById(`tx-log-body`)?.addEventListener(`change`,e=>{e.target.classList.contains(`modal-tx-select-checkbox`)&&l()}),document.getElementById(`modal-batch-delete-btn`)?.addEventListener(`click`,async()=>{if(s.length!==0&&confirm(`Are you sure you want to delete the ${s.length} selected transaction logs? This will permanently update the inventory stock balance.`)){for(let e of s)await n.delete(`transactions`,e),await r.queueOperation(`transactions`,`delete`,e);J.showToast(`Batch Logs Deleted`,`Successfully deleted ${s.length} log rows.`,`success`),s=[];let e=await Ze(t),o=document.getElementById(`modal-current-stock`);o&&(o.innerText=e+` `+i.unit),a=(await n.getAll(`transactions`)).filter(e=>e.itemId===t).sort((e,t)=>t.date.localeCompare(e.date)),c(a),X()}}),document.getElementById(`tx-log-search`)?.addEventListener(`input`,e=>{let t=e.target.value.toLowerCase();c(a.filter(e=>(e.date||``).includes(t)||(e.type||``).includes(t)||(e.sourceOrPurpose||``).toLowerCase().includes(t)||(e.hardwareName||``).toLowerCase().includes(t)||(e.partyName||``).toLowerCase().includes(t)||(e.fitterName||``).toLowerCase().includes(t)))}),document.getElementById(`modal-log-import`)?.addEventListener(`change`,async e=>{let o=e.target.files[0];o&&Papa.parse(o,{header:!0,dynamicTyping:!0,complete:async o=>{let s=0;for(let e of o.data){if(!e.date||!e.quantity)continue;let i=`tx-${Date.now()}-${s}`,a=(e.type||e.Type||`inward`).toLowerCase(),o=parseInt(e.quantity||e.Quantity)||0,c=e.description||e.sourceOrPurpose||e.Description||``,l=e.date||e.Date||new Date;l=E.toSystemFormat(l);let u={id:i,itemId:t,type:a,quantity:o,sourceOrPurpose:c,date:l};await n.put(`transactions`,u),await r.queueOperation(`transactions`,`insert`,u),s++}if(s>0){let e=await Ze(t),r=document.getElementById(`modal-current-stock`);r&&(r.innerText=e+` `+i.unit),J.showToast(`Logs Imported`,`Imported ${s} records.`,`success`),a=(await n.getAll(`transactions`)).filter(e=>e.itemId===t).sort((e,t)=>t.date.localeCompare(e.date)),c(a),X()}e.target.value=``}})}),document.getElementById(`modal-log-export-btn`)?.addEventListener(`click`,()=>{let e=0,t=[...a].sort((e,t)=>e.date.localeCompare(t.date)).map((t,n)=>{let r=t.type===`inward`,i=r?t.quantity:``,a=r?``:t.quantity;return e+=r?t.quantity:-t.quantity,{"S NO":n+1,DATE:t.date,"HARDWARE NAME":t.hardwareName||``,"PARTY NAME":t.partyName||``,"FITTER NAME / HELPER NAME":t.fitterName||t.sourceOrPurpose||``,INPUT:i,OUTPUT:a,TOTAL:e}}),n=Papa.unparse(t),r=new Blob([n],{type:`text/csv`}),o=URL.createObjectURL(r),s=document.createElement(`a`);s.href=o,s.download=`${i.name}_register_log.csv`,s.click(),URL.revokeObjectURL(o)})})})}function et(e,t=[]){if(e.length===0)return`<tr><td colspan="9" style="text-align:center; padding:20px; color:#555;">No transactions found.</td></tr>`;let n=[...e].sort((e,t)=>{let n=e=>{if(!e||typeof e!=`string`)return new Date(0);let t=e.split(`-`);return t.length===3?new Date(t[2],t[1]-1,t[0]):new Date(0)};return n(e.date)-n(t.date)}),r=0;return n.map((e,n)=>{let i=e.type===`inward`,a=i?e.quantity:``,o=i?``:e.quantity;r+=i?e.quantity:-e.quantity;let s=e.sourceOrPurpose||``,c=t.includes(e.id)?`checked`:``;return`
      <tr data-id="${e.id}" class="tx-row">
        <td style="text-align: center; border-right: 1px solid #555555;">
          <input type="checkbox" class="modal-tx-select-checkbox" data-id="${e.id}" ${c} />
        </td>
        <td class="text-center" style="border-right: 1px solid #555555;">${n+1}</td>
        <td style="border-right: 1px solid #555555;">
          <input type="date" class="log-edit-field log-edit" data-id="${e.id}" data-field="date" value="${T.toPickerFormat(e.date)}" style="width:120px;">
        </td>
        <td class="uppercase" style="border-right: 1px solid #555555;">
          <input type="text" class="log-edit-field log-edit" data-id="${e.id}" data-field="hardwareName" value="${e.hardwareName||``}" style="width:100%;" placeholder="—">
        </td>
        <td style="border-right: 1px solid #555555;">
          <input type="text" class="log-edit-field log-edit" data-id="${e.id}" data-field="partyName" value="${e.partyName||``}" style="width:100%;" placeholder="—">
        </td>
        <td style="border-right: 1px solid #555555;">
          <input type="text" class="log-edit-field log-edit" data-id="${e.id}" data-field="fitterName" value="${e.fitterName||s}" style="width:100%;" placeholder="—">
        </td>
        <td class="text-center font-bold text-blue-700" style="border-right: 1px solid #555555;">${a}</td>
        <td class="text-center font-bold text-red-600" style="border-right: 1px solid #555555;">${o}</td>
        <td class="text-center" style="font-weight:700;">${r}</td>
      </tr>
    `}).join(``)}function tt(e){document.getElementById(`inv-import-btn`)?.addEventListener(`click`,async()=>{let t=document.getElementById(`inv-file-upload`),i=t?.files?.[0];if(!i){J.showToast(`No File Selected`,`Please select a .csv or .xlsx file first.`,`warning`);return}let a=i.name.split(`.`).pop().toLowerCase(),o=[];try{if(a===`csv`){let e=await i.text();o=Papa.parse(e,{header:!0,skipEmptyLines:!0}).data}else if(a===`xlsx`){let e=await i.arrayBuffer(),t=XLSX.read(e,{type:`array`}),n=t.SheetNames[0],r=t.Sheets[n];o=XLSX.utils.sheet_to_json(r)}else{J.showToast(`Invalid Format`,`Only .csv and .xlsx files are supported.`,`danger`);return}}catch(e){console.error(`File parse error:`,e),J.showToast(`Parse Error`,`Failed to read the file. Check the format and try again.`,`danger`);return}if(!o||o.length===0){J.showToast(`Empty Data`,`The file contains no records to import.`,`warning`);return}let s=0,c=await n.getAll(`inventory`);for(let e of o){let t=e.name||e.Name||e.ITEM_NAME||e[`Item Name`]||``;if(!t)continue;let i=(e.code||e.Code||e.ITEM_CODE||e[`Item Code`]||``).toString().trim().toUpperCase()||`ITM-${Date.now()}-${s}`;if(c.some(e=>e.code===i)||(await n.getAll(`inventory`)).some(e=>e.code===i))continue;let a=e.category||e.Category||e.CATEGORY||e.Category||`others`,o=e.unit||e.Unit||e.UNIT||e.Unit||`Pcs`,l=parseInt(e.currentStock||e.CurrentStock||e.CURRENT_STOCK||e[`Current Stock`]||e.stock||e.Stock||`0`)||0,u=e.description||e.Description||e.DESCRIPTION||e.Description||``,d={id:`inv-${Date.now()}-${s}`,code:i,name:t,category:a,unit:o,currentStock:l,description:u,createdDate:new Date().toISOString().split(`T`)[0]};await n.put(`inventory`,d),await r.queueOperation(`inventory`,`insert`,d),s++}t.value=``,J.showToast(`Import Complete`,`Successfully imported ${s} new items from ${i.name}.`,`success`),Y(e)}),document.getElementById(`inv-export-csv-btn`)?.addEventListener(`click`,async()=>{let e=await n.getAll(`inventory`);if(e.length===0){J.showToast(`No Data`,`No inventory items to export.`,`warning`);return}let t=Papa.unparse(e.map(e=>({code:e.code,name:e.name,category:e.category,unit:e.unit,currentStock:e.currentStock,createdDate:e.createdDate,description:e.description}))),r=new Blob([t],{type:`text/csv;charset=utf-8;`}),i=URL.createObjectURL(r),a=document.createElement(`a`);a.href=i,a.download=`inventory_export_${new Date().toISOString().slice(0,10)}.csv`,a.click(),URL.revokeObjectURL(i),J.showToast(`Export Complete`,`Downloaded ${e.length} items as CSV.`,`success`)}),document.getElementById(`inv-export-xlsx-btn`)?.addEventListener(`click`,async()=>{let e=await n.getAll(`inventory`);if(e.length===0){J.showToast(`No Data`,`No inventory items to export.`,`warning`);return}let t=e.map(e=>({Code:e.code,Name:e.name,Category:e.category,Unit:e.unit,"Current Stock":e.currentStock,"Created Date":e.createdDate,Description:e.description})),r=XLSX.utils.json_to_sheet(t),i=XLSX.utils.book_new();XLSX.utils.book_append_sheet(i,r,`Inventory`),XLSX.writeFile(i,`inventory_export_${new Date().toISOString().slice(0,10)}.xlsx`),J.showToast(`Export Complete`,`Downloaded ${e.length} items as Excel.`,`success`)})}var Z=new Proxy({},{get:(e,t)=>window.app?window.app[t]:void 0});async function nt(e){e.innerHTML=`
    <div class="glass-card" style="display:flex; flex-direction:column; gap:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div>
          <h3 style="font-size:16px; font-family:var(--font-heading); font-weight:700;">System Access Accounts</h3>
          <p class="muted-text" style="font-size:12px;">Admin console to manage system login logins, passwords, and security boundaries.</p>
        </div>
        
        <div style="display:flex; gap:10px; align-items:center;">
          <div class="search-input-wrapper">
            <i data-lucide="search"></i>
            <input type="text" id="users-search-input" placeholder="Search by username or role..." class="form-control" style="padding-top:7px; padding-bottom:7px; font-size:12px;">
          </div>
          <button id="add-user-btn" class="btn btn-primary" style="padding: 8px 16px;">
            <i data-lucide="user-plus"></i>
            <span>Create User</span>
          </button>
        </div>
      </div>

      <div class="table-responsive">
        <table class="custom-table" style="font-size:13px;" id="users-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Password Credential</th>
              <th>Access Authority Role</th>
              <th>Status</th>
              <th>Commit Actions</th>
            </tr>
          </thead>
          <tbody id="users-list-body">
            ${(await n.getAll(`users`)).map(e=>`
              <tr>
                <td><strong>${e.username}</strong></td>
                <td><code>${e.password}</code></td>
                <td>
                  <select class="form-control-noicon role-change-select" data-user="${e.username}" style="width:160px; padding:4px 8px; font-size:12px;">
                    <option value="Admin" ${e.role===`Admin`?`selected`:``}>Admin</option>
                    <option value="Manager" ${e.role===`Manager`?`selected`:``}>Manager</option>
                    <option value="Store Keeper" ${e.role===`Store Keeper`?`selected`:``}>Store Keeper</option>
                    <option value="HR" ${e.role===`HR`?`selected`:``}>HR Manager</option>
                    <option value="Employee" ${e.role===`Employee`?`selected`:``}>Employee</option>
                  </select>
                </td>
                <td>
                  <span class="badge ${e.status===`Active`?`success`:`secondary`}">${e.status}</span>
                </td>
                <td style="display:flex; gap:10px;">
                  <button class="btn btn-secondary status-toggle-btn" data-user="${e.username}" style="padding:4px 10px; font-size:11px;">
                    ${e.status===`Active`?`Deactivate`:`Activate`}
                  </button>
                  ${e.username===`admin`?``:`
                    <button class="btn btn-danger user-delete-btn" data-user="${e.username}" style="padding:4px 10px; font-size:11px;">Delete</button>
                  `}
                </td>
              </tr>
            `).join(``)}
          </tbody>
        </table>
      </div>
    </div>
  `,rt(e),lucide.createIcons()}function rt(e){let t=document.getElementById(`users-search-input`);t&&t.addEventListener(`input`,e=>{let t=e.target.value.toLowerCase();document.querySelectorAll(`#users-list-body tr`).forEach(e=>{e.innerText.toLowerCase().includes(t)?e.classList.remove(`hidden`):e.classList.add(`hidden`)})}),e.querySelectorAll(`.role-change-select`).forEach(e=>{e.addEventListener(`change`,async t=>{let a=e.getAttribute(`data-user`),o=t.target.value,s=await n.get(`users`,a);s&&(s.role=o,await n.put(`users`,s),await r.queueOperation(`users`,`update`,s),Z.showToast(`Role Configured`,`Shifted ${a} access level to ${o}.`,`success`),a===i.getCurrentUser()?.username&&(Z.showToast(`Session Updated`,`Reloading view layout based on new access levels.`,`info`),setTimeout(()=>location.reload(),1500)))})}),e.querySelectorAll(`.status-toggle-btn`).forEach(t=>{t.addEventListener(`click`,async()=>{let i=t.getAttribute(`data-user`);if(i===`admin`){Z.showToast(`Action Terminated`,`Security Guard: The root administrator account cannot be deactivated.`,`danger`);return}let a=await n.get(`users`,i);a&&(a.status=a.status===`Active`?`Inactive`:`Active`,await n.put(`users`,a),await r.queueOperation(`users`,`update`,a),Z.showToast(`Account Status Changed`,`Set ${i} status to ${a.status}.`,`success`),await nt(e))})}),document.getElementById(`add-user-btn`).addEventListener(`click`,()=>{Z.openModal(`Create System Access User`,`
      <form id="create-user-form" class="login-form" style="padding:0;">
        <div class="input-group">
          <label>Username <span style="color:var(--danger); font-size:11px;">*required</span></label>
          <input type="text" id="new-u-username" class="form-control-noicon" required placeholder="e.g. jdoe">
        </div>
        <div class="input-group">
          <label>Password <span class="muted-text" style="font-size:10px;">(optional)</span></label>
          <input type="text" id="new-u-password" class="form-control-noicon" placeholder="e.g. securePass123 (auto-gen if empty)">
        </div>
        <div class="input-group">
          <label>System Authorization Role</label>
          <select id="new-u-role" class="form-control-noicon">
            <option value="Employee">Employee</option>
            <option value="Manager">Manager</option>
            <option value="Store Keeper">Store Keeper</option>
            <option value="HR">HR Manager</option>
            <option value="Admin">Admin</option>
          </select>
        </div>
        <button type="submit" class="btn btn-primary btn-block">Initialize Login Account</button>
      </form>
    `),document.getElementById(`create-user-form`).addEventListener(`submit`,async t=>{t.preventDefault();let i=document.getElementById(`new-u-username`).value.trim(),a=i.toLowerCase(),o=document.getElementById(`new-u-password`).value.trim()||`password123`,s=document.getElementById(`new-u-role`).value||`Employee`;if(await n.get(`users`,a)){Z.showToast(`Account Error`,`An account with username "${i}" already exists in databases.`,`danger`);return}let c={username:a,password:o,role:s,status:`Active`};await n.put(`users`,c),await r.queueOperation(`users`,`insert`,c),Z.closeModal(),Z.showToast(`User Created`,`Login account for "${i}" initialized.`,`success`),await nt(e)})}),e.querySelectorAll(`.user-delete-btn`).forEach(t=>{t.addEventListener(`click`,async()=>{let i=t.getAttribute(`data-user`);confirm(`Are you absolutely sure you want to delete system user: "${i}"?`)&&(await n.delete(`users`,i),await r.queueOperation(`users`,`delete`,i),Z.showToast(`User Deleted`,`Successfully deleted system user account "${i}".`,`success`),await nt(e))})})}var Q=new Proxy({},{get:(e,t)=>window.app?window.app[t]:void 0});async function $(e){let t=r.getConfig(),i=await n.getAll(`syncQueue`),a=r.getStatus(),o=typeof window.showDirectoryPicker==`function`,s=!!(n.localDirHandle||n.localDirPath),c=!1,l=``;s&&(n.localDirHandle?(l=n.localDirHandle.name,c=await n.verifyPermission(!0)):n.localDirPath&&(l=n.localDirPath,c=await n.verifyPermission(!0))),e.innerHTML=`
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
              <input type="text" id="g-webhook-url" class="form-control-noicon" placeholder="https://script.google.com/macros/s/.../exec" value="${localStorage.getItem(`aeroglass_gsheet_webhook`)||``}">
            </div>
            
            <div style="display:flex; align-items:center; gap:8px;">
              <input type="checkbox" id="g-autosync-check" ${localStorage.getItem(`aeroglass_gsheet_autosync`)===`false`?``:`checked`} style="width:16px; height:16px;">
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
              <input type="text" id="turso-url" class="form-control-noicon" placeholder="libsql://your-db.turso.io" value="${r.getTursoConfig()?r.getTursoConfig().url:``}">
            </div>
            <div class="input-group" style="margin-bottom:0;">
              <label>Auth Token</label>
              <input type="password" id="turso-token" class="form-control-noicon" placeholder="Enter Turso auth token..." value="${r.getTursoConfig()?r.getTursoConfig().authToken:``}">
            </div>
            <div style="display:flex; gap:12px;">
              <button id="turso-save-btn" class="btn btn-primary" style="flex-grow:1; padding:10px 16px;">Save Turso Config</button>
              ${r.getTursoConfig()?`<button id="turso-disconnect-btn" class="btn btn-secondary" style="padding:10px 16px;">Disconnect</button>`:``}
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
              <input type="url" id="sup-url" class="form-control-noicon" placeholder="https://your-project.supabase.co" value="${t?t.url:``}">
            </div>
            <div class="input-group" style="margin-bottom:0;">
              <label>API Service Key (Anon Key)</label>
              <input type="password" id="sup-key" class="form-control-noicon" placeholder="Enter anon role service key..." value="${t?t.key:``}">
            </div>
            <div style="display:flex; gap:12px;">
              <button type="submit" class="btn btn-primary" style="flex-grow:1; padding:10px 16px;">Save & Connect</button>
              ${t?`
                <button type="button" id="sup-disconnect-btn" class="btn btn-secondary" style="padding:10px 16px;">Disconnect</button>
              `:``}
            </div>
          </form>
        </div>

        <!-- Sync Actions and diagnostic status panels -->
        <div class="glass-card" style="display:flex; flex-direction:column; gap:16px;">
          <h3 style="font-size:15px; font-family:var(--font-heading); font-weight:700;">Operational Sync Status</h3>
          
          <div style="display:flex; flex-direction:column; gap:10px; font-size:13px;">
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--glass-border); padding-bottom:6px;">
              <span class="muted-text">Device Network Connection:</span>
              <strong class="${navigator.onLine?`success-text`:`warning-text`}">${navigator.onLine?`CONNECTED (ONLINE)`:`DISCONNECTED (OFFLINE)`}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--glass-border); padding-bottom:6px;">
              <span class="muted-text">Current System Mode:</span>
              <strong>${a===`local-only`?`Local-First (Offline Sandbox)`:`Cloud Synced (Automatic)`}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--glass-border); padding-bottom:6px;">
              <span class="muted-text">Transactions Awaiting Sync:</span>
              <strong class="${i.length>0?`warning-text`:`success-text`}">${i.length} items queued</strong>
            </div>
          </div>

          <div style="display:flex; gap:10px; margin-top:10px;">
            <button id="manual-sync-btn" class="btn btn-accent" style="flex-grow:1;" ${i.length===0||a===`offline`?`disabled`:``}>
              <i data-lucide="refresh-cw"></i>
              <span>Trigger Manual Sync</span>
            </button>
            <button id="pull-cloud-btn" class="btn btn-secondary" ${a===`online`?``:`disabled`} title="Pull all datasets from Cloud">
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
            ${s?`
              <div style="background:rgba(255,255,255,0.01); border:1px solid var(--glass-border); padding:16px; border-radius:8px; display:flex; flex-direction:column; gap:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <h4 style="font-size:13px; font-weight:700; display:flex; align-items:center; gap:6px;">
                      <i data-lucide="folder" style="color:var(--primary-color); width:16px; height:16px;"></i>
                      ${l}
                    </h4>
                    <p class="muted-text" style="font-size:11px; margin-top:2px;">Linked directory path handle</p>
                  </div>
                  <div>
                    ${c?`
                      <span class="badge success-badge" style="font-size:10px; padding:4px 8px; border-radius:4px; background:var(--success-glow); color:var(--success); border:1px solid var(--success); font-weight:bold;">Authorized</span>
                    `:`
                      <span class="badge warning-badge" style="font-size:10px; padding:4px 8px; border-radius:4px; background:var(--warning-glow); color:var(--warning); border:1px solid var(--warning); font-weight:bold;">Needs Auth</span>
                    `}
                  </div>
                </div>

                ${c?`
                  <div style="display:flex; align-items:center; gap:8px; border-top:1px solid var(--glass-border); padding-top:12px; margin-top:4px;">
                    <input type="checkbox" id="local-folder-autosave-check" ${n.isLocalDirAutoSave?`checked`:``} style="width:16px; height:16px; cursor:pointer;">
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
                `:`
                  <button id="local-folder-auth-btn" class="btn btn-accent" style="padding:10px 16px; width:100%; display:inline-flex; align-items:center; justify-content:center; gap:8px;">
                    <i data-lucide="key"></i>
                    <span>Authorize Folder Access</span>
                  </button>
                `}

                <button id="local-folder-disconnect-btn" class="btn btn-secondary" style="padding:8px 12px; font-size:12px; width:100%; display:inline-flex; align-items:center; justify-content:center; gap:6px; border-color:var(--danger); color:var(--danger); margin-top:4px;">
                  <i data-lucide="folder-minus" style="width:14px; height:14px;"></i>
                  <span>Disconnect Folder</span>
                </button>
              </div>
            `:`
              <div style="background:rgba(255,255,255,0.01); border:1px dashed var(--glass-border); padding:16px; border-radius:8px; display:flex; flex-direction:column; gap:12px;">
                <p class="muted-text" style="font-size:12px; margin:0; text-align:center;">No local folder connected. Database changes are saved to browser IndexedDB only.</p>
                
                ${o?`
                  <button id="local-folder-select-btn" class="btn btn-primary" style="padding:10px 16px; margin: 0 auto; display: inline-flex; align-items: center; gap: 8px;">
                    <i data-lucide="folder-plus"></i>
                    <span>Select Local Folder</span>
                  </button>
                  <div style="text-align:center; font-size:11px; margin:4px 0;" class="muted-text">— OR ENTER PATH MANUALLY —</div>
                `:`
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
              <input type="password" id="ai-key" class="form-control-noicon" placeholder="sk-or-v1-..." value="${localStorage.getItem(`eva_openrouter_api_key`)||``}">
            </div>
            <div class="input-group" style="margin-bottom:0;">
              <label>Default Vision Model</label>
              <select id="ai-model" class="form-control-noicon">
                <option value="google/gemini-2.5-flash" ${localStorage.getItem(`eva_openrouter_model`)===`google/gemini-2.5-flash`||!localStorage.getItem(`eva_openrouter_model`)?`selected`:``}>Google: Gemini 2.5 Flash (Recommended)</option>
                <option value="google/gemini-2.5-pro" ${localStorage.getItem(`eva_openrouter_model`)===`google/gemini-2.5-pro`?`selected`:``}>Google: Gemini 2.5 Pro</option>
                <option value="meta-llama/llama-3.2-11b-vision-instruct" ${localStorage.getItem(`eva_openrouter_model`)===`meta-llama/llama-3.2-11b-vision-instruct`?`selected`:``}>Llama 3.2 11B Vision</option>
              </select>
            </div>
            <div style="display:flex; gap:12px;">
              <button id="ai-save-btn" class="btn btn-primary" style="flex-grow:1; padding:10px 16px;">Save API Configuration</button>
              ${localStorage.getItem(`eva_openrouter_api_key`)?`<button id="ai-clear-btn" class="btn btn-secondary" style="padding:10px 16px;">Clear Key</button>`:``}
            </div>
          </div>
        </div>

      </div>
    </div>
  `,it(e),lucide.createIcons()}function it(e){document.getElementById(`supabase-config-form`).addEventListener(`submit`,async t=>{t.preventDefault();let n=document.getElementById(`sup-url`).value.trim(),i=document.getElementById(`sup-key`).value.trim();if(!n||!i){Q.showToast(`Validation Error`,`Please fill in both Supabase Endpoint URL and API Secret Key.`,`danger`);return}r.saveConfig(n,i),Q.showToast(`Configuration Saved`,`Connected Supabase parameters. Operational sync is now active.`,`success`),r.getStatus()===`online`&&(Q.showToast(`Syncing Queue`,`Pushing queued offline transactions to Supabase backend...`,`info`),await r.syncQueue()),await $(e)});let t=document.getElementById(`sup-disconnect-btn`);t&&t.addEventListener(`click`,async()=>{r.saveConfig(``,``),Q.showToast(`Disconnected`,`Severed Supabase cloud endpoints. Operating in local offline sandbox mode.`,`info`),await $(e)}),document.getElementById(`g-save-btn`)?.addEventListener(`click`,()=>{let e=document.getElementById(`g-webhook-url`)?.value.trim(),t=document.getElementById(`g-autosync-check`)?.checked;localStorage.setItem(`aeroglass_gsheet_webhook`,e),localStorage.setItem(`aeroglass_gsheet_autosync`,t?`true`:`false`),Q.showToast(`Google Sheets Linked`,`Failover backup parameters saved successfully.`,`success`)}),document.getElementById(`g-forcesync-btn`)?.addEventListener(`click`,async()=>{let e=document.getElementById(`g-webhook-url`)?.value.trim();if(!e){Q.showToast(`Missing Webhook`,`Please provide a valid Google AppScript URL first.`,`warning`);return}Q.showToast(`Sync Started`,`Pushing database snapshots to Google Sheets...`,`info`);try{let t=await n.getAll(`inventory`),r=await n.getAll(`employees`),i=[];try{i=await n.getAll(`tools_tracking`)}catch{}await fetch(e,{method:`POST`,mode:`no-cors`,headers:{"Content-Type":`application/json`},body:JSON.stringify({timestamp:new Date().toISOString(),inventory:t,hr_employees:r,tools:i})}),Q.showToast(`Matrix Push Succeeded`,`Spreadsheet state successfully replicated.`,`success`)}catch(e){console.error(e),Q.showToast(`Sync Failed`,`Could not reach Google Sheets Webhook.`,`danger`)}}),document.getElementById(`turso-save-btn`)?.addEventListener(`click`,async()=>{let t=document.getElementById(`turso-url`)?.value.trim(),n=document.getElementById(`turso-token`)?.value.trim();if(!t||!n){Q.showToast(`Validation Error`,`Please provide both Turso Database URL and Auth Token.`,`danger`);return}r.saveTursoConfig(t,n),Q.showToast(`Turso Connected`,`Turso cloud database credentials saved. Initializing schema...`,`success`);try{await r.createTursoTables(),Q.showToast(`Schema Ready`,`✓ Turso tables initialized. Triple-sync pipeline is now fully active.`,`success`)}catch{Q.showToast(`Schema Warning`,`Turso connected but table initialization could not be confirmed. Check your URL.`,`warning`)}await $(e)}),document.getElementById(`turso-disconnect-btn`)?.addEventListener(`click`,async()=>{r.saveTursoConfig(``,``),Q.showToast(`Turso Disconnected`,`Removed Turso cloud credentials. Pipeline reverted to Supabase + Sheets.`,`info`),await $(e)});let i=document.getElementById(`manual-sync-btn`);i&&i.addEventListener(`click`,async()=>{i.disabled=!0,Q.showToast(`Manual Sync Started`,`Commencing queue reconcile...`,`info`),await r.syncQueue()?Q.showToast(`Sync Succeeded`,`Reconciled all offline queue records with Supabase backend.`,`success`):Q.showToast(`Sync Failure`,`Failed to synchronize queue with Supabase. Check connectivity and credentials.`,`danger`),await $(e)});let a=document.getElementById(`pull-cloud-btn`);a&&a.addEventListener(`click`,async()=>{a.disabled=!0,Q.showToast(`Cloud Pull Triggered`,`Refreshing local stores with cloud backend files...`,`info`),await r.pullAllFromCloud()?Q.showToast(`Pull Complete`,`Refreshed local records from cloud backend tables.`,`success`):Q.showToast(`Pull Failure`,`Cloud pull failed.`,`danger`),a.disabled=!1}),document.getElementById(`export-inv-csv-btn`).addEventListener(`click`,async()=>{let e=await n.getAll(`inventory`);if(e.length===0){Q.showToast(`Export Blocked`,`No catalog records exist to back up.`,`warning`);return}let t=`Item Code,Item Name,Category,Unit,Current Stock,Safety Minimum,Description
`;e.forEach(e=>{let n=e.name.replace(/"/g,`""`),r=e.description.replace(/"/g,`""`);t+=`"${e.code}","${n}","${e.category}","${e.unit}",${e.currentStock},${e.minStock},"${r}"\n`});let r=new Blob([t],{type:`text/csv;charset=utf-8;`}),i=document.createElement(`a`),a=URL.createObjectURL(r);i.setAttribute(`href`,a),i.setAttribute(`download`,`AeroGlass_Inventory_Backup_${new Date().toISOString().slice(0,10)}.csv`),i.style.visibility=`hidden`,document.body.appendChild(i),i.click(),document.body.removeChild(i),Q.showToast(`Backup Complete`,`Downloaded Item Master catalogue data as CSV file successfully.`,`success`)}),document.getElementById(`export-tx-csv-btn`).addEventListener(`click`,async()=>{let e=await n.getAll(`transactions`),t=await n.getAll(`inventory`);if(e.length===0){Q.showToast(`Export Blocked`,`No transaction ledgers logged yet.`,`warning`);return}let r=`Transaction ID,Item Code,Item Name,Action Type,Quantity,Supplier/Purpose,Date
`;e.forEach(e=>{let n=t.find(t=>t.id===e.itemId),i=n?n.code:`UNKNOWN`,a=n?n.name.replace(/"/g,`""`):`Deleted Item`,o=e.sourceOrPurpose.replace(/"/g,`""`);r+=`"${e.id}","${i}","${a}","${e.type}",${e.quantity},"${o}","${e.date}"\n`});let i=new Blob([r],{type:`text/csv;charset=utf-8;`}),a=document.createElement(`a`),o=URL.createObjectURL(i);a.setAttribute(`href`,o),a.setAttribute(`download`,`AeroGlass_Ledger_Transactions_Backup_${new Date().toISOString().slice(0,10)}.csv`),a.style.visibility=`hidden`,document.body.appendChild(a),a.click(),document.body.removeChild(a),Q.showToast(`Backup Complete`,`Downloaded chronological warehouse ledger logs as CSV successfully.`,`success`)}),document.getElementById(`ai-save-btn`)?.addEventListener(`click`,()=>{let t=document.getElementById(`ai-key`)?.value.trim(),n=document.getElementById(`ai-model`)?.value;t&&localStorage.setItem(`eva_openrouter_api_key`,t),n&&localStorage.setItem(`eva_openrouter_model`,n),Q.showToast(`API Vault Synchronized`,`API key and default model saved securely in local storage.`,`success`),$(e)}),document.getElementById(`ai-clear-btn`)?.addEventListener(`click`,()=>{localStorage.removeItem(`eva_openrouter_api_key`),Q.showToast(`Key Revoked`,`API key has been deleted from local vault storage.`,`info`),$(e)}),document.getElementById(`local-folder-select-btn`)?.addEventListener(`click`,async()=>{try{let t=await window.showDirectoryPicker();if(await n.setLocalDirHandle(t),Q.showToast(`Folder Connected`,`Connected to local folder: ${t.name}`,`success`),await n.verifyPermission(!0)){let r=!1;try{for await(let e of t.values())if(e.name.endsWith(`.json`)){r=!0;break}}catch{}if(r){let r=`
            <div style="display:flex; flex-direction:column; gap:16px;">
              <p>The folder <strong>${t.name}</strong> contains existing database files. How would you like to initialize the database?</p>
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
          `;Q.openModal(`Database Sync Choice`,r),document.getElementById(`modal-import-btn`)?.addEventListener(`click`,async()=>{Q.closeModal(),Q.showToast(`Importing`,`Loading data from local folder...`,`info`);try{let e=await n.importAllFromFolder();Q.showToast(`Import Complete`,`Successfully loaded ${e} tables from folder.`,`success`)}catch(e){Q.showToast(`Import Failed`,e.message,`danger`)}await $(e)}),document.getElementById(`modal-export-btn`)?.addEventListener(`click`,async()=>{Q.closeModal(),Q.showToast(`Exporting`,`Writing database to local folder...`,`info`);try{await n.exportAllToFolder(),Q.showToast(`Export Complete`,`Successfully exported all tables to folder.`,`success`)}catch(e){Q.showToast(`Export Failed`,e.message,`danger`)}await $(e)})}else Q.showToast(`Exporting`,`Empty folder. Writing initial database schema...`,`info`),await n.exportAllToFolder(),Q.showToast(`Export Complete`,`Exported initial database state to local folder.`,`success`)}await $(e)}catch(e){e.name!==`AbortError`&&(console.error(e),Q.showToast(`Connection Error`,e.message,`danger`))}}),document.getElementById(`local-folder-auth-btn`)?.addEventListener(`click`,async()=>{try{await n.requestPermission(!0)?Q.showToast(`Access Granted`,`Successfully authorized database folder access.`,`success`):Q.showToast(`Access Denied`,`Folder access was not authorized.`,`warning`),await $(e)}catch(e){console.error(e),Q.showToast(`Authorization Error`,e.message,`danger`)}}),document.getElementById(`local-folder-disconnect-btn`)?.addEventListener(`click`,async()=>{await n.setLocalDirHandle(null),n.localDirPath=null,await n.setSetting(`local_dir_path`,null),Q.showToast(`Disconnected`,`Local folder disconnected. Data remains in browser IndexedDB.`,`info`),await $(e)}),document.getElementById(`local-folder-path-connect-btn`)?.addEventListener(`click`,async()=>{let t=document.getElementById(`local-folder-path-input`)?.value.trim();if(!t){Q.showToast(`Validation Error`,`Please enter a valid folder path.`,`danger`);return}Q.showToast(`Connecting`,`Verifying folder path via local server...`,`info`);try{let r=n.localDirPath;if(n.localDirPath=t,await n.verifyPermission(!0)){await n.setSetting(`local_dir_path`,t),await n.setSetting(`local_dir_autosave`,n.isLocalDirAutoSave),await n.setLocalDirHandle(null),n.localDirPath=t,Q.showToast(`Folder Connected`,`Connected via server API to: ${t}`,`success`);let r=await(await fetch(`/api/local-db/check?path=${encodeURIComponent(t)}`)).json();if(r.files&&r.files.length>0){let r=`
            <div style="display:flex; flex-direction:column; gap:16px;">
              <p>The folder <strong>${t}</strong> contains existing database files. How would you like to initialize the database?</p>
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
          `;Q.openModal(`Database Sync Choice`,r),document.getElementById(`modal-import-btn`)?.addEventListener(`click`,async()=>{Q.closeModal(),Q.showToast(`Importing`,`Loading data from local folder...`,`info`);try{let e=await n.importAllFromFolder();Q.showToast(`Import Complete`,`Successfully loaded ${e} tables from folder.`,`success`)}catch(e){Q.showToast(`Import Failed`,e.message,`danger`)}await $(e)}),document.getElementById(`modal-export-btn`)?.addEventListener(`click`,async()=>{Q.closeModal(),Q.showToast(`Exporting`,`Writing database to local folder...`,`info`);try{await n.exportAllToFolder(),Q.showToast(`Export Complete`,`Successfully exported all tables to folder.`,`success`)}catch(e){Q.showToast(`Export Failed`,e.message,`danger`)}await $(e)})}else Q.showToast(`Exporting`,`Empty folder. Writing initial database schema...`,`info`),await n.exportAllToFolder(),Q.showToast(`Export Complete`,`Exported initial database state to local folder.`,`success`)}else n.localDirPath=r,Q.showToast(`Connection Failed`,`Folder path does not exist on your computer. Please create the folder first or verify the path: ${t}`,`danger`);await $(e)}catch(e){console.error(e),Q.showToast(`Connection Error`,e.message,`danger`)}}),document.getElementById(`local-folder-import-btn`)?.addEventListener(`click`,async()=>{if(window.confirm(`Are you sure you want to IMPORT? This will OVERWRITE all your current browser data with data from the folder!`))try{Q.showToast(`Importing`,`Loading data from local folder...`,`info`);let t=await n.importAllFromFolder();Q.showToast(`Import Complete`,`Successfully loaded ${t} tables from folder.`,`success`),await $(e)}catch(e){Q.showToast(`Import Failed`,e.message,`danger`)}}),document.getElementById(`local-folder-export-btn`)?.addEventListener(`click`,async()=>{try{Q.showToast(`Exporting`,`Writing all tables to folder...`,`info`),await n.exportAllToFolder(),Q.showToast(`Export Complete`,`Successfully exported all tables to folder.`,`success`)}catch(e){Q.showToast(`Export Failed`,e.message,`danger`)}}),document.getElementById(`local-folder-autosave-check`)?.addEventListener(`change`,async e=>{n.isLocalDirAutoSave=e.target.checked,await n.setSetting(`local_dir_autosave`,n.isLocalDirAutoSave),Q.showToast(`Setting Saved`,`Auto-save ${n.isLocalDirAutoSave?`enabled`:`disabled`}.`,`success`)})}new Proxy({},{get:(e,t)=>window.app?window.app[t]:void 0});async function at(e){e.innerHTML=`
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
  `,ot(e),lucide.createIcons()}function ot(e){let t=`inventory`,i=async e=>{let t=document.getElementById(`db-table-head`),i=document.getElementById(`db-table-body`);if(!t||!i)return;let a=await n.getAll(e);if(a.length===0){t.innerHTML=``,i.innerHTML=`<tr><td class="text-center muted-text" style="padding:20px;">No records found in this table.</td></tr>`;return}let o=Object.keys(a[0]);t.innerHTML=`<tr>${o.map(e=>`<th style="padding:8px; font-size:10px; white-space:nowrap;">${e}</th>`).join(``)}</tr>`,i.innerHTML=a.slice(0,50).map((t,n)=>`
      <tr>
        ${o.map(r=>{let i=t[r];return typeof i==`object`&&i&&(i=JSON.stringify(i)),i??=``,`<td style="padding:4px 6px; max-width:200px; overflow:hidden; text-overflow:ellipsis;">
            <input type="text" class="form-control-noicon cell-edit" data-table="${e}" data-row-id="${t.id||n}" data-key="${r}" value="${typeof i==`string`?i.replace(/"/g,`"`):i}" style="width:100%; padding:2px 4px; font-size:10px; background:transparent; border:none;" />
          </td>`}).join(``)}
      </tr>
    `).join(``),i.querySelectorAll(`.cell-edit`).forEach(e=>{let t;e.addEventListener(`input`,()=>{clearTimeout(t),t=setTimeout(async()=>{let t=e.getAttribute(`data-table`),i=e.getAttribute(`data-row-id`),a=e.getAttribute(`data-key`),o=e.value,s=(await n.getAll(t)).find(e=>(e.id||e.username)===i);s&&(s[a]=isNaN(o)?o:Number(o),await n.put(t,s),await r.queueOperation(t,`update`,s))},600)})})};i(`inventory`),e.querySelectorAll(`.table-select-btn`).forEach(n=>{n.addEventListener(`click`,()=>{e.querySelectorAll(`.table-select-btn`).forEach(e=>{e.className=`btn btn-secondary table-select-btn`,e.style.cssText=`padding:6px 14px; font-size:12px;`}),n.className=`btn btn-primary table-select-btn`,n.style.cssText=`padding:6px 14px; font-size:12px;`,t=n.getAttribute(`data-table`),i(t)})})}new class{constructor(){window.app=this,this.currentView=null,this.toastContainer=document.getElementById(`toast-container`),this.modalOverlay=document.getElementById(`global-modal`),this.modalContainer=document.getElementById(`modal-container`),this.modalTitle=document.getElementById(`modal-title`),this.modalBody=document.getElementById(`modal-body`),this.modalCloseBtn=document.getElementById(`modal-close-btn`),this.currentUser=null,this.initEventListeners(),this.initSyncStatus(),this.initTheme(),this.initAuth(),navigator.onLine&&r.createTursoTables().catch(e=>console.warn(`Turso init skipped on startup:`,e.message))}initAuth(){let e=document.getElementById(`login-container`),t=document.getElementById(`app-container`),n=document.getElementById(`login-form`),r=document.getElementById(`logout-btn`),a=sessionStorage.getItem(`aeroglass_user`);a&&(this.currentUser=JSON.parse(a),e.classList.add(`hidden`),t.classList.remove(`hidden`),this.updateProfileWidgets()),n.addEventListener(`submit`,async r=>{r.preventDefault();let a=document.getElementById(`login-username`),o=document.getElementById(`login-password`),s=a.value.trim(),c=o.value;if(!s||!c)return;let l=n.querySelector(`button[type="submit"]`);l.disabled=!0,l.textContent=`Verifying operator profile...`;try{let n=await i.login(s,c);this.currentUser=n,sessionStorage.setItem(`aeroglass_user`,JSON.stringify(this.currentUser)),e.classList.add(`fade-out`),setTimeout(()=>{e.classList.add(`hidden`),e.classList.remove(`fade-out`),t.classList.remove(`hidden`),t.classList.add(`fade-in`),this.updateProfileWidgets(),this.handleRoute(),lucide.createIcons()},500)}catch(e){this.showToast(`Login Denied`,e.message,`danger`)}finally{l.disabled=!1,l.textContent=`Initialize Workspace Session`}}),r.addEventListener(`click`,()=>{i.logout(),this.currentUser=null,window.location.hash=``,window.location.reload()})}updateProfileWidgets(){this.currentUser&&(document.getElementById(`profile-name`).textContent=this.currentUser.username,document.getElementById(`profile-role`).textContent=this.currentUser.role,document.getElementById(`user-avatar`).textContent=this.currentUser.initials||`AD`,document.querySelectorAll(`.sidebar-nav .nav-item`).forEach(e=>{let t=e.getAttribute(`data-view`);i.canAccessView(t)?e.style.display=`flex`:e.style.display=`none`}))}async start(){try{await n.init(),console.log(`Database and seed data successfully initialized.`)}catch(e){console.error(`Failed to initialize database:`,e)}this.currentUser?(this.handleRoute(),window.addEventListener(`hashchange`,()=>this.handleRoute())):window.addEventListener(`hashchange`,()=>{this.currentUser&&this.handleRoute()}),this.startGoogleSheetsSyncLoop()}startGoogleSheetsSyncLoop(){let e=async()=>{let e=localStorage.getItem(`aeroglass_gsheet_webhook`);if(!(localStorage.getItem(`aeroglass_gsheet_autosync`)===`false`||!e))try{let t=await n.getAll(`inventory`),r=await n.getAll(`employees`),i=[];try{i=await n.getAll(`tools_tracking`)}catch{}await fetch(e,{method:`POST`,mode:`no-cors`,headers:{"Content-Type":`application/json`},body:JSON.stringify({timestamp:new Date().toISOString(),inventory:t,hr_employees:r,tools:i})}),console.log(`Automated spreadsheet state shadow sync array succeeded.`)}catch(e){console.error(`Hourly automated cloud sheet matrix serialization fail:`,e)}};e(),setInterval(e,36e5)}async handleRoute(){document.getElementById(`app-container`).classList.remove(`hidden`),this.updateProfileWidgets();let e=window.location.hash.slice(1)||`dashboard`,t=e.split(`/`),n=t[0];this.updateSidebarActive(n);let r=document.getElementById(`view-content`);if(!i.canAccessView(n)){r.innerHTML=`
        <div class="glass-card text-center" style="margin: 40px auto; max-width: 500px; padding: 40px;">
          <i data-lucide="shield-alert" class="warning-text" style="width: 48px; height: 48px; margin-bottom: 16px; display:inline-block;"></i>
          <h3 class="warning-text" style="font-family:var(--font-heading); font-weight:700;">Access Denied</h3>
          <p class="muted-text" style="margin-top: 8px; font-size:13px;">Your Operator Profile (${this.currentUser.role}) does not have permission to access the <strong>${n}</strong> module.</p>
          <button onclick="window.location.hash='#dashboard'" class="btn btn-primary" style="margin-top: 20px; padding: 8px 16px;">Back to Dashboard</button>
        </div>
      `,lucide.createIcons();return}r.innerHTML=`
      <div class="text-center muted-text" style="padding: 100px 0;">
        <i data-lucide="loader" class="spinning" style="width: 48px; height: 48px; margin-bottom: 16px;"></i>
        <p>Loading module workspace...</p>
      </div>
    `,lucide.createIcons();try{this.currentView=e;let i=document.getElementById(`view-title`);switch(n){case`dashboard`:i.textContent=`Operational Dashboard`,await s(r);break;case`quotations`:i.textContent=`Quotation & Invoice Studio`,await S(r,t);break;case`projects`:i.textContent=`Projects & Kanban`,await Se(r,t);break;case`hr`:i.textContent=`HR Management`,await Fe(r,t);break;case`inventory`:i.textContent=`Store & Inventory`,await Y(r,t);break;case`gatepass`:i.textContent=`Gate Pass-PI Manager`,await M(r,t);break;case`tools`:i.textContent=`Order Tracking Manager`,await F(r);break;case`users`:i.textContent=`User Administration`,await nt(r);break;case`settings`:i.textContent=`System Settings`,await $(r);break;case`db_explorer`:i.textContent=`Database Explorer`,await at(r);break;default:window.location.hash=`#dashboard`;break}}catch(e){console.error(`Module rendering failure:`,e),r.innerHTML=`
        <div class="glass-card text-center" style="margin: 40px auto; max-width: 500px;">
          <i data-lucide="alert-triangle" class="danger-text" style="width: 48px; height: 48px; margin-bottom: 16px;"></i>
          <h3 class="danger-text">Rendering Failure</h3>
          <p class="muted-text" style="margin-top: 8px;">An error occurred while loading this workspace screen.</p>
          <pre style="text-align: left; background: rgba(0,0,0,0.3); padding: 12px; margin-top: 16px; border-radius: 6px; font-size:12px; overflow-x:auto;">${e.message}</pre>
        </div>
      `}lucide.createIcons()}updateSidebarActive(e){document.querySelectorAll(`.sidebar-nav .nav-item`).forEach(t=>{t.getAttribute(`data-view`)===e?t.classList.add(`active`):t.classList.remove(`active`)})}initEventListeners(){this.modalCloseBtn.addEventListener(`click`,()=>this.closeModal()),this.modalOverlay.addEventListener(`click`,e=>{e.target===this.modalOverlay&&this.closeModal()});let e=document.getElementById(`sidebar-collapse-btn`),t=document.getElementById(`app-container`);e&&t&&e.addEventListener(`click`,()=>{t.classList.toggle(`collapsed`),e.innerHTML=`<i data-lucide="${t.classList.contains(`collapsed`)?`chevron-right`:`chevron-left`}" id="sidebar-collapse-icon" style="width: 20px; height: 20px;"></i>`,lucide.createIcons()});let n=document.getElementById(`theme-toggle`),r=document.getElementById(`theme-icon-sun`),i=document.getElementById(`theme-icon-moon`);n.addEventListener(`click`,()=>{let e=document.documentElement.getAttribute(`data-theme`)===`dark`?`light`:`dark`;document.documentElement.setAttribute(`data-theme`,e),localStorage.setItem(`aeroglass_theme`,e),e===`light`?(r.classList.remove(`hidden`),i.classList.add(`hidden`)):(r.classList.add(`hidden`),i.classList.remove(`hidden`))})}initSyncStatus(){let e=document.getElementById(`sync-indicator`),t=document.getElementById(`sync-label`);r.subscribe(i=>{switch(e&&(e.className=`sync-indicator `+i),i){case`online`:t&&(t.textContent=`Sync Connected`);break;case`offline`:t&&(t.textContent=`Offline Cache`);break;case`syncing`:t&&(t.textContent=`Syncing...`);break;case`local-only`:t&&(t.textContent=`Local Database`);break}let a=document.getElementById(`sync-item-folder`),o=document.getElementById(`sync-status-folder`)?.querySelector(`.db-sync-status-text`),s=document.getElementById(`sync-status-folder`)?.querySelector(`.db-sync-dot`);n.localDirHandle||n.localDirPath?(a&&(a.style.display=`flex`),n.verifyPermission(!0).then(e=>{o&&(o.textContent=e?`Authorized`:`Needs Auth`),s&&(s.className=`db-sync-dot ${e?`online`:`warning`}`)})):a&&(a.style.display=`none`),r.updateSyncWidget()});let i=document.getElementById(`sync-item-folder`);i&&i.addEventListener(`click`,async()=>{await n.requestPermission(!0)?(this.showToast(`Folder Authorized`,`Granted read/write permissions to the local folder database.`,`success`),this.initSyncStatus()):this.showToast(`Authorization Failed`,`Could not obtain local folder access.`,`danger`)}),r.updateSyncWidget()}initTheme(){let e=localStorage.getItem(`aeroglass_theme`)||`dark`;document.documentElement.setAttribute(`data-theme`,e);let t=document.getElementById(`theme-icon-sun`),n=document.getElementById(`theme-icon-moon`);e===`light`?(t.classList.remove(`hidden`),n.classList.add(`hidden`)):(t.classList.add(`hidden`),n.classList.remove(`hidden`))}showToast(e,t,n=`info`,r=4e3){let i=document.createElement(`div`);i.className=`toast ${n}`;let a=`info`;n===`success`&&(a=`check-circle`),n===`warning`&&(a=`alert-triangle`),n===`danger`&&(a=`x-circle`),i.innerHTML=`
      <i data-lucide="${a}"></i>
      <div class="toast-content">
        <div class="toast-title">${e}</div>
        <div class="toast-message">${t}</div>
      </div>
    `,this.toastContainer.appendChild(i),lucide.createIcons(),setTimeout(()=>i.classList.add(`show`),50),setTimeout(()=>{i.classList.remove(`show`),setTimeout(()=>i.remove(),400)},r)}openModal(e,t,n=`650px`){this._closeModalTimer&&=(clearTimeout(this._closeModalTimer),null),this.modalTitle.textContent=e,this.modalContainer.style.maxWidth=n,typeof t==`string`?this.modalBody.innerHTML=t:(this.modalBody.innerHTML=``,this.modalBody.appendChild(t)),this.modalOverlay.classList.remove(`hidden`),requestAnimationFrame(()=>{this.modalOverlay.classList.add(`show`)}),lucide.createIcons()}closeModal(){this.modalOverlay.classList.remove(`show`),this.modalOverlay.classList.remove(`big-screen-mode`),this._closeModalTimer&&clearTimeout(this._closeModalTimer),this._closeModalTimer=setTimeout(()=>{this.modalOverlay.classList.add(`hidden`),this.modalOverlay.classList.remove(`big-screen-mode`),this.modalBody.innerHTML=``,this.modalContainer.style.maxWidth=`650px`,this._closeModalTimer=null},320)}async showConflictResolver(e,t,n){return new Promise(r=>{let i=[`updatedAt`,`syncDate`,`id`,`username`],a=Array.from(new Set([...Object.keys(t),...Object.keys(n)])).filter(e=>!i.includes(e)&&t[e]!==n[e]);if(a.length===0){r(t);return}let o=`
        <div style="display:flex; flex-direction:column; gap:16px;">
          <p class="muted-text" style="font-size:12px;">A sync collision occurred for database record <code>${t.id||t.username}</code> in store <strong>${e}</strong>. Select the version to preserve.</p>
          
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; max-height:280px; overflow-y:auto; padding:4px;">
            <!-- Local Changes Card -->
            <div class="glass-card" style="padding:12px; border-color:var(--warning); display:flex; flex-direction:column; gap:8px;">
              <h4 style="font-size:13px; font-weight:700; color:var(--warning-color); display:flex; align-items:center; gap:6px;">
                <i data-lucide="smartphone" style="width:14px; height:14px;"></i>
                <span>Local Operator Changes</span>
              </h4>
              <div style="font-size:11px; display:flex; flex-direction:column; gap:6px; color:var(--text-secondary);">
                ${a.map(e=>`
                  <div>
                    <strong>${e}:</strong> 
                    <span class="warning-text">${typeof t[e]==`object`?JSON.stringify(t[e]):t[e]}</span>
                  </div>
                `).join(``)}
              </div>
              <button id="conflict-keep-local" class="btn btn-primary btn-block" style="margin-top:auto; font-size:11px; padding:6px;">Use Local Changes</button>
            </div>
            
            <!-- Cloud Changes Card -->
            <div class="glass-card" style="padding:12px; border-color:var(--primary-color); display:flex; flex-direction:column; gap:8px;">
              <h4 style="font-size:13px; font-weight:700; color:var(--primary-color); display:flex; align-items:center; gap:6px;">
                <i data-lucide="cloud" style="width:14px; height:14px;"></i>
                <span>Cloud Server State</span>
              </h4>
              <div style="font-size:11px; display:flex; flex-direction:column; gap:6px; color:var(--text-secondary);">
                ${a.map(e=>`
                  <div>
                    <strong>${e}:</strong> 
                    <span class="success-text">${typeof n[e]==`object`?JSON.stringify(n[e]):n[e]}</span>
                  </div>
                `).join(``)}
              </div>
              <button id="conflict-keep-cloud" class="btn btn-secondary btn-block" style="margin-top:auto; font-size:11px; padding:6px;">Use Cloud State</button>
            </div>
          </div>
          
          <button id="conflict-keep-merge" class="btn btn-accent btn-block" style="padding:10px;">
            <i data-lucide="merge"></i>
            <span>Auto-Merge (Non-Overlapping Fields)</span>
          </button>
        </div>
      `;this.openModal(`⚠️ Database Sync Conflict`,o,`620px`),document.getElementById(`conflict-keep-local`).addEventListener(`click`,()=>{this.closeModal(),r(t)}),document.getElementById(`conflict-keep-cloud`).addEventListener(`click`,()=>{this.closeModal(),r(null)}),document.getElementById(`conflict-keep-merge`).addEventListener(`click`,()=>{this.closeModal(),r({...n,...t,updatedAt:new Date().toISOString()})})})}}().start();