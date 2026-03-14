/**
 * ========================================
 * 通用3D模型展厅 - TypeScript 版本
 * ========================================
 * 
 * 基于 Three.js 的通用3D模型展厅
 * 支持：GLTF, GLB, STL, OBJ, MTL 格式模型
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

// ==========================================
// 类型定义
// ==========================================

type ModelFormat = 'gltf' | 'glb' | 'stl' | 'obj' | 'mtl';
type BackgroundType = 'color' | 'gradient' | 'image' | 'transparent';
type BackgroundImageMode = 'cover' | 'contain' | 'stretch' | 'center' | 'repeat';

interface ViewConfig {
    name: string;
    position: THREE.Vector3Tuple;
    target: THREE.Vector3Tuple;
}

// ==========================================
// 通用3D展厅类
// ==========================================

class ModelViewer {
    // 核心属性
    private container: HTMLElement | null;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls;

    private model: THREE.Object3D | null = null;
    private modelName: string = '';
    private modelMaterials: THREE.Material[] = [];

    // 灯光引用
    private ambientLight: THREE.AmbientLight | null = null;
    private mainLight: THREE.DirectionalLight | null = null;
    private fillLight: THREE.DirectionalLight | null = null;
    private rimLight: THREE.DirectionalLight | null = null;

    // 地面引用
    private floor: THREE.Mesh | null = null;
    private grid: THREE.GridHelper | null = null;

    // 当前背景类型
    private backgroundType: BackgroundType = 'color';
    private backgroundImageMode: BackgroundImageMode = 'cover';

    // 自动旋转
    private autoRotate: boolean = true;
    private autoRotateSpeed: number = 1.0;

    // 预设视角
    private readonly presetViews: ViewConfig[] = [
        { name: '默认', position: [5, 3, 5], target: [0, 0, 0] },
        { name: '正面', position: [0, 1.5, 5], target: [0, 0.5, 0] },
        { name: '侧面', position: [5, 1.5, 0], target: [0, 0.5, 0] },
        { name: '背面', position: [0, 1.5, -5], target: [0, 0.5, 0] },
        { name: '俯视', position: [0, 8, 0.1], target: [0, 0, 0] },
    ];

    constructor() {
        this.container = document.getElementById('canvas-container');

        if (!this.container) {
            throw new Error('未找到画布容器 #canvas-container');
        }

        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(5, 3, 5);

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 2;
        this.controls.maxDistance = 50;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
        this.controls.enablePan = true;

        // 默认启用自动旋转（360环绕）
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 1.0;

        this.init();
    }

    private init(): void {
        this.setBackground(0x1a1a2e);
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

    public setBackground(color: number): void {
        this.backgroundType = 'color';
        this.scene.background = new THREE.Color(color);
        this.scene.fog = new THREE.Fog(color, 15, 60);
    }

    public setGradientBackground(colors: string[]): void {
        if (colors.length < 2) return;

        this.backgroundType = 'gradient';

        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

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

    public setImageBackground(url: string, mode: BackgroundImageMode = 'cover'): void {
        this.backgroundType = 'image';
        this.backgroundImageMode = mode;

        const loader = new THREE.TextureLoader();
        loader.load(url, (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            texture.colorSpace = THREE.SRGBColorSpace;

            // 根据模式调整纹理
            switch (mode) {
                case 'cover':
                    texture.minFilter = THREE.LinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    break;
                case 'contain':
                    texture.minFilter = THREE.LinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    break;
                case 'stretch':
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    break;
                case 'center':
                case 'repeat':
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
    public setBackgroundImageMode(mode: BackgroundImageMode): void {
        this.backgroundImageMode = mode;

        const texture = this.scene.background as THREE.Texture | null;
        if (!texture || this.backgroundType !== 'image') return;

        switch (mode) {
            case 'cover':
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.wrapS = THREE.ClampToEdgeWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;
                break;
            case 'contain':
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.wrapS = THREE.ClampToEdgeWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;
                break;
            case 'stretch':
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                break;
            case 'center':
                texture.wrapS = THREE.ClampToEdgeWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;
                break;
            case 'repeat':
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                break;
        }

        texture.needsUpdate = true;
    }

    public setTransparentBackground(): void {
        this.backgroundType = 'transparent';
        this.scene.background = null;
        this.renderer.setClearColor(0x000000, 0);
        this.scene.fog = null;
    }

    // ==========================================
    // 灯光颜色设置
    // ==========================================

    public setAmbientLightColor(color: number): void {
        if (this.ambientLight) {
            this.ambientLight.color.setHex(color);
        }
    }

    public setMainLightColor(color: number): void {
        if (this.mainLight) {
            this.mainLight.color.setHex(color);
        }
    }

    public setFillLightColor(color: number): void {
        if (this.fillLight) {
            this.fillLight.color.setHex(color);
        }
    }

    public setRimLightColor(color: number): void {
        if (this.rimLight) {
            this.rimLight.color.setHex(color);
        }
    }

    public setAmbientLightIntensity(intensity: number): void {
        if (this.ambientLight) {
            this.ambientLight.intensity = intensity;
        }
    }

    public setMainLightIntensity(intensity: number): void {
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
    private createFloor(): void {
        const floorGeometry = new THREE.PlaneGeometry(50, 50);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x0a0a0f,
            metalness: 0.8,
            roughness: 0.2,
            transparent: false,
            opacity: 1,
        });

        this.floor = new THREE.Mesh(floorGeometry, floorMaterial);
        this.floor.rotation.x = -Math.PI / 2;
        this.floor.position.y = -0.01;
        this.floor.receiveShadow = true;
        this.scene.add(this.floor);

        this.grid = new THREE.GridHelper(30, 30, 0x333344, 0x222233);
        this.grid.position.y = 0;
        this.scene.add(this.grid);
    }

    /**
     * 设置地面颜色
     */
    public setFloorColor(color: number): void {
        if (this.floor) {
            const mat = this.floor.material as THREE.MeshStandardMaterial;
            mat.color.setHex(color);
        }
    }

    /**
     * 设置地面透明度
     * @param opacity 透明度 0-1，0为完全透明
     */
    public setFloorOpacity(opacity: number): void {
        if (this.floor) {
            const mat = this.floor.material as THREE.MeshStandardMaterial;
            mat.transparent = opacity < 1;
            mat.opacity = opacity;
            mat.needsUpdate = true;
        }
    }

    /**
     * 设置地面透明模式
     */
    public setFloorTransparent(transparent: boolean): void {
        if (this.floor) {
            const mat = this.floor.material as THREE.MeshStandardMaterial;
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
    public setGridVisible(visible: boolean): void {
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
    public setAutoRotate(enabled: boolean): void {
        this.autoRotate = enabled;
        this.controls.autoRotate = enabled;
    }

    /**
     * 设置自动旋转速度
     */
    public setAutoRotateSpeed(speed: number): void {
        this.autoRotateSpeed = speed;
        this.controls.autoRotateSpeed = speed;
    }

    // ==========================================
    // 灯光设置
    // ==========================================

    private setupLights(): void {
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(this.ambientLight);

        this.mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
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

        this.fillLight = new THREE.DirectionalLight(0x8888ff, 0.4);
        this.fillLight.position.set(-5, 5, -5);
        this.scene.add(this.fillLight);

        this.rimLight = new THREE.DirectionalLight(0xffaa88, 0.5);
        this.rimLight.position.set(-8, 8, 0);
        this.scene.add(this.rimLight);

        this.createEnvironmentMap();
    }

    private createEnvironmentMap(): void {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const gradient = ctx.createLinearGradient(0, 0, 0, 256);
        gradient.addColorStop(0, '#4466aa');
        gradient.addColorStop(0.5, '#88aadd');
        gradient.addColorStop(1, '#223344');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 256);

        const texture = new THREE.CanvasTexture(canvas);
        texture.mapping = THREE.EquirectangularReflectionMapping;
        this.scene.environment = texture;
    }

    // ==========================================
    // 事件监听
    // ==========================================

    private setupEventListeners(): void {
        window.addEventListener('resize', () => this.onWindowResize());

        this.setupDragDrop();
        this.setupFileInput();
        this.setupViewButtons();
        this.setupControlPanel();
        this.setupColorPickers();
    }

    private setupDragDrop(): void {
        const dropZone = this.container;
        if (!dropZone) return;

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');

            const files = e.dataTransfer?.files;
            if (files && files.length > 0) {
                this.loadModelFromFiles(Array.from(files));
            }
        });
    }

    private setupFileInput(): void {
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const files = (e.target as HTMLInputElement).files;
                if (files && files.length > 0) {
                    this.loadModelFromFiles(Array.from(files));
                }
            });
        }
    }

    private setupViewButtons(): void {
        const buttons = document.querySelectorAll('.view-btn');
        buttons.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLElement;
                const view = target.dataset.view;
                if (view) {
                    this.setView(view);
                }
            });
        });

        const resetBtn = document.getElementById('reset-view');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetView());
        }

        const fullscreenBtn = document.getElementById('fullscreen');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }
    }

    private setupControlPanel(): void {
        // 预设背景颜色
        const bgButtons = document.querySelectorAll('.bg-btn');
        bgButtons.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLElement;
                const color = parseInt(target.dataset.bg || '0', 16);
                this.setBackground(color);
                this.updateActiveButton('.bg-btn', target);
            });
        });

        // 网格开关
        const gridBtn = document.getElementById('toggle-grid');
        if (gridBtn) {
            gridBtn.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLElement;
                const isActive = target.classList.toggle('active');
                this.setGridVisible(isActive);
            });
        }

        // 自动旋转开关
        const autoRotateBtn = document.getElementById('toggle-auto-rotate');
        if (autoRotateBtn) {
            autoRotateBtn.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLElement;
                const isActive = target.classList.toggle('active');
                this.setAutoRotate(isActive);
            });
        }
    }

    private setupColorPickers(): void {
        // 背景颜色
        const bgColorPicker = document.getElementById('bg-color-picker') as HTMLInputElement;
        if (bgColorPicker) {
            bgColorPicker.addEventListener('input', (e) => {
                const color = (e.target as HTMLInputElement).value;
                this.setBackground(this.hexToInt(color));
            });
        }

        // 环境光颜色
        const ambientPicker = document.getElementById('ambient-color') as HTMLInputElement;
        if (ambientPicker) {
            ambientPicker.addEventListener('input', (e) => {
                this.setAmbientLightColor(this.hexToInt((e.target as HTMLInputElement).value));
            });
        }

        // 主光源颜色
        const mainLightPicker = document.getElementById('main-light-color') as HTMLInputElement;
        if (mainLightPicker) {
            mainLightPicker.addEventListener('input', (e) => {
                this.setMainLightColor(this.hexToInt((e.target as HTMLInputElement).value));
            });
        }

        // 填充光颜色
        const fillLightPicker = document.getElementById('fill-light-color') as HTMLInputElement;
        if (fillLightPicker) {
            fillLightPicker.addEventListener('input', (e) => {
                this.setFillLightColor(this.hexToInt((e.target as HTMLInputElement).value));
            });
        }

        // 轮廓光颜色
        const rimLightPicker = document.getElementById('rim-light-color') as HTMLInputElement;
        if (rimLightPicker) {
            rimLightPicker.addEventListener('input', (e) => {
                this.setRimLightColor(this.hexToInt((e.target as HTMLInputElement).value));
            });
        }

        // 地面颜色
        const floorColorPicker = document.getElementById('floor-color') as HTMLInputElement;
        if (floorColorPicker) {
            floorColorPicker.addEventListener('input', (e) => {
                this.setFloorColor(this.hexToInt((e.target as HTMLInputElement).value));
            });
        }

        // 地面透明度
        const floorOpacitySlider = document.getElementById('floor-opacity') as HTMLInputElement;
        if (floorOpacitySlider) {
            floorOpacitySlider.addEventListener('input', (e) => {
                const opacity = parseFloat((e.target as HTMLInputElement).value);
                this.setFloorOpacity(opacity);
            });
        }

        // 地面透明开关
        const floorTransparentBtn = document.getElementById('floor-transparent');
        if (floorTransparentBtn) {
            floorTransparentBtn.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLElement;
                const isActive = target.classList.toggle('active');
                this.setFloorTransparent(isActive);
                if (isActive) {
                    this.setFloorOpacity(0);
                }
            });
        }

        // 背景图片上传
        const bgImageInput = document.getElementById('bg-image-input') as HTMLInputElement;
        if (bgImageInput) {
            bgImageInput.addEventListener('change', (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        const modeSelect = document.getElementById('bg-image-mode') as HTMLSelectElement;
                        const mode = (modeSelect?.value || 'cover') as BackgroundImageMode;
                        this.setImageBackground(ev.target?.result as string, mode);
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        // 背景图模式切换
        const bgImageModeSelect = document.getElementById('bg-image-mode') as HTMLSelectElement;
        if (bgImageModeSelect) {
            bgImageModeSelect.addEventListener('change', (e) => {
                const mode = (e.target as HTMLSelectElement).value as BackgroundImageMode;
                this.setBackgroundImageMode(mode);
            });
        }

        // 渐变背景
        const gradientBtn = document.getElementById('apply-gradient');
        if (gradientBtn) {
            gradientBtn.addEventListener('click', () => {
                const color1Input = document.getElementById('gradient-color1') as HTMLInputElement;
                const color2Input = document.getElementById('gradient-color2') as HTMLInputElement;
                if (color1Input && color2Input) {
                    this.setGradientBackground([color1Input.value, color2Input.value]);
                }
            });
        }

        // 透明背景
        const transparentBtn = document.getElementById('set-transparent');
        if (transparentBtn) {
            transparentBtn.addEventListener('click', () => {
                this.setTransparentBackground();
            });
        }
    }

    // ==========================================
    // 工具方法
    // ==========================================

    private hexToInt(hex: string): number {
        return parseInt(hex.replace('#', ''), 16);
    }

    private updateActiveButton(selector: string, activeBtn: Element): void {
        document.querySelectorAll(selector).forEach((btn) => {
            btn.classList.remove('active');
        });
        activeBtn.classList.add('active');
    }

    private loadConfigFromURL(): void {
        const params = new URLSearchParams(window.location.search);

        const bg = params.get('bg');
        if (bg) this.setBackground(parseInt(bg, 16));

        const bgImage = params.get('bgImage');
        if (bgImage) this.setImageBackground(bgImage);

        const model = params.get('model');
        if (model) {
            const format = this.detectFormat(model);
            this.loadModel(model, format);
        }
    }

    private loadDefaultModel(): void {
        const params = new URLSearchParams(window.location.search);
        const modelPath = params.get('model');

        if (modelPath) {
            const format = this.detectFormat(modelPath);
            this.loadModel(modelPath, format);
        }
    }

    // ==========================================
    // 模型加载
    // ==========================================

    public loadModelFromFile(file: File): void {
        this.loadModelFromFiles([file]);
    }

    /**
     * 从多个文件加载模型（支持 OBJ + MTL 同时选择）
     */
    public loadModelFromFiles(files: File[]): void {
        console.log('loadModelFromFiles', files);
        if (files.length === 0) return;

        // 分类文件
        const objFiles = files.filter(f => f.name.toLowerCase().endsWith('.obj'));
        const mtlFiles = files.filter(f => f.name.toLowerCase().endsWith('.mtl'));
        const otherFiles = files.filter(f =>
            !f.name.toLowerCase().endsWith('.obj') &&
            !f.name.toLowerCase().endsWith('.mtl')
        );

        // 处理 OBJ + MTL 组合
        if (objFiles.length > 0 && mtlFiles.length > 0) {
            this.loadOBJWithMTL(objFiles[0], mtlFiles[0]);
            return;
        }

        // 处理单个 MTL 文件（需要查找同名 OBJ）
        if (mtlFiles.length > 0 && objFiles.length === 0) {
            this.loadMTLFromFiles(files, mtlFiles[0]);
            return;
        }

        // 处理其他文件（取第一个）
        const file = otherFiles.length > 0 ? otherFiles[0] : files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            const url = e.target?.result as string;
            const ext = file.name.split('.').pop()?.toLowerCase() || 'gltf';

            this.modelName = file.name;
            this.updateModelName(file.name);

            if (this.model) {
                this.scene.remove(this.model);
                this.model = null;
                this.modelMaterials = [];
            }

            switch (ext) {
                case 'stl':
                    this.loadSTL(url);
                    break;
                case 'obj':
                    this.loadOBJ(url);
                    break;
                case 'mtl':
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
    private loadMTLFromFiles(files: File[], mtlFile: File): void {
        const mtlName = mtlFile.name.replace(/\.mtl$/i, '');

        // 查找同名 OBJ 文件
        const objFile = files.find(f =>
            f.name.toLowerCase().replace(/\.obj$/i, '') === mtlName.toLowerCase()
        );

        if (objFile) {
            this.loadOBJWithMTL(objFile, mtlFile);
        } else {
            // 没有同名 OBJ，尝试单独加载 MTL
            const reader = new FileReader();
            reader.onload = (e) => {
                const url = e.target?.result as string;
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
    private loadOBJWithMTL(objFile: File, mtlFile: File): void {
        this.modelName = objFile.name;
        this.updateModelName(objFile.name);

        if (this.model) {
            this.scene.remove(this.model);
            this.model = null;
            this.modelMaterials = [];
        }

        // 读取 OBJ 文件内容
        const objReader = new FileReader();
        objReader.onload = (e) => {
            const objUrl = e.target?.result as string;

            // 读取 MTL 文件内容
            const mtlReader = new FileReader();
            mtlReader.onload = (e2) => {
                const mtlUrl = e2.target?.result as string;

                // 创建 MTL 加载器
                const mtlLoader = new MTLLoader();

                // 解析 MTL 内容
                mtlLoader.load(
                    mtlUrl,
                    (materials) => {
                        materials.preload();

                        const objLoader = new OBJLoader();
                        objLoader.setMaterials(materials);

                        // 解析 OBJ 内容并加载
                        objLoader.load(
                            objUrl,
                            (object) => {
                                this.processOBJObject(object);
                                this.updateStatus('模型加载完成');
                            },
                            (xhr) => {
                                const progress = (xhr.loaded / xhr.total * 100).toFixed(0);
                                this.updateStatus(`加载中: ${progress}%`);
                            },
                            (error) => {
                                console.error('OBJ加载失败:', error);
                                this.updateStatus('模型加载失败');
                            }
                        );
                    },
                    undefined,
                    (error) => {
                        console.error('MTL解析失败:', error);
                        // MTL 加载失败，只加载 OBJ
                        const objLoader = new OBJLoader();
                        objLoader.load(
                            objUrl,
                            (object) => {
                                this.processOBJObject(object);
                                this.updateStatus('模型加载完成（无材质）');
                            },
                            (xhr) => {
                                const progress = (xhr.loaded / xhr.total * 100).toFixed(0);
                                this.updateStatus(`加载中: ${progress}%`);
                            },
                            (error) => {
                                console.error('OBJ加载失败:', error);
                                this.updateStatus('模型加载失败');
                            }
                        );
                    }
                );
            };
            mtlReader.readAsDataURL(mtlFile);
        };
        objReader.readAsDataURL(objFile);
    }

    public loadModel(path: string, format: ModelFormat = 'gltf'): void {
        this.modelName = path.split('/').pop() || '模型';
        this.updateModelName(this.modelName);

        if (this.model) {
            this.scene.remove(this.model);
            this.model = null;
            this.modelMaterials = [];
        }

        switch (format) {
            case 'stl':
                this.loadSTL(path);
                break;
            case 'obj':
                this.loadOBJ(path);
                break;
            case 'mtl':
                this.loadMTL(path);
                break;
            default:
                this.loadGLTF(path);
        }
    }

    /**
     * 加载 OBJ 模型
     */
    private loadOBJ(path: string): void {
        const loader = new OBJLoader();

        loader.load(
            path,
            (object) => {
                this.processOBJObject(object);
                this.updateStatus('模型加载完成');
            },
            (xhr) => {
                const progress = (xhr.loaded / xhr.total * 100).toFixed(0);
                this.updateStatus(`加载中: ${progress}%`);
            },
            (error) => {
                console.error('加载失败:', error);
                this.updateStatus('加载失败');
            }
        );
    }

    /**
     * 加载 MTL 模型
     */
    private loadMTL(path: string): void {
        const mtlLoader = new MTLLoader();

        mtlLoader.load(
            path,
            (materials) => {
                materials.preload();

                // 从 MTL 文件路径推断 OBJ 文件路径
                const objPath = path.replace(/\.mtl$/i, '.obj');

                const objLoader = new OBJLoader();
                objLoader.setMaterials(materials);

                objLoader.load(
                    objPath,
                    (object) => {
                        this.processOBJObject(object);
                        this.updateStatus('模型加载完成');
                    },
                    (xhr) => {
                        const progress = (xhr.loaded / xhr.total * 100).toFixed(0);
                        this.updateStatus(`加载中: ${progress}%`);
                    },
                    (error) => {
                        console.error('加载失败:', error);
                        this.updateStatus('加载失败 - 请确保同目录下有同名 .obj 文件');
                    }
                );
            },
            (xhr) => {
                const progress = (xhr.loaded / xhr.total * 100).toFixed(0);
                this.updateStatus(`加载中: ${progress}%`);
            },
            (error) => {
                console.error('MTL加载失败:', error);
                this.updateStatus('MTL加载失败');
            }
        );
    }

    /**
     * 处理 OBJ/MTL 加载后的对象
     */
    private processOBJObject(object: THREE.Object3D): void {
        // 计算包围盒并缩放
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 5) {
            const scale = 3 / maxDim;
            object.scale.setScalar(scale);
        }

        // 居中模型
        object.position.x = -center.x * (object.scale.x || 1);
        object.position.y = -box.min.y * (object.scale.y || 1);
        object.position.z = -center.z * (object.scale.z || 1);

        // 启用阴影并收集材质
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

    private loadSTL(path: string): void {
        const loader = new STLLoader();

        loader.load(
            path,
            (geometry) => {
                geometry.computeBoundingBox();
                const box = geometry.boundingBox;
                if (!box) return;

                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 3 / maxDim;

                const material = new THREE.MeshPhysicalMaterial({
                    color: 0x3388ff,
                    metalness: 0.6,
                    roughness: 0.3,
                    clearcoat: 0.5,
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

                this.updateStatus('模型加载完成');
            },
            (xhr) => {
                const progress = (xhr.loaded / xhr.total * 100).toFixed(0);
                this.updateStatus(`加载中: ${progress}%`);
            },
            (error) => {
                console.error('加载失败:', error);
                this.updateStatus('加载失败');
            }
        );
    }

    private loadGLTF(path: string): void {
        const loader = new GLTFLoader();

        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
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

                this.updateStatus('模型加载完成');
            },
            (xhr) => {
                const progress = (xhr.loaded / xhr.total * 100).toFixed(0);
                this.updateStatus(`加载中: ${progress}%`);
            },
            (error) => {
                console.error('加载失败:', error);
                this.updateStatus('加载失败');
            }
        );
    }

    // ==========================================
    // 视角控制
    // ==========================================

    public setView(viewName: string): void {
        const views: { [key: string]: ViewConfig } = {
            'default': { name: '默认', position: [5, 3, 5], target: [0, 0, 0] },
            'front': { name: '正面', position: [0, 1.5, 5], target: [0, 0.5, 0] },
            'side': { name: '侧面', position: [5, 1.5, 0], target: [0, 0.5, 0] },
            'back': { name: '背面', position: [0, 1.5, -5], target: [0, 0.5, 0] },
            'top': { name: '俯视', position: [0, 8, 0.1], target: [0, 0, 0] },
        };

        const view = views[viewName];
        if (!view) return;

        this.animateCamera(
            new THREE.Vector3(...view.position),
            new THREE.Vector3(...view.target)
        );

        document.querySelectorAll('.view-btn').forEach((btn) => {
            btn.classList.remove('active');
            if ((btn as HTMLElement).dataset.view === viewName) {
                btn.classList.add('active');
            }
        });
    }

    private animateCamera(targetPosition: THREE.Vector3, targetLookAt: THREE.Vector3): void {
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

    public resetView(): void {
        this.setView('default');
    }

    public toggleFullscreen(): void {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    // ==========================================
    // 模型调整
    // ==========================================

    public setModelColor(color: number): void {
        this.modelMaterials.forEach((mat) => {
            if ('color' in mat) {
                (mat as THREE.MeshStandardMaterial).color.setHex(color);
            }
        });
    }

    public setMetalness(value: number): void {
        this.modelMaterials.forEach((mat) => {
            if ('metalness' in mat) {
                (mat as THREE.MeshPhysicalMaterial).metalness = value;
            }
        });
    }

    public setRoughness(value: number): void {
        this.modelMaterials.forEach((mat) => {
            if ('roughness' in mat) {
                (mat as THREE.MeshPhysicalMaterial).roughness = value;
            }
        });
    }

    // ==========================================
    // 其他
    // ==========================================

    private detectFormat(path: string): ModelFormat {
        const ext = path.split('.').pop()?.toLowerCase();
        if (ext === 'stl') return 'stl';
        if (ext === 'obj') return 'obj';
        if (ext === 'mtl') return 'mtl';
        if (ext === 'glb') return 'glb';
        return 'gltf';
    }

    private onWindowResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    private updateStatus(message: string): void {
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.textContent = message;
        }
    }

    private updateModelName(name: string): void {
        const nameEl = document.getElementById('model-name');
        if (nameEl) {
            nameEl.textContent = name;
        }
    }

    private animate(): void {
        requestAnimationFrame(() => this.animate());

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    // 公开访问方法
    public getScene(): THREE.Scene { return this.scene; }
    public getCamera(): THREE.PerspectiveCamera { return this.camera; }
    public getRenderer(): THREE.WebGLRenderer { return this.renderer; }
}

// ==========================================
// 程序入口
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
    }, 500);

    const viewer = new ModelViewer();
    (window as unknown as { viewer: ModelViewer }).viewer = viewer;
});
