// Card Types
export type CardType = 'SKILL' | 'PLAYER' | 'ENEMY' | 'RESOURCE' | 'MAP' | 'SUPPORT' | 'BOSS' | 'DAYNIGHT' | 'SPECIAL_CHARACTER';

export interface ICard {
  _id: string;
  name: string;
  imgUrl: string;
  thumbUrl?: string;  // 缩略图 URL
  description: string;
  type: CardType;
  hp?: number;
  attack?: number;
  stealth?: number;
  cost?: number;
  role?: string;
  level?: number;
  color?: string;
  mapNumber?: number;  // 地图编号（用于骰子定位）
}

export interface ICampaignCardConfig {
  card: ICard;
  color?: string;
  count?: number; // 资源卡张数
}

// Equipment
export interface Equipment {
  card: ICard;
  labels: string[];
  ammo: number;
}

// Player
export interface Player {
  id: string;
  roleCard: ICard;
  profession?: string;        // 职业（如"枪手"）
  availableRoles?: ICard[];   // 同职业可切换的所有角色卡
  name: string;
  imgUrl: string;
  color: string;
  hp: number;
  maxHp: number;
  stealth: number;
  hunger: number;
  gold: number;
  tags: string[];
  handResource: ICard[];      // 资源手牌
  handSkill: ICard[];         // 技能手牌
  skillDeck: ICard[];         // 技能牌堆
  skillDiscard: ICard[];      // 技能弃牌堆
  discard: ICard[];           // 个人弃牌堆
  equipment: Equipment[];
  x: number;
  y: number;
  _version: number;           // 状态版本号，用于同步时防止旧数据覆盖新数据
}

// Map
export interface PlacedMapTile {
  card: ICard;
  revealed: boolean;
}

// Enemy
export interface ActiveEnemy {
  id: string;
  card: ICard;
  currentHp: number;
  maxHp: number;
  boundToPlayerId?: string;
}

// Map Marker
export interface MapMarker {
  id: string;
  text: string;
  color: string;
  x: number;  // 相对于地图容器的像素位置
  y: number;
}

// Played Card (打出的卡牌)
export interface PlayedCard {
  card: ICard;
  playerId: string;
  playerName: string;
  playerColor: string;
  timestamp: number;
}

// Game State
export interface GameState {
  campaignName: string;
  redDeck: ICard[];
  blueDeck: ICard[];
  greenDeck: ICard[];
  shopDeck: ICard[];
  publicDiscard: ICard[];
  enemyDeck: ICard[];
  enemyDiscard: ICard[];
  supportDeck: ICard[];
  supportDiscard: ICard[];
  bossDeck: ICard[];
  bossDiscard: ICard[];
  daynightDeck: ICard[];
  daynightDiscard: ICard[];
  specialCharacterDeck: ICard[];
  specialCharacterDiscard: ICard[];
  mapCards: ICard[];
  placedMap: (PlacedMapTile | null)[];
  terrainGrid: boolean[];  // 地形配置：true = 可用格子，false = 禁用格子
  gameStarted: boolean;
  mapDiscard: ICard[];  // 地图弃牌堆
  mapMarkers: MapMarker[];  // 地图标记
  playedCard: PlayedCard | null;  // 当前打出的卡牌（只保留最后一张）
}

// Constants
export const GRID_SIZE = 9;  // 9x9 网格
export const PLAYER_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

