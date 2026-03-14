# 目录结构说明

本文档详细说明了 `threejs-car-showroom` 项目的目录结构和各文件的作用。

## 项目根目录

```
threejs-car-showroom/
├── index.html          # 主页面入口
├── main.ts             # TypeScript 源代码
├── main.js             # 编译后的 JavaScript
├── main.js.map         # Source Map 调试文件
├── style.css           # 样式文件
├── build.js            # 构建脚本
├── tsconfig.json       # TypeScript 配置
├── package.json        # 项目依赖配置
├── hua.stl             # 示例3D模型文件
├── README.md           # 项目说明文档
├── node_modules/       # 依赖包目录
└── old/                # 历史版本备份目录
```

## 文件详细说明

### 核心文件

| 文件名 | 类型 | 说明 |
|--------|------|------|
| `index.html` | HTML | 主页面，包含 Canvas 容器、控制面板 UI 和脚本引用 |
| `main.ts` | TypeScript | 核心业务逻辑，包含 `ModelViewer` 类和所有3D渲染功能 |
| `main.js` | JavaScript | 由 `main.ts` 编译生成的 JavaScript 文件，供浏览器运行 |
| `main.js.map` | Source Map | 源码映射文件，用于在浏览器调试时关联 TypeScript 源码 |
| `style.css` | CSS | 界面样式文件，包含暗色主题设计、动画效果和响应式布局 |
| `build.js` | JavaScript | esbuild 构建脚本，负责将 TypeScript 编译为 JavaScript |

### 配置文件

| 文件名 | 说明 |
|--------|------|
| `package.json` | NPM 项目配置，定义依赖包、脚本命令和项目元信息 |
| `tsconfig.json` | TypeScript 编译器配置，定义编译选项和类型检查规则 |

### 资源文件

| 文件名 | 说明 |
|--------|------|
| `hua.stl` | 示例3D模型文件（STL格式），用于演示模型加载功能 |

### 目录

| 目录名 | 说明 |
|--------|------|
| `node_modules/` | NPM 依赖包目录，包含 Three.js 及其相关库 |
| `old/` | 历史版本备份目录，用于存放废弃的文件（当前为空） |

## node_modules 目录结构

```
node_modules/
├── three/                  # Three.js 核心库
│   ├── src/               # 源代码
│   ├── examples/          # 示例和扩展
│   │   ├── jsm/           # ES Module 示例
│   │   │   ├── controls/  # 控制器（OrbitControls等）
│   │   │   ├── loaders/   # 模型加载器（GLTFLoader, STLLoader等）
│   │   │   ├── libs/      # 第三方库（DRACO等）
│   │   │   └── ...
│   │   └── ...
│   ├── package.json
│   └── ...
├── esbuild/               # 构建工具
└── ...
```

## 构建产物

运行 `npm run build` 后生成的文件：

| 文件名 | 说明 |
|--------|------|
| `main.js` | 打包合并后的 JavaScript 代码 |
| `main.js.map` | 源码映射文件 |

## 模块依赖关系

```
index.html
    ├── style.css (样式)
    └── main.js (逻辑)
        └── three (通过 node_modules 引用)
            ├── OrbitControls (相机控制)
            ├── GLTFLoader (GLTF模型加载)
            ├── STLLoader (STL模型加载)
            ├── OBJLoader (OBJ模型加载)
            └── MTLLoader (MTL材质加载)
```

## 开发工作流

1. **编写代码** - 在 `main.ts` 中编写 TypeScript 代码
2. **编译构建** - 运行 `npm run build` 或 `npm run dev`
3. **预览运行** - 通过本地服务器访问 `index.html`
4. **调试** - 使用浏览器开发者工具，通过 Source Map 调试 TypeScript 源码

## 添加新文件的规范

- TypeScript 源文件应放在根目录
- 公共资源（图片、模型等）放在根目录或新建 `assets/` 目录
- 组件化代码可新建 `src/` 目录组织
- 配置文件使用 JSON 格式
