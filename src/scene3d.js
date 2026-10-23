import * as THREE from 'three';
import { FireMesh } from '@wolffo/three-fire/vanilla';

/**
 * Three.js 3D Interactive Scene:
 * "Ngọn Lửa Tri Ân - FPT Telecom 20/11 (30 Năm Tiếp Lửa)"
 *
 * Combines the iconic Key Visual S-Curve design with realistic living fire physics:
 * 1. Hybrid 3D Volumetric Core + GLSL Simplex FBM Domain-Warped S-Curve Fire Shader:
 *    - Real upward-flowing thermal convection & licking flame tongues along the S-curve
 *    - Dynamic edge erosion & blackbody temperature color ramp (White-Hot -> Imperial Gold -> Fiery Orange)
 *    - Living Sapphire-Blue Knowledge Gas Flame flickering at the torch rim
 *    - Fine ascending micro-embers rising from the licking tips
 * 2. Royal Golden Olympic Torch with fluted ribs and 3D Spiral Laurel Ribbon Sash.
 * 3. Open Book of Wisdom Base with dramatic fanning illuminated pages & stepped pedestal.
 * 4. 3D Shooting Star (Sao Băng Tri Thức) with blazing starburst head, tapering fading
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

    // Core 3D Groups & Flame Layers
    this.coreGroup = null;
    this.flameGroup = null;
    this.flameLayers = [];
    this.volumetricCore = null;
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

    // 2. Camera: Framed so the entire Torch, Open Book, Flame, and Shooting Star are visible
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
    this.renderer.toneMappingExposure = 1.22;
    this.container.appendChild(this.renderer.domElement);

    // 4. Procedural Studio Gold Environment Map (Ensures metallic gold shines brilliantly)
    this.scene.environment = this.createStudioEnvMap();

    // 5. Lights
    this.ambientLight = new THREE.AmbientLight(0x162c5a, 2.2);
    this.scene.add(this.ambientLight);

    // Warm Golden-Orange Flame Light
    this.pointLight = new THREE.PointLight(
      0xff9922,
      4.5,
      this.isMobile ? 38 : 48
    );
    this.pointLight.position.set(0, 0.5, 2.8);
    this.scene.add(this.pointLight);

    // Torch & Book Front Key Light
    this.secondaryLight = new THREE.PointLight(
      0xffdf77,
      3.6,
      this.isMobile ? 32 : 42
    );
    this.secondaryLight.position.set(1.5, -4.2, 5.5);
    this.scene.add(this.secondaryLight);

    // Sapphire Blue Rim Light
    this.blueLight = new THREE.PointLight(0x38bdf8, 2.4, 22);
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
   * Generates a warm gold & royal blue studio reflection map so metallic gold surfaces
   * gleam like polished Olympic gold instead of reflecting black sky.
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
   * Builds the central group: Realistic Key Visual Flame + Golden Torch + Open Book Base
   */
  buildCore() {
    this.coreGroup = new THREE.Group();

    // 1. Realistic Living S-Curve Flame (Kết hợp hình dáng Key Visual & Vật lý lửa thật)
    this.buildStylizedFlame();

    // 2. Olympic Golden Torch & Open Book of Wisdom Base
    this.buildAltarBase();

    this.scene.add(this.coreGroup);
  }

  /**
   * Builds the realistic living S-Curve Flame:
   * - True 3D Volumetric Fire Core inside the cup (`FireMesh`)
   * - Multi-layered 3D Curved Shells driven by a real-time GLSL Simplex FBM Fire Shader
   *   that advects upward thermal currents, erodes licking flame tips, and renders
   *   dynamic blackbody plasma streams (Sapphire-Blue base + Imperial Gold & Fiery Orange body)
   * - Fine ascending fire micro-embers rising from the flame tongues
   */
  buildStylizedFlame() {
    this.flameGroup = new THREE.Group();
    this.flameGroup.position.set(0, 0.95, 0);
    this.flameLayers = [];

    // A. Inner 3D Raymarched Volumetric Fire Core (Gives genuine 3D depth inside the cup)
    const textureLoader = new THREE.TextureLoader();
    const fireTex = textureLoader.load('/assets/Fire.png', (tex) => {
      tex.needsUpdate = true;
    });

    this.volumetricCore = new FireMesh({
      fireTex: fireTex,
      color: 0xffaa22,
      magnitude: 1.65,
      lacunarity: 2.1,
      gain: 0.5,
      iterations: this.isMobile ? 14 : 18,
      octaves: 3,
      noiseScale: [1.3, 2.9, 1.3, 0.42]
    });
    this.volumetricCore.scale.set(3.4, 8.2, 3.4);
    this.volumetricCore.position.set(0.05, -0.35, 0.0);
    this.volumetricCore.material.blending = THREE.AdditiveBlending;
    this.flameGroup.add(this.volumetricCore);

    // B. Atmospheric Backglow Sprites
    // 1. Warm Golden-Orange Halo behind the flame body
    const auraCanvas = document.createElement('canvas');
    auraCanvas.width = 128;
    auraCanvas.height = 128;
    const aCtx = auraCanvas.getContext('2d');
    const aGrad = aCtx.createRadialGradient(64, 64, 2, 64, 64, 62);
    aGrad.addColorStop(0.0, 'rgba(255, 220, 110, 0.55)');
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
    this.auraSprite.scale.set(9.2, 10.8, 1);
    this.auraSprite.position.set(0.0, 0.1, -0.55);
    this.flameGroup.add(this.auraSprite);

    // 2. Intense Cup Rim Glow at the base of the flame
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

    // 3. Sapphire-Blue Knowledge Core Glow Sprite (Right above the cup rim)
    const blueCanvas = document.createElement('canvas');
    blueCanvas.width = 128;
    blueCanvas.height = 128;
    const bCtx = blueCanvas.getContext('2d');
    const bGrad = bCtx.createRadialGradient(64, 64, 0, 64, 64, 58);
    bGrad.addColorStop(0.0, 'rgba(224, 242, 254, 0.82)');
    bGrad.addColorStop(0.35, 'rgba(56, 189, 248, 0.52)');
    bGrad.addColorStop(0.7, 'rgba(29, 78, 216, 0.20)');
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
    this.blueCoreSprite.scale.set(3.6, 3.4, 1);
    this.blueCoreSprite.position.set(0.38, -2.35, 0.25);
    this.flameGroup.add(this.blueCoreSprite);

    // C. Soft-Feathered Density & Color Field Maps for the GLSL Simplex Fire Shader
    const mainBodyTex = this.createMainFlameBodyTexture();
    const goldRidgesTex = this.createGoldRidgesTexture();
    const blueCoreTex = this.createBlueCoreFlameTexture();

    const layerConfigs = [
      {
        tex: mainBodyTex,
        width: 6.5,
        height: 8.7,
        zOffset: -0.1,
        rotY: 0.0,
        curveZ: 0.42,
        phase: 0.0,
        swayAmp: 0.18,
        warpScale: 1.0,
        flowSpeed: 2.8,
        isBlue: 0.0,
        blending: THREE.NormalBlending,
        opacity: 0.96
      },
      {
        tex: mainBodyTex,
        width: 6.0,
        height: 8.5,
        zOffset: -0.02,
        rotY: 0.44,
        curveZ: 0.5,
        phase: 1.7,
        swayAmp: 0.2,
        warpScale: 1.15,
        flowSpeed: 3.1,
        isBlue: 0.0,
        blending: THREE.AdditiveBlending,
        opacity: 0.62
      },
      {
        tex: mainBodyTex,
        width: 6.0,
        height: 8.5,
        zOffset: -0.02,
        rotY: -0.44,
        curveZ: -0.5,
        phase: 3.4,
        swayAmp: 0.2,
        warpScale: 1.15,
        flowSpeed: 2.9,
        isBlue: 0.0,
        blending: THREE.AdditiveBlending,
        opacity: 0.52
      },
      {
        tex: goldRidgesTex,
        width: 6.4,
        height: 8.6,
        zOffset: 0.08,
        rotY: 0.0,
        curveZ: 0.3,
        phase: 0.8,
        swayAmp: 0.2,
        warpScale: 1.25,
        flowSpeed: 3.4,
        isBlue: 0.0,
        blending: THREE.AdditiveBlending,
        opacity: 0.92
      },
      {
        tex: blueCoreTex,
        width: 6.2,
        height: 8.5,
        zOffset: 0.22,
        rotY: 0.0,
        curveZ: 0.24,
        phase: 2.1,
        swayAmp: 0.12,
        warpScale: 0.95,
        flowSpeed: 3.6,
        isBlue: 1.0,
        blending: THREE.AdditiveBlending,
        opacity: 0.98
      }
    ];

    // GLSL 2D Simplex Noise + Upward FBM Convection & Blackbody Plasma Shader
    const vertexShader = `
      varying vec2 vUv;
      uniform float uTime;
      uniform float uPhase;
      uniform float uSwayAmp;

      void main() {
        vUv = uv;
        vec3 pos = position;

        // Pin base inside the golden torch cup (uv.y == 0 -> h == 0)
        float h = smoothstep(0.02, 0.98, uv.y);
        float hPow = pow(h, 1.4);

        // Organic thermal updraft sway
        float wave1 = sin(uv.y * 4.8 - uTime * 3.2 + uPhase) * uSwayAmp * hPow;
        float wave2 = cos(uv.y * 8.2 - uTime * 5.1 + uPhase * 1.3) * (uSwayAmp * 0.35) * hPow;
        float waveZ = sin(uv.y * 4.2 - uTime * 2.7 + uPhase) * (uSwayAmp * 0.5) * hPow;

        pos.x += wave1 + wave2;
        pos.z += waveZ;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `;

    const fragmentShader = `
      varying vec2 vUv;
      uniform sampler2D uMap;
      uniform float uTime;
      uniform float uPhase;
      uniform float uWarpScale;
      uniform float uFlowSpeed;
      uniform float uIsBlue;
      uniform float uOpacity;
      uniform float uBoost;

      // Fast 2D Simplex Noise (Ashima Arts)
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
        float h = clamp(vUv.y, 0.0, 1.0);
        // Keep base anchored inside cup, increase fire turbulence toward upper body & tips
        float warpMask = smoothstep(0.03, 0.85, h);

        // 3-Octave Upward-Scrolling Fire Convection (FBM)
        float t = uTime * uFlowSpeed;
        float n1 = snoise(vec2(vUv.x * 3.4, vUv.y * 3.8 - t * 0.85 + uPhase));
        float n2 = snoise(vec2(vUv.x * 7.2 + n1 * 0.42, vUv.y * 7.8 - t * 1.45 + uPhase * 1.7));
        float n3 = snoise(vec2(vUv.x * 14.5 - n2 * 0.3, vUv.y * 15.0 - t * 2.2));
        float fbm = n1 * 0.52 + n2 * 0.33 + n3 * 0.15;

        // Domain-warp UV coordinates so real flame tongues lick upward along the S-curve!
        vec2 warpedUv = vUv;
        warpedUv.x += fbm * 0.068 * warpMask * uWarpScale;
        warpedUv.y += (n1 * 0.042 + n2 * 0.024) * warpMask * uWarpScale;

        vec4 texSample = texture2D(uMap, clamp(warpedUv, 0.002, 0.998));
        float baseDensity = texSample.a;
        if (baseDensity < 0.005) discard;

        // Dynamic fire edge erosion: creates living licking wisps & soft plasma falloff
        float erosionNoise = fbm * 0.5 + 0.5;
        float erodedDensity = baseDensity + (erosionNoise - 0.46) * 0.42 * warpMask;
        float finalAlpha = smoothstep(0.08, 0.58, erodedDensity) * baseDensity;
        if (finalAlpha < 0.005) discard;

        // Upward-streaming incandescent plasma filaments inside the flame
        float streamNoise = snoise(vec2(warpedUv.x * 8.5 + n1 * 0.55, warpedUv.y * 5.5 - t * 1.3 + uPhase));
        float filament = smoothstep(0.05, 0.82, streamNoise * 0.5 + 0.5) * smoothstep(0.25, 0.9, baseDensity);

        vec3 col = texSample.rgb;

        // Blackbody thermal color modulation:
        // White-hot / cyan-white core filaments + rich fiery orange / deep sapphire outer rim
        vec3 coreGlow = uIsBlue > 0.5 ? vec3(0.88, 0.97, 1.0) : vec3(1.0, 0.97, 0.82);
        vec3 outerRim = uIsBlue > 0.5 ? vec3(0.06, 0.42, 0.96) : vec3(0.96, 0.26, 0.03);

        float rimFactor = smoothstep(0.72, 0.12, erodedDensity);
        col = mix(col, outerRim, rimFactor * 0.45);
        col = mix(col, coreGlow, filament * 0.52);

        // Living thermal flicker
        float flicker = 1.0 + 0.22 * fbm + uBoost * 0.4;
        gl_FragColor = vec4(col * flicker, finalAlpha * uOpacity);
      }
    `;

    layerConfigs.forEach((cfg) => {
      const geo = new THREE.PlaneGeometry(cfg.width, cfg.height, 28, 56);
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
          uMap: { value: cfg.tex },
          uTime: { value: 0 },
          uPhase: { value: cfg.phase },
          uSwayAmp: { value: cfg.swayAmp },
          uWarpScale: { value: cfg.warpScale },
          uFlowSpeed: { value: cfg.flowSpeed },
          uIsBlue: { value: cfg.isBlue },
          uOpacity: { value: cfg.opacity },
          uBoost: { value: 0.0 }
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        blending: cfg.blending,
        depthWrite: false,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(0, 0.25, cfg.zOffset);
      mesh.rotation.y = cfg.rotY;
      this.flameGroup.add(mesh);
      this.flameLayers.push(mesh);
    });

    // D. Fine Ascending Fire Micro-Embers (Tàn lửa li ti bay lên từ ngọn lửa thật)
    this.buildRisingFireEmbers();

    this.coreGroup.add(this.flameGroup);
  }

  /**
   * Builds fine, realistic glowing fire embers rising directly along the S-curve flame
   */
  buildRisingFireEmbers() {
    const count = this.isMobile ? 24 : 44;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const speeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      phases[i] = Math.random();
      speeds[i] = 0.22 + Math.random() * 0.25;
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
    // Follow the S-curve spine of the flame from cup rim (y = -3.2) to above tip (y = +4.6)
    const y = -3.2 + t * 7.8;
    const sCurveX =
      Math.sin(t * Math.PI * 1.65 - 0.5) * 0.65 * (1.0 - t * 0.35);
    const spread = (1.0 - t * 0.4) * 0.85;
    const angle = idx * 2.399 + time * 1.8;
    positions[idx * 3] = sCurveX + Math.cos(angle) * spread * 0.55;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = Math.sin(angle) * spread * 0.45;
  }

  /**
   * Draws Soft-Feathered Density & Color Field for the Main S-Curve Flame + Right Fork.
   * Soft blurring ensures the GLSL Simplex FBM shader erodes edges into natural plasma fire!
   */
  createMainFlameBodyTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1280;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 1024, 1280);

    // 1. Soft Outer Thermal Plasma Halo
    ctx.save();
    ctx.filter = 'blur(28px)';
    const outerGrad = ctx.createLinearGradient(512, 1200, 512, 80);
    outerGrad.addColorStop(0.0, 'rgba(255, 150, 30, 0.90)');
    outerGrad.addColorStop(0.45, 'rgba(243, 112, 33, 0.88)');
    outerGrad.addColorStop(0.85, 'rgba(255, 165, 20, 0.72)');
    outerGrad.addColorStop(1.0, 'rgba(243, 112, 33, 0.0)');
    ctx.fillStyle = outerGrad;
    this.traceMainSFlamePath(ctx);
    ctx.fill();
    ctx.restore();

    // 2. Soft-Feathered S-Curve Flame Body (Blurred 12px so there are ZERO hard vector edges!)
    ctx.save();
    ctx.filter = 'blur(12px)';
    const mainGrad = ctx.createLinearGradient(350, 1210, 580, 90);
    mainGrad.addColorStop(0.0, '#fff3b0');
    mainGrad.addColorStop(0.18, '#ffb703');
    mainGrad.addColorStop(0.48, '#f37021');
    mainGrad.addColorStop(0.78, '#fbbf24');
    mainGrad.addColorStop(0.95, '#f97316');
    mainGrad.addColorStop(1.0, 'rgba(243, 112, 33, 0.0)');

    ctx.fillStyle = mainGrad;
    this.traceMainSFlamePath(ctx);
    ctx.fill();

    // 3. Secondary Right-Side Curling Flame Fork
    const forkGrad = ctx.createLinearGradient(540, 1160, 740, 370);
    forkGrad.addColorStop(0.0, '#fde047');
    forkGrad.addColorStop(0.4, '#f59e0b');
    forkGrad.addColorStop(0.8, '#ea580c');
    forkGrad.addColorStop(1.0, 'rgba(254, 240, 138, 0.1)');

    ctx.fillStyle = forkGrad;
    ctx.beginPath();
    ctx.moveTo(460, 1185);
    ctx.bezierCurveTo(440, 960, 590, 820, 690, 650);
    ctx.bezierCurveTo(755, 530, 745, 420, 695, 360);
    ctx.bezierCurveTo(725, 445, 700, 540, 610, 645);
    ctx.bezierCurveTo(510, 760, 365, 920, 360, 1185);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 4. Inner Golden Plasma Streams (Softly feathered 8px)
    ctx.save();
    ctx.filter = 'blur(8px)';
    const rib1Grad = ctx.createLinearGradient(380, 1190, 520, 120);
    rib1Grad.addColorStop(0.0, '#ffffff');
    rib1Grad.addColorStop(0.22, '#fef08a');
    rib1Grad.addColorStop(0.55, '#fbbf24');
    rib1Grad.addColorStop(0.85, '#f59e0b');
    rib1Grad.addColorStop(1.0, 'rgba(253, 224, 71, 0.0)');

    ctx.fillStyle = rib1Grad;
    ctx.beginPath();
    ctx.moveTo(335, 1195);
    ctx.bezierCurveTo(215, 975, 270, 750, 465, 560);
    ctx.bezierCurveTo(635, 395, 625, 225, 485, 105);
    ctx.bezierCurveTo(575, 235, 565, 385, 405, 540);
    ctx.bezierCurveTo(220, 720, 175, 955, 290, 1195);
    ctx.closePath();
    ctx.fill();

    const rib2Grad = ctx.createLinearGradient(440, 1190, 560, 190);
    rib2Grad.addColorStop(0.0, '#ffffff');
    rib2Grad.addColorStop(0.35, '#fef9c3');
    rib2Grad.addColorStop(0.7, '#fde047');
    rib2Grad.addColorStop(1.0, 'rgba(245, 158, 11, 0.0)');

    ctx.fillStyle = rib2Grad;
    ctx.beginPath();
    ctx.moveTo(410, 1195);
    ctx.bezierCurveTo(295, 960, 355, 765, 535, 585);
    ctx.bezierCurveTo(680, 440, 660, 270, 515, 155);
    ctx.bezierCurveTo(615, 285, 610, 435, 475, 575);
    ctx.bezierCurveTo(310, 745, 255, 950, 360, 1195);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Smooth bottom feather into the golden cup lip
    ctx.globalCompositeOperation = 'destination-in';
    const maskGrad = ctx.createLinearGradient(0, 1260, 0, 0);
    maskGrad.addColorStop(0.0, 'rgba(0,0,0,0)');
    maskGrad.addColorStop(0.06, 'rgba(0,0,0,1)');
    maskGrad.addColorStop(0.94, 'rgba(0,0,0,1)');
    maskGrad.addColorStop(1.0, 'rgba(0,0,0,0)');
    ctx.fillStyle = maskGrad;
    ctx.fillRect(0, 0, 1024, 1280);
    ctx.globalCompositeOperation = 'source-over';

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  traceMainSFlamePath(ctx) {
    ctx.beginPath();
    ctx.moveTo(275, 1200);
    ctx.bezierCurveTo(135, 980, 195, 725, 425, 520);
    ctx.bezierCurveTo(615, 350, 610, 200, 465, 88);
    ctx.bezierCurveTo(585, 165, 685, 315, 645, 495);
    ctx.bezierCurveTo(615, 635, 495, 760, 545, 930);
    ctx.bezierCurveTo(585, 1055, 700, 1110, 735, 1200);
    ctx.closePath();
  }

  /**
   * Draws Soft-Feathered White-Gold Longitudinal Plasma Streams & Cup Rim Wisps
   */
  createGoldRidgesTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1280;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 1024, 1280);

    ctx.save();
    ctx.filter = 'blur(9px)';

    // 1. Primary Incandescent Silk Spine
    const spineGrad = ctx.createLinearGradient(450, 1190, 510, 100);
    spineGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.98)');
    spineGrad.addColorStop(0.35, 'rgba(254, 249, 195, 0.95)');
    spineGrad.addColorStop(0.7, 'rgba(253, 224, 71, 0.88)');
    spineGrad.addColorStop(1.0, 'rgba(251, 191, 36, 0.0)');

    ctx.fillStyle = spineGrad;
    ctx.beginPath();
    ctx.moveTo(355, 1195);
    ctx.bezierCurveTo(225, 965, 290, 745, 485, 555);
    ctx.bezierCurveTo(645, 398, 632, 220, 478, 96);
    ctx.bezierCurveTo(598, 220, 595, 390, 445, 545);
    ctx.bezierCurveTo(260, 735, 195, 960, 315, 1195);
    ctx.closePath();
    ctx.fill();

    // 2. Second Inner Silk Stream
    ctx.beginPath();
    ctx.moveTo(435, 1195);
    ctx.bezierCurveTo(335, 965, 405, 785, 565, 610);
    ctx.bezierCurveTo(685, 475, 670, 310, 535, 190);
    ctx.bezierCurveTo(635, 310, 635, 465, 520, 595);
    ctx.bezierCurveTo(365, 770, 300, 960, 395, 1195);
    ctx.closePath();
    ctx.fill();

    // 3. Right Branch Stream
    const branchGrad = ctx.createLinearGradient(550, 1150, 725, 365);
    branchGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.85)');
    branchGrad.addColorStop(0.5, 'rgba(254, 240, 138, 0.85)');
    branchGrad.addColorStop(1.0, 'rgba(251, 191, 36, 0.15)');
    ctx.fillStyle = branchGrad;

    ctx.beginPath();
    ctx.moveTo(475, 1185);
    ctx.bezierCurveTo(465, 975, 610, 825, 702, 650);
    ctx.bezierCurveTo(758, 535, 745, 425, 695, 360);
    ctx.bezierCurveTo(725, 435, 718, 535, 660, 645);
    ctx.bezierCurveTo(568, 815, 435, 970, 440, 1185);
    ctx.closePath();
    ctx.fill();

    // 4. Right Cup Rim Licking Wisp
    const wispGrad = ctx.createLinearGradient(680, 1190, 810, 900);
    wispGrad.addColorStop(0.0, '#ffffff');
    wispGrad.addColorStop(0.45, '#fde047');
    wispGrad.addColorStop(0.85, '#f97316');
    wispGrad.addColorStop(1.0, 'rgba(243, 112, 33, 0)');
    ctx.fillStyle = wispGrad;

    ctx.beginPath();
    ctx.moveTo(645, 1195);
    ctx.bezierCurveTo(735, 1165, 815, 1085, 805, 965);
    ctx.bezierCurveTo(798, 915, 765, 885, 740, 870);
    ctx.bezierCurveTo(765, 905, 775, 955, 762, 1015);
    ctx.bezierCurveTo(745, 1095, 675, 1150, 595, 1195);
    ctx.closePath();
    ctx.fill();

    // 5. Left Cup Rim Licking Wisp
    ctx.beginPath();
    ctx.moveTo(310, 1195);
    ctx.bezierCurveTo(225, 1150, 175, 1055, 195, 945);
    ctx.bezierCurveTo(205, 995, 240, 1095, 345, 1195);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  /**
   * Draws Soft-Feathered Sapphire-Blue Gas Flame Core at the bottom-right of the flame
   */
  createBlueCoreFlameTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1280;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 1024, 1280);

    // 1. Soft Sapphire Plasma Glow
    ctx.save();
    ctx.filter = 'blur(18px)';
    const blueGlow = ctx.createRadialGradient(575, 1050, 15, 575, 1050, 220);
    blueGlow.addColorStop(0.0, 'rgba(56, 189, 248, 0.90)');
    blueGlow.addColorStop(0.5, 'rgba(37, 99, 235, 0.60)');
    blueGlow.addColorStop(1.0, 'rgba(29, 78, 216, 0.0)');
    ctx.fillStyle = blueGlow;
    ctx.fillRect(330, 760, 480, 460);
    ctx.restore();

    // 2. Soft-Feathered Sapphire-Blue Curling Tongue
    ctx.save();
    ctx.filter = 'blur(9px)';
    const blueBodyGrad = ctx.createLinearGradient(460, 1200, 650, 810);
    blueBodyGrad.addColorStop(0.0, '#e0f2fe');
    blueBodyGrad.addColorStop(0.22, '#60a5fa');
    blueBodyGrad.addColorStop(0.55, '#2563eb');
    blueBodyGrad.addColorStop(0.82, '#1d4ed8');
    blueBodyGrad.addColorStop(1.0, 'rgba(186, 230, 253, 0.1)');

    ctx.fillStyle = blueBodyGrad;
    ctx.beginPath();
    ctx.moveTo(415, 1198);
    ctx.bezierCurveTo(435, 1075, 515, 985, 615, 915);
    ctx.bezierCurveTo(675, 872, 688, 822, 652, 775);
    ctx.bezierCurveTo(718, 825, 728, 915, 685, 1010);
    ctx.bezierCurveTo(645, 1098, 585, 1165, 635, 1198);
    ctx.closePath();
    ctx.fill();

    // 3. Luminous Ice-White & Cyan Plasma Stream inside the Blue Flame
    const cyanRidgeGrad = ctx.createLinearGradient(480, 1198, 665, 785);
    cyanRidgeGrad.addColorStop(0.0, '#ffffff');
    cyanRidgeGrad.addColorStop(0.4, '#e0f2fe');
    cyanRidgeGrad.addColorStop(0.75, '#38bdf8');
    cyanRidgeGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.1)');

    ctx.fillStyle = cyanRidgeGrad;
    ctx.beginPath();
    ctx.moveTo(455, 1198);
    ctx.bezierCurveTo(475, 1090, 548, 1005, 635, 932);
    ctx.bezierCurveTo(682, 892, 692, 832, 655, 778);
    ctx.bezierCurveTo(705, 835, 702, 910, 655, 978);
    ctx.bezierCurveTo(595, 1065, 535, 1135, 555, 1198);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Smooth bottom feather
    ctx.globalCompositeOperation = 'destination-in';
    const maskGrad = ctx.createLinearGradient(0, 1245, 0, 700);
    maskGrad.addColorStop(0.0, 'rgba(0,0,0,0)');
    maskGrad.addColorStop(0.09, 'rgba(0,0,0,1)');
    maskGrad.addColorStop(1.0, 'rgba(0,0,0,1)');
    ctx.fillStyle = maskGrad;
    ctx.fillRect(0, 0, 1024, 1280);
    ctx.globalCompositeOperation = 'source-over';

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  /**
   * Builds the Royal Olympic Golden Torch, Spiral Laurel Sash, Open Book of Wisdom,
   * and Stepped Pedestal matching Image 2.
   */
  buildAltarBase() {
    const altarGroup = new THREE.Group();
    const segments = this.isMobile ? 28 : 40;

    // 1. Radiant Imperial Gold Materials
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

    // 1. Upper Flared Crown Rim (Miệng đài đuốc 2 tầng)
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

    // 2. Fluted Goblet Cup (Bầu đuốc chạm khắc gân nổi)
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

    // 3. Tapered Fluted Torch Stem
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

    // 4. Spiral Laurel Ribbon Sash
    const sashGroup = this.buildLaurelSpiralSash();
    torchGroup.add(sashGroup);

    // 5. Incandescent Ember Bed inside the Torch Cup
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

      // Left Wing Curved Page
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

      // Right Wing Curved Page
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

    // 1. Primary Shooting Star & Tapering Fading Comet Tail
    this.mainComet = this.createShootingStarArc({
      orbitRadiusX: 5.5,
      orbitRadiusZ: 5.5,
      arcAngle: Math.PI * 0.72,
      headSize: 1.6,
      tailMaxRadius: 0.115
    });
    this.orbitSystem.add(this.mainComet.group);

    // 2. Secondary Upper Golden Comet Swoosh
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

    // 3. Luminous Floating Knowledge Pages
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
    if (this.volumetricCore) {
      this.volumetricCore.magnitude = isTyping ? 2.05 : 1.65;
    }
  }

  /**
   * Celebratory "Thắp Lửa" burst when a tribute is submitted
   */
  triggerIgnite(onComplete) {
    if (this.isIgniting) return;
    this.isIgniting = true;

    if (this.volumetricCore) {
      this.volumetricCore.magnitude = 2.8;
    }

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
        this.pointLight.intensity = 4.5 + this.igniteBoost * 12.0;
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
        if (this.volumetricCore) {
          this.volumetricCore.magnitude = this.isTyping ? 2.05 : 1.65;
        }
        if (this.pointLight) this.pointLight.intensity = 4.5;
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
        Math.sin(time * 0.45) * 0.14 + this.mouse.x * 0.28;
      this.coreGroup.rotation.x =
        Math.sin(time * 0.35) * 0.03 - this.mouse.y * 0.12;
      this.coreGroup.rotation.z =
        Math.cos(time * 0.4) * 0.015 - this.mouse.x * 0.05;
    }

    // 1. Update Volumetric Core & GLSL Simplex FBM Fire Shaders
    const speedMult = this.isTyping ? 1.45 : 1.0;
    if (this.volumetricCore) {
      this.volumetricCore.update(time * 1.15 * speedMult);
    }

    for (let i = 0; i < this.flameLayers.length; i++) {
      const layer = this.flameLayers[i];
      layer.material.uniforms.uTime.value = time * speedMult;
      layer.material.uniforms.uBoost.value =
        this.igniteBoost + (this.isTyping ? 0.25 : 0.0);
    }

    // Animate Rising Fire Micro-Embers along the S-curve
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
      this.blueCoreSprite.scale.set(3.6 * bluePulse, 3.4 * bluePulse, 1);
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
      this.pointLight.intensity = (this.isTyping ? 5.4 : 4.5) + flicker;
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

    if (this.volumetricCore) {
      this.volumetricCore.dispose();
    }

    this.flameLayers.forEach((mesh) => {
      if (mesh.material.uniforms && mesh.material.uniforms.uMap.value) {
        mesh.material.uniforms.uMap.value.dispose();
      }
      mesh.material.dispose();
      mesh.geometry.dispose();
    });

    if (this.renderer && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
