import * as THREE from 'three';
import { FireMesh } from '@wolffo/three-fire/vanilla';

/**
 * Three.js 3D Interactive Volumetric Fire Scene:
 * "Ngọn Lửa Tri Ân - FPT Telecom 20/11"
 * Based on procedural raymarched volumetric fire (typeWolffo/THREE.Fire)
 */
export class Scene3D {
  constructor(containerElement) {
    this.container = containerElement;
    this.scene = null;
    this.camera = null;
    this.renderer = null;

    // 3D Fire & Scene Objects
    this.coreGroup = null;
    this.fireMesh = null;
    this.fireCore = null;
    this.emberMesh = null;
    this.haloSprite = null;
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
    this.startTime = performance.now();

    this.init();
  }

  init() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x050914, 0.022);

    // 2. Camera: Optimized for both Mobile and Desktop
    const isMobile = width < 768;
    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    this.camera.position.set(0, isMobile ? 0.6 : 0.0, isMobile ? 22 : 17.5);

    // 3. Renderer with cinematic tone mapping
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.container.appendChild(this.renderer.domElement);

    // 4. Lights: Dynamic warm flame illumination
    this.ambientLight = new THREE.AmbientLight(0x07152b, 1.6);
    this.scene.add(this.ambientLight);

    // Main flame light inside the fire
    this.pointLight = new THREE.PointLight(0xf37021, 3.8, 45);
    this.pointLight.position.set(0, -1.8, 0.5);
    this.scene.add(this.pointLight);

    // Secondary golden flame glow
    this.secondaryLight = new THREE.PointLight(0xffd700, 2.2, 35);
    this.secondaryLight.position.set(0, 1.5, 2.0);
    this.scene.add(this.secondaryLight);

    // 5. Build 3D Objects
    this.buildCore();
    this.buildSparks();
    this.buildStarfield();

    // 6. Event listeners
    this.onWindowResize = this.onWindowResize.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);

    window.addEventListener('resize', this.onWindowResize);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('touchmove', this.onTouchMove, { passive: true });

    // 7. Start render loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  /**
   * Constructs the procedural volumetric flame and ceremonial brazier
   */
  buildCore() {
    this.coreGroup = new THREE.Group();

    // Load official 3D volumetric fire profile texture
    const textureLoader = new THREE.TextureLoader();
    const fireTex = textureLoader.load('/assets/Fire.png', (tex) => {
      tex.needsUpdate = true;
    });

    // 1. MAIN VOLUMETRIC FLAME (Ngọn Lửa Tri Ân FTEL)
    // Towering, leaping orange flame using procedural simplex noise turbulence
    this.fireMesh = new FireMesh({
      fireTex: fireTex,
      color: 0xf37021, // FPT Telecom vibrant flame orange
      magnitude: 1.75, // Dynamic flame licking
      lacunarity: 2.1,
      gain: 0.52,
      iterations: 26,  // Smooth volumetric raymarching
      octaves: 4,      // Rich realistic turbulence
      noiseScale: [1.0, 2.2, 1.0, 0.32] // Upward convection draft
    });
    // Tall flame aspect ratio: Width 6.6, Height 13.0, Depth 6.6
    this.fireMesh.scale.set(6.6, 13.0, 6.6);
    // Base is at y = 0.7 - (13.0 / 2) = -5.8, perfectly seated inside the brazier
    this.fireMesh.position.set(0, 0.7, 0);
    this.coreGroup.add(this.fireMesh);

    // 2. INNER INCANDESCENT CORE FLAME (Trọng Tâm Nhiệt Huyết)
    // Hot, brilliant golden-yellow thermal core inside the lower flame
    this.fireCore = new FireMesh({
      fireTex: fireTex,
      color: 0xffea77, // Brilliant warm gold
      magnitude: 2.1,
      lacunarity: 2.0,
      gain: 0.5,
      iterations: 22,
      octaves: 3,
      noiseScale: [1.2, 2.4, 1.2, 0.38]
    });
    this.fireCore.scale.set(4.2, 9.2, 4.2);
    // Base is at y = -1.2 - (9.2 / 2) = -5.8
    this.fireCore.position.set(0, -1.2, 0);
    this.fireCore.material.blending = THREE.AdditiveBlending;
    this.coreGroup.add(this.fireCore);

    // 3. CEREMONIAL BRAZIER (Đài Lửa Tri Ân)
    this.buildAltarBase();

    // 4. Soft warm atmospheric glow sprite at the flame base
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 60);
    grad.addColorStop(0, 'rgba(255, 230, 150, 0.9)');
    grad.addColorStop(0.25, 'rgba(243, 112, 33, 0.6)');
    grad.addColorStop(0.65, 'rgba(243, 112, 33, 0.15)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    const haloTexture = new THREE.CanvasTexture(canvas);
    const haloMat = new THREE.SpriteMaterial({
      map: haloTexture,
      color: 0xffffff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.haloSprite = new THREE.Sprite(haloMat);
    this.haloSprite.scale.set(8.5, 8.5, 1);
    this.haloSprite.position.set(0, -2.5, 0);
    this.coreGroup.add(this.haloSprite);

    this.scene.add(this.coreGroup);
  }

  /**
   * Builds the ceremonial bronze & gold brazier (Đài Thắp Lửa) at the base
   */
  buildAltarBase() {
    const brazierGroup = new THREE.Group();

    // Metallic bronze finish
    const bronzeMat = new THREE.MeshStandardMaterial({
      color: 0x1d1713,
      roughness: 0.32,
      metalness: 0.88
    });

    // Burnished gold trim finish
    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.22,
      metalness: 0.92,
      emissive: 0x663300,
      emissiveIntensity: 0.35
    });

    // 1. Upper rim of the brazier
    const rimGeo = new THREE.TorusGeometry(3.1, 0.18, 16, 64);
    const rimMesh = new THREE.Mesh(rimGeo, goldTrimMat);
    rimMesh.rotation.x = Math.PI / 2;
    rimMesh.position.y = -5.8;
    brazierGroup.add(rimMesh);

    // 2. Tapered brazier bowl
    const bowlGeo = new THREE.CylinderGeometry(3.05, 1.8, 1.4, 32);
    const bowlMesh = new THREE.Mesh(bowlGeo, bronzeMat);
    bowlMesh.position.y = -6.5;
    brazierGroup.add(bowlMesh);

    // 3. Middle gold ring
    const midRingGeo = new THREE.TorusGeometry(2.1, 0.12, 16, 48);
    const midRingMesh = new THREE.Mesh(midRingGeo, goldTrimMat);
    midRingMesh.rotation.x = Math.PI / 2;
    midRingMesh.position.y = -7.1;
    brazierGroup.add(midRingMesh);

    // 4. Sturdy pedestal base
    const pedestalGeo = new THREE.CylinderGeometry(2.1, 2.7, 0.8, 32);
    const pedestalMesh = new THREE.Mesh(pedestalGeo, bronzeMat);
    pedestalMesh.position.y = -7.5;
    brazierGroup.add(pedestalMesh);

    // 5. Bottom ring
    const baseRingGeo = new THREE.TorusGeometry(2.72, 0.14, 16, 48);
    const baseRingMesh = new THREE.Mesh(baseRingGeo, goldTrimMat);
    baseRingMesh.rotation.x = Math.PI / 2;
    baseRingMesh.position.y = -7.9;
    brazierGroup.add(baseRingMesh);

    // 6. Glowing hot ember bed inside the bowl
    const emberGeo = new THREE.CircleGeometry(2.9, 32);
    const emberCanvas = document.createElement('canvas');
    emberCanvas.width = 128;
    emberCanvas.height = 128;
    const ctx = emberCanvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 5, 64, 64, 64);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.28, '#ffcc00');
    grad.addColorStop(0.68, '#ff3b00');
    grad.addColorStop(1, '#660000');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    const emberTexture = new THREE.CanvasTexture(emberCanvas);
    const emberMat = new THREE.MeshBasicMaterial({
      map: emberTexture,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending
    });
    this.emberMesh = new THREE.Mesh(emberGeo, emberMat);
    this.emberMesh.rotation.x = -Math.PI / 2;
    this.emberMesh.position.y = -5.75;
    brazierGroup.add(this.emberMesh);

    this.coreGroup.add(brazierGroup);
  }

  /**
   * Ascending sparks and glowing embers floating up from the sacred flame
   */
  buildSparks() {
    const count = 380;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const radius = 0.2 + Math.random() * 2.4;
      positions[i * 3] = Math.cos(theta) * radius;
      positions[i * 3 + 1] = -5.5 + Math.random() * 13.5;
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
      size: 0.38,
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
    const count = 750;
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
    if (e.touches.length > 0) {
      this.mouse.targetX = (e.touches[0].clientX / window.innerWidth - 0.5) * 2;
      this.mouse.targetY = (e.touches[0].clientY / window.innerHeight - 0.5) * 2;
    }
  }

  onWindowResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    const isMobile = width < 768;
    this.camera.position.set(0, isMobile ? 0.6 : 0.0, isMobile ? 22 : 17.5);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /**
   * Reacts dynamically when the user types in the tribute form
   */
  setTyping(isTyping) {
    this.isTyping = isTyping;
    if (this.fireMesh) {
      this.fireMesh.magnitude = isTyping ? 2.15 : 1.75;
    }
    if (this.fireCore) {
      this.fireCore.magnitude = isTyping ? 2.5 : 2.1;
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

    // Upward eruption of golden embers
    const burstCount = 650;
    const burstGeo = new THREE.BufferGeometry();
    const burstPositions = new Float32Array(burstCount * 3);
    const burstVelocities = new Float32Array(burstCount * 3);

    for (let i = 0; i < burstCount; i++) {
      burstPositions[i * 3] = (Math.random() - 0.5) * 1.6;
      burstPositions[i * 3 + 1] = -4.5 + Math.random() * 2.5;
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
      progress += 0.025;

      const pos = burstGeo.attributes.position.array;
      for (let i = 0; i < burstCount; i++) {
        pos[i * 3] += burstVelocities[i * 3];
        pos[i * 3 + 1] += burstVelocities[i * 3 + 1];
        pos[i * 3 + 2] += burstVelocities[i * 3 + 2];
        burstVelocities[i * 3 + 1] += 0.005; // thermal lift
      }
      burstGeo.attributes.position.needsUpdate = true;
      burstMat.opacity = Math.max(0, 1 - progress);

      // Light flash intensity
      if (this.pointLight) {
        this.pointLight.intensity = 3.8 + Math.sin(progress * Math.PI) * 15.0;
      }
      if (this.haloSprite) {
        const s = 8.5 + Math.sin(progress * Math.PI) * 12.0;
        this.haloSprite.scale.set(s, s, 1);
      }

      if (progress >= 1.0) {
        clearInterval(igniteInterval);
        this.scene.remove(burstMesh);
        burstGeo.dispose();
        burstMat.dispose();
        this.isIgniting = false;
        if (this.fireMesh) this.fireMesh.magnitude = this.isTyping ? 2.15 : 1.75;
        if (this.fireCore) this.fireCore.magnitude = this.isTyping ? 2.5 : 2.1;
        if (this.pointLight) this.pointLight.intensity = 3.8;
        if (this.haloSprite) this.haloSprite.scale.set(8.5, 8.5, 1);
        if (onComplete) onComplete();
      }
    }, 16);
  }

  animate() {
    requestAnimationFrame(this.animate);

    const time = (performance.now() - this.startTime) * 0.001;

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

    // High frequency natural fire flicker
    if (this.pointLight && !this.isIgniting) {
      const flicker1 = Math.sin(time * 19.3) * 0.4 + Math.cos(time * 29.7) * 0.28;
      const flicker2 = Math.sin(time * 11.2) * 0.2;
      const baseLight = this.isTyping ? 5.0 : 3.8;
      this.pointLight.intensity = baseLight + flicker1 + flicker2;
      this.pointLight.position.y = -1.8 + Math.sin(time * 4.5) * 0.25;
    }

    // Breathing pulse on hot coals bed
    if (this.emberMesh) {
      const emberPulse = 0.88 + Math.sin(time * 3.8) * 0.12;
      this.emberMesh.material.opacity = emberPulse;
    }

    // Animate ascending sparks and embers
    if (this.sparks) {
      const positions = this.sparks.geometry.attributes.position.array;
      const { speeds, phases, count } = this.sparks.userData;

      for (let i = 0; i < count; i++) {
        // Upward thermal lift
        positions[i * 3 + 1] += speeds[i] * (this.isTyping ? 1.45 : 1.0);

        // Convection sway
        const phase = phases[i] + time * 1.6;
        positions[i * 3] += Math.sin(phase) * 0.007;
        positions[i * 3 + 2] += Math.cos(phase) * 0.007;

        // Reset ember to brazier bed once it ascends past flame tips
        if (positions[i * 3 + 1] > 8.0) {
          positions[i * 3 + 1] = -5.5;
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

    if (this.fireMesh) this.fireMesh.dispose();
    if (this.fireCore) this.fireCore.dispose();

    if (this.renderer && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
