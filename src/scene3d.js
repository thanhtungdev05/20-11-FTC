import * as THREE from 'three';

/**
 * Three.js 3D Interactive Scene: "Thắp Lửa Tri Ân - Trái Tim Tri Thức"
 */
export class Scene3D {
  constructor(containerElement) {
    this.container = containerElement;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    
    // 3D Objects
    this.coreGroup = null;
    this.innerFlame = null;
    this.rings = [];
    this.sparks = null;
    this.stars = null;
    this.burstParticles = null;
    
    // Lights
    this.pointLight = null;
    this.ambientLight = null;
    
    // Interaction state
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
    this.scene.fog = new THREE.FogExp2(0x060913, 0.025);

    // 2. Camera (Tối ưu góc nhìn cho cả Mobile và Desktop)
    const isMobile = width < 768;
    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    this.camera.position.set(0, isMobile ? 1.5 : 0, isMobile ? 21 : 16);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    // 4. Lights
    this.ambientLight = new THREE.AmbientLight(0x002d62, 1.5);
    this.scene.add(this.ambientLight);

    this.pointLight = new THREE.PointLight(0xf37021, 3.5, 40);
    this.pointLight.position.set(0, 0, 0);
    this.scene.add(this.pointLight);

    const secondaryLight = new THREE.PointLight(0xffd700, 2.0, 30);
    secondaryLight.position.set(0, 3, 2);
    this.scene.add(secondaryLight);

    // 5. Build 3D Objects
    this.buildCore();
    this.buildOrbitRings();
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

  buildCore() {
    this.coreGroup = new THREE.Group();

    // Inner Glowing Crystal Flame (Khối Pha Lê Tri Thức)
    const geometry = new THREE.IcosahedronGeometry(2.2, 2);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xf37021,
      emissive: 0xff4500,
      emissiveIntensity: 0.8,
      roughness: 0.15,
      metalness: 0.1,
      transmission: 0.6,
      ior: 1.5,
      wireframe: false,
      transparent: true,
      opacity: 0.85
    });

    this.innerFlame = new THREE.Mesh(geometry, material);
    this.coreGroup.add(this.innerFlame);

    // Wireframe overlay for modern tech aesthetic
    const wireGeo = new THREE.IcosahedronGeometry(2.35, 1);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      wireframe: true,
      transparent: true,
      opacity: 0.4
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    this.coreGroup.add(wireMesh);
    this.wireMesh = wireMesh;

    // Glowing sprite halo at the center
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 60);
    grad.addColorStop(0, 'rgba(255, 215, 0, 1)');
    grad.addColorStop(0.3, 'rgba(243, 112, 33, 0.8)');
    grad.addColorStop(0.7, 'rgba(243, 112, 33, 0.2)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    const haloTexture = new THREE.CanvasTexture(canvas);
    const haloMat = new THREE.SpriteMaterial({
      map: haloTexture,
      color: 0xffffff,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    const haloSprite = new THREE.Sprite(haloMat);
    haloSprite.scale.set(7, 7, 1);
    this.coreGroup.add(haloSprite);
    this.haloSprite = haloSprite;

    this.scene.add(this.coreGroup);
  }

  buildOrbitRings() {
    // 3 Golden Orbit Rings representing transmission of wisdom
    const ringConfigs = [
      { radius: 3.4, tube: 0.04, rx: 1.2, ry: 0.5, speed: 0.008, color: 0xffd700 },
      { radius: 4.0, tube: 0.035, rx: -0.8, ry: 1.1, speed: -0.006, color: 0xf37021 },
      { radius: 4.6, tube: 0.03, rx: 0.4, ry: -0.7, speed: 0.005, color: 0x00c6ff }
    ];

    ringConfigs.forEach((cfg) => {
      const ringGeo = new THREE.TorusGeometry(cfg.radius, cfg.tube, 16, 100);
      const ringMat = new THREE.MeshStandardMaterial({
        color: cfg.color,
        emissive: cfg.color,
        emissiveIntensity: 0.6,
        roughness: 0.2,
        metalness: 0.8
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = cfg.rx;
      ringMesh.rotation.y = cfg.ry;
      ringMesh.userData = { speed: cfg.speed };
      this.coreGroup.add(ringMesh);
      this.rings.push(ringMesh);
    });
  }

  buildSparks() {
    // Rising sparks from the flame of gratitude
    const count = 350;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const radius = 0.5 + Math.random() * 2.8;
      positions[i * 3] = Math.cos(theta) * radius;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 2] = Math.sin(theta) * radius;

      speeds[i] = 0.02 + Math.random() * 0.04;
      phases[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Particle texture
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 14);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, '#ffd700');
    grad.addColorStop(0.8, '#f37021');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 0.35,
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.sparks = new THREE.Points(geometry, material);
    this.sparks.userData = { speeds, phases, count };
    this.scene.add(this.sparks);
  }

  buildStarfield() {
    // Background starfield
    const count = 800;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 60;
      positions[i + 1] = (Math.random() - 0.5) * 60;
      positions[i + 2] = (Math.random() - 0.5) * 40 - 10;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      size: 0.12,
      color: 0x88ccff,
      transparent: true,
      opacity: 0.7,
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
    this.camera.position.set(0, isMobile ? 1.5 : 0, isMobile ? 21 : 16);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  setTyping(isTyping) {
    this.isTyping = isTyping;
  }

  /**
   * Hiệu ứng 3D "Thắp Lửa" bùng nổ hoành tráng
   */
  triggerIgnite(onComplete) {
    if (this.isIgniting) return;
    this.isIgniting = true;

    // Create explosion burst particles
    const burstCount = 600;
    const burstGeo = new THREE.BufferGeometry();
    const burstPositions = new Float32Array(burstCount * 3);
    const burstVelocities = new Float32Array(burstCount * 3);

    for (let i = 0; i < burstCount; i++) {
      burstPositions[i * 3] = 0;
      burstPositions[i * 3 + 1] = 0;
      burstPositions[i * 3 + 2] = 0;

      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const speed = 0.15 + Math.random() * 0.35;

      burstVelocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      burstVelocities[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
      burstVelocities[i * 3 + 2] = Math.cos(phi) * speed;
    }

    burstGeo.setAttribute('position', new THREE.BufferAttribute(burstPositions, 3));

    const burstMat = new THREE.PointsMaterial({
      size: 0.45,
      color: 0xffaa00,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const burstMesh = new THREE.Points(burstGeo, burstMat);
    this.scene.add(burstMesh);

    let progress = 0;
    const igniteInterval = setInterval(() => {
      progress += 0.03;
      
      // Expand particles
      const pos = burstGeo.attributes.position.array;
      for (let i = 0; i < burstCount; i++) {
        pos[i * 3] += burstVelocities[i * 3];
        pos[i * 3 + 1] += burstVelocities[i * 3 + 1] + 0.02; // rise upwards
        pos[i * 3 + 2] += burstVelocities[i * 3 + 2];
      }
      burstGeo.attributes.position.needsUpdate = true;
      burstMat.opacity = Math.max(0, 1 - progress);

      // Light flash intensity
      if (this.pointLight) {
        this.pointLight.intensity = 3.5 + Math.sin(progress * Math.PI) * 12.0;
      }
      if (this.haloSprite) {
        const s = 7 + Math.sin(progress * Math.PI) * 10;
        this.haloSprite.scale.set(s, s, 1);
      }

      if (progress >= 1.0) {
        clearInterval(igniteInterval);
        this.scene.remove(burstMesh);
        burstGeo.dispose();
        burstMat.dispose();
        this.isIgniting = false;
        if (this.pointLight) this.pointLight.intensity = 3.5;
        if (this.haloSprite) this.haloSprite.scale.set(7, 7, 1);
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

    // Rotate core group
    if (this.coreGroup) {
      this.coreGroup.rotation.y = time * 0.25 + this.mouse.x * 0.4;
      this.coreGroup.rotation.x = Math.sin(time * 0.3) * 0.15 - this.mouse.y * 0.4;

      // Pulse rate changes if user is typing
      const pulseSpeed = this.isTyping ? 5.0 : 2.0;
      const pulseScale = 1.0 + Math.sin(time * pulseSpeed) * (this.isTyping ? 0.08 : 0.03);
      this.innerFlame.scale.set(pulseScale, pulseScale, pulseScale);

      // Rotate wireframe
      if (this.wireMesh) {
        this.wireMesh.rotation.y = -time * 0.3;
        this.wireMesh.rotation.z = time * 0.15;
      }

      // Rotate orbit rings
      this.rings.forEach((ring) => {
        ring.rotation.z += ring.userData.speed;
        ring.rotation.x += ring.userData.speed * 0.5;
      });
    }

    // Animate rising sparks
    if (this.sparks) {
      const positions = this.sparks.geometry.attributes.position.array;
      const { speeds, phases, count } = this.sparks.userData;

      for (let i = 0; i < count; i++) {
        // Move upward
        positions[i * 3 + 1] += speeds[i];
        
        // Gentle spiral
        const phase = phases[i] + time * 1.5;
        positions[i * 3] += Math.sin(phase) * 0.005;
        positions[i * 3 + 2] += Math.cos(phase) * 0.005;

        // Reset if too high
        if (positions[i * 3 + 1] > 6) {
          positions[i * 3 + 1] = -3;
          const theta = Math.random() * Math.PI * 2;
          const radius = 0.5 + Math.random() * 2.0;
          positions[i * 3] = Math.cos(theta) * radius;
          positions[i * 3 + 2] = Math.sin(theta) * radius;
        }
      }
      this.sparks.geometry.attributes.position.needsUpdate = true;
    }

    // Slowly rotate background starfield
    if (this.stars) {
      this.stars.rotation.y = time * 0.015;
    }

    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('touchmove', this.onTouchMove);
    if (this.renderer && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
