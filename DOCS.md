# Zoom 桌游数字化平台 - 项目文档

## 目录

1. [项目概述](#项目概述)
2. [技术栈](#技术栈)
3. [项目结构](#项目结构)
4. [数据模型](#数据模型)
5. [API 接口](#api-接口)
6. [前端页面](#前端页面)
7. [游戏组件](#游戏组件)
8. [核心功能](#核心功能)
9. [部署配置](#部署配置)
10. [开发指南](#开发指南)
11. [注意事项](#注意事项)

---

## 项目概述

这是一个基于 Next.js 开发的桌游数字化平台，用于管理和进行卡牌类桌游。系统支持：

- **卡牌库管理**：录入、编辑、删除各类卡牌（技能卡、玩家角色卡、敌人卡、资源卡、地图卡、支援卡、Boss卡、日夜卡、特殊人物卡）
- **版本管理**：管理敌人卡和地图卡的版本/扩展包（如"狂热"、"瘟疫"等）
- **战役定义**：从卡牌库中选择卡牌组合成战役牌库，支持为资源卡分配颜色和数量
- **多人游戏**：支持多名玩家同时进行游戏，支持WebSocket实时同步
- **游戏面板**：包含地图、多种牌堆、玩家信息、敌人/Boss/支援管理等完整游戏界面
- **存档系统**：自动保存游戏进度，支持继续游戏

---

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 16.0.10 | 前端框架 (App Router) |
| React | 19.2.1 | UI 库 |
| TypeScript | ^5 | 类型安全 |
| MongoDB | - | 数据库 |
| Mongoose | 9.0.1 | MongoDB ODM |
| Tailwind CSS | ^4 | 样式框架 |
| Lucide React | 0.561.0 | 图标库 |
| WebSocket (ws) | - | 实时同步 |
| Caddy | 2.x | 反向代理/HTTPS |

### 数据库连接

默认连接字符串（可通过 `MONGODB_URI` 环境变量覆盖）：
```
mongodb://admin:d2bdagc8aq48ats015b0@127.0.0.1:27017/zoom_game?authSource=admin
```

---

## 项目结构

```
zoom/
├── app/                          # Next.js App Router
│   ├── admin/                    # 管理后台
│   │   ├── cards/page.tsx        # 卡牌管理页面（含版本管理）
│   │   └── campaigns/            # 战役管理
│   │       ├── page.tsx          # 战役列表页面
│   │       ├── new/page.tsx      # 创建新战役
│   │       └── [id]/
│   │           ├── page.tsx      # 查看战役详情
│   │           └── edit/page.tsx # 编辑战役
│   ├── api/                      # API 路由
│   │   ├── cards/                # 卡牌 CRUD API
│   │   │   ├── route.ts          # GET (列表) / POST (创建)
│   │   │   └── [id]/route.ts     # GET / PUT / DELETE
│   │   ├── campaigns/            # 战役 CRUD API
│   │   │   ├── route.ts          # GET / POST
│   │   │   └── [id]/route.ts     # GET / PUT / DELETE
│   │   ├── editions/             # 版本管理 API
│   │   │   ├── route.ts          # GET / POST
│   │   │   └── [id]/route.ts     # GET / PUT / DELETE
│   │   └── game-sessions/        # 游戏存档 API
│   │       ├── route.ts          # GET / POST
│   │       └── [id]/route.ts     # GET / PUT / DELETE
│   ├── game/                     # 游戏模块
│   │   ├── setup/page.tsx        # 游戏设置页面（选择战役和角色）
│   │   ├── sessions/page.tsx     # 存档列表页面
│   │   ├── player/page.tsx       # 玩家移动端页面
│   │   └── play/                 # 游戏主面板
│   │       ├── page.tsx          # 游戏主页面
│   │       ├── types.ts          # 类型定义
│   │       ├── utils/            # 工具函数
│   │       │   └── cardUtils.ts  # 卡牌处理工具（弃牌逻辑等）
│   │       └── components/       # 游戏组件
│   │           ├── index.ts      # 组件导出
│   │           ├── PlayerCard.tsx
│   │           ├── PlayerList.tsx
│   │           ├── PlayerDetailModal.tsx
│   │           ├── PlayerDiscardModal.tsx
│   │           ├── EnemyCard.tsx
│   │           ├── EnemyList.tsx
│   │           ├── StatMini.tsx
│   │           ├── TopBar.tsx           # 顶部栏（牌堆、弃牌区）
│   │           ├── MapSetupPanel.tsx    # 地图设置面板
│   │           ├── MapMarkers.tsx       # 地图标记组件
│   │           ├── PublicDiscardModal.tsx   # 公共弃牌堆弹窗
│   │           ├── MapDiscardModal.tsx      # 地图弃牌堆弹窗
│   │           ├── CombinedDiscardModal.tsx # 合并弃牌区弹窗
│   │           ├── SpecialCharacterModal.tsx # 特殊人物牌选择弹窗
│   │           ├── DeckPickModal.tsx        # Boss牌选择弹窗
│   │           ├── AddMarkerModal.tsx       # 添加标记弹窗
│   │           └── EquipmentPreviewModal.tsx # 装备预览弹窗
│   ├── globals.css               # 全局样式
│   ├── layout.tsx                # 根布局
│   └── page.tsx                  # 首页
├── lib/
│   └── db.ts                     # 数据库连接工具
├── models/                       # Mongoose 数据模型
│   ├── Card.ts                   # 卡牌模型
│   ├── Campaign.ts               # 战役模型
│   ├── Edition.ts                # 版本模型
│   └── GameSession.ts            # 游戏存档模型
├── public/
│   └── uploads/                  # 上传的卡牌图片
├── server.js                     # 自定义服务器（WebSocket + 静态文件）
└── package.json
```

---

## 数据模型

### 1. Card（卡牌）

**文件**: `models/Card.ts`

```typescript
type CardType = 'SKILL' | 'PLAYER' | 'ENEMY' | 'RESOURCE' | 'MAP' | 'SUPPORT' | 'BOSS' | 'DAYNIGHT' | 'SPECIAL_CHARACTER';

interface ICard {
  name: string;           // 卡牌名称
  imgUrl: string;         // 图片路径（如 /uploads/card-xxx.jpg）
  description: string;    // 卡牌描述
  type: CardType;         // 卡牌类型
  
  // 技能卡特有字段
  skillType?: string;     // 技能类型
  role?: string;          // 所属角色（用于判断技能卡归属）
  level?: number;         // 等级
  cost?: number;          // 费用
  count?: number;         // 数量（默认1）

  // 玩家/敌人/Boss/支援/特殊人物卡特有字段
  hp?: number;            // 血量
  stealth?: number;       // 潜行值（玩家卡）
  attack?: number;        // 攻击值（敌人卡/Boss卡）

  // 资源卡特有字段
  resourceType?: string;  // 资源类型

  // 敌人卡/地图卡/支援卡/Boss卡/日夜卡/特殊人物卡特有字段
  edition?: string;       // 版本/扩展包名称
}
```

**卡牌类型说明**：

| 类型 | 说明 | 特有字段 |
|------|------|----------|
| SKILL | 技能卡 | skillType, role, level, cost, count |
| PLAYER | 玩家角色卡 | hp, stealth |
| ENEMY | 敌人卡 | hp, attack, edition |
| RESOURCE | 资源卡 | resourceType |
| MAP | 地图卡 | edition |
| SUPPORT | 支援卡 | hp, attack, edition |
| BOSS | Boss卡 | hp, attack, edition |
| DAYNIGHT | 日夜卡 | edition |
| SPECIAL_CHARACTER | 特殊人物卡 | hp, attack, edition |

---

### 2. Edition（版本）

**文件**: `models/Edition.ts`

```typescript
interface IEdition {
  name: string;           // 版本名称（唯一）
  description?: string;   // 版本描述
  color?: string;         // 显示颜色
  createdAt: Date;
  updatedAt: Date;
}
```

**设计说明**：
- 用于管理敌人卡、地图卡及其他特殊卡牌的扩展包/版本
- 战役编辑时可按版本分组显示卡牌
- 不同版本使用动态颜色区分显示

---

### 3. Campaign（战役）

**文件**: `models/Campaign.ts`

```typescript
interface ICampaignCard {
  card: ObjectId;         // 关联的卡牌ID
  color?: 'RED' | 'BLUE' | 'GREEN' | 'SHOP';  // 资源卡颜色
  count?: number;         // 数量（仅资源卡使用，默认1）
}

interface ICampaign {
  name: string;           // 战役名称（唯一）
  cards: ICampaignCard[]; // 包含的卡牌列表
  createdAt: Date;
  updatedAt: Date;
}
```

**设计说明**：
- 资源卡的颜色和数量在创建战役时分配，支持红/蓝/绿/商店四种颜色
- 例如：同一张"治疗药水"可配置为"红色x3"和"蓝色x2"
- 战役编辑时**不包含技能卡**，技能卡由玩家角色决定
- 战役编辑时**不选择玩家角色**，角色在开始游戏时选择
- 支持所有卡牌类型的选择和分页浏览（每页20张）

---

### 4. GameSession（游戏存档）

**文件**: `models/GameSession.ts`

```typescript
// 装备
interface IEquipment {
  card: any;              // 装备的卡牌数据
  labels: string[];       // 标签列表（如 "已强化"、"+2攻击"）
  ammo: number;           // 弹药数量
}

// 玩家
interface IPlayer {
  id: string;             // 玩家唯一ID
  roleCard: any;          // 角色卡数据
  name: string;           // 角色名
  imgUrl: string;         // 头像
  color: string;          // 玩家颜色标识
  hp: number;             // 当前血量
  maxHp: number;          // 最大血量
  stealth: number;        // 潜行值
  hunger: number;         // 饥饿值
  gold: number;           // 金币
  tags: string[];         // 状态标签（如 "中毒"、"麻痹"）
  handResource: any[];    // 手牌-资源卡
  handSkill: any[];       // 手牌-技能卡
  discard: any[];         // 个人弃牌堆（技能卡弃牌）
  skillDeck: any[];       // 技能牌堆
  skillDiscard: any[];    // 技能牌弃牌堆
  equipment: IEquipment[]; // 装备栏
  x: number;              // 地图上的X坐标（百分比）
  y: number;              // 地图上的Y坐标（百分比）
}

// 地图板块
interface IPlacedMapTile {
  cardId: string;
  cardData: any;
  revealed: boolean;      // 是否已翻开
}

// 地图标记
interface IMapMarker {
  id: string;             // 标记唯一ID
  text: string;           // 标记文本
  color: string;          // 标记颜色
  x: number;              // X坐标（百分比）
  y: number;              // Y坐标（百分比）
}

// 战场上的敌人/Boss/支援/特殊人物
interface IActiveEnemy {
  id: string;             // 唯一ID
  card: any;              // 卡牌数据
  currentHp: number;      // 当前血量
  maxHp: number;          // 最大血量
  boundToPlayerId?: string; // 绑定的玩家ID
}

// 游戏存档
interface IGameSession {
  name: string;           // 存档名称
  campaignId: ObjectId;   // 关联战役
  campaignName: string;   // 战役名称
  
  // 多玩家支持
  players: IPlayer[];
  
  // 地图状态
  placedMap: (IPlacedMapTile | null)[];  // 9x9网格，共81格
  unplacedMapCards: any[];               // 未放置的地图卡
  terrainGrid: boolean[];                // 地形网格（可放置区域）
  mapMarkers: IMapMarker[];              // 地图标记
  mapDiscard: any[];                     // 地图弃牌堆
  
  // 共享牌堆
  redDeck: any[];         // 红色资源牌堆
  blueDeck: any[];        // 蓝色资源牌堆
  greenDeck: any[];       // 绿色资源牌堆
  shopDeck: any[];        // 商店资源牌堆
  enemyDeck: any[];       // 敌人牌堆
  supportDeck: any[];     // 支援牌堆
  bossDeck: any[];        // Boss牌堆
  daynightDeck: any[];    // 日夜牌堆
  specialCharacterDeck: any[];  // 特殊人物牌堆
  
  // 共享弃牌堆
  publicDiscard: any[];   // 公共弃牌堆（资源卡）
  enemyDiscard: any[];    // 敌人弃牌堆
  supportDiscard: any[];  // 支援弃牌堆
  bossDiscard: any[];     // Boss弃牌堆
  daynightDiscard: any[]; // 日夜弃牌堆
  specialCharacterDiscard: any[];  // 特殊人物弃牌堆
  
  // 战场实体
  activeEnemies: IActiveEnemy[];          // 战场敌人
  activeBosses: IActiveEnemy[];           // 战场Boss
  activeSupports: IActiveEnemy[];         // 战场支援
  activeSpecialCharacters: IActiveEnemy[];// 战场特殊人物
  
  // 游戏状态
  gameStarted: boolean;   // 是否已开始（地图布局完成）
  
  createdAt: Date;
  updatedAt: Date;
}
```

---

## API 接口

### 卡牌 API

#### `GET /api/cards`
获取卡牌列表，支持查询参数过滤和分页。

**Query 参数**：
- `type`: 卡牌类型 (SKILL/PLAYER/ENEMY/RESOURCE/MAP/SUPPORT/BOSS/DAYNIGHT/SPECIAL_CHARACTER)
- `edition`: 版本名称
- `page`: 页码（从1开始）
- `limit`: 每页数量
- 其他字段均可作为过滤条件

**响应**：
```json
{
  "success": true,
  "data": [{ "_id": "...", "name": "...", "type": "SKILL", "edition": "狂热", ... }],
  "pagination": { "page": 1, "limit": 20, "total": 100 }
}
```

#### `POST /api/cards`
创建卡牌，支持图片上传。

**请求**：`multipart/form-data`
- `image`: 图片文件
- `edition`: 版本名称
- 其他字段：卡牌属性

#### `GET /api/cards/[id]`
获取单张卡牌详情。

#### `PUT /api/cards/[id]`
更新卡牌，支持图片上传。

#### `DELETE /api/cards/[id]`
删除卡牌。

---

### 版本 API

#### `GET /api/editions`
获取所有版本列表。

#### `POST /api/editions`
创建新版本。

**请求体**：
```json
{
  "name": "狂热",
  "description": "狂热扩展包",
  "color": "#ff6b6b"
}
```

#### `GET /api/editions/[id]`
获取版本详情。

#### `PUT /api/editions/[id]`
更新版本。

#### `DELETE /api/editions/[id]`
删除版本。

---

### 战役 API

#### `GET /api/campaigns`
获取战役列表（自动填充卡牌详情）。

#### `POST /api/campaigns`
创建战役。

**请求体**：
```json
{
  "name": "战役一",
  "cards": [
    { "card": "卡牌ID", "color": "RED", "count": 3 },
    { "card": "卡牌ID", "color": "SHOP", "count": 2 },
    { "card": "卡牌ID" }
  ]
}
```

#### `GET /api/campaigns/[id]`
获取战役详情。

#### `PUT /api/campaigns/[id]`
更新战役。

#### `DELETE /api/campaigns/[id]`
删除战役。

---

### 游戏存档 API

#### `GET /api/game-sessions`
获取存档列表。

**Query 参数**：
- `campaignId`: 按战役过滤

#### `POST /api/game-sessions`
创建新存档。

#### `GET /api/game-sessions/[id]`
获取存档详情。

#### `PUT /api/game-sessions/[id]`
更新存档（自动保存游戏进度）。

#### `DELETE /api/game-sessions/[id]`
删除存档。

---

## 前端页面

### 1. 首页 (`/`)
游戏主菜单，包含：
- 进入管理后台
- 开始新游戏
- 继续游戏（查看存档）

### 2. 卡牌管理 (`/admin/cards`)
功能：
- 查看所有卡牌（按类型分组，分页显示每页20张）
- 创建新卡牌（支持图片上传）
- 编辑现有卡牌
- 删除卡牌
- **版本管理**：创建、编辑、删除版本
- 支持所有卡牌类型：技能卡、玩家卡、敌人卡、资源卡、地图卡、支援卡、Boss卡、日夜卡、特殊人物卡

### 3. 战役管理

#### 战役列表 (`/admin/campaigns`)
- 查看所有战役
- 显示战役创建时间和卡牌数量
- 提供查看、编辑、删除操作

#### 创建战役 (`/admin/campaigns/new`)
- 输入战役名称
- **资源卡选择**：点击颜色按钮（红/蓝/绿/商店）添加配置，支持同一卡牌多种颜色配置，可设置数量
- **敌人卡/地图卡/支援卡/Boss卡/日夜卡/特殊人物卡选择**：按版本分组显示，支持折叠/展开，不同版本使用不同颜色标签
- **分页功能**：每页显示20张卡牌，可翻页浏览
- **搜索功能**：按名称搜索卡牌
- **不包含技能卡和玩家角色**

#### 查看战役 (`/admin/campaigns/[id]`)
- 只读显示战役详情
- 按类型分组显示卡牌
- 资源卡显示颜色和数量
- 敌人卡/地图卡/其他卡牌按版本分组

#### 编辑战役 (`/admin/campaigns/[id]/edit`)
- 修改战役名称
- 同创建页面的卡牌选择功能
- 分页显示所有卡牌
- 删除战役

### 4. 游戏设置 (`/game/setup`)
功能：
- 选择战役
- 选择参与的玩家角色（多选）
- 开始游戏

### 5. 存档列表 (`/game/sessions`)
功能：
- 查看所有游戏存档
- 继续游戏
- 删除存档

### 6. 游戏面板 (`/game/play`)
核心游戏界面，包含：
- **地图区域**（9x9网格，支持拖拽滚动）
- 玩家列表（左侧）
- 敌人/Boss/支援/特殊人物列表（右侧）
- 资源牌堆（红/蓝/绿/商店）
- 敌人牌堆、支援牌堆、Boss牌堆、日夜牌堆、特殊人物牌堆
- 公共弃牌堆（资源卡）
- 合并弃牌区（敌人/Boss/支援/日夜/特殊人物）
- 地图弃牌堆
- 地图标记功能

### 7. 玩家移动端页面 (`/game/player`)
功能：
- 移动端适配的玩家界面
- 实时同步游戏状态
- 查看手牌和装备
- 抽牌（红/蓝/绿/商店/技能）
- 管理自己的卡牌

---

## 游戏组件

### TopBar
顶部工具栏，包含：
- **左侧区域**：
  - 资源牌堆（红/蓝/绿/商店）及数量显示
  - 公共弃牌堆按钮
  - 地图弃牌堆按钮
  - 添加地图标记按钮
- **中间区域**：
  - 战役名称
- **右侧区域**：
  - 敌人牌堆及数量
  - 支援牌堆（点击抽一张到战场）
  - Boss牌堆（点击打开选择弹窗）
  - 日夜牌堆（点击抽一张到打出区域）
  - 特殊人物牌堆（点击打开选择弹窗）
  - 合并弃牌区按钮（显示总数量）
  - 分享按钮（生成玩家链接）
  - 保存按钮及状态显示

### MapSetupPanel
地图设置面板（游戏开始前）：
- 地形编辑（设置可放置区域）
- 地图卡拖放到指定位置
- 随机放置剩余地图卡
- 开始游戏按钮

### MapMarkers
地图标记组件：
- 显示自定义文本标记
- 支持自由拖拽定位
- 短文本显示为圆形，长文本自动切换为矩形
- 可自定义颜色

### PlayerCard
玩家信息卡片，显示：
- 头像、名称
- 血量、潜行值、饥饿值
- 金币（可直接加减）
- 手牌/弃牌数量
- 装备栏（缩略图+标签+弹药）
- 抽牌按钮（红/蓝/绿/商店/技能）

### PlayerDetailModal
玩家详情弹窗，功能：
- 查看/修改属性
- 添加/移除状态标签
- 管理手牌：
  - **装备**：将卡牌移入装备栏
  - **弃牌**：资源卡→公共弃牌堆，技能卡→原主人弃牌堆
  - **打出**：使用卡牌效果后弃牌
  - **赠送**：将卡牌送给其他玩家
- 管理装备（添加标签/调整弹药/卸下）
- 赠送的技能卡显示"来自 XXX"标识

### PublicDiscardModal
公共弃牌堆弹窗：
- 查看所有弃掉的资源卡
- 可将卡牌放回指定玩家手牌

### MapDiscardModal
地图弃牌堆弹窗：
- 查看所有移除的地图卡
- 支持拖拽地图卡放回地图网格
- 卡牌显示尺寸适配网格大小
- 有效放置区域高亮显示

### CombinedDiscardModal
合并弃牌区弹窗：
- 标签页切换：敌人/Boss/支援/日夜/特殊人物
- 显示各类型的弃牌数量
- **敌人/Boss/支援/特殊人物**：可放回战场或放回牌库
- **日夜**：只能放回牌库
- 显示卡牌图片和属性

### SpecialCharacterModal
特殊人物牌选择弹窗：
- 显示特殊人物牌库中的所有卡牌
- 点击卡牌直接放入战场

### DeckPickModal
Boss牌选择弹窗：
- 显示Boss牌库中的所有卡牌
- 点击卡牌直接放入战场

### EnemyCard
敌人/Boss/支援/特殊人物信息卡片，显示：
- 卡牌图片
- 类型标识（Boss/支援/特殊人物显示不同颜色）
- 攻击力
- 当前血量（可加减）
- 绑定玩家选择
- 弃牌按钮

### EnemyList
敌人列表区域，功能：
- 从敌人牌堆抽取敌人
- 分区显示：敌人、Boss、支援、特殊人物
- 不同类型使用不同背景色区分
- 血量调整和玩家绑定
- 弃牌操作

### StatMini
小型属性显示组件，用于显示：
- 图标
- 数值
- 加减按钮

---

## 核心功能

### 1. 地图系统
- **9x9 网格布局**（可配置）
- 地形编辑：设置可放置地图卡的区域
- 手动拖放地图卡到指定位置
- 随机放置剩余地图卡（默认不翻开）
- 地图卡操作：
  - **翻开**：点击查看地图内容
  - **翻回**：将已翻开的地图卡翻回未知面
  - **移动**：将地图卡移动到其他位置
  - **移除**：将地图卡移入弃牌堆
- **地图标记**：添加自定义文本标记，可自由拖拽
- **地图弃牌堆**：移除的地图卡可重新拖回地图
- 玩家头像可在地图上自由拖拽

### 2. 牌堆系统

#### 资源牌堆
- 四个资源牌堆：红/蓝/绿/商店
- 点击牌堆抽牌到玩家手牌
- 弃牌统一进入公共弃牌堆

#### 敌人牌堆
- 点击抽取敌人到战场
- 敌人弃牌后进入敌人弃牌区
- 可从弃牌区恢复到战场或牌库

#### 支援牌堆
- 点击抽取一张支援到战场
- 支援在敌人列表中显示
- 可调整血量、绑定玩家
- 弃牌后进入支援弃牌区

#### Boss牌堆
- 点击打开选择弹窗
- 自由选择任意Boss放入战场
- Boss在敌人列表中显示（橙色背景）
- 弃牌后进入Boss弃牌区
- 可从弃牌区恢复到战场或牌库

#### 日夜牌堆
- 点击抽取一张日夜牌
- 日夜牌显示在"打出牌"区域
- 新抽取的日夜牌会覆盖之前的
- 弃牌后进入日夜弃牌区

#### 特殊人物牌堆
- 点击打开选择弹窗
- 自由选择任意特殊人物放入战场
- 特殊人物在敌人列表中显示（粉色背景）
- 弃牌后进入特殊人物弃牌区
- 可从弃牌区恢复到战场或牌库

### 3. 卡牌操作
- **装备**：将手牌移入装备栏
- **弃牌**：
  - 资源卡 → 公共弃牌堆
  - 技能卡 → 原主人的弃牌堆（根据 `role` 字段判断）
- **打出**：使用卡牌效果后进入弃牌流程
- **赠送**：将手牌送给其他玩家
  - 赠送的技能卡会显示原主人信息
  - 弃牌时仍返回原主人弃牌堆

### 4. 多玩家系统
- 每个玩家有独立的：
  - 属性（血量、潜行、饥饿、金币）
  - 状态标签
  - 手牌（资源+技能）
  - 技能牌堆和弃牌堆
  - 个人弃牌堆
  - 装备栏
  - 地图位置
- 技能卡根据角色自动分配
- WebSocket实时同步游戏状态

### 5. 敌人/Boss/支援/特殊人物管理
- 从各自牌堆抽取/选择到战场
- 实时调整血量
- 绑定到玩家
- 击败后移入各自弃牌堆
- 从弃牌堆恢复（战场或牌库）
- 不同类型使用不同颜色区分

### 6. 自动存档
- 游戏状态变化时每5秒自动保存
- 手动保存按钮
- 显示保存状态和时间
- 支持继续之前的游戏
- 保存内容包括：地图状态、标记、所有牌堆、所有弃牌区、战场实体、玩家数据等

---

## 部署配置

### 服务器架构

```
Cloudflare (DNS/CDN)
       ↓
Caddy (反向代理/HTTPS)
       ↓
┌──────┴──────┐
│  Port 3000  │ Next.js HTTP 服务
│  Port 3001  │ WebSocket 服务
└─────────────┘
```

### Caddy 配置

配置文件：`/etc/caddy/Caddyfile`

```caddyfile
zoom.prudentiai.com.cn {
    reverse_proxy localhost:3000

    # WebSocket 支持
    @websocket {
        header Connection *Upgrade*
        header Upgrade websocket
    }
    reverse_proxy @websocket localhost:3001
}
```

### 启动命令

```bash
# 开发环境
npm run dev

# 生产环境
npm run build
NODE_ENV=production node server.js

# Caddy 服务
sudo systemctl start caddy
sudo systemctl enable caddy
```

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| MONGODB_URI | MongoDB 连接字符串 | mongodb://admin:xxx@127.0.0.1:27017/zoom_game?authSource=admin |
| PORT | HTTP 服务端口 | 3000 |
| WS_PORT | WebSocket 端口 | 3001 |

---

## 开发指南

### 本地运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器（含WebSocket）
node server.js
```

### 添加新卡牌类型

1. 修改 `models/Card.ts`：
   - 在 `CardType` 中添加新类型
   - 在 `ICard` 接口中添加特有字段
   - 更新 `CardSchema`

2. 修改 `app/admin/cards/page.tsx`：
   - 在 `cardTypes` 中添加显示名称
   - 在表单中添加新字段的输入

3. 修改 `app/game/play/types.ts`：
   - 更新 `CardType` 类型
   - 更新 `GameState` 接口（牌堆、弃牌堆等）

4. 修改 `models/GameSession.ts`：
   - 添加新的牌堆和弃牌堆字段

5. 修改战役管理页面：
   - 确保新类型在卡牌分组中正确显示

6. 修改 `app/game/play/page.tsx`：
   - 添加新牌堆的状态和操作函数

### 添加新游戏功能

1. 更新 `app/game/play/types.ts` 添加新类型
2. 更新 `models/GameSession.ts` 以持久化新数据
3. 如需通用逻辑，在 `utils/cardUtils.ts` 中添加
4. 在 `app/game/play/page.tsx` 中添加状态和逻辑
5. 如需新组件，在 `components/` 目录创建并在 `index.ts` 中导出

### 添加新 API

1. 在 `app/api/` 下创建路由文件
2. Next.js 15 中动态参数是 Promise，需要 await：
   ```typescript
   export async function GET(
     request: Request, 
     props: { params: Promise<{ id: string }> }
   ) {
     const params = await props.params;
     const id = params.id;
     // ...
   }
   ```

---

## 注意事项

### Next.js 15 特性
- `params` 是 Promise，必须 await
- 使用 App Router（非 Pages Router）

### 热重载问题
Mongoose 模型在热重载时可能出问题，解决方案：
```typescript
// 防止热重载时模型重复注册
if (mongoose.models.ModelName) {
  delete mongoose.models.ModelName;
}
const Model = mongoose.model('ModelName', Schema);
```

### 文件上传
- 图片保存在 `public/uploads/`
- 文件名格式：`card-{timestamp}-{random}.{ext}`
- 前端使用 `FormData` 发送
- 自定义静态文件服务器确保新上传图片立即可用

### 静态文件缓存
- 使用 `server.js` 自定义静态文件处理
- 上传目录 `/uploads/` 单独处理，绕过 Next.js 缓存
- 浏览器缓存：7天 (`Cache-Control: public, max-age=604800`)

### 状态管理
- 使用 React `useState` 管理游戏状态
- 复杂嵌套状态使用函数式更新：
  ```typescript
  setPlayers(prev => prev.map(p => 
    p.id === targetId ? { ...p, hp: p.hp + 1 } : p
  ));
  ```

### 弃牌逻辑
统一使用 `utils/cardUtils.ts` 中的函数处理：
- `processCardDiscard`: 处理弃牌逻辑
- `processSkillCardPlay`: 处理打出技能卡
- 资源卡始终进入公共弃牌堆
- 技能卡根据 `role` 字段返回原主人弃牌堆
- 敌人/Boss/支援/日夜/特殊人物进入各自弃牌区

### 拖拽实现
- 地图卡拖拽：使用 HTML5 Drag and Drop API
- 地图标记拖拽：使用 `mousedown` + 全局事件
- 玩家头像拖拽：使用 `mousedown` + 全局 `mousemove`/`mouseup`

### 样式约定
- 暗色主题（深色背景）
- 游戏风格 UI
- 所有文字使用中文
- 使用 Tailwind CSS 工具类
- 版本标签使用动态颜色（基于名称哈希）
- 不同战场实体类型使用不同背景色：
  - 敌人：默认深色
  - Boss：橙色
  - 支援：绿色
  - 特殊人物：粉色

---

## 数据库集合

| 集合名 | 对应模型 | 说明 |
|--------|----------|------|
| cards | Card | 所有卡牌 |
| campaigns | Campaign | 战役定义 |
| editions | Edition | 版本/扩展包 |
| gamesessions | GameSession | 游戏存档 |

---

## 常见问题

### Q: 为什么资源卡颜色在战役中设置？
A: 这样设计可以让同一张资源卡在不同战役中有不同颜色，增加灵活性。

### Q: 资源卡可以有多种颜色配置吗？
A: 可以。在战役编辑时，同一张资源卡可以添加多个配置，如"红色x3"和"商店x2"。

### Q: 技能卡如何分配给玩家？
A: 技能卡不在战役中配置，而是在开始游戏时根据选择的玩家角色自动分配。每个角色的技能卡由卡牌的 `role` 字段决定。

### Q: 赠送的技能卡弃牌后去哪里？
A: 无论技能卡被赠送给谁，弃牌时都会返回原主人的弃牌堆。系统通过技能卡的 `role` 字段判断原主人。

### Q: 如何添加新的玩家状态？
A: 在 `IPlayer` 接口中添加字段，更新 `PlayerSchema`，然后在 `PlayerDetailModal` 中添加 UI。

### Q: 游戏存档什么时候自动保存？
A: 游戏状态变化后每5秒触发一次自动保存，也可点击保存按钮手动保存。

### Q: 如何调试数据库连接问题？
A: 检查 `MONGODB_URI` 环境变量或 `lib/db.ts` 中的默认连接字符串。

### Q: 地图标记文本太长怎么办？
A: 系统会自动判断，短文本显示为圆形，长文本自动切换为圆角矩形以完整显示内容。

### Q: 新上传的卡牌图片显示404怎么办？
A: 系统使用自定义静态文件服务器处理 `/uploads/` 目录，新图片应该立即可用。如果仍有问题，检查 `server.js` 是否正确运行。

### Q: Boss牌和支援牌有什么区别？
A: Boss牌可以自由选择放入战场，支援牌是随机抽取。两者都在敌人列表显示，但使用不同背景色区分。

### Q: 日夜牌和其他牌有什么不同？
A: 日夜牌抽取后显示在"打出牌"区域，而不是战场。新抽取的日夜牌会覆盖之前的。

### Q: 特殊人物牌可以恢复吗？
A: 可以。特殊人物有独立的弃牌区，可以从弃牌区恢复到战场或放回牌库。

---

## 版本历史

- **v0.3.0**: 牌堆扩展版
  - 商店资源牌堆
  - 支援牌系统
  - Boss牌系统（自由选择）
  - 日夜牌系统（覆盖显示）
  - 特殊人物牌系统（独立管理）
  - 合并弃牌区弹窗
  - 分页显示（每页20张）
  - WebSocket实时同步
  - 玩家移动端页面
  - Caddy反向代理配置
  - 静态文件即时加载

- **v0.2.0**: 功能增强版
  - 版本管理系统（敌人卡/地图卡）
  - 战役管理重构（查看/编辑分离）
  - 资源卡数量配置
  - 9x9 地图网格
  - 地图标记系统
  - 地图卡操作（翻回、移动、移除）
  - 地图弃牌堆
  - 公共弃牌堆完善
  - 卡牌赠送功能
  - 卡牌打出功能
  - 弃牌逻辑统一
  - 搜索功能
  - 动态版本颜色
  - 组件拆分优化

- **v0.1.0**: 初始版本
  - 基础卡牌管理
  - 战役系统
  - 多人游戏支持
  - 地图系统
  - 敌人管理
  - 自动存档

---

*文档最后更新：2025年12月19日*
