import mongoose, { Schema, Document, Model } from 'mongoose';

// Equipment with multiple labels and ammo
interface IEquipment {
  card: any;
  labels: string[];
  ammo: number;
}

// Player data structure
interface IPlayer {
  id: string;
  roleCard: any;
  name: string;
  imgUrl: string;
  color: string;
  hp: number;
  maxHp: number;
  stealth: number;
  hunger: number;
  gold: number;
  tags: string[];
  handResource: any[];
  handSkill: any[];
  skillDeck: any[];      // 技能牌堆
  skillDiscard: any[];   // 技能弃牌堆
  discard: any[];
  equipment: IEquipment[];
  x: number;
  y: number;
}

// Map tile with reveal state
interface IPlacedMapTile {
  cardId: string;
  cardData: any;
  revealed: boolean;
}

// Active enemy in battle
interface IActiveEnemy {
  id: string;
  card: any;
  currentHp: number;
  maxHp: number;
  boundToPlayerId?: string;
}

// Map marker
interface IMapMarker {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
}

export interface IGameSession extends Document {
  name: string;
  campaignId: mongoose.Types.ObjectId;
  campaignName: string;
  roleId: mongoose.Types.ObjectId; // Primary role (for backwards compat)
  roleName: string;
  roleImgUrl: string;
  
  // Multi-player support
  players: IPlayer[];
  
  // Map state
  placedMap: (IPlacedMapTile | null)[];
  unplacedMapCards: any[];
  
  // Shared deck states
  redDeck: any[];
  blueDeck: any[];
  greenDeck: any[];
  shopDeck: any[];
  enemyDeck: any[];
  supportDeck: any[];
  bossDeck: any[];
  daynightDeck: any[];
  specialCharacterDeck: any[];
  
  // Shared discard piles
  publicDiscard: any[];
  enemyDiscard: any[];
  supportDiscard: any[];
  bossDiscard: any[];
  daynightDiscard: any[];
  specialCharacterDiscard: any[];
  
  // Active enemies, bosses, supports, and special characters
  activeEnemies: IActiveEnemy[];
  activeBosses: IActiveEnemy[];
  activeSupports: IActiveEnemy[];
  activeSpecialCharacters: IActiveEnemy[];
  
  // Map discard pile
  mapDiscard: any[];
  
  // Map markers
  mapMarkers: IMapMarker[];
  
  // Game state
  gameStarted: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

const EquipmentSchema = new Schema({
  card: Schema.Types.Mixed,
  labels: [String],
  ammo: { type: Number, default: 0 }
}, { _id: false });

const PlayerSchema = new Schema({
  id: String,
  roleCard: Schema.Types.Mixed,
  name: String,
  imgUrl: String,
  color: String,
  hp: Number,
  maxHp: Number,
  stealth: Number,
  hunger: Number,
  gold: { type: Number, default: 0 },
  tags: [String],
  handResource: [Schema.Types.Mixed],
  handSkill: [Schema.Types.Mixed],
  skillDeck: [Schema.Types.Mixed],      // 技能牌堆
  skillDiscard: [Schema.Types.Mixed],   // 技能弃牌堆
  discard: [Schema.Types.Mixed],
  equipment: [EquipmentSchema],
  x: Number,
  y: Number
}, { _id: false });

const PlacedMapTileSchema = new Schema({
  cardId: String,
  cardData: Schema.Types.Mixed,
  revealed: Boolean
}, { _id: false });

const ActiveEnemySchema = new Schema({
  id: String,
  card: Schema.Types.Mixed,
  currentHp: Number,
  maxHp: Number,
  boundToPlayerId: String
}, { _id: false });

const GameSessionSchema: Schema = new Schema({
  name: { type: String, required: true },
  campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true },
  campaignName: { type: String, required: true },
  roleId: { type: Schema.Types.ObjectId, ref: 'Card' },
  roleName: { type: String },
  roleImgUrl: { type: String },
  
  // Multi-player support
  players: [PlayerSchema],
  
  placedMap: [{ type: Schema.Types.Mixed }],
  terrainGrid: [{ type: Boolean }],  // 地形配置
  unplacedMapCards: [Schema.Types.Mixed],
  
  redDeck: [Schema.Types.Mixed],
  blueDeck: [Schema.Types.Mixed],
  greenDeck: [Schema.Types.Mixed],
  shopDeck: [Schema.Types.Mixed],
  enemyDeck: [Schema.Types.Mixed],
  supportDeck: [Schema.Types.Mixed],
  bossDeck: [Schema.Types.Mixed],
  daynightDeck: [Schema.Types.Mixed],
  specialCharacterDeck: [Schema.Types.Mixed],
  
  publicDiscard: [Schema.Types.Mixed],
  enemyDiscard: [Schema.Types.Mixed],
  supportDiscard: [Schema.Types.Mixed],
  bossDiscard: [Schema.Types.Mixed],
  daynightDiscard: [Schema.Types.Mixed],
  specialCharacterDiscard: [Schema.Types.Mixed],
  
  activeEnemies: [ActiveEnemySchema],
  activeBosses: [ActiveEnemySchema],
  activeSupports: [ActiveEnemySchema],
  activeSpecialCharacters: [ActiveEnemySchema],
  
  mapDiscard: [Schema.Types.Mixed],
  
  mapMarkers: [{
    id: String,
    text: String,
    color: String,
    x: Number,
    y: Number
  }],
  
  gameStarted: { type: Boolean, default: false }
}, { timestamps: true });

// Force delete old model to ensure schema updates
if (mongoose.models.GameSession) {
  delete mongoose.models.GameSession;
}

const GameSession: Model<IGameSession> = mongoose.model<IGameSession>('GameSession', GameSessionSchema);

export default GameSession;

