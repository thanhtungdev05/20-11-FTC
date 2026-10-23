import * as THREE from 'three';
import { FireMesh } from '@wolffo/three-fire/vanilla';

/**
 * Three.js 3D Interactive Volumetric Fire Scene:
 * "Ngọn Lửa Tri Ân - FPT Telecom 20/11"
 * Recreated faithfully from official Key Visual:
 * - Slender sculpted Olympic Golden Torch (Đài Đuốc Vàng Hoàng Gia)
 * - Open Book of Wisdom Base (Cuốn Sách Tri Thức Mở Rộng)
 * - Tilted Golden Orbit Ring & Flying Knowledge Pages (Vòng Quỹ Đạo & Trang Sách Bay)
 * - Fully optimized for Ultra-smooth 60 FPS on Mobile & High Concurrency
 */
export class Scene3D {
  constructor(containerElement) {
    this.container = containerElement;
    this.scene = null;
    this.camera = null;
    this.renderer = null;

    // Detect mobile device
    const width = containerElement.clientWidth || window.innerWidth;
    this.isMobile = width < 768 || /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // 3D Fire & Scene Objects
    this.coreGroup = null;
    this.fireMesh = null;
    this.fireCore = null;
    this.flameTongue = null;
    this.emberMesh = null;
    this.haloSprite = null;
    this.auraSprite = null;

    // Orbit & Flying Pages
    this.orbitGroup = null;
    this.orbitRing = null;
    this.orbitGlowRing = null;
    this.flyingPages = [];

    // Ambient Particles
    this.sparks = null;
    this.stars = null;

    // Dynamic Lights
    this.pointLight = null;
    this.secondaryLight = null;
    this.ambientLight = null;

    // Interaction & Animation State
    this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.isIgniting = false;
    this.isTyping = false;
    this.isPaused = false;
    this.startTime = performance.now();
    this.lastFrameTime = performance.now();
    this.elapsedTime = 0;

    this.init();
  }

  init() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // 1. Scene with subtle celestial fog
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x050914, this.isMobile ? 0.018 : 0.022);

    // 2. Camera: Optimized framing for both Mobile and Desktop
    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    // Mobile: camera positioned to comfortably capture flame + Olympic torch + book base
    this.camera.position.set(0, this.isMobile ? -1.0 : -0.2, this.isMobile ? 16.5 : 17.5);

    // 3. Renderer: High-performance configuration
    // Mobile: pixelRatio = 1.0 (avoids 4x fillrate blowup on retina mobile screens)
    const pixelRatio = this.isMobile ? 1.0 : Math.min(window.devicePixelRatio, 1.75);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isMobile, // Disable on mobile to conserve GPU fillrate
      alpha: true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.container.appendChild(this.renderer.domElement);

    // 4. Lights: Dynamic warm flame illumination
    this.ambientLight = new THREE.AmbientLight(0x0a1b38, 1.7);
    this.scene.add(this.ambientLight);

    // Main flame light inside the fire
    this.pointLight = new THREE.PointLight(0xf37021, 3.8, this.isMobile ? 35 : 45);
    this.pointLight.position.set(0, -2.2, 0.6);
    this.scene.add(this.pointLight);

    // Secondary golden flame glow
    this.secondaryLight = new THREE.PointLight(0xffd700, 2.4, this.isMobile ? 25 : 35);
    this.secondaryLight.position.set(0, 1.8, 2.0);
    this.scene.add(this.secondaryLight);

    // 5. Build 3D Objects with mobile-adaptive budgets
    this.buildCore();
    this.buildOrbitAndPages();
    this.buildSparks();
    this.buildStarfield();

    // 6. Event listeners & Page Visibility (Battery / High-Traffic Optimization)
    this.onWindowResize = this.onWindowResize.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onVisibilityChange = this.onVisibilityChange.bind(this);

    window.addEventListener('resize', this.onWindowResize);
    window.addEventListener('mousemove', this.onMouseMove, { passive: true });
    window.addEventListener('touchmove', this.onTouchMove, { passive: true });
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    // 7. Start render loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  onVisibilityChange() {
    this.isPaused = document.hidden;
    if (!this.isPaused) {
      this.lastFrameTime = performance.now();
      requestAnimationFrame(this.animate);
    }
  }

  /**
   * Constructs the procedural volumetric flame, sculpted flame tongue, and Olympic torch base
   */
  buildCore() {
    this.coreGroup = new THREE.Group();

    // Load official 3D volumetric fire profile texture
    const textureLoader = new THREE.TextureLoader();
    const fireTex = textureLoader.load('/assets/Fire.png', (tex) => {
      tex.needsUpdate = true;
    });

    // 1. MAIN VOLUMETRIC FLAME (Ngọn Lửa Tri Ân FTEL - Tapered Olympic Torch Flame)
    this.fireMesh = new FireMesh({
      fireTex: fireTex,
      color: 0xf37021, // FPT Telecom vibrant flame orange
      magnitude: 1.85,
      lacunarity: 2.1,
      gain: 0.52,
      iterations: this.isMobile ? 20 : 24,
      octaves: 3,
      noiseScale: [1.2, 2.7, 1.2, 0.36] // Slender upward convection draft
    });
    // Slender, tall sculpted flame aspect ratio matching Key Visual
    this.fireMesh.scale.set(5.2, 14.6, 5.2);
    this.fireMesh.position.set(0, 1.8, 0);
    this.coreGroup.add(this.fireMesh);

    // 2. INNER INCANDESCENT CORE FLAME (Trọng Tâm Nhiệt Huyết)
    this.fireCore = new FireMesh({
      fireTex: fireTex,
      color: 0xffea77, // Brilliant warm gold
      magnitude: 2.2,
      lacunarity: 2.0,
      gain: 0.5,
      iterations: this.isMobile ? 16 : 20,
      octaves: 3,
      noiseScale: [1.3, 2.8, 1.3, 0.40]
    });
    this.fireCore.scale.set(3.4, 10.5, 3.4);
    this.fireCore.position.set(0, 0.4, 0);
    this.fireCore.material.blending = THREE.AdditiveBlending;
    this.coreGroup.add(this.fireCore);

    // 2b. STYLIZED DYNAMIC FLAME TONGUE (Lưỡi Lửa Nghệ Thuật Như Key Visual)
    this.buildFlameTongue();

    // 3. OLYMPIC GOLDEN TORCH & OPEN BOOK OF WISDOM (Đài Đuốc Vàng & Sách Mở)
    this.buildAltarBase();

    // 4. Soft warm atmospheric glow sprite at the flame base
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255, 235, 160, 0.92)');
    grad.addColorStop(0.25, 'rgba(243, 112, 33, 0.6)');
    grad.addColorStop(0.65, 'rgba(243, 112, 33, 0.15)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const haloTexture = new THREE.CanvasTexture(canvas);
    const haloMat = new THREE.SpriteMaterial({
      map: haloTexture,
      color: 0xffffff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.haloSprite = new THREE.Sprite(haloMat);
    this.haloSprite.scale.set(7.5, 7.5, 1);
    this.haloSprite.position.set(0, -3.2, 0);
    this.coreGroup.add(this.haloSprite);

    // 5. Ambient luminous fire aura (Quầng hào quang nhiệt huyết bao quanh ngọn đuốc)
    const auraCanvas = document.createElement('canvas');
    auraCanvas.width = 128;
    auraCanvas.height = 128;
    const auraCtx = auraCanvas.getContext('2d');
    const auraGrad = auraCtx.createRadialGradient(64, 64, 0, 64, 64, 60);
    auraGrad.addColorStop(0, 'rgba(243, 112, 33, 0.42)');
    auraGrad.addColorStop(0.35, 'rgba(243, 112, 33, 0.20)');
    auraGrad.addColorStop(0.7, 'rgba(255, 140, 0, 0.08)');
    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    auraCtx.fillStyle = auraGrad;
    auraCtx.fillRect(0, 0, 128, 128);

    const auraTex = new THREE.CanvasTexture(auraCanvas);
    const auraMat = new THREE.SpriteMaterial({
      map: auraTex,
      color: 0xffffff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.auraSprite = new THREE.Sprite(auraMat);
    this.auraSprite.scale.set(11.0, 15.0, 1);
    this.auraSprite.position.set(0, 1.2, -0.6);
    this.coreGroup.add(this.auraSprite);

    this.scene.add(this.coreGroup);
  }

  /**
   * Stylized dynamic S-curved flame lick matching Key Visual
   */
  buildFlameTongue() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Outer warm gold & orange curve
    const grad = ctx.createLinearGradient(64, 512, 64, 0);
    grad.addColorStop(0, 'rgba(255, 230, 150, 0.95)');
    grad.addColorStop(0.35, 'rgba(255, 180, 50, 0.85)');
    grad.addColorStop(0.7, 'rgba(243, 112, 33, 0.6)');
    grad.addColorStop(1, 'rgba(243, 112, 33, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(40, 512);
    ctx.bezierCurveTo(20, 360, 100, 240, 50, 80);
    ctx.bezierCurveTo(64, 20, 64, 0, 64, 0);
    ctx.bezierCurveTo(64, 0, 70, 40, 85, 120);
    ctx.bezierCurveTo(115, 260, 45, 380, 88, 512);
    ctx.closePath();
    ctx.fill();

    // Inner incandescent white-hot core
    const coreGrad = ctx.createLinearGradient(64, 512, 64, 100);
    coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    coreGrad.addColorStop(0.5, 'rgba(255, 240, 180, 0.7)');
    coreGrad.addColorStop(1, 'rgba(255, 200, 100, 0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.moveTo(52, 512);
    ctx.bezierCurveTo(42, 380, 80, 280, 58, 160);
    ctx.bezierCurveTo(64, 110, 64, 100, 64, 100);
    ctx.bezierCurveTo(64, 100, 68, 130, 74, 180);
    ctx.bezierCurveTo(86, 290, 60, 400, 76, 512);
    ctx.closePath();
    ctx.fill();

    const tongueTex = new THREE.CanvasTexture(canvas);
    tongueTex.wrapS = THREE.ClampToEdgeWrapping;
    tongueTex.wrapT = THREE.ClampToEdgeWrapping;

    const tongueMat = new THREE.MeshBasicMaterial({
      map: tongueTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const tongueGeo = new THREE.PlaneGeometry(3.6, 11.5, 8, 24);
    this.flameTongue = new THREE.Mesh(tongueGeo, tongueMat);
    this.flameTongue.position.set(0, 1.4, 0.1);
    this.coreGroup.add(this.flameTongue);
  }

  /**
   * Builds the Olympic Golden Torch & Open Book of Wisdom Base (Đài Đuốc Vàng & Cuốn Sách Tri Thức)
   * Exact 3D recreation of the official Key Visual
   */
  buildAltarBase() {
    const altarGroup = new THREE.Group();
    const segments = this.isMobile ? 24 : 36;

    // 1. Materials matching official KV
    // High-shine Olympic Gold
    const olympicGoldMat = new THREE.MeshStandardMaterial({
      color: 0xffd23f,
      roughness: 0.18,
      metalness: 0.92,
      emissive: 0x5a3800,
      emissiveIntensity: 0.28
    });

    // Deep burnished gold trim
    const darkGoldMat = new THREE.MeshStandardMaterial({
      color: 0xcca01a,
      roughness: 0.24,
      metalness: 0.88,
      emissive: 0x442200,
      emissiveIntensity: 0.2
    });

    // Wisdom Book Pages: Pearl ivory with gold illuminated edges
    const pageMat = new THREE.MeshStandardMaterial({
      color: 0xfcf9ee,
      roughness: 0.32,
      metalness: 0.15,
      emissive: 0x443011,
      emissiveIntensity: 0.15,
      side: THREE.DoubleSide
    });

    // Technology Pedestal: Royal deep navy with metallic finish
    const navyPedestalMat = new THREE.MeshStandardMaterial({
      color: 0x08152e,
      roughness: 0.35,
      metalness: 0.75
    });

    // --- A. THE GOLDEN OLYMPIC TORCH CUP (ĐÀI ĐUỐC VÀNG) ---
    const torchGroup = new THREE.Group();

    // 1. Thick polished gold upper lip rim
    const rimGeo = new THREE.TorusGeometry(2.35, 0.14, 12, segments);
    const rimMesh = new THREE.Mesh(rimGeo, olympicGoldMat);
    rimMesh.rotation.x = Math.PI / 2;
    rimMesh.position.y = -4.1;
    torchGroup.add(rimMesh);

    // 2. Flared goblet cup (hình chuông loe hoàng gia)
    const cupGeo = new THREE.CylinderGeometry(2.3, 1.15, 1.9, segments, 1, true);
    const cupMesh = new THREE.Mesh(cupGeo, darkGoldMat);
    cupMesh.position.y = -5.05;
    torchGroup.add(cupMesh);

    // 3. Rounded spherical cup base
    const cupBottomGeo = new THREE.SphereGeometry(1.16, segments, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    const cupBottomMesh = new THREE.Mesh(cupBottomGeo, olympicGoldMat);
    cupBottomMesh.position.y = -6.0;
    torchGroup.add(cupBottomMesh);

    // 4. Vertical fluted ribs on the cup (các đường gân nổi đặc trưng của đuốc Olympic)
    const ribCount = 12;
    for (let i = 0; i < ribCount; i++) {
      const ribAngle = (i / ribCount) * Math.PI * 2;
      const ribGeo = new THREE.CylinderGeometry(0.045, 0.045, 1.85, 8);
      const ribMesh = new THREE.Mesh(ribGeo, olympicGoldMat);
      const midR = 1.72;
      ribMesh.position.set(Math.cos(ribAngle) * midR, -5.05, Math.sin(ribAngle) * midR);
      ribMesh.rotation.z = Math.cos(ribAngle) * -0.28;
      ribMesh.rotation.x = Math.sin(ribAngle) * 0.28;
      torchGroup.add(ribMesh);
    }

    // 5. Torch stem with diagonal gold spiral rings
    const stemGeo = new THREE.CylinderGeometry(0.72, 0.85, 2.4, segments);
    const stemMesh = new THREE.Mesh(stemGeo, darkGoldMat);
    stemMesh.position.y = -7.2;
    torchGroup.add(stemMesh);

    // Spiral accent rings wrapping around the stem
    const ringYPositions = [-6.4, -7.1, -7.8];
    ringYPositions.forEach((y, idx) => {
      const ringGeo = new THREE.TorusGeometry(0.82 - idx * 0.02, 0.08, 10, segments);
      const ringMesh = new THREE.Mesh(ringGeo, olympicGoldMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = y;
      torchGroup.add(ringMesh);
    });

    // 6. Glowing hot ember bed inside the cup lip
    const emberGeo = new THREE.CircleGeometry(2.18, segments);
    const emberCanvas = document.createElement('canvas');
    emberCanvas.width = 64;
    emberCanvas.height = 64;
    const ctx = emberCanvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 31);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.25, '#ffdd33');
    grad.addColorStop(0.65, '#f37021');
    grad.addColorStop(1, '#661100');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const emberTexture = new THREE.CanvasTexture(emberCanvas);
    const emberMat = new THREE.MeshBasicMaterial({
      map: emberTexture,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    this.emberMesh = new THREE.Mesh(emberGeo, emberMat);
    this.emberMesh.rotation.x = -Math.PI / 2;
    this.emberMesh.position.y = -4.08;
    torchGroup.add(this.emberMesh);

    altarGroup.add(torchGroup);

    // --- B. THE OPEN BOOK OF WISDOM (CUỐN SÁCH TRI THỨC MỞ RỘNG) ---
    const bookGroup = new THREE.Group();
    bookGroup.position.set(0, -8.45, 0);

    // Central cylindrical book spine
    const spineGeo = new THREE.CylinderGeometry(0.55, 0.55, 2.6, 16);
    const spineMesh = new THREE.Mesh(spineGeo, darkGoldMat);
    spineMesh.rotation.x = Math.PI / 2;
    spineMesh.position.set(0, -0.05, 0);
    bookGroup.add(spineMesh);

    // Fanned book pages (Cánh sách tri thức tỏa rộng nâng đỡ ngọn đuốc)
    const pageLayers = 5;
    for (let l = 0; l < pageLayers; l++) {
      const layerOffset = l * 0.05;
      const fanAngle = 0.22 - l * 0.035;

      // Curved Left Wing Page
      const leftPageGeo = new THREE.PlaneGeometry(3.2, 2.4, 6, 4);
      const leftPos = leftPageGeo.attributes.position;
      for (let i = 0; i < leftPos.count; i++) {
        const px = leftPos.getX(i);
        if (px < 0) {
          leftPos.setY(i, leftPos.getY(i) - Math.pow(Math.abs(px) / 1.6, 1.6) * 0.28);
        }
      }
      leftPageGeo.computeVertexNormals();

      const leftPage = new THREE.Mesh(leftPageGeo, pageMat);
      leftPage.rotation.x = -Math.PI / 2;
      leftPage.rotation.y = -fanAngle;
      leftPage.position.set(-1.62, -layerOffset, 0);
      bookGroup.add(leftPage);

      // Curved Right Wing Page
      const rightPageGeo = new THREE.PlaneGeometry(3.2, 2.4, 6, 4);
      const rightPos = rightPageGeo.attributes.position;
      for (let i = 0; i < rightPos.count; i++) {
        const px = rightPos.getX(i);
        if (px > 0) {
          rightPos.setY(i, rightPos.getY(i) - Math.pow(Math.abs(px) / 1.6, 1.6) * 0.28);
        }
      }
      rightPageGeo.computeVertexNormals();

      const rightPage = new THREE.Mesh(rightPageGeo, pageMat);
      rightPage.rotation.x = -Math.PI / 2;
      rightPage.rotation.y = fanAngle;
      rightPage.position.set(1.62, -layerOffset, 0);
      bookGroup.add(rightPage);
    }

    // Golden book edge trims
    const trimGeo = new THREE.BoxGeometry(3.25, 0.05, 0.12);
    const leftTrim = new THREE.Mesh(trimGeo, olympicGoldMat);
    leftTrim.position.set(-1.65, -0.26, 1.15);
    bookGroup.add(leftTrim);

    const rightTrim = new THREE.Mesh(trimGeo, olympicGoldMat);
    rightTrim.position.set(1.65, -0.26, 1.15);
    bookGroup.add(rightTrim);

    altarGroup.add(bookGroup);

    // --- C. STEPPED TECHNOLOGY PEDESTAL BASE (BỆ CÔNG NGHỆ BẬC THANG) ---
    // Step 1: Upper Tech Step
    const step1Geo = new THREE.CylinderGeometry(4.1, 4.4, 0.55, segments);
    const step1Mesh = new THREE.Mesh(step1Geo, navyPedestalMat);
    step1Mesh.position.y = -9.2;
    altarGroup.add(step1Mesh);

    const step1GoldRingGeo = new THREE.TorusGeometry(4.42, 0.07, 10, segments);
    const step1GoldRing = new THREE.Mesh(step1GoldRingGeo, olympicGoldMat);
    step1GoldRing.rotation.x = Math.PI / 2;
    step1GoldRing.position.y = -8.95;
    altarGroup.add(step1GoldRing);

    // Step 2: Foundation Tech Platform
    const step2Geo = new THREE.CylinderGeometry(5.2, 5.6, 0.65, segments);
    const step2Mesh = new THREE.Mesh(step2Geo, navyPedestalMat);
    step2Mesh.position.y = -9.8;
    altarGroup.add(step2Mesh);

    const step2GoldRingGeo = new THREE.TorusGeometry(5.62, 0.08, 10, segments);
    const step2GoldRing = new THREE.Mesh(step2GoldRingGeo, darkGoldMat);
    step2GoldRing.rotation.x = Math.PI / 2;
    step2GoldRing.position.y = -9.5;
    altarGroup.add(step2GoldRing);

    this.coreGroup.add(altarGroup);
  }

  /**
   * Tilted Golden Orbit & Flying Knowledge Pages (Vòng Quỹ Đạo Ánh Sáng & Trang Sách Tri Thức)
   * Inspired directly by the Key Visual's orbiting cosmic elements
   */
  buildOrbitAndPages() {
    this.orbitGroup = new THREE.Group();
    this.orbitGroup.position.set(0, -0.2, 0);

    // 1. Tilted Golden Orbit Ring
    const orbitRadius = 5.2;
    const ringTube = 0.042;
    const segments = this.isMobile ? 48 : 72;

    const ringGeo = new THREE.TorusGeometry(orbitRadius, ringTube, 10, segments);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xffe066,
      emissive: 0xffaa00,
      emissiveIntensity: 0.9,
      metalness: 0.85,
      roughness: 0.2,
      transparent: true,
      opacity: 0.88
    });
    this.orbitRing = new THREE.Mesh(ringGeo, ringMat);
    this.orbitRing.rotation.x = 0.52; // Tilted angle like KV
    this.orbitRing.rotation.z = -0.28;
    this.orbitGroup.add(this.orbitRing);

    // 2. Soft Orbit Glow halo
    const glowRingGeo = new THREE.TorusGeometry(orbitRadius, ringTube * 3.2, 8, this.isMobile ? 32 : 48);
    const glowRingMat = new THREE.MeshBasicMaterial({
      color: 0xffbb33,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.orbitGlowRing = new THREE.Mesh(glowRingGeo, glowRingMat);
    this.orbitGlowRing.rotation.copy(this.orbitRing.rotation);
    this.orbitGroup.add(this.orbitGlowRing);

    // 3. Flying Knowledge Pages (Các trang sách tri thức bay lượn trên quỹ đạo)
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = 64;
    pageCanvas.height = 80;
    const pCtx = pageCanvas.getContext('2d');

    // Draw glowing parchment page with golden lines representing knowledge
    pCtx.fillStyle = '#fffdf5';
    pCtx.fillRect(2, 2, 60, 76);
    pCtx.strokeStyle = '#ffd700';
    pCtx.lineWidth = 2;
    pCtx.strokeRect(2, 2, 60, 76);

    // Gold script text lines
    pCtx.fillStyle = '#c8963e';
    for (let y = 14; y <= 66; y += 7) {
      const lineLen = 32 + (y % 11) * 2;
      pCtx.fillRect(10, y, lineLen, 2.5);
    }

    const pageTexture = new THREE.CanvasTexture(pageCanvas);
    const flyingPageMat = new THREE.MeshStandardMaterial({
      map: pageTexture,
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.1,
      emissive: 0x664400,
      emissiveIntensity: 0.35,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95
    });

    const flyingPageGeo = new THREE.PlaneGeometry(0.85, 1.15);
    const pageCount = this.isMobile ? 4 : 7;
    this.flyingPages = [];

    for (let i = 0; i < pageCount; i++) {
      const baseAngle = (i / pageCount) * Math.PI * 2;
      const pageMesh = new THREE.Mesh(flyingPageGeo, flyingPageMat);
      pageMesh.userData = {
        baseAngle: baseAngle,
        speed: 0.28 + (i % 3) * 0.05,
        tiltPhase: i * 1.3,
        orbitRadius: orbitRadius + (i % 2 === 0 ? 0.3 : -0.3)
      };
      this.orbitGroup.add(pageMesh);
      this.flyingPages.push(pageMesh);
    }

    this.scene.add(this.orbitGroup);
  }

  /**
   * Ascending sparks and glowing embers floating up from the sacred flame
   */
  buildSparks() {
    const count = this.isMobile ? 75 : 380;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const radius = 0.2 + Math.random() * 2.2;
      positions[i * 3] = Math.cos(theta) * radius;
      positions[i * 3 + 1] = -4.0 + Math.random() * 13.5;
      positions[i * 3 + 2] = Math.sin(theta) * radius;

      speeds[i] = 0.03 + Math.random() * 0.045;
      phases[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // High quality spark texture
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 15);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.35, '#ffdd44');
    grad.addColorStop(0.75, '#f37021');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: this.isMobile ? 0.32 : 0.38,
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.sparks = new THREE.Points(geometry, material);
    this.sparks.userData = { speeds, phases, count };
    this.scene.add(this.sparks);
  }

  /**
   * Background starfield representing the galaxy of wisdom
   */
  buildStarfield() {
    const count = this.isMobile ? 180 : 750;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 65;
      positions[i + 1] = (Math.random() - 0.5) * 65;
      positions[i + 2] = (Math.random() - 0.5) * 45 - 12;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      size: 0.12,
      color: 0x88ccff,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });

    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);
  }

  onMouseMove(e) {
    this.mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
    this.mouse.targetY = (e.clientY / window.innerHeight - 0.5) * 2;
  }

  onTouchMove(e) {
    if (e.touches && e.touches.length > 0) {
      this.mouse.targetX = (e.touches[0].clientX / window.innerWidth - 0.5) * 1.5;
      this.mouse.targetY = (e.touches[0].clientY / window.innerHeight - 0.5) * 1.5;
    }
  }

  onWindowResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.isMobile = width < 768 || /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.camera.position.set(0, this.isMobile ? -1.0 : -0.2, this.isMobile ? 16.5 : 17.5);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    const pixelRatio = this.isMobile ? 1.0 : Math.min(window.devicePixelRatio, 1.75);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height);
  }

  /**
   * Reacts dynamically when the user types in the tribute form
   */
  setTyping(isTyping) {
    this.isTyping = isTyping;
    if (this.fireMesh) {
      this.fireMesh.magnitude = isTyping ? 2.15 : 1.85;
    }
    if (this.fireCore) {
      this.fireCore.magnitude = isTyping ? 2.5 : 2.2;
    }
  }

  /**
   * Majestic "Thắp Lửa" celebratory burst when tribute is sent
   */
  triggerIgnite(onComplete) {
    if (this.isIgniting) return;
    this.isIgniting = true;

    // Flare volumetric fire magnitude
    if (this.fireMesh) this.fireMesh.magnitude = 3.2;
    if (this.fireCore) this.fireCore.magnitude = 3.6;
    if (this.flameTongue) {
      this.flameTongue.scale.set(1.35, 1.25, 1.35);
    }

    // Upward eruption of golden embers
    const burstCount = this.isMobile ? 180 : 650;
    const burstGeo = new THREE.BufferGeometry();
    const burstPositions = new Float32Array(burstCount * 3);
    const burstVelocities = new Float32Array(burstCount * 3);

    for (let i = 0; i < burstCount; i++) {
      burstPositions[i * 3] = (Math.random() - 0.5) * 1.6;
      burstPositions[i * 3 + 1] = -3.8 + Math.random() * 2.5;
      burstPositions[i * 3 + 2] = (Math.random() - 0.5) * 1.6;

      const phi = Math.random() * Math.PI * 0.4;
      const theta = Math.random() * Math.PI * 2;
      const speed = 0.2 + Math.random() * 0.42;

      burstVelocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      burstVelocities[i * 3 + 1] = Math.cos(phi) * speed * 1.7 + 0.18;
      burstVelocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;
    }

    burstGeo.setAttribute('position', new THREE.BufferAttribute(burstPositions, 3));

    const burstMat = new THREE.PointsMaterial({
      size: 0.52,
      color: 0xffcc33,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const burstMesh = new THREE.Points(burstGeo, burstMat);
    this.scene.add(burstMesh);

    let progress = 0;
    const igniteInterval = setInterval(() => {
      progress += 0.03;

      const pos = burstGeo.attributes.position.array;
      for (let i = 0; i < burstCount; i++) {
        pos[i * 3] += burstVelocities[i * 3];
        pos[i * 3 + 1] += burstVelocities[i * 3 + 1];
        pos[i * 3 + 2] += burstVelocities[i * 3 + 2];
        burstVelocities[i * 3 + 1] += 0.005;
      }
      burstGeo.attributes.position.needsUpdate = true;
      burstMat.opacity = Math.max(0, 1 - progress);

      // Light flash intensity
      if (this.pointLight) {
        this.pointLight.intensity = 3.8 + Math.sin(progress * Math.PI) * 14.0;
      }
      if (this.haloSprite) {
        const s = 7.5 + Math.sin(progress * Math.PI) * 10.0;
        this.haloSprite.scale.set(s, s, 1);
      }

      if (progress >= 1.0) {
        clearInterval(igniteInterval);
        this.scene.remove(burstMesh);
        burstGeo.dispose();
        burstMat.dispose();
        this.isIgniting = false;
        if (this.fireMesh) this.fireMesh.magnitude = this.isTyping ? 2.15 : 1.85;
        if (this.fireCore) this.fireCore.magnitude = this.isTyping ? 2.5 : 2.2;
        if (this.flameTongue) this.flameTongue.scale.set(1.0, 1.0, 1.0);
        if (this.pointLight) this.pointLight.intensity = 3.8;
        if (this.haloSprite) this.haloSprite.scale.set(7.5, 7.5, 1);
        if (onComplete) onComplete();
      }
    }, 16);
  }

  animate() {
    if (this.isPaused) return;
    requestAnimationFrame(this.animate);

    // Smooth delta-time tracking to completely prevent sudden jumps/stutter after idle or tab suspension
    const now = performance.now();
    const rawDelta = this.lastFrameTime ? (now - this.lastFrameTime) * 0.001 : 0.016;
    this.lastFrameTime = now;
    const delta = Math.min(rawDelta, 0.05); // Clamp max 50ms to absorb any GC or idle wakeup latency
    this.elapsedTime = (this.elapsedTime || 0) + delta;
    const time = this.elapsedTime;

    // Smooth mouse lerp
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.05;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.05;

    // Subtle 3D perspective sway reacting to viewer motion
    if (this.coreGroup) {
      this.coreGroup.rotation.y = time * 0.16 + this.mouse.x * 0.35;
      this.coreGroup.rotation.x = Math.sin(time * 0.35) * 0.04 - this.mouse.y * 0.22;
      this.coreGroup.rotation.z = Math.sin(time * 0.45) * 0.02 - this.mouse.x * 0.08;
    }

    // Procedural volumetric fire updates
    const speedMult = this.isTyping ? 1.35 : 1.0;
    if (this.fireMesh) {
      this.fireMesh.update(time * speedMult);
    }
    if (this.fireCore) {
      this.fireCore.update(time * 1.25 * speedMult);
    }

    // Dynamic S-curve flame tongue swaying
    if (this.flameTongue) {
      this.flameTongue.rotation.y = Math.sin(time * 1.5) * 0.22;
      this.flameTongue.rotation.z = Math.cos(time * 2.1) * 0.04;
      this.flameTongue.scale.y = 1.0 + Math.sin(time * 3.8) * 0.05;
      this.flameTongue.scale.x = 1.0 + Math.cos(time * 2.7) * 0.04;
    }

    // Orbit Group & Flying Pages Animation
    if (this.orbitGroup) {
      // Rotation of the golden orbit ring
      this.orbitRing.rotation.y = time * 0.08;
      if (this.orbitGlowRing) {
        this.orbitGlowRing.rotation.y = time * 0.08;
        this.orbitGlowRing.material.opacity = 0.28 + Math.sin(time * 2.5) * 0.12;
      }

      // Fluttering flight of wisdom pages along the tilted orbit
      const rx = 0.52;
      const rz = -0.28;
      this.flyingPages.forEach((page) => {
        const { baseAngle, speed, tiltPhase, orbitRadius } = page.userData;
        const currentAngle = baseAngle + time * speed;

        const localX = Math.cos(currentAngle) * orbitRadius;
        const localZ = Math.sin(currentAngle) * orbitRadius;
        const localY = Math.sin(currentAngle * 2.0 + tiltPhase) * 0.45;

        // Apply tilt transformation
        const v = new THREE.Vector3(localX, localY, localZ);
        v.applyAxisAngle(new THREE.Vector3(1, 0, 0), rx);
        v.applyAxisAngle(new THREE.Vector3(0, 0, 1), rz);

        page.position.copy(v);

        // Page flutter & face orientation
        page.rotation.x = rx + Math.sin(time * 3.0 + tiltPhase) * 0.35;
        page.rotation.y = -currentAngle + Math.PI / 2;
        page.rotation.z = rz + Math.cos(time * 2.5 + tiltPhase) * 0.25;
      });
    }

    // High frequency natural fire flicker
    if (this.pointLight && !this.isIgniting) {
      const flicker1 = Math.sin(time * 19.3) * 0.4 + Math.cos(time * 29.7) * 0.28;
      const flicker2 = Math.sin(time * 11.2) * 0.2;
      const baseLight = this.isTyping ? 5.0 : 3.8;
      this.pointLight.intensity = baseLight + flicker1 + flicker2;
      this.pointLight.position.y = -2.2 + Math.sin(time * 4.5) * 0.25;
    }

    // Breathing pulse on hot coals bed
    if (this.emberMesh) {
      const emberPulse = 0.88 + Math.sin(time * 3.8) * 0.12;
      this.emberMesh.material.opacity = emberPulse;
    }

    // Breathing pulse on luminous aura
    if (this.auraSprite) {
      this.auraSprite.material.opacity = 0.80 + Math.sin(time * 3.0) * 0.18;
    }

    // Animate ascending sparks and embers
    if (this.sparks) {
      const positions = this.sparks.geometry.attributes.position.array;
      const { speeds, phases, count } = this.sparks.userData;

      for (let i = 0; i < count; i++) {
        positions[i * 3 + 1] += speeds[i] * (this.isTyping ? 1.45 : 1.0);

        const phase = phases[i] + time * 1.6;
        positions[i * 3] += Math.sin(phase) * 0.007;
        positions[i * 3 + 2] += Math.cos(phase) * 0.007;

        if (positions[i * 3 + 1] > 9.0) {
          positions[i * 3 + 1] = -4.0;
          const theta = Math.random() * Math.PI * 2;
          const radius = 0.2 + Math.random() * 2.2;
          positions[i * 3] = Math.cos(theta) * radius;
          positions[i * 3 + 2] = Math.sin(theta) * radius;
        }
      }
      this.sparks.geometry.attributes.position.needsUpdate = true;
    }

    // Celestial background starfield slow drift
    if (this.stars) {
      this.stars.rotation.y = time * 0.012;
    }

    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('touchmove', this.onTouchMove);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);

    if (this.fireMesh) this.fireMesh.dispose();
    if (this.fireCore) this.fireCore.dispose();
    if (this.flameTongue) {
      if (this.flameTongue.material.map) this.flameTongue.material.map.dispose();
      this.flameTongue.material.dispose();
      this.flameTongue.geometry.dispose();
    }
    if (this.auraSprite) {
      if (this.auraSprite.material.map) this.auraSprite.material.map.dispose();
      this.auraSprite.material.dispose();
    }
    if (this.haloSprite) {
      if (this.haloSprite.material.map) this.haloSprite.material.map.dispose();
      this.haloSprite.material.dispose();
    }
    if (this.orbitGroup) {
      this.scene.remove(this.orbitGroup);
      if (this.orbitRing) {
        this.orbitRing.geometry.dispose();
        this.orbitRing.material.dispose();
      }
      if (this.orbitGlowRing) {
        this.orbitGlowRing.geometry.dispose();
        this.orbitGlowRing.material.dispose();
      }
      this.flyingPages.forEach(p => {
        p.geometry.dispose();
        if (p.material.map) p.material.map.dispose();
        p.material.dispose();
      });
    }

    if (this.renderer && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
