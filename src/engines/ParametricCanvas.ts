// EvA ERP Cloud - ParametricCanvas 2D Engine

export interface Division {
  id: string;
  type: 'horizontal' | 'vertical'; // Horizontal transom or Vertical mullion
  position: number; // Normalized position (0 to 1)
}

export interface DesignData {
  width: number; // in mm
  height: number; // in mm
  type: 'window' | 'door' | 'facade' | 'partition';
  glassType: string;
  profileType: string;
  divisions: Division[];
  fittings: { id: string; quantity: number }[];
}

export class ParametricCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
  // Design properties
  public design: DesignData;
  
  // Viewport properties (Pan & Zoom)
  private zoom: number = 0.8;
  private panX: number = 0;
  private panY: number = 0;
  
  // Interaction states
  private isDraggingView: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  
  private activeDivisionId: string | null = null;
  private hoverDivisionId: string | null = null;
  private isDraggingDivision: boolean = false;
  
  // Callback when design changes
  private onChangeCallback: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement, initialDesign?: Partial<DesignData>) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D context');
    this.ctx = context;
    
    this.design = {
      width: 1500,
      height: 1200,
      type: 'window',
      glassType: '6mm Clear Tempered',
      profileType: 'Alu-Black-Matte',
      divisions: [],
      fittings: [
        { id: 'fit-4', quantity: 4 }, // rollers for sliding window
        { id: 'fit-3', quantity: 1 }  // lock
      ],
      ...initialDesign
    };
    
    this.initViewport();
    this.setupEventListeners();
  }

  private initViewport() {
    this.panX = this.canvas.width / 2;
    this.panY = this.canvas.height / 2;
    // Auto-scale to fit canvas
    const scaleX = (this.canvas.width * 0.6) / this.design.width;
    const scaleY = (this.canvas.height * 0.6) / this.design.height;
    this.zoom = Math.min(scaleX, scaleY);
  }

  public setOnChange(callback: () => void) {
    this.onChangeCallback = callback;
  }

  private triggerChange() {
    if (this.onChangeCallback) {
      this.onChangeCallback();
    }
  }

  public updateDesign(newDesign: Partial<DesignData>) {
    this.design = { ...this.design, ...newDesign };
    this.triggerChange();
    this.render();
  }

  public addDivision(type: 'horizontal' | 'vertical', position: number = 0.5) {
    const id = `div-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.design.divisions.push({ id, type, position });
    this.triggerChange();
    this.render();
  }

  public removeDivision(id: string) {
    this.design.divisions = this.design.divisions.filter(d => d.id !== id);
    this.triggerChange();
    this.render();
  }

  private setupEventListeners() {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
    
    // Resize handler
    const resizeObserver = new ResizeObserver(() => {
      const rect = this.canvas.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
      this.render();
    });
    resizeObserver.observe(this.canvas);
  }

  // Transform canvas screen coordinates to design coordinates (in mm)
  private screenToDesign(screenX: number, screenY: number): { x: number; y: number } {
    const x = (screenX - this.panX) / this.zoom;
    const y = (screenY - this.panY) / this.zoom;
    // Origin is at center of the design
    return { x, y };
  }

  // Transform design coordinates (in mm) to screen coordinates
  private designToScreen(designX: number, designY: number): { x: number; y: number } {
    const x = designX * this.zoom + this.panX;
    const y = designY * this.zoom + this.panY;
    return { x, y };
  }

  private handleMouseDown(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    // Check if clicked near a division line for dragging
    const hitDivision = this.findDivisionAt(mx, my);
    if (hitDivision) {
      this.isDraggingDivision = true;
      this.activeDivisionId = hitDivision.id;
      return;
    }

    // Default: Pan viewport
    this.isDraggingView = true;
    this.dragStartX = mx - this.panX;
    this.dragStartY = my - this.panY;
  }

  private handleMouseMove(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (this.isDraggingDivision && this.activeDivisionId) {
      const div = this.design.divisions.find(d => d.id === this.activeDivisionId);
      if (div) {
        const designPos = this.screenToDesign(mx, my);
        if (div.type === 'horizontal') {
          // Normalize position between -height/2 and +height/2
          const localY = designPos.y;
          let normY = (localY + this.design.height / 2) / this.design.height;
          normY = Math.max(0.05, Math.min(0.95, normY)); // clamping
          div.position = normY;
        } else {
          const localX = designPos.x;
          let normX = (localX + this.design.width / 2) / this.design.width;
          normX = Math.max(0.05, Math.min(0.95, normX));
          div.position = normX;
        }
        this.triggerChange();
        this.render();
      }
      return;
    }

    if (this.isDraggingView) {
      this.panX = mx - this.dragStartX;
      this.panY = my - this.dragStartY;
      this.render();
      return;
    }

    // Hover detection for divisions
    const hitDivision = this.findDivisionAt(mx, my);
    if (hitDivision) {
      if (this.hoverDivisionId !== hitDivision.id) {
        this.hoverDivisionId = hitDivision.id;
        this.canvas.style.cursor = hitDivision.type === 'horizontal' ? 'ns-resize' : 'ew-resize';
        this.render();
      }
    } else {
      if (this.hoverDivisionId !== null) {
        this.hoverDivisionId = null;
        this.canvas.style.cursor = 'default';
        this.render();
      }
    }
  }

  private handleMouseUp() {
    this.isDraggingView = false;
    this.isDraggingDivision = false;
    this.activeDivisionId = null;
  }

  private handleWheel(e: WheelEvent) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    // Zoom centered on cursor
    const beforeZoom = this.screenToDesign(mx, my);
    const zoomFactor = 1.1;
    if (e.deltaY < 0) {
      this.zoom *= zoomFactor;
    } else {
      this.zoom /= zoomFactor;
    }
    this.zoom = Math.max(0.1, Math.min(10, this.zoom));
    
    const afterZoom = this.designToScreen(beforeZoom.x, beforeZoom.y);
    this.panX += mx - afterZoom.x;
    this.panY += my - afterZoom.y;
    
    this.render();
  }

  private findDivisionAt(screenX: number, screenY: number): Division | null {
    const tolerance = 8; // click pixels tolerance
    const designPos = this.screenToDesign(screenX, screenY);
    
    for (const div of this.design.divisions) {
      if (div.type === 'horizontal') {
        const divY = -this.design.height / 2 + div.position * this.design.height;
        const screenDivY = this.designToScreen(0, divY).y;
        if (Math.abs(screenY - screenDivY) < tolerance) {
          // Check if within bounds of the design width
          if (Math.abs(designPos.x) <= this.design.width / 2 + tolerance) {
            return div;
          }
        }
      } else {
        const divX = -this.design.width / 2 + div.position * this.design.width;
        const screenDivX = this.designToScreen(divX, 0).x;
        if (Math.abs(screenX - screenDivX) < tolerance) {
          // Check if within bounds of the design height
          if (Math.abs(designPos.y) <= this.design.height / 2 + tolerance) {
            return div;
          }
        }
      }
    }
    return null;
  }

  // Renders the canvas content
  public render() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.ctx.clearRect(0, 0, w, h);
    
    // Draw background grid for a technical design app look
    this.drawGrid();
    
    // Draw outer boundary and profiles
    const halfWidth = this.design.width / 2;
    const halfHeight = this.design.height / 2;
    
    // Outer Frame Coordinates
    const topLeft = this.designToScreen(-halfWidth, -halfHeight);
    const bottomRight = this.designToScreen(halfWidth, halfHeight);
    const frameWidth = (bottomRight.x - topLeft.x);
    const frameHeight = (bottomRight.y - topLeft.y);
    
    // 1. Draw outer frame profile
    const profileThickness = 50 * this.zoom; // Profile depth on screen (50mm default)
    
    this.ctx.fillStyle = this.getProfileColor();
    this.ctx.strokeStyle = '#2d3748';
    this.ctx.lineWidth = 1.5;
    
    // Outer rect
    this.ctx.fillRect(topLeft.x, topLeft.y, frameWidth, frameHeight);
    this.ctx.strokeRect(topLeft.x, topLeft.y, frameWidth, frameHeight);
    
    // Inner rect (Glass panel boundary)
    const glassLeft = topLeft.x + profileThickness;
    const glassTop = topLeft.y + profileThickness;
    const glassWidth = frameWidth - 2 * profileThickness;
    const glassHeight = frameHeight - 2 * profileThickness;
    
    this.ctx.fillStyle = this.getGlassColor();
    this.ctx.fillRect(glassLeft, glassTop, glassWidth, glassHeight);
    this.ctx.strokeRect(glassLeft, glassTop, glassWidth, glassHeight);
    
    // 2. Draw interior transoms & mullions
    this.design.divisions.forEach(div => {
      this.ctx.fillStyle = this.getProfileColor();
      this.ctx.lineWidth = 1;
      
      const isHovered = div.id === this.hoverDivisionId;
      const isDragging = div.id === this.activeDivisionId;
      this.ctx.strokeStyle = isDragging ? '#f6ad55' : (isHovered ? '#4fd1c5' : '#2d3748');
      
      if (div.type === 'horizontal') {
        const divY = -halfHeight + div.position * this.design.height;
        const screenDivY = this.designToScreen(0, divY).y;
        
        // Draw transom (horizontal profile bar)
        this.ctx.fillRect(glassLeft, screenDivY - profileThickness/2, glassWidth, profileThickness);
        this.ctx.strokeRect(glassLeft, screenDivY - profileThickness/2, glassWidth, profileThickness);
      } else {
        const divX = -halfWidth + div.position * this.design.width;
        const screenDivX = this.designToScreen(divX, 0).x;
        
        // Draw mullion (vertical profile bar)
        this.ctx.fillRect(screenDivX - profileThickness/2, glassTop, profileThickness, glassHeight);
        this.ctx.strokeRect(screenDivX - profileThickness/2, glassTop, profileThickness, glassHeight);
      }
    });

    // 3. Draw visual markers based on door/window type
    this.drawFittingsAndTypeMarkers(topLeft, bottomRight, profileThickness);

    // 4. Draw dimension lines
    this.drawDimensions(halfWidth, halfHeight);
  }

  private drawGrid() {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    this.ctx.lineWidth = 1;
    const gridSize = 40 * this.zoom;
    
    const startX = this.panX % gridSize;
    for (let x = startX; x < this.canvas.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }
    
    const startY = this.panY % gridSize;
    for (let y = startY; y < this.canvas.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
  }

  private drawDimensions(halfWidth: number, halfHeight: number) {
    this.ctx.strokeStyle = '#a0aec0';
    this.ctx.fillStyle = '#a0aec0';
    this.ctx.lineWidth = 1;
    this.ctx.font = '10px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    const offset = 40; // pixel offset from frame
    
    // Top width dimension
    const tL_dim = this.designToScreen(-halfWidth, -halfHeight);
    const tR_dim = this.designToScreen(halfWidth, -halfHeight);
    
    this.ctx.beginPath();
    this.ctx.moveTo(tL_dim.x, tL_dim.y - offset);
    this.ctx.lineTo(tR_dim.x, tR_dim.y - offset);
    // Tick markers
    this.ctx.moveTo(tL_dim.x, tL_dim.y - offset - 5);
    this.ctx.lineTo(tL_dim.x, tL_dim.y - offset + 5);
    this.ctx.moveTo(tR_dim.x, tR_dim.y - offset - 5);
    this.ctx.lineTo(tR_dim.x, tR_dim.y - offset + 5);
    this.ctx.stroke();
    
    // Label
    this.ctx.save();
    this.ctx.fillStyle = '#1a202c';
    const labelW = `${this.design.width} mm`;
    const labelWWidth = this.ctx.measureText(labelW).width + 10;
    this.ctx.fillRect((tL_dim.x + tR_dim.x) / 2 - labelWWidth / 2, tL_dim.y - offset - 6, labelWWidth, 12);
    this.ctx.restore();
    this.ctx.fillStyle = '#cbd5e0';
    this.ctx.fillText(labelW, (tL_dim.x + tR_dim.x) / 2, tL_dim.y - offset);
    
    // Left height dimension
    const bL_dim = this.designToScreen(-halfWidth, halfHeight);
    this.ctx.beginPath();
    this.ctx.moveTo(tL_dim.x - offset, tL_dim.y);
    this.ctx.lineTo(bL_dim.x - offset, bL_dim.y);
    // Tick markers
    this.ctx.moveTo(tL_dim.x - offset - 5, tL_dim.y);
    this.ctx.lineTo(tL_dim.x - offset + 5, tL_dim.y);
    this.ctx.moveTo(bL_dim.x - offset - 5, bL_dim.y);
    this.ctx.lineTo(bL_dim.x - offset + 5, bL_dim.y);
    this.ctx.stroke();
    
    // Label
    this.ctx.save();
    this.ctx.fillStyle = '#1a202c';
    const labelH = `${this.design.height} mm`;
    const labelHWidth = this.ctx.measureText(labelH).width + 10;
    this.ctx.fillRect(tL_dim.x - offset - 6, (tL_dim.y + bL_dim.y) / 2 - 6, labelHWidth, 12);
    this.ctx.restore();
    this.ctx.fillStyle = '#cbd5e0';
    this.ctx.fillText(labelH, tL_dim.x - offset + 12, (tL_dim.y + bL_dim.y) / 2);
  }

  private drawFittingsAndTypeMarkers(topLeft: {x:number; y:number}, bottomRight: {x:number; y:number}, profile: number) {
    const w = bottomRight.x - topLeft.x;
    const h = bottomRight.y - topLeft.y;
    
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([5, 5]);

    // Draw sliding or folding arrow marks
    if (this.design.type === 'window' || this.design.type === 'partition') {
      // Sliding window dotted cross line or sliders
      this.ctx.beginPath();
      this.ctx.moveTo(topLeft.x + profile, topLeft.y + profile);
      this.ctx.lineTo(topLeft.x + w/2, topLeft.y + h/2);
      this.ctx.lineTo(topLeft.x + profile, bottomRight.y - profile);
      this.ctx.moveTo(bottomRight.x - profile, topLeft.y + profile);
      this.ctx.lineTo(topLeft.x + w/2, topLeft.y + h/2);
      this.ctx.lineTo(bottomRight.x - profile, bottomRight.y - profile);
      this.ctx.stroke();
    } else if (this.design.type === 'door') {
      // Swing door open direction triangle (from hinge side to handle side)
      this.ctx.beginPath();
      // Assume hinge on left
      this.ctx.moveTo(topLeft.x + profile, topLeft.y + profile);
      this.ctx.lineTo(bottomRight.x - profile, topLeft.y + h/2);
      this.ctx.lineTo(topLeft.x + profile, bottomRight.y - profile);
      this.ctx.stroke();

      // Draw door handle
      this.ctx.fillStyle = '#cbd5e0';
      this.ctx.strokeStyle = '#2d3748';
      this.ctx.setLineDash([]);
      this.ctx.lineWidth = 1.5;
      const handleX = bottomRight.x - profile - 15 * this.zoom;
      const handleY = topLeft.y + h / 2 - 40 * this.zoom;
      const handleW = 6 * this.zoom;
      const handleH = 80 * this.zoom;
      this.ctx.fillRect(handleX, handleY, handleW, handleH);
      this.ctx.strokeRect(handleX, handleY, handleW, handleH);
    }

    this.ctx.setLineDash([]);
  }

  private getProfileColor(): string {
    switch (this.design.profileType) {
      case 'Alu-Black-Matte': return '#1a202c';
      case 'Alu-Rose-Gold': return '#b7791f';
      case 'UPVC-White': return '#edf2f7';
      case 'Alu-Silver-Anodized': return '#718096';
      default: return '#4a5568';
    }
  }

  private getGlassColor(): string {
    switch (this.design.glassType) {
      case '6mm Clear Tempered': return 'rgba(129, 230, 217, 0.15)'; // pale teal
      case '8mm Frosted': return 'rgba(226, 232, 240, 0.45)'; // milky slate
      case '12mm Double-Glazed': return 'rgba(66, 153, 225, 0.25)'; // sky blue tint
      default: return 'rgba(255, 255, 255, 0.1)';
    }
  }

  // Calculate BoM values (in meters and square meters) for the costing engine
  public getBOM() {
    const widthM = this.design.width / 1000;
    const heightM = this.design.height / 1000;
    
    // Outer perimeter profiles
    let totalProfileLength = 2 * (widthM + heightM);
    
    // Add transoms and mullions
    this.design.divisions.forEach(div => {
      if (div.type === 'horizontal') {
        totalProfileLength += widthM;
      } else {
        totalProfileLength += heightM;
      }
    });

    // Glass panels area calculations
    // In a simplistic design with N divisions, it splits the glass. The total area is slightly less than total frame size due to profiles.
    // Let's assume glass area is approx 90% of total outer rectangle.
    const totalGlassArea = widthM * heightM * 0.92;
    
    return {
      glassAreaSqM: totalGlassArea,
      profileLengthM: totalProfileLength,
      fittings: this.design.fittings
    };
  }
}
