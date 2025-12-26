import mongoose, { Schema, Document, Model } from 'mongoose';

export type CardType = 'SKILL' | 'PLAYER' | 'ENEMY' | 'RESOURCE' | 'MAP' | 'SUPPORT' | 'BOSS' | 'DAYNIGHT' | 'SPECIAL_CHARACTER';

export interface ICard extends Document {
  name: string; 
  imgUrl: string;
  thumbUrl?: string;  // 缩略图URL（用于列表显示，提高加载速度）
  description: string;
  type: CardType;
  
  // Skill Card specific
  skillType?: string;
  role?: string; 
  level?: number;
  cost?: number;
  count?: number; 

  // Player Card specific
  hp?: number; 
  stealth?: number;

  // Enemy Card specific
  attack?: number;
  edition?: string;  // 版本（如"狂热"、"瘟疫"等）

  // Resource Card specific
  resourceType?: string; 
  // color removed, handled in Campaign

  // Map Card specific
  mapNumber?: number;  // 地图编号（用于骰子定位）
}

const CardSchema: Schema = new Schema({
  name: { type: String, required: true },
  imgUrl: { type: String, required: true },
  thumbUrl: { type: String },  // 缩略图URL
  description: { type: String },
  type: { 
    type: String, 
    required: true, 
    enum: ['SKILL', 'PLAYER', 'ENEMY', 'RESOURCE', 'MAP', 'SUPPORT', 'BOSS', 'DAYNIGHT', 'SPECIAL_CHARACTER'] 
  },

  // Skill specific fields
  skillType: { type: String },
  role: { type: String }, 
  level: { type: Number },
  cost: { type: Number },
  count: { type: Number, default: 1 },

  // Player/Enemy specific fields
  hp: { type: Number },
  stealth: { type: Number },
  attack: { type: Number },
  edition: { type: String },  // 版本（敌人卡、地图卡使用）

  // Resource specific
  resourceType: { type: String },
  
  // Map specific
  mapNumber: { type: Number },  // 地图编号（用于骰子定位）
}, { timestamps: true });

// Force delete old model to ensure schema updates take effect during hot reload
if (mongoose.models.Card) {
  delete mongoose.models.Card;
}

const Card: Model<ICard> = mongoose.model<ICard>('Card', CardSchema);

export default Card;
