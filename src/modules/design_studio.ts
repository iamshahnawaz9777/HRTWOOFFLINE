// EvA ERP Cloud - Parametric 2D/3D Design Studio & Quotation Estimator
import { db } from '../../js/db.js';
import { sync } from '../../js/sync.js';
import { ParametricCanvas, DesignData } from '../engines/ParametricCanvas';
import { SpatialPreviewer } from '../engines/SpatialPreviewer';
import { CostingEngine, CostBreakdown } from '../engines/CostingEngine';
import { AiOrchestrator } from '../ai/AiOrchestrator';

declare const lucide: any;

// Define a proxy for the global app to show toasts/modals
const appProxy = new Proxy({} as any, {
  get: (target, prop) => (window as any).app ? (window as any).app[prop] : undefined
});

export async function renderDesignStudio(container: HTMLElement, projectId: string) {
  // Fetch fittings catalog and designs
  const fittingsCatalog = await db.getAll('fittings');
  const allDesigns = await db.getAll('designs');
  
  // Find if there is an existing design for this project
  let designItem = allDesigns.find((d: any) => d.project_id === projectId);
  
  if (!designItem) {
    // Seed a default design for this project
    designItem = {
      id: `ds-${Date.now()}`,
      project_id: projectId,
      name: 'Standard Design Frame',
      type: 'window',
      width: 1500,
      height: 1200,
      glass_type: '6mm Clear Tempered',
      profile_type: 'Alu-Black-Matte',
      layout_data: {
        divisions: [
          { id: 'div-1', type: 'vertical', position: 0.5 }
        ],
        fittings: [
          { id: 'fit-4', quantity: 4 }, // Roller wheels
          { id: 'fit-3', quantity: 1 }  // Lock system
        ]
      }
    };
    await db.put('designs', designItem);
  }

  // Render Layout
  container.innerHTML = `
    <div style="display: grid; grid-template-columns: 320px 1fr 340px; gap: 20px; height: calc(100vh - 210px); overflow: hidden;">
      
      <!-- 1. LEFT PANEL: Controls & AI Blueprint Uploader -->
      <div class="glass-card" style="display:flex; flex-direction:column; padding:16px; overflow-y:auto; gap:16px;">
        <h3 style="font-size:14px; font-family:var(--font-heading); font-weight:700; margin-bottom:4px; display:flex; align-items:center; gap:8px;">
          <i data-lucide="sliders" style="width:16px; height:16px; color:var(--primary-color);"></i>
          <span>Configuration Studio</span>
        </h3>

        <!-- Core Parametric Inputs -->
        <div class="input-group" style="margin-bottom:0;">
          <label style="font-size:11px; text-transform:uppercase; font-weight:600;">Design Width (mm)</label>
          <input type="number" id="eva-width" class="form-control-noicon" value="${designItem.width}" min="300" max="6000" step="50">
        </div>

        <div class="input-group" style="margin-bottom:0;">
          <label style="font-size:11px; text-transform:uppercase; font-weight:600;">Design Height (mm)</label>
          <input type="number" id="eva-height" class="form-control-noicon" value="${designItem.height}" min="300" max="4000" step="50">
        </div>

        <div class="input-group" style="margin-bottom:0;">
          <label style="font-size:11px; text-transform:uppercase; font-weight:600;">Opening Type</label>
          <select id="eva-type" class="form-control-noicon">
            <option value="window" ${designItem.type === 'window' ? 'selected' : ''}>Sliding Window</option>
            <option value="door" ${designItem.type === 'door' ? 'selected' : ''}>Pivot Door</option>
            <option value="facade" ${designItem.type === 'facade' ? 'selected' : ''}>Structural Facade</option>
            <option value="partition" ${designItem.type === 'partition' ? 'selected' : ''}>Office Partition</option>
          </select>
        </div>

        <div class="input-group" style="margin-bottom:0;">
          <label style="font-size:11px; text-transform:uppercase; font-weight:600;">Profile Specification</label>
          <select id="eva-profile" class="form-control-noicon">
            <option value="Alu-Black-Matte" ${designItem.profile_type === 'Alu-Black-Matte' ? 'selected' : ''}>Alu - Matte Black</option>
            <option value="Alu-Rose-Gold" ${designItem.profile_type === 'Alu-Rose-Gold' ? 'selected' : ''}>Alu - Rose Gold Premium</option>
            <option value="Alu-Silver-Anodized" ${designItem.profile_type === 'Alu-Silver-Anodized' ? 'selected' : ''}>Alu - Silver Anodized</option>
            <option value="UPVC-White" ${designItem.profile_type === 'UPVC-White' ? 'selected' : ''}>uPVC - Glossy White</option>
          </select>
        </div>

        <div class="input-group" style="margin-bottom:0;">
          <label style="font-size:11px; text-transform:uppercase; font-weight:600;">Glass Specifications</label>
          <select id="eva-glass" class="form-control-noicon">
            <option value="6mm Clear Tempered" ${designItem.glass_type === '6mm Clear Tempered' ? 'selected' : ''}>6mm Clear Tempered</option>
            <option value="8mm Frosted" ${designItem.glass_type === '8mm Frosted' ? 'selected' : ''}>8mm Satin Frosted</option>
            <option value="12mm Double-Glazed" ${designItem.glass_type === '12mm Double-Glazed' ? 'selected' : ''}>12mm Insulated Double-Glazed</option>
            <option value="10mm Clear Tempered" ${designItem.glass_type === '10mm Clear Tempered' ? 'selected' : ''}>10mm Structural Tempered</option>
            <option value="12mm Frosted" ${designItem.glass_type === '12mm Frosted' ? 'selected' : ''}>12mm Frosted Partition</option>
          </select>
        </div>

        <!-- Add Divisions -->
        <div style="border-top: 1px solid var(--glass-border); padding-top: 12px; display:flex; flex-direction:column; gap:8px;">
          <label style="font-size:11px; text-transform:uppercase; font-weight:600; margin-bottom:2px;">Divider Controls</label>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <button id="btn-add-mullion" class="btn btn-secondary" style="padding:6px; font-size:11px;">+ Mullion (Vert)</button>
            <button id="btn-add-transom" class="btn btn-secondary" style="padding:6px; font-size:11px;">+ Transom (Horiz)</button>
          </div>
          <button id="btn-clear-divs" class="btn btn-danger" style="padding:6px; font-size:11px; opacity:0.8;">Clear Dividers</button>
        </div>

        <!-- BYOK AI Scanner -->
        <div style="border-top: 1px solid var(--glass-border); padding-top: 14px; margin-top: auto; display:flex; flex-direction:column; gap:8px;">
          <h4 style="font-size:12px; font-weight:700; margin-bottom:2px; display:flex; align-items:center; gap:6px;">
            <i data-lucide="sparkles" style="width:14px; height:14px; color:#f6ad55;"></i>
            <span>AI Blueprint Estimator</span>
          </h4>
          <p class="muted-text" style="font-size:10px; line-height:1.3; margin-bottom:4px;">
            Upload blueprint drawings or site photos to auto-extract dimensions, profiles, and transoms.
          </p>
          <div class="input-group" style="margin-bottom:0;">
            <label for="ai-file-upload" class="btn btn-secondary btn-block" style="cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; font-size:11px; padding:8px;">
              <i data-lucide="upload" style="width:14px; height:14px;"></i>
              <span>Upload Blueprints</span>
            </label>
            <input type="file" id="ai-file-upload" accept="image/*" style="display:none;">
          </div>
          <div id="ai-spinner" class="hidden text-center" style="font-size:11px; padding:8px 0; color:#f6ad55;">
            <i data-lucide="loader" class="spinning" style="width:14px; height:14px; display:inline-block; vertical-align:middle; margin-right:4px;"></i>
            Analyzing blueprint structure...
          </div>
        </div>

      </div>

      <!-- 2. MIDDLE PANEL: Design Editor (2D Canvas / 3D Previewer) -->
      <div style="display:flex; flex-direction:column; gap:16px; height:100%;">
        <!-- View Tabs -->
        <div class="glass-card" style="padding:6px; display:flex; gap:8px; align-items:center;">
          <button id="tab-2d" class="btn btn-primary" style="padding:6px 16px; font-size:12px; background:var(--primary-color);">2D Sketch Editor</button>
          <button id="tab-3d" class="btn btn-secondary" style="padding:6px 16px; font-size:12px;">3D Spatial Preview</button>
          <span style="margin-left:auto; font-size:11px; color:var(--text-secondary); padding-right:8px;" class="muted-text">
            * Drag dividers in 2D to adjust layouts in real-time
          </span>
        </div>

        <!-- Render Workspace Viewports -->
        <div class="glass-card" style="flex-grow:1; position:relative; overflow:hidden; display:flex; align-items:stretch; background:rgba(0,0,0,0.15);">
          <!-- 2D Viewport -->
          <canvas id="eva-canvas-2d" style="width:100%; height:100%; display:block;"></canvas>
          
          <!-- 3D Viewport -->
          <div id="eva-container-3d" style="position:absolute; top:0; left:0; width:100%; height:100%; display:none;"></div>
        </div>
      </div>

      <!-- 3. RIGHT PANEL: Quotation & Nesting optimization -->
      <div class="glass-card" style="display:flex; flex-direction:column; padding:16px; overflow-y:auto; gap:16px;">
        <h3 style="font-size:14px; font-family:var(--font-heading); font-weight:700; margin-bottom:4px; display:flex; align-items:center; gap:8px;">
          <i data-lucide="calculator" style="width:16px; height:16px; color:var(--primary-color);"></i>
          <span>Live Quotation & BOM</span>
        </h3>

        <!-- Real-Time BOM details -->
        <div style="background:rgba(0,0,0,0.2); border:1px solid var(--glass-border); padding:10px; border-radius:6px; font-size:11px; display:flex; flex-direction:column; gap:6px;">
          <div style="font-weight:700; color:var(--text-secondary); border-bottom:1px solid var(--glass-border); padding-bottom:4px; text-transform:uppercase;">Materials BoM</div>
          <div style="display:flex; justify-content:space-between;">
            <span>Effective Glass Area:</span>
            <strong id="bom-glass">0.00 SqM</strong>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span>Total Profile Length:</span>
            <strong id="bom-profile">0.00 m</strong>
          </div>
        </div>

        <!-- 1D Profile Nesting Optimization Output -->
        <div style="background:rgba(0,0,0,0.2); border:1px solid var(--glass-border); padding:10px; border-radius:6px; font-size:11px; display:flex; flex-direction:column; gap:6px;">
          <div style="font-weight:700; color:#4fd1c5; border-bottom:1px solid var(--glass-border); padding-bottom:4px; text-transform:uppercase; display:flex; align-items:center; gap:4px;">
            <i data-lucide="scissors" style="width:12px; height:12px;"></i>
            <span>Nesting Cut Sheet (6m Bars)</span>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span>Bars Required:</span>
            <strong id="nest-bars">0</strong>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span>Scrap Waste:</span>
            <strong id="nest-waste" style="color:#f6ad55;">0%</strong>
          </div>
          <div id="nest-cutting-map" style="max-height:80px; overflow-y:auto; font-size:10px; color:var(--text-secondary); margin-top:4px; padding-top:4px; border-top:1px dashed var(--glass-border); display:flex; flex-direction:column; gap:3px;">
            <!-- Render cutting layout per bar -->
          </div>
        </div>

        <!-- Live Price Breakdown -->
        <div style="flex-grow:1; display:flex; flex-direction:column; gap:8px;">
          <div style="font-weight:700; font-size:11px; color:var(--text-secondary); text-transform:uppercase;">Quotation Estimate</div>
          <table style="width:100%; font-size:12px; border-collapse:collapse;" id="estimate-table">
            <tbody>
              <tr>
                <td style="padding:4px 0; color:var(--text-muted);">Glass paneling:</td>
                <td style="padding:4px 0; text-align:right;" id="cost-glass">$0.00</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:var(--text-muted);">Aluminum bars:</td>
                <td style="padding:4px 0; text-align:right;" id="cost-profiles">$0.00</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:var(--text-muted);">Fittings & seals:</td>
                <td style="padding:4px 0; text-align:right;" id="cost-fittings">$0.00</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:var(--text-muted);">Fabrication labor:</td>
                <td style="padding:4px 0; text-align:right;" id="cost-labor">$0.00</td>
              </tr>
              <tr style="border-bottom:1px solid var(--glass-border);">
                <td style="padding:4px 0; padding-bottom:8px; color:var(--text-muted);">Site installation:</td>
                <td style="padding:4px 0; padding-bottom:8px; text-align:right;" id="cost-install">$0.00</td>
              </tr>
              <tr>
                <td style="padding:8px 0; font-weight:600; color:var(--text-secondary);">Subtotal:</td>
                <td style="padding:8px 0; text-align:right; font-weight:600;" id="cost-subtotal">$0.00</td>
              </tr>
              <tr style="border-bottom:1px double var(--glass-border);">
                <td style="padding:4px 0; padding-bottom:8px; color:var(--text-muted);" id="cost-markup-label">Agency markup (25%):</td>
                <td style="padding:4px 0; padding-bottom:8px; text-align:right;" id="cost-markup">$0.00</td>
              </tr>
              <tr style="font-size:15px; font-weight:700;">
                <td style="padding:10px 0; color:var(--primary-color);">Final client quote:</td>
                <td style="padding:10px 0; text-align:right; color:var(--primary-color);" id="cost-final">$0.00</td>
              </tr>
            </tbody>
          </table>
        </div>

        <button id="btn-save-quote" class="btn btn-primary btn-block" style="padding:10px;">
          <i data-lucide="file-check"></i>
          <span>Save Quote & Design</span>
        </button>
      </div>

    </div>
  `;

  lucide.createIcons();

  // 2D canvas initialization
  const canvasEl = document.getElementById('eva-canvas-2d') as HTMLCanvasElement;
  const initialDesignData: Partial<DesignData> = {
    width: Number(designItem.width),
    height: Number(designItem.height),
    type: designItem.type,
    glassType: designItem.glass_type,
    profileType: designItem.profile_type,
    divisions: designItem.layout_data?.divisions || [],
    fittings: designItem.layout_data?.fittings || [
      { id: 'fit-1', quantity: 2 },
      { id: 'fit-2', quantity: 1 }
    ]
  };

  const canvas2d = new ParametricCanvas(canvasEl, initialDesignData);
  
  // 3D Spatial previewer container
  const container3d = document.getElementById('eva-container-3d') as HTMLDivElement;
  let spatial3d: SpatialPreviewer | null = null;
  let activeTab: '2d' | '3d' = '2d';

  // Live calculator update routine
  const updateEstimates = () => {
    const bom = canvas2d.getBOM();
    const costBreakdown: CostBreakdown = CostingEngine.calculateCost(canvas2d.design, fittingsCatalog);

    // Update BoM UI
    document.getElementById('bom-glass')!.textContent = `${bom.glassAreaSqM.toFixed(2)} SqM`;
    document.getElementById('bom-profile')!.textContent = `${bom.profileLengthM.toFixed(2)} m`;

    // Update Nesting UI
    document.getElementById('nest-bars')!.textContent = String(costBreakdown.nestingResult.barsCount);
    document.getElementById('nest-waste')!.textContent = `${costBreakdown.nestingResult.wastePercent.toFixed(1)}%`;
    
    // Render Nesting Cutting Map list
    const cuttingListEl = document.getElementById('nest-cutting-map')!;
    cuttingListEl.innerHTML = costBreakdown.nestingResult.cuttingMap.map((barCuts, idx) => {
      const remainingSpace = CostingEngine.BAR_STOCK_LENGTH_MM - barCuts.reduce((a,b)=>a+b, 0);
      return `<div>Bar #${idx + 1}: Cuts [${barCuts.join('mm, ')}mm] | Leftover: ${remainingSpace}mm</div>`;
    }).join('');

    // Update cost tables
    document.getElementById('cost-glass')!.textContent = `$${costBreakdown.glassTotal.toFixed(2)}`;
    document.getElementById('cost-profiles')!.textContent = `$${costBreakdown.profileTotal.toFixed(2)}`;
    document.getElementById('cost-fittings')!.textContent = `$${costBreakdown.fittingsTotal.toFixed(2)}`;
    document.getElementById('cost-labor')!.textContent = `$${costBreakdown.fabricationCost.toFixed(2)}`;
    document.getElementById('cost-install')!.textContent = `$${costBreakdown.installationCost.toFixed(2)}`;
    
    document.getElementById('cost-subtotal')!.textContent = `$${costBreakdown.subtotal.toFixed(2)}`;
    document.getElementById('cost-markup-label')!.textContent = `Agency Markup (${costBreakdown.markupPercent}%):`;
    document.getElementById('cost-markup')!.textContent = `$${costBreakdown.markupAmount.toFixed(2)}`;
    document.getElementById('cost-final')!.textContent = `$${costBreakdown.finalTotal.toFixed(2)}`;

    // Sync design to 3D engine if active
    if (activeTab === '3d' && spatial3d) {
      spatial3d.updateDesign(canvas2d.design);
    }
  };

  // Setup live callbacks
  canvas2d.setOnChange(() => {
    updateEstimates();
  });

  // Init calculations
  updateEstimates();

  // Tab switcher logic
  const tab2dBtn = document.getElementById('tab-2d')!;
  const tab3dBtn = document.getElementById('tab-3d')!;
  
  tab2dBtn.addEventListener('click', () => {
    if (activeTab === '2d') return;
    activeTab = '2d';
    tab2dBtn.className = 'btn btn-primary';
    tab2dBtn.style.background = 'var(--primary-color)';
    tab3dBtn.className = 'btn btn-secondary';
    tab3dBtn.style.background = 'transparent';

    document.getElementById('eva-canvas-2d')!.style.display = 'block';
    container3d.style.display = 'none';

    if (spatial3d) {
      spatial3d.destroy();
      spatial3d = null;
    }
    
    canvas2d.render();
  });

  tab3dBtn.addEventListener('click', () => {
    if (activeTab === '3d') return;
    activeTab = '3d';
    tab3dBtn.className = 'btn btn-primary';
    tab3dBtn.style.background = 'var(--primary-color)';
    tab2dBtn.className = 'btn btn-secondary';
    tab2dBtn.style.background = 'transparent';

    document.getElementById('eva-canvas-2d')!.style.display = 'none';
    container3d.style.display = 'block';

    // Initialize Orbit controls scene
    spatial3d = new SpatialPreviewer(container3d);
    spatial3d.updateDesign(canvas2d.design);
  });

  // Setup input bindings
  const widthInput = document.getElementById('eva-width') as HTMLInputElement;
  const heightInput = document.getElementById('eva-height') as HTMLInputElement;
  const typeSelect = document.getElementById('eva-type') as HTMLSelectElement;
  const profileSelect = document.getElementById('eva-profile') as HTMLSelectElement;
  const glassSelect = document.getElementById('eva-glass') as HTMLSelectElement;

  const updateFromInputs = () => {
    let w = parseInt(widthInput.value) || 1500;
    let h = parseInt(heightInput.value) || 1200;
    
    // fit default fittings by opening type
    let fittings = canvas2d.design.fittings;
    const typeVal = typeSelect.value as any;
    if (typeVal !== canvas2d.design.type) {
      if (typeVal === 'door') {
        fittings = [
          { id: 'fit-1', quantity: 1 }, // HD pivot hinge
          { id: 'fit-2', quantity: 2 }, // Handle
          { id: 'fit-3', quantity: 1 }, // Lock
          { id: 'fit-5', quantity: 1 }  // silicon tube
        ];
      } else if (typeVal === 'window') {
        fittings = [
          { id: 'fit-4', quantity: 4 }, // Roller wheel
          { id: 'fit-3', quantity: 1 }, // Lock
          { id: 'fit-6', quantity: 8 }  // Gasket sealing meters
        ];
      } else {
        fittings = [
          { id: 'fit-5', quantity: 4 }, // sealant
          { id: 'fit-6', quantity: 15 } // gasket seals
        ];
      }
    }

    canvas2d.updateDesign({
      width: w,
      height: h,
      type: typeVal,
      profileType: profileSelect.value,
      glassType: glassSelect.value,
      fittings
    });
  };

  [widthInput, heightInput, typeSelect, profileSelect, glassSelect].forEach(input => {
    input.addEventListener('change', updateFromInputs);
  });

  // Divider click buttons
  document.getElementById('btn-add-mullion')!.addEventListener('click', () => {
    canvas2d.addDivision('vertical', 0.5);
  });

  document.getElementById('btn-add-transom')!.addEventListener('click', () => {
    canvas2d.addDivision('horizontal', 0.5);
  });

  document.getElementById('btn-clear-divs')!.addEventListener('click', () => {
    canvas2d.updateDesign({ divisions: [] });
  });

  // Save quotation action
  document.getElementById('btn-save-quote')!.addEventListener('click', async () => {
    // 1. Save Design parameters
    designItem.width = canvas2d.design.width;
    designItem.height = canvas2d.design.height;
    designItem.type = canvas2d.design.type;
    designItem.glass_type = canvas2d.design.glassType;
    designItem.profile_type = canvas2d.design.profileType;
    designItem.layout_data = {
      divisions: canvas2d.design.divisions,
      fittings: canvas2d.design.fittings
    };

    await db.put('designs', designItem);
    await sync.queueOperation('designs', 'update', designItem);

    // 2. Generate and save quote
    const costBreakdown: CostBreakdown = CostingEngine.calculateCost(canvas2d.design, fittingsCatalog);
    const quoteItem = {
      id: `qt-${Date.now()}`,
      project_id: projectId,
      client_name: 'Architect Estimations / Client',
      total_price: costBreakdown.finalTotal,
      status: 'Draft',
      items: [
        {
          design_id: designItem.id,
          width: designItem.width,
          height: designItem.height,
          type: designItem.type,
          glass_cost: costBreakdown.glassTotal,
          profile_cost: costBreakdown.profileTotal,
          fittings_cost: costBreakdown.fittingsTotal,
          install_cost: costBreakdown.installationCost,
          subtotal: costBreakdown.subtotal,
          markup: costBreakdown.markupAmount,
          total: costBreakdown.finalTotal
        }
      ],
      created_at: new Date().toISOString()
    };

    await db.put('quotes', quoteItem);
    await sync.queueOperation('quotes', 'insert', quoteItem);

    appProxy.showToast('Design & Quotation Saved', `Stored estimate: $${costBreakdown.finalTotal} linked to project!`, 'success');
  });

  // AI Blueprint File Upload handler
  const fileUpload = document.getElementById('ai-file-upload') as HTMLInputElement;
  const spinner = document.getElementById('ai-spinner')!;

  fileUpload.addEventListener('change', async (e) => {
    const file = fileUpload.files?.[0];
    if (!file) return;

    spinner.classList.remove('hidden');
    appProxy.showToast('Analyzing Design', 'Cognitive vision engine parsing structural outline...', 'info');

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const result = await AiOrchestrator.extractLayoutFromImage(base64Data);

        // Populate fields
        widthInput.value = String(result.width);
        heightInput.value = String(result.height);
        typeSelect.value = result.type;
        profileSelect.value = result.profileType;
        glassSelect.value = result.glassType;

        // Map divisions
        const mappedDivs = result.divisions.map((d, index) => ({
          id: `div-ai-${index}-${Date.now()}`,
          type: d.type,
          position: d.position
        }));

        canvas2d.updateDesign({
          width: result.width,
          height: result.height,
          type: result.type,
          profileType: result.profileType,
          glassType: result.glassType,
          divisions: mappedDivs
        });

        updateEstimates();

        appProxy.showToast(
          'AI Analysis Complete',
          `Parsed ${result.type} (${result.width}x${result.height}) with ${result.divisions.length} divisions. Confidence: ${Math.round(result.confidence * 100)}%`,
          'success'
        );
        
        if (result.notes) {
          console.log('AI Extraction Notes:', result.notes);
        }

      } catch (err: any) {
        console.error(err);
        appProxy.showToast('AI Estimator Failed', err.message, 'danger');
      } finally {
        spinner.classList.add('hidden');
        fileUpload.value = ''; // Reset uploader
      }
    };
    
    reader.readAsDataURL(file);
  });
}
