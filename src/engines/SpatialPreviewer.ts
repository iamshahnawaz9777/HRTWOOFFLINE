// EvA ERP Cloud - SpatialPreviewer 3D Engine
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class SpatialPreviewer {
  private container: HTMLDivElement;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private animationFrameId: number | null = null;
  
  // Design Mesh objects
  private frameGroup: THREE.Group;
  
  // Materials Cache
  private materials: Record<string, THREE.Material> = {};

  constructor(container: HTMLDivElement) {
    this.container = container;
    this.frameGroup = new THREE.Group();
    
    this.initThree();
    this.initLights();
    this.initMaterials();
    
    this.scene.add(this.frameGroup);
    
    this.animate();
    
    // Auto resize
    const resizeObserver = new ResizeObserver(() => {
      this.handleResize();
    });
    resizeObserver.observe(this.container);
  }

  private initThree() {
    const width = this.container.clientWidth || 500;
    const height = this.container.clientHeight || 400;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#1a202c'); // Dark gray backdrop

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 2000); // Look at center

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI; // Full rotation allowed
    this.controls.minDistance = 300;
    this.controls.maxDistance = 5000;
  }

  private initLights() {
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.6);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight('#ffffff', 0.8);
    dirLight1.position.set(1000, 1000, 1000);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 1024;
    dirLight1.shadow.mapSize.height = 1024;
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight('#4299e1', 0.4); // Blue fill light
    dirLight2.position.set(-1000, -500, -1000);
    this.scene.add(dirLight2);

    const pointLight = new THREE.PointLight('#ffffff', 0.5, 2000);
    pointLight.position.set(0, 0, 500);
    this.scene.add(pointLight);
  }

  private initMaterials() {
    // 1. Metal frame materials
    this.materials['Alu-Black-Matte'] = new THREE.MeshStandardMaterial({
      color: '#121212',
      roughness: 0.8,
      metalness: 0.9,
    });

    this.materials['Alu-Rose-Gold'] = new THREE.MeshStandardMaterial({
      color: '#b7791f',
      roughness: 0.3,
      metalness: 0.95,
    });

    this.materials['UPVC-White'] = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.4,
      metalness: 0.1,
    });

    this.materials['Alu-Silver-Anodized'] = new THREE.MeshStandardMaterial({
      color: '#a0aec0',
      roughness: 0.3,
      metalness: 0.9,
    });

    // 2. Glass materials (PBR translucent glass)
    this.materials['6mm Clear Tempered'] = new THREE.MeshPhysicalMaterial({
      color: '#e2f5f5',
      transparent: true,
      opacity: 0.25,
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.9,
      ior: 1.5,
      side: THREE.DoubleSide
    });

    this.materials['8mm Frosted'] = new THREE.MeshPhysicalMaterial({
      color: '#e2e8f0',
      transparent: true,
      opacity: 0.7,
      roughness: 0.6,
      metalness: 0.0,
      transmission: 0.6,
      ior: 1.3,
      side: THREE.DoubleSide
    });

    this.materials['12mm Double-Glazed'] = new THREE.MeshPhysicalMaterial({
      color: '#cbd5e0',
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      metalness: 0.2,
      transmission: 0.8,
      ior: 1.6,
      side: THREE.DoubleSide
    });
  }

  /**
   * Rebuilds the 3D geometry of the window based on parametric design data
   */
  public updateDesign(design: {
    width: number;
    height: number;
    type: string;
    glassType: string;
    profileType: string;
    divisions: { type: 'horizontal' | 'vertical', position: number }[];
  }) {
    // Clear old geometries
    while (this.frameGroup.children.length > 0) {
      const obj = this.frameGroup.children[0];
      this.frameGroup.remove(obj);
    }

    const frameMat = this.materials[design.profileType] || this.materials['Alu-Black-Matte'];
    const glassMat = this.materials[design.glassType] || this.materials['6mm Clear Tempered'];

    const W = design.width;
    const H = design.height;
    
    // Core parameters (in mm)
    const profileDepth = 70; // 3D thickness (Z axis)
    const profileWidth = 50; // Face width (X/Y axes)
    const glassThickness = 12;

    // 1. Create Outer Boundary Profiles
    // Left & Right Verticals
    const verticalGeom = new THREE.BoxGeometry(profileWidth, H, profileDepth);
    const leftProfile = new THREE.Mesh(verticalGeom, frameMat);
    leftProfile.position.set(-W/2 + profileWidth/2, 0, 0);
    leftProfile.castShadow = true;
    leftProfile.receiveShadow = true;
    this.frameGroup.add(leftProfile);

    const rightProfile = leftProfile.clone();
    rightProfile.position.set(W/2 - profileWidth/2, 0, 0);
    this.frameGroup.add(rightProfile);

    // Top & Bottom Horizontals
    const horizontalGeom = new THREE.BoxGeometry(W - 2 * profileWidth, profileWidth, profileDepth);
    const topProfile = new THREE.Mesh(horizontalGeom, frameMat);
    topProfile.position.set(0, H/2 - profileWidth/2, 0);
    topProfile.castShadow = true;
    topProfile.receiveShadow = true;
    this.frameGroup.add(topProfile);

    const bottomProfile = topProfile.clone();
    bottomProfile.position.set(0, -H/2 + profileWidth/2, 0);
    this.frameGroup.add(bottomProfile);

    // 2. Add Divisions (transoms/mullions)
    design.divisions.forEach(div => {
      if (div.type === 'horizontal') {
        const divY = -H/2 + div.position * H;
        const transomGeom = new THREE.BoxGeometry(W - 2 * profileWidth, profileWidth, profileDepth - 10);
        const transomMesh = new THREE.Mesh(transomGeom, frameMat);
        transomMesh.position.set(0, divY, 0);
        transomMesh.castShadow = true;
        transomMesh.receiveShadow = true;
        this.frameGroup.add(transomMesh);
      } else {
        const divX = -W/2 + div.position * W;
        const mullionGeom = new THREE.BoxGeometry(profileWidth, H - 2 * profileWidth, profileDepth - 10);
        const mullionMesh = new THREE.Mesh(mullionGeom, frameMat);
        mullionMesh.position.set(divX, 0, 0);
        mullionMesh.castShadow = true;
        mullionMesh.receiveShadow = true;
        this.frameGroup.add(mullionMesh);
      }
    });

    // 3. Create Glass Panels (For simplicity, we fill the background with a glass sheet or calculate partition boxes)
    // To make it look incredibly detailed, let's partition the glass area matching the divisions!
    this.buildSubdividedGlass(W, H, profileWidth, glassThickness, design.divisions, glassMat);

    // Fit camera to object size
    this.adjustCamera(W, H);
  }

  private buildSubdividedGlass(
    W: number, H: number, 
    pw: number, gt: number, 
    divisions: { type: 'horizontal' | 'vertical', position: number }[],
    glassMat: THREE.Material
  ) {
    // If there are no divisions, just draw one main glass sheet
    if (divisions.length === 0) {
      const glassGeom = new THREE.BoxGeometry(W - 2 * pw, H - 2 * pw, gt);
      const glassMesh = new THREE.Mesh(glassGeom, glassMat);
      glassMesh.position.set(0, 0, 0);
      this.frameGroup.add(glassMesh);
      return;
    }

    // Sort divisions by position to divide the panels
    const hDivs = divisions.filter(d => d.type === 'horizontal').map(d => d.position).sort((a,b)=>a-b);
    const vDivs = divisions.filter(d => d.type === 'vertical').map(d => d.position).sort((a,b)=>a-b);

    // Add boundaries (0 and 1)
    const ySegments = [0, ...hDivs, 1];
    const xSegments = [0, ...vDivs, 1];

    // Build panels in the grids
    for (let i = 0; i < xSegments.length - 1; i++) {
      for (let j = 0; j < ySegments.length - 1; j++) {
        const xStart = -W/2 + xSegments[i] * W;
        const xEnd = -W/2 + xSegments[i+1] * W;
        const yStart = -H/2 + ySegments[j] * H;
        const yEnd = -H/2 + ySegments[j+1] * H;

        // Apply margins for profile frames
        const padX = i === 0 ? pw : pw/2;
        const padXEnd = i === xSegments.length - 2 ? pw : pw/2;
        const padY = j === 0 ? pw : pw/2;
        const padYEnd = j === ySegments.length - 2 ? pw : pw/2;

        const panelW = (xEnd - xStart) - (padX + padXEnd);
        const panelH = (yEnd - yStart) - (padY + padYEnd);

        if (panelW > 10 && panelH > 10) {
          const glassGeom = new THREE.BoxGeometry(panelW, panelH, gt);
          const glassMesh = new THREE.Mesh(glassGeom, glassMat);
          // Position is the center of the cell
          const posX = xStart + padX + panelW/2;
          const posY = yStart + padY + panelH/2;
          glassMesh.position.set(posX, posY, 0);
          this.frameGroup.add(glassMesh);
        }
      }
    }
  }

  private adjustCamera(W: number, H: number) {
    const size = Math.max(W, H);
    this.camera.position.set(size * 0.8, size * 0.5, size * 1.5);
    this.controls.target.set(0, 0, 0);
    this.camera.lookAt(0, 0, 0);
    this.controls.update();
  }

  private handleResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
  }

  private animate() {
    const renderFrame = () => {
      this.animationFrameId = requestAnimationFrame(renderFrame);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    renderFrame();
  }

  public destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.controls.dispose();
    this.renderer.dispose();
    this.container.innerHTML = '';
  }
}
