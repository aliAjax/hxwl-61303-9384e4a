# 电梯维保路线看板

楼盘电梯维保周期、到期风险和完成状态管理看板。基于 Vite + React 构建，采用事件溯源（Event Sourcing）架构管理核心业务状态。

---

## 快速开始

### 环境要求

- Node.js `>= 18.x`（推荐 `20.x LTS`）
- npm `>= 9.x`（随 Node.js 一同安装）

### 本地开发

```bash
# 1. 安装依赖（首次或 package.json / package-lock.json 变更后）
npm install

# 2. 启动开发服务器
npm run dev
```

默认端口：`61303`，访问 http://localhost:61303

### 生产构建

```bash
npm run build
npm run preview   # 本地预览构建产物
```

构建产物位于 `dist/` 目录。

---

## 质量门禁与发布前检查

项目内建了一套可复现的质量门禁流程，**任何提交 / 发布前必须通过**。

### 一键执行完整检查

```bash
npm run ci:check
```

该命令会依次执行：
1. **类型检查** — `npm run typecheck`（TypeScript Compiler 检查 allowJs 模式下的语法与类型）
2. **单元测试** — `npm test`（Vitest 运行所有 `*.test.js`）

### 各命令详解

| 命令 | 说明 | 什么时候用 |
|------|------|-----------|
| `npm run dev` | 启动开发服务器（HMR） | 日常编码调试 |
| `npm run typecheck` | 运行 TSC 类型检查，发现即停 | 编码过程中随时检查 |
| `npm run typecheck:watch` | 监听模式下的类型检查 | 专注修复类型问题时 |
| `npm test` | 一次性运行所有单元测试 | 提交代码前 / CI 环境 |
| `npm run test:watch` | Vitest watch 模式，变更即重跑 | TDD 开发 / 写测试时 |
| `npm run test:coverage` | 运行测试并生成覆盖率报告 | 评估测试覆盖度 |
| `npm run ci:check` | 类型检查 + 测试串联 | **发布前必须执行** |
| `npm run build` | ci:check 通过后才执行 Vite 构建 | 生成生产包 |

### 自动触发点

- `npm run build` 前会自动执行 `prebuild → ci:check`，不通过则构建失败
- `npm pack` 发布打包前会自动执行 `prepack → ci:check`

---

## 测试覆盖范围

测试文件命名约定：与被测模块同目录，后缀 `.test.js`。

| 模块 | 测试文件 | 覆盖核心逻辑 |
|------|---------|-------------|
| [eventStore.js](src/eventStore.js) | [eventStore.test.js](src/eventStore.test.js) | 事件溯源回放、记录 CRUD、状态流转、路线规划、自动计划、合并与冲突检测、快照机制、EventStore 类 |
| [recordUtils.js](src/recordUtils.js) | [recordUtils.test.js](src/recordUtils.test.js) | 记录变更检测、增量 ID 计算、持久化标准化（updatedAt / businessKey） |
| [dataImportExport.js](src/dataImportExport.js) | [dataImportExport.test.js](src/dataImportExport.test.js) | 数据迁移、冲突检测、合并策略、数据校验、时间线去重排序、导入导出格式验证 |
| [textImport.js](src/textImport.js) | [textImport.test.js](src/textImport.test.js) | 多分隔符文本解析、表头识别、字段映射、导入记录校验 |

**新增测试时请遵循：**
- 优先覆盖"纯函数"逻辑（无 DOM / 无副作用）
- 每一个 describe 对应一个被测函数，每一个 it 聚焦一个场景
- 测试必须独立可重复（不要依赖执行顺序）

---

## CI 持续集成

配置文件位于 [`.github/workflows/ci.yml`](.github/workflows/ci.yml)，在以下时机自动执行：

- Push 到 `main` / `master` / `develop` / `feature/*` 分支
- 向 `main` / `master` / `develop` 发起 Pull Request

### 流水线阶段

| Job | 运行环境 | 执行内容 |
|-----|---------|---------|
| `quality-gate` (Node 18, 20) | Ubuntu | `npm ci` → 类型检查 → 单元测试 → 生产构建 |
| `test-windows` | Windows | `npm ci` → 单元测试（跨平台兼容性） |

### CI 本地复现

要在本地严格复现 CI 行为（使用 `package-lock.json` 锁定依赖）：

```bash
rm -rf node_modules
npm ci             # 严格按 lockfile 安装
npm run ci:check   # 类型检查 + 测试
npm run build      # 构建验证
```

---

## 代码架构与约束

### 技术栈

- **构建工具**：Vite (latest)
- **框架**：React 18 (JSX, allowJs=true, 非严格 TS 模式)
- **类型系统**：TypeScript 作为检查器，不强制类型标注
- **测试框架**：Vitest + `vi` Mock
- **图标**：lucide-react

### 目录结构

```
src/
├── App.jsx                   # 主视图组件（业务逻辑聚合点，后续可增量拆分）
├── App.css                   # 样式
├── main.jsx                  # 入口
├── eventStore.js             # ✅ 事件溯源核心（已抽离，有测试）
├── recordUtils.js            # ✅ 记录变更检测（已抽离，有测试）
├── dataImportExport.js       # ✅ 导入导出合并校验（已抽离，有测试）
├── textImport.js             # ✅ 文本导入解析（已抽离，有测试）
├── dataStorage.js            # localStorage 默认配置管理
├── *.test.js                 # 同目录测试文件
```

### 演进策略

项目最初业务逻辑集中在 `App.jsx`。质量门禁落地后，**建议按以下优先级增量重构**：

1. **新增业务逻辑一律抽到独立模块并写测试**（不再向 App.jsx 堆积）
2. **修改 App.jsx 中的已有逻辑时**：顺手提取到 `eventStore.js` 或新建 `*.js` 模块，补对应测试
3. **不强制一次性拆分完 App.jsx**，但每次改动必须让它变得更小

---

## 最小闭环功能

- 新增、筛选、删除业务记录
- 本地存储 (localStorage) 持久化 + 事件溯源快照机制
- 状态流转、详情查看与 timeline 追踪
- 场景化统计与分组视图（看板 / 路线规划 / 自动排程）
- JSON 格式数据导入导出与设备间合并
- 多分隔符文本批量导入

---

## 常见问题

**Q: 类型检查提示 App.jsx 有错怎么办？**
A: 项目处于 allowJs + 非 strict 模式，大部分提示仅为告警。若导致 `npm run build` 失败，请优先处理：
  - `tsconfig.json` 的 `strict` 暂保持 `false`，避免一次性引入海量错误
  - 可以用 `// @ts-nocheck` 临时抑制（仅用于旧代码）
  - 新模块建议加 `// @ts-check` 享受类型提示

**Q: 测试里 localStorage 报错？**
A: Vitest 已通过 `globalThis.localStorage` Mock 注入（参考 eventStore.test.js 的 beforeEach）。新测试若依赖存储，请同样设置。

**Q: 想加覆盖率阈值？**
A: 编辑 `vitest.config.js` 添加：
```js
coverage: {
  thresholds: {
    lines: 80,
    functions: 80,
    branches: 70
  }
}
```
