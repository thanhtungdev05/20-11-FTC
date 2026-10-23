import * as THREE from 'three';
import { FireMesh } from '@wolffo/three-fire/vanilla';

/**
 * Three.js 3D Interactive Scene:
 * "Ngọn Lửa Tri Ân - FPT Telecom 20/11 (30 Năm Tiếp Lửa)"
 *
 * Multi-Directional Living 3D Olympic Torch Flame + Shooting Star System:
 * 1. 3-Layer 3D Volumetric Raymarched Fire Plume (`FireMesh`):
 *    - Outer FPT Fiery Orange-Gold Plume
 *    - Inner Incandescent White-Gold Heart
 *    - Base Sapphire-Blue Knowledge Gas Flame nestled in the golden cup mouth
 * 2. 100% Pure Procedural GLSL Multi-Directional Silk Fire Petals & 3D Vortex Wisps:
 *    - Zero static 2D cutout images!
 *    - Dynamic weaving centerline that naturally alternates curves in all 3D directions
 *    - Silky longitudinal plasma streams, dynamic licking tongues, and blackbody color ramp
 * 3. Royal Golden Olympic Torch with fluted ribs and 3D Spiral Laurel Ribbon Sash.
 * 4. Open Book of Wisdom Base with dramatic fanning illuminated pages & stepped pedestal.
 * 5. 3D Shooting Star (Sao Băng Tri Thức) with blazing starburst head, tapering fading
 *    comet tail, twinkling stardust wake, and luminous floating pages.
 */
export class Scene3D {
  constructor(containerElement) {
    this.container = containerElement;
    this.scene = null;
    this.camera = null;
    this.renderer = null;

    const width = containerElement.clientWidth || window.innerWidth;
    this.isMobile =
      width < 768 ||
      /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    // Core 3D Groups & Multi-Directional Flame Elements
    this.coreGroup = null;
    this.flameGroup = null;
    this.fireOuterVolume = null;
    this.fireInnerVolume = null;
    this.fireBlueVolume = null;
    this.proceduralFlameMeshes = [];
    this.fireEmbers = null;
    this.emberMesh = null;
    this.haloSprite = null;
    this.blueCoreSprite = null;
    this.auraSprite = null;

    // Shooting Star & Comet Trail Objects
    this.orbitSystem = null;
    this.mainComet = null;
    this.upperComet = null;
    this.flyingPages = [];

    // Stardust & Background Stars
    this.sparks = null;
    this.stars = null;

    // Dynamic Lights
    this.pointLight = null;
    this.secondaryLight = null;
    this.blueLight = null;
    this.ambientLight = null;

    // Interaction & Animation State
    this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.isIgniting = false;
    this.isTyping = false;
    this.isPaused = false;
    this.igniteBoost = 0;
    this.lastFrameTime = performance.now();
    this.elapsedTime = 0;

    this.init();
  }

  init() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // 1. Scene & Royal Deep Blue Atmosphere
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x040b1e, this.isMobile ? 0.014 : 0.016);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 1000);
    this.camera.position.set(
      0,
      this.isMobile ? -1.3 : -1.0,
      this.isMobile ? 16.8 : 17.4
    );

    // 3. Renderer
    const pixelRatio = this.isMobile
      ? 1.0
      : Math.min(window.devicePixelRatio, 1.75);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isMobile,
      alpha: true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.24;
    this.container.appendChild(this.renderer.domElement);

    // 4. Procedural Studio Gold Environment Map
    this.scene.environment = this.createStudioEnvMap();

    // 5. Lights
    this.ambientLight = new THREE.AmbientLight(0x162c5a, 2.2);
    this.scene.add(this.ambientLight);

    this.pointLight = new THREE.PointLight(
      0xff9922,
      4.6,
      this.isMobile ? 38 : 48
    );
    this.pointLight.position.set(0, 0.6, 2.8);
    this.scene.add(this.pointLight);

    this.secondaryLight = new THREE.PointLight(
      0xffdf77,
      3.6,
      this.isMobile ? 32 : 42
    );
    this.secondaryLight.position.set(1.5, -4.2, 5.5);
    this.scene.add(this.secondaryLight);

    this.blueLight = new THREE.PointLight(0x38bdf8, 2.5, 22);
    this.blueLight.position.set(-2.0, -3.5, 3.5);
    this.scene.add(this.blueLight);

    // 6. Build Scene Elements
    this.buildCore();
    this.buildShootingStarOrbit();
    this.buildStardustWake();
    this.buildStarfield();

    // 7. Event Listeners
    this.onWindowResize = this.onWindowResize.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onVisibilityChange = this.onVisibilityChange.bind(this);

    window.addEventListener('resize', this.onWindowResize);
    window.addEventListener('mousemove', this.onMouseMove, { passive: true });
    window.addEventListener('touchmove', this.onTouchMove, { passive: true });
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    // 8. Start Animation Loop
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
   * Warm gold & royal blue studio reflection map so metallic gold surfaces gleam
   */
  createStudioEnvMap() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0.0, '#1e3a8a');
    grad.addColorStop(0.25, '#fbbf24');
    grad.addColorStop(0.48, '#ffffff');
    grad.addColorStop(0.55, '#f59e0b');
    grad.addColorStop(0.8, '#1e293b');
    grad.addColorStop(1.0, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 128);

    ctx.fillStyle = 'rgba(255, 250, 220, 0.85)';
    ctx.fillRect(20, 24, 50, 65);
    ctx.fillRect(110, 18, 60, 75);
    ctx.fillRect(200, 28, 40, 60);

    const tex = new THREE.CanvasTexture(canvas);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    return tex;
  }

  /**
   * Builds the central group: Multi-Directional Living 3D Flame + Golden Torch + Open Book Base
   */
  buildCore() {
    this.coreGroup = new THREE.Group();

    // 1. Multi-Directional Living 3D Torch Flame
    this.buildLiving3DFlame();

    // 2. Olympic Golden Torch & Open Book of Wisdom Base
    this.buildAltarBase();

    this.scene.add(this.coreGroup);
  }

  /**
   * Builds a 360-degree, multi-directional living 3D torch flame:
   * - 3 Volumetric Raymarched `FireMesh` layers (FPT Orange Outer + White-Gold Core + Sapphire-Blue Base)
   * - 6 Intertwined 3D Curved Petals driven by a 100% Pure Procedural GLSL Fire Shader
   *   whose centerline dynamically weaves left, right, front, and back (never frozen in 1 direction!)
   * - Fine ascending fire micro-embers rising and swirling in 3D
   */
  buildLiving3DFlame() {
    this.flameGroup = new THREE.Group();
    this.flameGroup.position.set(0, 0.95, 0);
    this.proceduralFlameMeshes = [];

    const textureLoader = new THREE.TextureLoader();
    const fireTex = textureLoader.load('/assets/Fire.png', (tex) => {
      tex.needsUpdate = true;
    });

    // --- A. 3-LAYER 3D VOLUMETRIC RAYMARCHED FIRE PLUME ---
    // 1. Outer FPT Orange-Gold Volumetric Plume
    this.fireOuterVolume = new FireMesh({
      fireTex: fireTex,
      color: 0xf37021,
      magnitude: 1.55,
      lacunarity: 2.0,
      gain: 0.48,
      iterations: this.isMobile ? 16 : 22,
      octaves: 3,
      noiseScale: [1.15, 2.6, 1.15, 0.36]
    });
    this.fireOuterVolume.scale.set(4.5, 10.2, 4.5);
    this.fireOuterVolume.position.set(0, 0.75, 0);
    this.flameGroup.add(this.fireOuterVolume);

    // 2. Inner Incandescent Imperial Gold & White Heart
    this.fireInnerVolume = new FireMesh({
      fireTex: fireTex,
      color: 0xffea75,
      magnitude: 1.75,
      lacunarity: 2.0,
      gain: 0.48,
      iterations: this.isMobile ? 14 : 18,
      octaves: 3,
      noiseScale: [1.25, 2.8, 1.25, 0.4]
    });
    this.fireInnerVolume.scale.set(3.1, 7.6, 3.1);
    this.fireInnerVolume.position.set(0, -0.35, 0);
    this.fireInnerVolume.material.blending = THREE.AdditiveBlending;
    this.flameGroup.add(this.fireInnerVolume);

    // 3. Base Sapphire-Blue Knowledge Gas Flame (Nestled right in the golden torch cup mouth)
    this.fireBlueVolume = new FireMesh({
      fireTex: fireTex,
      color: 0x38bdf8,
      magnitude: 1.45,
      lacunarity: 2.1,
      gain: 0.5,
      iterations: this.isMobile ? 12 : 16,
      octaves: 2,
      noiseScale: [1.4, 2.5, 1.4, 0.38]
    });
    this.fireBlueVolume.scale.set(3.3, 4.2, 3.3);
    this.fireBlueVolume.position.set(0.18, -1.85, 0.15);
    this.fireBlueVolume.material.blending = THREE.AdditiveBlending;
    this.flameGroup.add(this.fireBlueVolume);

    // --- B. ATMOSPHERIC GLOW HALOS ---
    const auraCanvas = document.createElement('canvas');
    auraCanvas.width = 128;
    auraCanvas.height = 128;
    const aCtx = auraCanvas.getContext('2d');
    const aGrad = aCtx.createRadialGradient(64, 64, 2, 64, 64, 62);
    aGrad.addColorStop(0.0, 'rgba(255, 225, 120, 0.55)');
    aGrad.addColorStop(0.38, 'rgba(243, 112, 33, 0.28)');
    aGrad.addColorStop(0.72, 'rgba(243, 112, 33, 0.08)');
    aGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    aCtx.fillStyle = aGrad;
    aCtx.fillRect(0, 0, 128, 128);

    this.auraSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(auraCanvas),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    this.auraSprite.scale.set(9.4, 11.2, 1);
    this.auraSprite.position.set(0, 0.25, -0.5);
    this.flameGroup.add(this.auraSprite);

    const haloCanvas = document.createElement('canvas');
    haloCanvas.width = 128;
    haloCanvas.height = 128;
    const hCtx = haloCanvas.getContext('2d');
    const hGrad = hCtx.createRadialGradient(64, 64, 0, 64, 64, 60);
    hGrad.addColorStop(0.0, 'rgba(255, 255, 240, 0.90)');
    hGrad.addColorStop(0.3, 'rgba(255, 195, 60, 0.52)');
    hGrad.addColorStop(0.65, 'rgba(243, 112, 33, 0.16)');
    hGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    hCtx.fillStyle = hGrad;
    hCtx.fillRect(0, 0, 128, 128);

    this.haloSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(haloCanvas),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    this.haloSprite.scale.set(5.8, 3.8, 1);
    this.haloSprite.position.set(0, -3.35, 0.15);
    this.flameGroup.add(this.haloSprite);

    const blueCanvas = document.createElement('canvas');
    blueCanvas.width = 128;
    blueCanvas.height = 128;
    const bCtx = blueCanvas.getContext('2d');
    const bGrad = bCtx.createRadialGradient(64, 64, 0, 64, 64, 58);
    bGrad.addColorStop(0.0, 'rgba(224, 242, 254, 0.80)');
    bGrad.addColorStop(0.38, 'rgba(56, 189, 248, 0.48)');
    bGrad.addColorStop(0.72, 'rgba(29, 78, 216, 0.18)');
    bGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    bCtx.fillStyle = bGrad;
    bCtx.fillRect(0, 0, 128, 128);

    this.blueCoreSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(blueCanvas),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    this.blueCoreSprite.scale.set(4.0, 3.4, 1);
    this.blueCoreSprite.position.set(0.15, -2.55, 0.25);
    this.flameGroup.add(this.blueCoreSprite);

    // --- C. 100% PURE PROCEDURAL GLSL MULTI-DIRECTIONAL SILK FIRE PETALS ---
    // Arranged around 360 degrees so the flame dances in all directions with silky plasma ridges
    const vertexShader = `
      varying vec2 vUv;
      uniform float uTime;
      uniform float uPhase;
      uniform float uSwayAmp;

      void main() {
        vUv = uv;
        vec3 pos = position;

        // Pin base inside the golden torch cup (uv.y == 0 -> h == 0)
        float h = smoothstep(0.0, 0.98, uv.y);
        float hPow = pow(h, 1.35);

        // Multi-directional 3D vortex undulation
        float waveX = sin(uv.y * 4.5 - uTime * 3.1 + uPhase) * uSwayAmp * hPow
                    + cos(uv.y * 7.8 - uTime * 4.8 - uPhase) * (uSwayAmp * 0.35) * hPow;
        float waveZ = cos(uv.y * 4.2 - uTime * 2.8 + uPhase * 1.3) * (uSwayAmp * 0.65) * hPow;

        pos.x += waveX;
        pos.z += waveZ;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `;

    const fragmentShader = `
      varying vec2 vUv;
      uniform float uTime;
      uniform float uPhase;
      uniform float uColorMode;
      uniform float uOpacity;
      uniform float uBoost;

      vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                           -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy));
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod(i, 289.0);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
        m = m * m;
        m = m * m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      void main() {
        float h = vUv.y;
        if (h <= 0.005 || h >= 0.995) discard;

        float t = uTime * 2.5;

        // 1. Dynamic Weaving Spine: Alternates smoothly between left & right curves over time!
        float spineWave1 = sin(h * 5.0 - t * 1.2 + uPhase) * 0.14 * pow(h, 1.15);
        float spineWave2 = cos(h * 2.8 - t * 0.78 - uPhase * 0.8) * 0.10 * pow(h, 1.35);
        float spineNoise = snoise(vec2(h * 1.6 - t * 0.45, uPhase)) * 0.11 * pow(h, 1.2);
        float centerX = 0.5 + spineWave1 + spineWave2 + spineNoise;

        // 2. Natural Teardrop Plume Width Envelope
        float cupBase = smoothstep(0.0, 0.11, h);
        float tipTaper = pow(max(0.0, 1.0 - h), 0.76);
        float halfWidth = 0.34 * cupBase * tipTaper;

        float dist = abs(vUv.x - centerX) / max(halfWidth, 0.001);

        // 3. Multi-Octave Upward-Convecting Fire Turbulence (FBM)
        vec2 flowUv = vec2((vUv.x - centerX) * 3.6, h * 3.8 - t * 1.3);
        float n1 = snoise(flowUv + vec2(uPhase, 0.0));
        float n2 = snoise(flowUv * 2.15 + vec2(n1 * 0.45, -t * 0.65 + uPhase));
        float n3 = snoise(flowUv * 4.4 - vec2(n2 * 0.35, t * 1.15));
        float fbm = n1 * 0.52 + n2 * 0.33 + n3 * 0.15;

        // 4. Licking Flame Tongues on BOTH left and right sides
        float density = 1.0 - dist + fbm * (0.36 + 0.34 * h);
        float alpha = smoothstep(0.18, 0.74, density) * cupBase * smoothstep(1.0, 0.85, h);
        if (alpha < 0.005) discard;

        // 5. Silky Upward Plasma Ridges (Các dải lụa lửa cuộn lên tự nhiên)
        float streamWave = sin((vUv.x - centerX) * 24.0 + n1 * 2.6) * 0.5 + 0.5;
        float silkRidge = smoothstep(0.25, 0.90, streamWave) * smoothstep(0.22, 0.88, density);

        // 6. Blackbody Thermal Color Gradient
        vec3 outerCol;
        vec3 midCol;
        vec3 coreCol;

        if (uColorMode > 1.5) {
          // Sapphire-Blue & Cyan Gas Flame at the cup mouth
          outerCol = vec3(0.05, 0.28, 0.90);
          midCol   = vec3(0.18, 0.74, 1.0);
          coreCol  = vec3(0.92, 0.98, 1.0);
        } else {
          // Fiery FPT Orange -> Imperial Gold -> Incandescent White-Gold
          outerCol = vec3(0.95, 0.30, 0.04);
          midCol   = vec3(1.0, 0.76, 0.12);
          coreCol  = vec3(1.0, 0.98, 0.88);
        }

        float heat = clamp(density * 0.82 + silkRidge * 0.45, 0.0, 1.0);
        vec3 col = mix(outerCol, midCol, smoothstep(0.15, 0.56, heat));
        col = mix(col, coreCol, smoothstep(0.56, 0.94, heat));

        // Subtle blue-cyan thermal ionization at the very bottom near the cup lip
        if (uColorMode < 1.5) {
          float blueLip = smoothstep(0.24, 0.02, h) * smoothstep(0.35, 0.85, 1.0 - dist);
          col = mix(col, vec3(0.22, 0.74, 1.0), blueLip * 0.58);
        }

        float pulse = 1.05 + 0.22 * n1 + uBoost * 0.45;
        gl_FragColor = vec4(col * pulse, alpha * uOpacity);
      }
    `;

    const petalConfigs = [
      // Main multi-directional golden-orange fire petals arranged around Y-axis
      {
        width: 5.8,
        height: 8.6,
        yOffset: 0.35,
        rotY: 0.0,
        curveZ: 0.45,
        phase: 0.0,
        swayAmp: 0.22,
        colorMode: 0.0,
        opacity: 0.78
      },
      {
        width: 5.5,
        height: 8.3,
        yOffset: 0.25,
        rotY: 0.62,
        curveZ: 0.5,
        phase: 2.1,
        swayAmp: 0.24,
        colorMode: 0.0,
        opacity: 0.65
      },
      {
        width: 5.5,
        height: 8.3,
        yOffset: 0.25,
        rotY: -0.62,
        curveZ: -0.5,
        phase: 4.2,
        swayAmp: 0.24,
        colorMode: 0.0,
        opacity: 0.65
      },
      {
        width: 5.0,
        height: 7.8,
        yOffset: 0.1,
        rotY: 1.25,
        curveZ: 0.45,
        phase: 1.05,
        swayAmp: 0.22,
        colorMode: 0.0,
        opacity: 0.48
      },
      {
        width: 5.0,
        height: 7.8,
        yOffset: 0.1,
        rotY: -1.25,
        curveZ: -0.45,
        phase: 3.15,
        swayAmp: 0.22,
        colorMode: 0.0,
        opacity: 0.48
      },
      // Sapphire-Blue Knowledge Gas Flame Petals at the base inside the cup
      {
        width: 4.4,
        height: 4.2,
        yOffset: -1.8,
        rotY: 0.18,
        curveZ: 0.35,
        phase: 0.7,
        swayAmp: 0.14,
        colorMode: 2.0,
        opacity: 0.72
      },
      {
        width: 4.2,
        height: 4.0,
        yOffset: -1.85,
        rotY: -0.45,
        curveZ: -0.35,
        phase: 2.8,
        swayAmp: 0.14,
        colorMode: 2.0,
        opacity: 0.62
      }
    ];

    petalConfigs.forEach((cfg) => {
      const geo = new THREE.PlaneGeometry(cfg.width, cfg.height, 24, 52);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const px = pos.getX(i);
        const py = pos.getY(i);
        const normX = px / (cfg.width * 0.5);
        const normY = (py + cfg.height * 0.5) / cfg.height;
        const archZ =
          (1.0 - normX * normX) * cfg.curveZ * Math.sin(normY * Math.PI);
        pos.setZ(i, archZ);
      }
      geo.computeVertexNormals();

      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uPhase: { value: cfg.phase },
          uSwayAmp: { value: cfg.swayAmp },
          uColorMode: { value: cfg.colorMode },
          uOpacity: { value: cfg.opacity },
          uBoost: { value: 0.0 }
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(0, cfg.yOffset, 0);
      mesh.rotation.y = cfg.rotY;
      this.flameGroup.add(mesh);
      this.proceduralFlameMeshes.push(mesh);
    });

    // --- D. FINE ASCENDING 3D FIRE MICRO-EMBERS ---
    this.buildRisingFireEmbers();

    this.coreGroup.add(this.flameGroup);
  }

  /**
   * Builds fine, realistic glowing fire embers rising and swirling in 3D from the torch flame
   */
  buildRisingFireEmbers() {
    const count = this.isMobile ? 28 : 52;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const speeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      phases[i] = Math.random();
      speeds[i] = 0.22 + Math.random() * 0.26;
      this.setFireEmberPos(positions, i, phases[i], 0);
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 15);
    grad.addColorStop(0.0, '#ffffff');
    grad.addColorStop(0.35, '#fde047');
    grad.addColorStop(0.75, '#f37021');
    grad.addColorStop(1.0, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);

    const mat = new THREE.PointsMaterial({
      size: this.isMobile ? 0.14 : 0.17,
      map: new THREE.CanvasTexture(canvas),
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.fireEmbers = new THREE.Points(geo, mat);
    this.fireEmbers.userData = { phases, speeds, count };
    this.flameGroup.add(this.fireEmbers);
  }

  setFireEmberPos(positions, idx, t, time) {
    // Swirl upward in 360 degrees from the cup rim (y = -3.2) to above the flame tip (y = +4.8)
    const y = -3.2 + t * 8.0;
    const radius = (1.0 - t * 0.55) * 1.15 + Math.sin(t * 6.0 + idx) * 0.25;
    const angle = idx * 2.399 + time * 1.9 + t * 3.5;
    positions[idx * 3] = Math.cos(angle) * radius;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = Math.sin(angle) * radius;
  }

  /**
   * Builds the Royal Olympic Golden Torch, Spiral Laurel Sash, Open Book of Wisdom,
   * and Stepped Pedestal matching Image 2.
   */
  buildAltarBase() {
    const altarGroup = new THREE.Group();
    const segments = this.isMobile ? 28 : 40;

    const olympicGoldMat = new THREE.MeshStandardMaterial({
      color: 0xffd84d,
      roughness: 0.22,
      metalness: 0.85,
      emissive: 0x8a5200,
      emissiveIntensity: 0.45
    });

    const burnishedGoldMat = new THREE.MeshStandardMaterial({
      color: 0xe5a922,
      roughness: 0.28,
      metalness: 0.82,
      emissive: 0x6b3a00,
      emissiveIntensity: 0.38
    });

    const brightGoldHighlightMat = new THREE.MeshStandardMaterial({
      color: 0xfff099,
      roughness: 0.16,
      metalness: 0.88,
      emissive: 0xb87700,
      emissiveIntensity: 0.55
    });

    // --- A. ROYAL GOLDEN OLYMPIC TORCH (ĐÀI ĐUỐC VÀNG HOÀNG GIA) ---
    const torchGroup = new THREE.Group();

    const upperLipGeo = new THREE.TorusGeometry(2.05, 0.15, 14, segments);
    const upperLip = new THREE.Mesh(upperLipGeo, brightGoldHighlightMat);
    upperLip.rotation.x = Math.PI / 2;
    upperLip.position.y = -2.45;
    torchGroup.add(upperLip);

    const crownCollarGeo = new THREE.CylinderGeometry(
      2.05,
      1.78,
      0.38,
      segments
    );
    const crownCollar = new THREE.Mesh(crownCollarGeo, olympicGoldMat);
    crownCollar.position.y = -2.65;
    torchGroup.add(crownCollar);

    const secondLipGeo = new THREE.TorusGeometry(1.82, 0.11, 12, segments);
    const secondLip = new THREE.Mesh(secondLipGeo, brightGoldHighlightMat);
    secondLip.rotation.x = Math.PI / 2;
    secondLip.position.y = -2.85;
    torchGroup.add(secondLip);

    const cupGeo = new THREE.CylinderGeometry(1.75, 1.05, 1.55, segments);
    const cupMesh = new THREE.Mesh(cupGeo, burnishedGoldMat);
    cupMesh.position.y = -3.62;
    torchGroup.add(cupMesh);

    const ribCount = 14;
    for (let i = 0; i < ribCount; i++) {
      const angle = (i / ribCount) * Math.PI * 2;
      const ribGeo = new THREE.CylinderGeometry(0.075, 0.048, 1.48, 8);
      const rib = new THREE.Mesh(ribGeo, brightGoldHighlightMat);
      const midR = 1.41;
      rib.position.set(
        Math.cos(angle) * midR,
        -3.62,
        Math.sin(angle) * midR
      );
      rib.rotation.z = Math.cos(angle) * -0.27;
      rib.rotation.x = Math.sin(angle) * 0.27;
      torchGroup.add(rib);
    }

    const neckRingGeo = new THREE.TorusGeometry(1.08, 0.09, 12, segments);
    const neckRing = new THREE.Mesh(neckRingGeo, brightGoldHighlightMat);
    neckRing.rotation.x = Math.PI / 2;
    neckRing.position.y = -4.4;
    torchGroup.add(neckRing);

    const stemGeo = new THREE.CylinderGeometry(1.02, 0.56, 3.4, segments);
    const stemMesh = new THREE.Mesh(stemGeo, olympicGoldMat);
    stemMesh.position.y = -6.1;
    torchGroup.add(stemMesh);

    const stemFlutes = 10;
    for (let i = 0; i < stemFlutes; i++) {
      const angle = (i / stemFlutes) * Math.PI * 2;
      const fluteGeo = new THREE.CylinderGeometry(0.045, 0.028, 3.3, 6);
      const flute = new THREE.Mesh(fluteGeo, brightGoldHighlightMat);
      const r = 0.79;
      flute.position.set(Math.cos(angle) * r, -6.1, Math.sin(angle) * r);
      flute.rotation.z = Math.cos(angle) * -0.075;
      flute.rotation.x = Math.sin(angle) * 0.075;
      torchGroup.add(flute);
    }

    const sashGroup = this.buildLaurelSpiralSash();
    torchGroup.add(sashGroup);

    const emberGeo = new THREE.CircleGeometry(1.92, segments);
    const emberCanvas = document.createElement('canvas');
    emberCanvas.width = 64;
    emberCanvas.height = 64;
    const eCtx = emberCanvas.getContext('2d');
    const eGrad = eCtx.createRadialGradient(32, 32, 2, 32, 32, 31);
    eGrad.addColorStop(0.0, '#ffffff');
    eGrad.addColorStop(0.35, '#bae6fd');
    eGrad.addColorStop(0.7, '#fbbf24');
    eGrad.addColorStop(1.0, '#f37021');
    eCtx.fillStyle = eGrad;
    eCtx.fillRect(0, 0, 64, 64);

    this.emberMesh = new THREE.Mesh(
      emberGeo,
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(emberCanvas),
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending
      })
    );
    this.emberMesh.rotation.x = -Math.PI / 2;
    this.emberMesh.position.y = -2.42;
    torchGroup.add(this.emberMesh);

    altarGroup.add(torchGroup);

    // --- B. THE OPEN BOOK OF WISDOM ---
    const bookGroup = new THREE.Group();
    bookGroup.position.set(0, -7.75, 0.2);

    const bookPageCanvas = document.createElement('canvas');
    bookPageCanvas.width = 256;
    bookPageCanvas.height = 256;
    const bpCtx = bookPageCanvas.getContext('2d');
    const bpGrad = bpCtx.createLinearGradient(0, 0, 256, 0);
    bpGrad.addColorStop(0.0, '#fde68a');
    bpGrad.addColorStop(0.12, '#fffbeb');
    bpGrad.addColorStop(0.55, '#dbeafe');
    bpGrad.addColorStop(0.88, '#eff6ff');
    bpGrad.addColorStop(1.0, '#fbbf24');
    bpCtx.fillStyle = bpGrad;
    bpCtx.fillRect(0, 0, 256, 256);

    bpCtx.strokeStyle = '#ffd700';
    bpCtx.lineWidth = 10;
    bpCtx.strokeRect(4, 4, 248, 248);

    const bookPageTex = new THREE.CanvasTexture(bookPageCanvas);
    const bookPageMat = new THREE.MeshStandardMaterial({
      map: bookPageTex,
      color: 0xffffff,
      roughness: 0.28,
      metalness: 0.15,
      emissive: 0x3b4d7a,
      emissiveIntensity: 0.35,
      side: THREE.DoubleSide
    });

    const goldEdgePageMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      roughness: 0.22,
      metalness: 0.85,
      emissive: 0x996500,
      emissiveIntensity: 0.5
    });

    const fanAngles = [0.14, 0.26, 0.39, 0.53, 0.68, 0.84];
    fanAngles.forEach((angle, idx) => {
      const pageWidth = 3.55 - idx * 0.1;
      const pageDepth = 2.45;
      const pageThickness = 0.045;

      const leftGeo = new THREE.BoxGeometry(
        pageWidth,
        pageThickness,
        pageDepth,
        14,
        1,
        4
      );
      const lPos = leftGeo.attributes.position;
      for (let i = 0; i < lPos.count; i++) {
        const px = lPos.getX(i);
        const distFromSpine = pageWidth * 0.5 - px;
        const t = distFromSpine / pageWidth;
        const archY =
          Math.sin(t * Math.PI * 0.85) * 0.42 - Math.pow(t, 2.2) * 0.25;
        lPos.setX(i, -distFromSpine);
        lPos.setY(i, lPos.getY(i) + archY);
      }
      leftGeo.computeVertexNormals();

      const leftPage = new THREE.Mesh(leftGeo, [
        goldEdgePageMat,
        goldEdgePageMat,
        bookPageMat,
        bookPageMat,
        goldEdgePageMat,
        goldEdgePageMat
      ]);
      leftPage.rotation.z = -angle;
      leftPage.rotation.y = 0.08 - idx * 0.015;
      leftPage.position.set(-0.18, idx * 0.04, 0);
      bookGroup.add(leftPage);

      const rightGeo = new THREE.BoxGeometry(
        pageWidth,
        pageThickness,
        pageDepth,
        14,
        1,
        4
      );
      const rPos = rightGeo.attributes.position;
      for (let i = 0; i < rPos.count; i++) {
        const px = rPos.getX(i);
        const distFromSpine = px + pageWidth * 0.5;
        const t = distFromSpine / pageWidth;
        const archY =
          Math.sin(t * Math.PI * 0.85) * 0.42 - Math.pow(t, 2.2) * 0.25;
        rPos.setX(i, distFromSpine);
        rPos.setY(i, rPos.getY(i) + archY);
      }
      rightGeo.computeVertexNormals();

      const rightPage = new THREE.Mesh(rightGeo, [
        goldEdgePageMat,
        goldEdgePageMat,
        bookPageMat,
        bookPageMat,
        goldEdgePageMat,
        goldEdgePageMat
      ]);
      rightPage.rotation.z = angle;
      rightPage.rotation.y = -0.08 + idx * 0.015;
      rightPage.position.set(0.18, idx * 0.04, 0);
      bookGroup.add(rightPage);
    });

    const spineGeo = new THREE.CylinderGeometry(0.42, 0.42, 2.55, 16);
    const spineMesh = new THREE.Mesh(spineGeo, olympicGoldMat);
    spineMesh.rotation.x = Math.PI / 2;
    spineMesh.position.set(0, -0.08, 0);
    bookGroup.add(spineMesh);

    altarGroup.add(bookGroup);

    // --- C. STEPPED MONUMENTAL PEDESTAL ---
    const navyBlockMat = new THREE.MeshStandardMaterial({
      color: 0x0b1d42,
      roughness: 0.35,
      metalness: 0.65,
      emissive: 0x051026,
      emissiveIntensity: 0.4
    });

    const glowingGoldStripMat = new THREE.MeshBasicMaterial({
      color: 0xffd700
    });

    const step1Geo = new THREE.BoxGeometry(6.8, 0.68, 3.6);
    const step1 = new THREE.Mesh(step1Geo, navyBlockMat);
    step1.position.set(0, -8.35, 0.1);
    step1.rotation.y = -0.12;
    altarGroup.add(step1);

    const step1EdgeGeo = new THREE.BoxGeometry(6.86, 0.055, 3.66);
    const step1Edge = new THREE.Mesh(step1EdgeGeo, glowingGoldStripMat);
    step1Edge.position.set(0, -8.01, 0.1);
    step1Edge.rotation.y = -0.12;
    altarGroup.add(step1Edge);

    const step2Geo = new THREE.BoxGeometry(8.8, 0.85, 4.4);
    const step2 = new THREE.Mesh(step2Geo, navyBlockMat);
    step2.position.set(0, -9.12, 0.2);
    step2.rotation.y = -0.08;
    altarGroup.add(step2);

    const step2EdgeGeo = new THREE.BoxGeometry(8.86, 0.065, 4.46);
    const step2Edge = new THREE.Mesh(step2EdgeGeo, glowingGoldStripMat);
    step2Edge.position.set(0, -8.7, 0.2);
    step2Edge.rotation.y = -0.08;
    altarGroup.add(step2Edge);

    this.coreGroup.add(altarGroup);
  }

  /**
   * Builds the sculpted 3D Spiral Laurel Ribbon Sash wrapping diagonally around the torch stem
   */
  buildLaurelSpiralSash() {
    const sashGroup = new THREE.Group();

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const bgGrad = ctx.createLinearGradient(0, 0, 0, 128);
    bgGrad.addColorStop(0.0, '#fff3a8');
    bgGrad.addColorStop(0.15, '#d97706');
    bgGrad.addColorStop(0.5, '#ffd700');
    bgGrad.addColorStop(0.85, '#b45309');
    bgGrad.addColorStop(1.0, '#fff3a8');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 512, 128);

    ctx.fillStyle = '#fef08a';
    ctx.fillRect(0, 4, 512, 10);
    ctx.fillRect(0, 114, 512, 10);

    ctx.fillStyle = '#fffbeb';
    for (let x = 24; x < 496; x += 36) {
      ctx.beginPath();
      ctx.ellipse(x, 46, 14, 6, -0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x, 82, 14, 6, 0.42, 0, Math.PI * 2);
      ctx.fill();
    }

    const sashTex = new THREE.CanvasTexture(canvas);
    const sashMat = new THREE.MeshStandardMaterial({
      map: sashTex,
      color: 0xffdf66,
      roughness: 0.2,
      metalness: 0.85,
      emissive: 0x7a4900,
      emissiveIntensity: 0.45,
      side: THREE.DoubleSide
    });

    const turns = 1.15;
    const segsU = 48;
    const sashHeight = 0.62;
    const ribbonGeo = new THREE.PlaneGeometry(1, 1, segsU, 4);
    const pos = ribbonGeo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i) + 0.5;
      const v = pos.getY(i);

      const theta = -Math.PI * 0.85 + u * Math.PI * 2.0 * turns;
      const centerY = -5.95 + u * 2.15;
      const stemR = 0.72 + (centerY + 6.0) * 0.22 + 0.14;

      const wx = Math.cos(theta) * stemR;
      const wz = Math.sin(theta) * stemR;
      const wy = centerY + v * sashHeight;

      pos.setXYZ(i, wx, wy, wz);
    }
    ribbonGeo.computeVertexNormals();

    const sashMesh = new THREE.Mesh(ribbonGeo, sashMat);
    sashGroup.add(sashMesh);

    return sashGroup;
  }

  /**
   * 3D Shooting Star & Fading Comet Tail (Sao Băng Quay Xung Quanh)
   * + Luminous Floating Knowledge Pages gliding in its wake!
   */
  buildShootingStarOrbit() {
    this.orbitSystem = new THREE.Group();
    this.orbitSystem.position.set(0, -2.1, 0);
    this.orbitSystem.rotation.x = 0.44;
    this.orbitSystem.rotation.z = -0.26;

    this.mainComet = this.createShootingStarArc({
      orbitRadiusX: 5.5,
      orbitRadiusZ: 5.5,
      arcAngle: Math.PI * 0.72,
      headSize: 1.6,
      tailMaxRadius: 0.115
    });
    this.orbitSystem.add(this.mainComet.group);

    this.upperComet = this.createShootingStarArc({
      orbitRadiusX: 4.3,
      orbitRadiusZ: 4.3,
      arcAngle: Math.PI * 0.58,
      headSize: 1.05,
      tailMaxRadius: 0.068
    });
    this.upperComet.group.position.set(0, 3.6, -0.4);
    this.upperComet.group.rotation.z = 0.12;
    this.orbitSystem.add(this.upperComet.group);

    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = 128;
    pageCanvas.height = 160;
    const pCtx = pageCanvas.getContext('2d');

    const pGrad = pCtx.createLinearGradient(0, 0, 128, 160);
    pGrad.addColorStop(0.0, 'rgba(255, 253, 235, 0.96)');
    pGrad.addColorStop(0.6, 'rgba(254, 240, 138, 0.92)');
    pGrad.addColorStop(1.0, 'rgba(251, 191, 36, 0.88)');
    pCtx.fillStyle = pGrad;
    pCtx.fillRect(6, 6, 116, 148);

    pCtx.strokeStyle = '#ffffff';
    pCtx.lineWidth = 3;
    pCtx.strokeRect(6, 6, 116, 148);

    pCtx.fillStyle = 'rgba(180, 110, 20, 0.55)';
    for (let y = 26; y <= 132; y += 13) {
      const len = 64 + ((y * 7) % 28);
      pCtx.fillRect(20, y, len, 4);
    }

    const pageTex = new THREE.CanvasTexture(pageCanvas);
    const pageMat = new THREE.MeshBasicMaterial({
      map: pageTex,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide
    });

    const pageCount = 3;
    this.flyingPages = [];
    for (let i = 0; i < pageCount; i++) {
      const pageGeo = new THREE.PlaneGeometry(0.95, 1.22, 8, 8);
      const pos = pageGeo.attributes.position;
      for (let k = 0; k < pos.count; k++) {
        const px = pos.getX(k);
        const py = pos.getY(k);
        pos.setZ(k, Math.sin(px * 2.5 + py * 1.8) * 0.14);
      }
      pageGeo.computeVertexNormals();

      const pageMesh = new THREE.Mesh(pageGeo, pageMat);
      pageMesh.userData = {
        angleOffset: -0.35 - i * 0.85,
        radiusX: 5.5 + (i % 2 === 0 ? 0.35 : -0.3),
        radiusZ: 5.5 + (i % 2 === 0 ? 0.35 : -0.3),
        yOffset: (i - 1) * 0.55,
        flutterPhase: i * 2.1
      };
      this.orbitSystem.add(pageMesh);
      this.flyingPages.push(pageMesh);
    }

    this.scene.add(this.orbitSystem);
  }

  /**
   * Helper: Creates a 3D Shooting Star with a blazing 4-point starburst head and a
   * tapering, alpha-fading golden comet tail along an orbital arc.
   */
  createShootingStarArc({
    orbitRadiusX,
    orbitRadiusZ,
    arcAngle,
    headSize,
    tailMaxRadius
  }) {
    const group = new THREE.Group();
    const segments = this.isMobile ? 44 : 64;

    const curvePoints = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = -t * arcAngle;
      const x = Math.cos(angle) * orbitRadiusX;
      const z = Math.sin(angle) * orbitRadiusZ;
      const y = Math.sin(angle * 2.0) * 0.28;
      curvePoints.push(new THREE.Vector3(x, y, z));
    }

    const curve = new THREE.CatmullRomCurve3(curvePoints);

    const radialSegs = 8;
    const tubeGeo = new THREE.TubeGeometry(
      curve,
      segments,
      tailMaxRadius,
      radialSegs,
      false
    );
    const pos = tubeGeo.attributes.position;
    const uvs = tubeGeo.attributes.uv;

    const centerPoint = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      const u = uvs.getX(i);
      curve.getPointAt(u, centerPoint);
      const taper = Math.pow(1.0 - u, 0.75);
      const vx = centerPoint.x + (pos.getX(i) - centerPoint.x) * taper;
      const vy = centerPoint.y + (pos.getY(i) - centerPoint.y) * taper;
      const vz = centerPoint.z + (pos.getZ(i) - centerPoint.z) * taper;
      pos.setXYZ(i, vx, vy, vz);
    }
    tubeGeo.computeVertexNormals();

    const tailMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        void main() {
          float fade = pow(1.0 - vUv.x, 1.85);
          vec3 headColor = vec3(1.0, 0.98, 0.88);
          vec3 midColor = vec3(1.0, 0.82, 0.22);
          vec3 tailColor = vec3(0.95, 0.44, 0.13);

          vec3 col = mix(headColor, midColor, smoothstep(0.0, 0.35, vUv.x));
          col = mix(col, tailColor, smoothstep(0.35, 1.0, vUv.x));

          gl_FragColor = vec4(col, fade * 0.95);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const tailMesh = new THREE.Mesh(tubeGeo, tailMat);
    group.add(tailMesh);

    const glowGeo = new THREE.TubeGeometry(
      curve,
      segments,
      tailMaxRadius * 2.8,
      6,
      false
    );
    const gPos = glowGeo.attributes.position;
    const gUvs = glowGeo.attributes.uv;
    for (let i = 0; i < gPos.count; i++) {
      const u = gUvs.getX(i);
      curve.getPointAt(u, centerPoint);
      const taper = Math.pow(1.0 - u, 0.9);
      gPos.setXYZ(
        i,
        centerPoint.x + (gPos.getX(i) - centerPoint.x) * taper,
        centerPoint.y + (gPos.getY(i) - centerPoint.y) * taper,
        centerPoint.z + (gPos.getZ(i) - centerPoint.z) * taper
      );
    }

    const glowMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        void main() {
          float fade = pow(1.0 - vUv.x, 2.2);
          vec3 col = mix(vec3(1.0, 0.88, 0.4), vec3(0.95, 0.44, 0.13), vUv.x);
          gl_FragColor = vec4(col, fade * 0.38);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    group.add(glowMesh);

    const starHeadTex = this.createStarburstTexture();
    const headSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: starHeadTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    headSprite.scale.set(headSize, headSize, 1);
    headSprite.position.copy(curvePoints[0]);
    group.add(headSprite);

    return { group, headSprite, orbitRadiusX, orbitRadiusZ };
  }

  /**
   * Draws a dazzling 4-pointed diamond shooting star flare texture
   */
  createStarburstTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const rad = ctx.createRadialGradient(64, 64, 0, 64, 64, 60);
    rad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    rad.addColorStop(0.2, 'rgba(255, 240, 150, 0.85)');
    rad.addColorStop(0.5, 'rgba(255, 180, 30, 0.35)');
    rad.addColorStop(1.0, 'rgba(243, 112, 33, 0.0)');
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, 128, 128);

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(64, 2);
    ctx.quadraticCurveTo(64, 64, 126, 64);
    ctx.quadraticCurveTo(64, 64, 64, 126);
    ctx.quadraticCurveTo(64, 64, 2, 64);
    ctx.quadraticCurveTo(64, 64, 64, 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 250, 210, 0.8)';
    ctx.beginPath();
    ctx.moveTo(24, 24);
    ctx.quadraticCurveTo(64, 64, 104, 24);
    ctx.quadraticCurveTo(64, 64, 104, 104);
    ctx.quadraticCurveTo(64, 64, 24, 104);
    ctx.quadraticCurveTo(64, 64, 24, 24);
    ctx.closePath();
    ctx.fill();

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Delicate Sparkling Stardust Particles trailing along the Shooting Star
   */
  buildStardustWake() {
    const count = this.isMobile ? 36 : 68;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const angles = new Float32Array(count);
    const speeds = new Float32Array(count);
    const offsets = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      angles[i] = Math.random() * Math.PI * 2;
      speeds[i] = 0.35 + Math.random() * 0.45;
      offsets[i * 3] = (Math.random() - 0.5) * 0.85;
      offsets[i * 3 + 1] = (Math.random() - 0.5) * 0.85;
      offsets[i * 3 + 2] = (Math.random() - 0.5) * 0.85;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 15);
    grad.addColorStop(0.0, '#ffffff');
    grad.addColorStop(0.3, '#fef08a');
    grad.addColorStop(0.7, 'rgba(251, 191, 36, 0.35)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);

    const material = new THREE.PointsMaterial({
      size: this.isMobile ? 0.22 : 0.26,
      map: new THREE.CanvasTexture(canvas),
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.sparks = new THREE.Points(geometry, material);
    this.sparks.userData = { angles, speeds, offsets, count };
    this.orbitSystem.add(this.sparks);
  }

  /**
   * Background celestial starfield
   */
  buildStarfield() {
    const count = this.isMobile ? 140 : 420;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 65;
      positions[i + 1] = (Math.random() - 0.5) * 65;
      positions[i + 2] = -10 - Math.random() * 35;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      size: 0.11,
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.55,
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
      this.mouse.targetX =
        (e.touches[0].clientX / window.innerWidth - 0.5) * 1.5;
      this.mouse.targetY =
        (e.touches[0].clientY / window.innerHeight - 0.5) * 1.5;
    }
  }

  onWindowResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.isMobile =
      width < 768 ||
      /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
    this.camera.position.set(
      0,
      this.isMobile ? -1.3 : -1.0,
      this.isMobile ? 16.8 : 17.4
    );
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    const pixelRatio = this.isMobile
      ? 1.0
      : Math.min(window.devicePixelRatio, 1.75);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height);
  }

  /**
   * Reacts dynamically when the user types in the tribute form
   */
  setTyping(isTyping) {
    this.isTyping = isTyping;
    if (this.fireOuterVolume) {
      this.fireOuterVolume.magnitude = isTyping ? 1.95 : 1.55;
    }
    if (this.fireInnerVolume) {
      this.fireInnerVolume.magnitude = isTyping ? 2.15 : 1.75;
    }
    if (this.fireBlueVolume) {
      this.fireBlueVolume.magnitude = isTyping ? 1.85 : 1.45;
    }
  }

  /**
   * Celebratory "Thắp Lửa" burst when a tribute is submitted
   */
  triggerIgnite(onComplete) {
    if (this.isIgniting) return;
    this.isIgniting = true;

    if (this.fireOuterVolume) this.fireOuterVolume.magnitude = 2.6;
    if (this.fireInnerVolume) this.fireInnerVolume.magnitude = 2.9;
    if (this.fireBlueVolume) this.fireBlueVolume.magnitude = 2.4;

    const burstCount = this.isMobile ? 120 : 320;
    const burstGeo = new THREE.BufferGeometry();
    const burstPositions = new Float32Array(burstCount * 3);
    const burstVelocities = new Float32Array(burstCount * 3);

    for (let i = 0; i < burstCount; i++) {
      burstPositions[i * 3] = (Math.random() - 0.5) * 1.5;
      burstPositions[i * 3 + 1] = -2.2 + Math.random() * 2.0;
      burstPositions[i * 3 + 2] = (Math.random() - 0.5) * 1.5;

      const phi = Math.random() * Math.PI * 0.42;
      const theta = Math.random() * Math.PI * 2;
      const speed = 0.18 + Math.random() * 0.38;

      burstVelocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      burstVelocities[i * 3 + 1] = Math.cos(phi) * speed * 1.65 + 0.15;
      burstVelocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;
    }

    burstGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(burstPositions, 3)
    );

    const burstMat = new THREE.PointsMaterial({
      size: 0.42,
      color: 0xffe066,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const burstMesh = new THREE.Points(burstGeo, burstMat);
    this.scene.add(burstMesh);

    let progress = 0;
    const igniteInterval = setInterval(() => {
      progress += 0.03;
      this.igniteBoost = Math.sin(progress * Math.PI);

      const pos = burstGeo.attributes.position.array;
      for (let i = 0; i < burstCount; i++) {
        pos[i * 3] += burstVelocities[i * 3];
        pos[i * 3 + 1] += burstVelocities[i * 3 + 1];
        pos[i * 3 + 2] += burstVelocities[i * 3 + 2];
        burstVelocities[i * 3 + 1] += 0.004;
      }
      burstGeo.attributes.position.needsUpdate = true;
      burstMat.opacity = Math.max(0, 1 - progress);

      if (this.pointLight) {
        this.pointLight.intensity = 4.6 + this.igniteBoost * 12.0;
      }
      if (this.flameGroup) {
        const s = 1.0 + this.igniteBoost * 0.22;
        this.flameGroup.scale.set(s, s, s);
      }

      if (progress >= 1.0) {
        clearInterval(igniteInterval);
        this.scene.remove(burstMesh);
        burstGeo.dispose();
        burstMat.dispose();
        this.isIgniting = false;
        this.igniteBoost = 0;
        if (this.fireOuterVolume) {
          this.fireOuterVolume.magnitude = this.isTyping ? 1.95 : 1.55;
        }
        if (this.fireInnerVolume) {
          this.fireInnerVolume.magnitude = this.isTyping ? 2.15 : 1.75;
        }
        if (this.fireBlueVolume) {
          this.fireBlueVolume.magnitude = this.isTyping ? 1.85 : 1.45;
        }
        if (this.pointLight) this.pointLight.intensity = 4.6;
        if (this.flameGroup) this.flameGroup.scale.set(1, 1, 1);
        if (onComplete) onComplete();
      }
    }, 16);
  }

  animate() {
    if (this.isPaused) return;
    requestAnimationFrame(this.animate);

    const now = performance.now();
    const rawDelta = this.lastFrameTime
      ? (now - this.lastFrameTime) * 0.001
      : 0.016;
    this.lastFrameTime = now;
    const delta = Math.min(rawDelta, 0.05);
    this.elapsedTime = (this.elapsedTime || 0) + delta;
    const time = this.elapsedTime;

    // Smooth mouse parallax lerp
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.05;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.05;

    // Gentle 3D sway of the Torch & Book
    if (this.coreGroup) {
      this.coreGroup.rotation.y =
        Math.sin(time * 0.45) * 0.16 + this.mouse.x * 0.32;
      this.coreGroup.rotation.x =
        Math.sin(time * 0.35) * 0.03 - this.mouse.y * 0.12;
      this.coreGroup.rotation.z =
        Math.cos(time * 0.4) * 0.015 - this.mouse.x * 0.05;
    }

    // 1. Update 3-Layer 3D Volumetric Raymarched Fire & Multi-Directional GLSL Petals
    const speedMult = this.isTyping ? 1.45 : 1.0;
    if (this.fireOuterVolume) {
      this.fireOuterVolume.update(time * 1.05 * speedMult);
    }
    if (this.fireInnerVolume) {
      this.fireInnerVolume.update(time * 1.3 * speedMult);
    }
    if (this.fireBlueVolume) {
      this.fireBlueVolume.update(time * 1.55 * speedMult);
    }

    for (let i = 0; i < this.proceduralFlameMeshes.length; i++) {
      const mesh = this.proceduralFlameMeshes[i];
      mesh.material.uniforms.uTime.value = time * speedMult;
      mesh.material.uniforms.uBoost.value =
        this.igniteBoost + (this.isTyping ? 0.25 : 0.0);
    }

    // Animate Rising 3D Fire Micro-Embers
    if (this.fireEmbers) {
      const ePos = this.fireEmbers.geometry.attributes.position.array;
      const { phases, speeds, count } = this.fireEmbers.userData;
      for (let i = 0; i < count; i++) {
        phases[i] += delta * speeds[i] * speedMult;
        if (phases[i] > 1.0) phases[i] -= 1.0;
        this.setFireEmberPos(ePos, i, phases[i], time);
      }
      this.fireEmbers.geometry.attributes.position.needsUpdate = true;
    }

    // Pulse Blue Knowledge Core & Golden Aura
    if (this.blueCoreSprite) {
      const bluePulse = 1.0 + Math.sin(time * 4.5) * 0.09;
      this.blueCoreSprite.scale.set(4.0 * bluePulse, 3.4 * bluePulse, 1);
    }
    if (this.auraSprite) {
      this.auraSprite.material.opacity = 0.82 + Math.sin(time * 2.8) * 0.15;
    }

    // 2. Animate Shooting Stars & Fading Comet Trails
    const orbitSpeed = this.isTyping ? 1.35 : 0.95;
    const mainAngle = time * orbitSpeed;

    if (this.mainComet) {
      this.mainComet.group.rotation.y = -mainAngle;
      const flareScale = 1.45 + Math.sin(time * 9.0) * 0.25;
      this.mainComet.headSprite.scale.set(flareScale, flareScale, 1);
    }

    if (this.upperComet) {
      this.upperComet.group.rotation.y = -time * (orbitSpeed * 0.78) - 2.2;
      const upperFlare = 1.0 + Math.cos(time * 8.0) * 0.18;
      this.upperComet.headSprite.scale.set(upperFlare, upperFlare, 1);
    }

    // 3. Animate Luminous Floating Knowledge Pages
    for (let i = 0; i < this.flyingPages.length; i++) {
      const page = this.flyingPages[i];
      const { angleOffset, radiusX, radiusZ, yOffset, flutterPhase } =
        page.userData;
      const a = mainAngle * 0.55 + angleOffset;

      page.position.set(
        Math.cos(a) * radiusX,
        yOffset + Math.sin(time * 2.2 + flutterPhase) * 0.28,
        Math.sin(a) * radiusZ
      );

      page.rotation.x = 0.35 + Math.sin(time * 2.8 + flutterPhase) * 0.22;
      page.rotation.y = -a + Math.PI * 0.5;
      page.rotation.z = Math.cos(time * 2.4 + flutterPhase) * 0.18;
    }

    // 4. Animate Sparkling Stardust Wake trailing behind the Shooting Star
    if (this.sparks) {
      const positions = this.sparks.geometry.attributes.position.array;
      const { angles, speeds, offsets, count } = this.sparks.userData;

      for (let i = 0; i < count; i++) {
        const trailArc = (i / count) * Math.PI * 0.85;
        const a =
          mainAngle -
          trailArc +
          Math.sin(time * speeds[i] + angles[i]) * 0.08;
        positions[i * 3] = Math.cos(a) * 5.5 + offsets[i * 3];
        positions[i * 3 + 1] =
          Math.sin(a * 2.0) * 0.28 +
          offsets[i * 3 + 1] +
          Math.sin(time * 2.5 + i) * 0.15;
        positions[i * 3 + 2] = Math.sin(a) * 5.5 + offsets[i * 3 + 2];
      }
      this.sparks.geometry.attributes.position.needsUpdate = true;
    }

    // 5. Warm Flame Light Flicker
    if (this.pointLight && !this.isIgniting) {
      const flicker =
        Math.sin(time * 14.0) * 0.35 + Math.cos(time * 23.0) * 0.22;
      this.pointLight.intensity = (this.isTyping ? 5.5 : 4.6) + flicker;
    }

    // 6. Slow Celestial Starfield Drift
    if (this.stars) {
      this.stars.rotation.y = time * 0.01;
    }

    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('touchmove', this.onTouchMove);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);

    if (this.fireOuterVolume) this.fireOuterVolume.dispose();
    if (this.fireInnerVolume) this.fireInnerVolume.dispose();
    if (this.fireBlueVolume) this.fireBlueVolume.dispose();

    this.proceduralFlameMeshes.forEach((mesh) => {
      mesh.material.dispose();
      mesh.geometry.dispose();
    });

    if (this.renderer && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
