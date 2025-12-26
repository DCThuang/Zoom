import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICampaignCard {
  card: mongoose.Types.ObjectId;
  color?: string; // RED, BLUE, GREEN, SHOP
  count?: number; // 资源卡张数，默认为1
}

export interface ICampaign extends Document {
  name: string;
  cards: ICampaignCard[]; 
  createdAt: Date;
  updatedAt: Date;
}

const CampaignCardSchema = new Schema({
  card: { type: Schema.Types.ObjectId, ref: 'Card', required: true },
  color: { type: String, enum: ['RED', 'BLUE', 'GREEN', 'SHOP'] },
  count: { type: Number, default: 1 } // 资源卡张数
}, { _id: false });

const CampaignSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  cards: [CampaignCardSchema],
}, { timestamps: true });

// Force delete old model to ensure schema updates take effect during hot reload
if (mongoose.models.Campaign) {
  delete mongoose.models.Campaign;
}

const Campaign: Model<ICampaign> = mongoose.model<ICampaign>('Campaign', CampaignSchema);

export default Campaign;
