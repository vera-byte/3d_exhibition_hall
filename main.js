// main.ts
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";
var ModelViewer = class {
  constructor() {
    this.model = null;
    this.modelName = "";
    this.modelMaterials = [];
    // 灯光引用
    this.ambientLight = null;
    this.mainLight = null;
    this.fillLight = null;
    this.rimLight = null;
    // 地面引用
    this.floor = null;
    this.grid = null;
    // 当前背景类型
    this.backgroundType = "color";
    this.backgroundImageMode = "cover";
    // 自动旋转
    this.autoRotate = true;
    this.autoRotateSpeed = 1;
    // 预设视角
    this.presetViews = [
      { name: "\u9ED8\u8BA4", position: [5, 3, 5], target: [0, 0, 0] },
      { name: "\u6B63\u9762", position: [0, 1.5, 5], target: [0, 0.5, 0] },
      { name: "\u4FA7\u9762", position: [5, 1.5, 0], target: [0, 0.5, 0] },
      { name: "\u80CC\u9762", position: [0, 1.5, -5], target: [0, 0.5, 0] },
      { name: "\u4FEF\u89C6", position: [0, 8, 0.1], target: [0, 0, 0] }
    ];
    this.container = document.getElementById("canvas-container");
    if (!this.container) {
      throw new Error("\u672A\u627E\u5230\u753B\u5E03\u5BB9\u5668 #canvas-container");
    }
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1e3
    );
    this.camera.position.set(5, 3, 5);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 50;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
    this.controls.enablePan = true;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 1;
    this.init();
  }
  init() {
    this.setBackground(1710638);
    this.createFloor();
    this.setupLights();
    this.setupEventListeners();
    this.animate();
    this.loadDefaultModel();
    this.loadConfigFromURL();
  }
  // ==========================================
  // 背景设置
  // ==========================================
  setBackground(color) {
    this.backgroundType = "color";
    this.scene.background = new THREE.Color(color);
    this.scene.fog = new THREE.Fog(color, 15, 60);
  }
  setGradientBackground(colors) {
    if (colors.length < 2)
      return;
    this.backgroundType = "gradient";
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx)
      return;
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    colors.forEach((color, index) => {
      gradient.addColorStop(index / (colors.length - 1), color);
    });
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    this.scene.background = texture;
    this.scene.fog = null;
  }
  setImageBackground(url, mode = "cover") {
    this.backgroundType = "image";
    this.backgroundImageMode = mode;
    const loader = new THREE.TextureLoader();
    loader.load(url, (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      switch (mode) {
        case "cover":
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          break;
        case "contain":
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          break;
        case "stretch":
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          break;
        case "center":
        case "repeat":
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          break;
      }
      this.scene.background = texture;
      this.scene.fog = null;
    });
  }
  /**
   * 设置背景图显示模式
   */
  setBackgroundImageMode(mode) {
    this.backgroundImageMode = mode;
    const texture = this.scene.background;
    if (!texture || this.backgroundType !== "image")
      return;
    switch (mode) {
      case "cover":
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        break;
      case "contain":
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        break;
      case "stretch":
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        break;
      case "center":
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        break;
      case "repeat":
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        break;
    }
    texture.needsUpdate = true;
  }
  setTransparentBackground() {
    this.backgroundType = "transparent";
    this.scene.background = null;
    this.renderer.setClearColor(0, 0);
    this.scene.fog = null;
  }
  // ==========================================
  // 灯光颜色设置
  // ==========================================
  setAmbientLightColor(color) {
    if (this.ambientLight) {
      this.ambientLight.color.setHex(color);
    }
  }
  setMainLightColor(color) {
    if (this.mainLight) {
      this.mainLight.color.setHex(color);
    }
  }
  setFillLightColor(color) {
    if (this.fillLight) {
      this.fillLight.color.setHex(color);
    }
  }
  setRimLightColor(color) {
    if (this.rimLight) {
      this.rimLight.color.setHex(color);
    }
  }
  setAmbientLightIntensity(intensity) {
    if (this.ambientLight) {
      this.ambientLight.intensity = intensity;
    }
  }
  setMainLightIntensity(intensity) {
    if (this.mainLight) {
      this.mainLight.intensity = intensity;
    }
  }
  // ==========================================
  // 地面设置
  // ==========================================
  /**
   * 创建地面
   */
  createFloor() {
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 657935,
      metalness: 0.8,
      roughness: 0.2,
      transparent: false,
      opacity: 1
    });
    this.floor = new THREE.Mesh(floorGeometry, floorMaterial);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = -0.01;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);
    this.grid = new THREE.GridHelper(30, 30, 3355460, 2236979);
    this.grid.position.y = 0;
    this.scene.add(this.grid);
  }
  /**
   * 设置地面颜色
   */
  setFloorColor(color) {
    if (this.floor) {
      const mat = this.floor.material;
      mat.color.setHex(color);
    }
  }
  /**
   * 设置地面透明度
   * @param opacity 透明度 0-1，0为完全透明
   */
  setFloorOpacity(opacity) {
    if (this.floor) {
      const mat = this.floor.material;
      mat.transparent = opacity < 1;
      mat.opacity = opacity;
      mat.needsUpdate = true;
    }
  }
  /**
   * 设置地面透明模式
   */
  setFloorTransparent(transparent) {
    if (this.floor) {
      const mat = this.floor.material;
      mat.transparent = transparent;
      if (!transparent) {
        mat.opacity = 1;
      }
      mat.needsUpdate = true;
    }
  }
  /**
   * 切换网格显示
   */
  setGridVisible(visible) {
    if (this.grid) {
      this.grid.visible = visible;
    }
  }
  // ==========================================
  // 自动旋转（360环绕）
  // ==========================================
  /**
   * 设置自动旋转
   */
  setAutoRotate(enabled) {
    this.autoRotate = enabled;
    this.controls.autoRotate = enabled;
  }
  /**
   * 设置自动旋转速度
   */
  setAutoRotateSpeed(speed) {
    this.autoRotateSpeed = speed;
    this.controls.autoRotateSpeed = speed;
  }
  // ==========================================
  // 灯光设置
  // ==========================================
  setupLights() {
    this.ambientLight = new THREE.AmbientLight(16777215, 0.5);
    this.scene.add(this.ambientLight);
    this.mainLight = new THREE.DirectionalLight(16777215, 1.2);
    this.mainLight.position.set(5, 10, 5);
    this.mainLight.castShadow = true;
    this.mainLight.shadow.mapSize.width = 2048;
    this.mainLight.shadow.mapSize.height = 2048;
    this.mainLight.shadow.camera.near = 0.5;
    this.mainLight.shadow.camera.far = 50;
    this.mainLight.shadow.camera.left = -10;
    this.mainLight.shadow.camera.right = 10;
    this.mainLight.shadow.camera.top = 10;
    this.mainLight.shadow.camera.bottom = -10;
    this.scene.add(this.mainLight);
    this.fillLight = new THREE.DirectionalLight(8947967, 0.4);
    this.fillLight.position.set(-5, 5, -5);
    this.scene.add(this.fillLight);
    this.rimLight = new THREE.DirectionalLight(16755336, 0.5);
    this.rimLight.position.set(-8, 8, 0);
    this.scene.add(this.rimLight);
    this.createEnvironmentMap();
  }
  createEnvironmentMap() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx)
      return;
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, "#4466aa");
    gradient.addColorStop(0.5, "#88aadd");
    gradient.addColorStop(1, "#223344");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    this.scene.environment = texture;
  }
  // ==========================================
  // 事件监听
  // ==========================================
  setupEventListeners() {
    window.addEventListener("resize", () => this.onWindowResize());
    this.setupDragDrop();
    this.setupFileInput();
    this.setupViewButtons();
    this.setupControlPanel();
    this.setupColorPickers();
  }
  setupDragDrop() {
    const dropZone = this.container;
    if (!dropZone)
      return;
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("drag-over");
    });
    dropZone.addEventListener("dragleave", () => {
      dropZone.classList.remove("drag-over");
    });
    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("drag-over");
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        this.loadModelFromFiles(Array.from(files));
      }
    });
  }
  setupFileInput() {
    const fileInput = document.getElementById("file-input");
    if (fileInput) {
      fileInput.addEventListener("change", (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
          this.loadModelFromFiles(Array.from(files));
        }
      });
    }
  }
  setupViewButtons() {
    const buttons = document.querySelectorAll(".view-btn");
    buttons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const target = e.currentTarget;
        const view = target.dataset.view;
        if (view) {
          this.setView(view);
        }
      });
    });
    const resetBtn = document.getElementById("reset-view");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => this.resetView());
    }
    const fullscreenBtn = document.getElementById("fullscreen");
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener("click", () => this.toggleFullscreen());
    }
  }
  setupControlPanel() {
    const bgButtons = document.querySelectorAll(".bg-btn");
    bgButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const target = e.currentTarget;
        const color = parseInt(target.dataset.bg || "0", 16);
        this.setBackground(color);
        this.updateActiveButton(".bg-btn", target);
      });
    });
    const gridBtn = document.getElementById("toggle-grid");
    if (gridBtn) {
      gridBtn.addEventListener("click", (e) => {
        const target = e.currentTarget;
        const isActive = target.classList.toggle("active");
        this.setGridVisible(isActive);
      });
    }
    const autoRotateBtn = document.getElementById("toggle-auto-rotate");
    if (autoRotateBtn) {
      autoRotateBtn.addEventListener("click", (e) => {
        const target = e.currentTarget;
        const isActive = target.classList.toggle("active");
        this.setAutoRotate(isActive);
      });
    }
  }
  setupColorPickers() {
    const bgColorPicker = document.getElementById("bg-color-picker");
    if (bgColorPicker) {
      bgColorPicker.addEventListener("input", (e) => {
        const color = e.target.value;
        this.setBackground(this.hexToInt(color));
      });
    }
    const ambientPicker = document.getElementById("ambient-color");
    if (ambientPicker) {
      ambientPicker.addEventListener("input", (e) => {
        this.setAmbientLightColor(this.hexToInt(e.target.value));
      });
    }
    const mainLightPicker = document.getElementById("main-light-color");
    if (mainLightPicker) {
      mainLightPicker.addEventListener("input", (e) => {
        this.setMainLightColor(this.hexToInt(e.target.value));
      });
    }
    const fillLightPicker = document.getElementById("fill-light-color");
    if (fillLightPicker) {
      fillLightPicker.addEventListener("input", (e) => {
        this.setFillLightColor(this.hexToInt(e.target.value));
      });
    }
    const rimLightPicker = document.getElementById("rim-light-color");
    if (rimLightPicker) {
      rimLightPicker.addEventListener("input", (e) => {
        this.setRimLightColor(this.hexToInt(e.target.value));
      });
    }
    const floorColorPicker = document.getElementById("floor-color");
    if (floorColorPicker) {
      floorColorPicker.addEventListener("input", (e) => {
        this.setFloorColor(this.hexToInt(e.target.value));
      });
    }
    const floorOpacitySlider = document.getElementById("floor-opacity");
    if (floorOpacitySlider) {
      floorOpacitySlider.addEventListener("input", (e) => {
        const opacity = parseFloat(e.target.value);
        this.setFloorOpacity(opacity);
      });
    }
    const floorTransparentBtn = document.getElementById("floor-transparent");
    if (floorTransparentBtn) {
      floorTransparentBtn.addEventListener("click", (e) => {
        const target = e.currentTarget;
        const isActive = target.classList.toggle("active");
        this.setFloorTransparent(isActive);
        if (isActive) {
          this.setFloorOpacity(0);
        }
      });
    }
    const bgImageInput = document.getElementById("bg-image-input");
    if (bgImageInput) {
      bgImageInput.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const modeSelect = document.getElementById("bg-image-mode");
            const mode = modeSelect?.value || "cover";
            this.setImageBackground(ev.target?.result, mode);
          };
          reader.readAsDataURL(file);
        }
      });
    }
    const bgImageModeSelect = document.getElementById("bg-image-mode");
    if (bgImageModeSelect) {
      bgImageModeSelect.addEventListener("change", (e) => {
        const mode = e.target.value;
        this.setBackgroundImageMode(mode);
      });
    }
    const gradientBtn = document.getElementById("apply-gradient");
    if (gradientBtn) {
      gradientBtn.addEventListener("click", () => {
        const color1Input = document.getElementById("gradient-color1");
        const color2Input = document.getElementById("gradient-color2");
        if (color1Input && color2Input) {
          this.setGradientBackground([color1Input.value, color2Input.value]);
        }
      });
    }
    const transparentBtn = document.getElementById("set-transparent");
    if (transparentBtn) {
      transparentBtn.addEventListener("click", () => {
        this.setTransparentBackground();
      });
    }
  }
  // ==========================================
  // 工具方法
  // ==========================================
  hexToInt(hex) {
    return parseInt(hex.replace("#", ""), 16);
  }
  updateActiveButton(selector, activeBtn) {
    document.querySelectorAll(selector).forEach((btn) => {
      btn.classList.remove("active");
    });
    activeBtn.classList.add("active");
  }
  loadConfigFromURL() {
    const params = new URLSearchParams(window.location.search);
    const bg = params.get("bg");
    if (bg)
      this.setBackground(parseInt(bg, 16));
    const bgImage = params.get("bgImage");
    if (bgImage)
      this.setImageBackground(bgImage);
    const model = params.get("model");
    if (model) {
      const format = this.detectFormat(model);
      this.loadModel(model, format);
    }
  }
  loadDefaultModel() {
    const params = new URLSearchParams(window.location.search);
    const modelPath = params.get("model");
    if (modelPath) {
      const format = this.detectFormat(modelPath);
      this.loadModel(modelPath, format);
    } else {
      this.loadModel("3dmodels/vision_lod_a.kn5.obj", "obj");
    }
  }
  // ==========================================
  // 模型加载
  // ==========================================
  loadModelFromFile(file) {
    this.loadModelFromFiles([file]);
  }
  /**
   * 从多个文件加载模型（支持 OBJ + MTL 同时选择）
   */
  loadModelFromFiles(files) {
    console.log("loadModelFromFiles", files);
    if (files.length === 0)
      return;
    const objFiles = files.filter((f) => f.name.toLowerCase().endsWith(".obj"));
    const mtlFiles = files.filter((f) => f.name.toLowerCase().endsWith(".mtl"));
    const otherFiles = files.filter(
      (f) => !f.name.toLowerCase().endsWith(".obj") && !f.name.toLowerCase().endsWith(".mtl")
    );
    if (objFiles.length > 0 && mtlFiles.length > 0) {
      this.loadOBJWithMTL(objFiles[0], mtlFiles[0]);
      return;
    }
    if (mtlFiles.length > 0 && objFiles.length === 0) {
      this.loadMTLFromFiles(files, mtlFiles[0]);
      return;
    }
    const file = otherFiles.length > 0 ? otherFiles[0] : files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result;
      const ext = file.name.split(".").pop()?.toLowerCase() || "gltf";
      this.modelName = file.name;
      this.updateModelName(file.name);
      if (this.model) {
        this.scene.remove(this.model);
        this.model = null;
        this.modelMaterials = [];
      }
      switch (ext) {
        case "stl":
          this.loadSTL(url);
          break;
        case "obj":
          this.loadOBJ(url);
          break;
        case "mtl":
          this.loadMTL(url);
          break;
        default:
          this.loadGLTF(url);
      }
    };
    reader.readAsDataURL(file);
  }
  /**
   * 从多个文件加载 MTL（包含同名 OBJ）
   */
  loadMTLFromFiles(files, mtlFile) {
    const mtlName = mtlFile.name.replace(/\.mtl$/i, "");
    const objFile = files.find(
      (f) => f.name.toLowerCase().replace(/\.obj$/i, "") === mtlName.toLowerCase()
    );
    if (objFile) {
      this.loadOBJWithMTL(objFile, mtlFile);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result;
        this.modelName = mtlFile.name;
        this.updateModelName(mtlFile.name);
        if (this.model) {
          this.scene.remove(this.model);
          this.model = null;
        }
        this.loadMTL(url);
      };
      reader.readAsDataURL(mtlFile);
    }
  }
  /**
   * 加载 OBJ 模型（带 MTL 材质）
   */
  loadOBJWithMTL(objFile, mtlFile) {
    this.modelName = objFile.name;
    this.updateModelName(objFile.name);
    if (this.model) {
      this.scene.remove(this.model);
      this.model = null;
      this.modelMaterials = [];
    }
    const objReader = new FileReader();
    objReader.onload = (e) => {
      const objUrl = e.target?.result;
      const mtlReader = new FileReader();
      mtlReader.onload = (e2) => {
        const mtlUrl = e2.target?.result;
        const mtlLoader = new MTLLoader();
        mtlLoader.load(
          mtlUrl,
          (materials) => {
            materials.preload();
            const objLoader = new OBJLoader();
            objLoader.setMaterials(materials);
            objLoader.load(
              objUrl,
              (object) => {
                this.processOBJObject(object);
                this.updateStatus("\u6A21\u578B\u52A0\u8F7D\u5B8C\u6210");
              },
              (xhr) => {
                const progress = (xhr.loaded / xhr.total * 100).toFixed(0);
                this.updateStatus(`\u52A0\u8F7D\u4E2D: ${progress}%`);
              },
              (error) => {
                console.error("OBJ\u52A0\u8F7D\u5931\u8D25:", error);
                this.updateStatus("\u6A21\u578B\u52A0\u8F7D\u5931\u8D25");
              }
            );
          },
          void 0,
          (error) => {
            console.error("MTL\u89E3\u6790\u5931\u8D25:", error);
            const objLoader = new OBJLoader();
            objLoader.load(
              objUrl,
              (object) => {
                this.processOBJObject(object);
                this.updateStatus("\u6A21\u578B\u52A0\u8F7D\u5B8C\u6210\uFF08\u65E0\u6750\u8D28\uFF09");
              },
              (xhr) => {
                const progress = (xhr.loaded / xhr.total * 100).toFixed(0);
                this.updateStatus(`\u52A0\u8F7D\u4E2D: ${progress}%`);
              },
              (error2) => {
                console.error("OBJ\u52A0\u8F7D\u5931\u8D25:", error2);
                this.updateStatus("\u6A21\u578B\u52A0\u8F7D\u5931\u8D25");
              }
            );
          }
        );
      };
      mtlReader.readAsDataURL(mtlFile);
    };
    objReader.readAsDataURL(objFile);
  }
  loadModel(path, format = "gltf") {
    this.modelName = path.split("/").pop() || "\u6A21\u578B";
    this.updateModelName(this.modelName);
    if (this.model) {
      this.scene.remove(this.model);
      this.model = null;
      this.modelMaterials = [];
    }
    switch (format) {
      case "stl":
        this.loadSTL(path);
        break;
      case "obj":
        this.loadOBJ(path);
        break;
      case "mtl":
        this.loadMTL(path);
        break;
      default:
        this.loadGLTF(path);
    }
  }
  /**
   * 加载 OBJ 模型
   */
  loadOBJ(path) {
    const loader = new OBJLoader();
    loader.load(
      path,
      (object) => {
        this.processOBJObject(object);
        this.updateStatus("\u6A21\u578B\u52A0\u8F7D\u5B8C\u6210");
      },
      (xhr) => {
        const progress = (xhr.loaded / xhr.total * 100).toFixed(0);
        this.updateStatus(`\u52A0\u8F7D\u4E2D: ${progress}%`);
      },
      (error) => {
        console.error("\u52A0\u8F7D\u5931\u8D25:", error);
        this.updateStatus("\u52A0\u8F7D\u5931\u8D25");
      }
    );
  }
  /**
   * 加载 MTL 模型
   */
  loadMTL(path) {
    const mtlLoader = new MTLLoader();
    mtlLoader.load(
      path,
      (materials) => {
        materials.preload();
        const objPath = path.replace(/\.mtl$/i, ".obj");
        const objLoader = new OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.load(
          objPath,
          (object) => {
            this.processOBJObject(object);
            this.updateStatus("\u6A21\u578B\u52A0\u8F7D\u5B8C\u6210");
          },
          (xhr) => {
            const progress = (xhr.loaded / xhr.total * 100).toFixed(0);
            this.updateStatus(`\u52A0\u8F7D\u4E2D: ${progress}%`);
          },
          (error) => {
            console.error("\u52A0\u8F7D\u5931\u8D25:", error);
            this.updateStatus("\u52A0\u8F7D\u5931\u8D25 - \u8BF7\u786E\u4FDD\u540C\u76EE\u5F55\u4E0B\u6709\u540C\u540D .obj \u6587\u4EF6");
          }
        );
      },
      (xhr) => {
        const progress = (xhr.loaded / xhr.total * 100).toFixed(0);
        this.updateStatus(`\u52A0\u8F7D\u4E2D: ${progress}%`);
      },
      (error) => {
        console.error("MTL\u52A0\u8F7D\u5931\u8D25:", error);
        this.updateStatus("MTL\u52A0\u8F7D\u5931\u8D25");
      }
    );
  }
  /**
   * 处理 OBJ/MTL 加载后的对象
   */
  processOBJObject(object) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 5) {
      const scale = 3 / maxDim;
      object.scale.setScalar(scale);
    }
    object.position.x = -center.x * (object.scale.x || 1);
    object.position.y = -box.min.y * (object.scale.y || 1);
    object.position.z = -center.z * (object.scale.z || 1);
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (Array.isArray(child.material)) {
          this.modelMaterials.push(...child.material);
        } else {
          this.modelMaterials.push(child.material);
        }
      }
    });
    this.model = object;
    this.scene.add(object);
  }
  loadSTL(path) {
    const loader = new STLLoader();
    loader.load(
      path,
      (geometry) => {
        geometry.computeBoundingBox();
        const box = geometry.boundingBox;
        if (!box)
          return;
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 3 / maxDim;
        const material = new THREE.MeshPhysicalMaterial({
          color: 3377407,
          metalness: 0.6,
          roughness: 0.3,
          clearcoat: 0.5
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.scale.set(scale, scale, scale);
        mesh.position.set(
          -box.min.x * scale,
          -box.min.y * scale,
          -box.min.z * scale
        );
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.model = mesh;
        this.modelMaterials = [material];
        this.scene.add(mesh);
        this.updateStatus("\u6A21\u578B\u52A0\u8F7D\u5B8C\u6210");
      },
      (xhr) => {
        const progress = (xhr.loaded / xhr.total * 100).toFixed(0);
        this.updateStatus(`\u52A0\u8F7D\u4E2D: ${progress}%`);
      },
      (error) => {
        console.error("\u52A0\u8F7D\u5931\u8D25:", error);
        this.updateStatus("\u52A0\u8F7D\u5931\u8D25");
      }
    );
  }
  loadGLTF(path) {
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
    loader.setDRACOLoader(dracoLoader);
    loader.load(
      path,
      (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 5) {
          const scale = 3 / maxDim;
          model.scale.setScalar(scale);
        }
        model.position.x = -center.x * (model.scale.x || 1);
        model.position.y = -box.min.y * (model.scale.y || 1);
        model.position.z = -center.z * (model.scale.z || 1);
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (Array.isArray(child.material)) {
              this.modelMaterials.push(...child.material);
            } else {
              this.modelMaterials.push(child.material);
            }
          }
        });
        this.model = model;
        this.scene.add(model);
        this.updateStatus("\u6A21\u578B\u52A0\u8F7D\u5B8C\u6210");
      },
      (xhr) => {
        const progress = (xhr.loaded / xhr.total * 100).toFixed(0);
        this.updateStatus(`\u52A0\u8F7D\u4E2D: ${progress}%`);
      },
      (error) => {
        console.error("\u52A0\u8F7D\u5931\u8D25:", error);
        this.updateStatus("\u52A0\u8F7D\u5931\u8D25");
      }
    );
  }
  // ==========================================
  // 视角控制
  // ==========================================
  setView(viewName) {
    const views = {
      "default": { name: "\u9ED8\u8BA4", position: [5, 3, 5], target: [0, 0, 0] },
      "front": { name: "\u6B63\u9762", position: [0, 1.5, 5], target: [0, 0.5, 0] },
      "side": { name: "\u4FA7\u9762", position: [5, 1.5, 0], target: [0, 0.5, 0] },
      "back": { name: "\u80CC\u9762", position: [0, 1.5, -5], target: [0, 0.5, 0] },
      "top": { name: "\u4FEF\u89C6", position: [0, 8, 0.1], target: [0, 0, 0] }
    };
    const view = views[viewName];
    if (!view)
      return;
    this.animateCamera(
      new THREE.Vector3(...view.position),
      new THREE.Vector3(...view.target)
    );
    document.querySelectorAll(".view-btn").forEach((btn) => {
      btn.classList.remove("active");
      if (btn.dataset.view === viewName) {
        btn.classList.add("active");
      }
    });
  }
  animateCamera(targetPosition, targetLookAt) {
    const startPosition = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const duration = 800;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      this.camera.position.lerpVectors(startPosition, targetPosition, eased);
      this.controls.target.lerpVectors(startTarget, targetLookAt, eased);
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    animate();
  }
  resetView() {
    this.setView("default");
  }
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }
  // ==========================================
  // 模型调整
  // ==========================================
  setModelColor(color) {
    this.modelMaterials.forEach((mat) => {
      if ("color" in mat) {
        mat.color.setHex(color);
      }
    });
  }
  setMetalness(value) {
    this.modelMaterials.forEach((mat) => {
      if ("metalness" in mat) {
        mat.metalness = value;
      }
    });
  }
  setRoughness(value) {
    this.modelMaterials.forEach((mat) => {
      if ("roughness" in mat) {
        mat.roughness = value;
      }
    });
  }
  // ==========================================
  // 其他
  // ==========================================
  detectFormat(path) {
    const ext = path.split(".").pop()?.toLowerCase();
    if (ext === "stl")
      return "stl";
    if (ext === "obj")
      return "obj";
    if (ext === "mtl")
      return "mtl";
    if (ext === "glb")
      return "glb";
    return "gltf";
  }
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  updateStatus(message) {
    const statusEl = document.getElementById("status");
    if (statusEl) {
      statusEl.textContent = message;
    }
  }
  updateModelName(name) {
    const nameEl = document.getElementById("model-name");
    if (nameEl) {
      nameEl.textContent = name;
    }
  }
  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
  // 公开访问方法
  getScene() {
    return this.scene;
  }
  getCamera() {
    return this.camera;
  }
  getRenderer() {
    return this.renderer;
  }
};
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    const loadingScreen = document.getElementById("loading-screen");
    if (loadingScreen) {
      loadingScreen.classList.add("hidden");
    }
  }, 500);
  const viewer = new ModelViewer();
  window.viewer = viewer;
});
//# sourceMappingURL=main.js.map
