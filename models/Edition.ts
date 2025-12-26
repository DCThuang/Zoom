import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEdition extends Document {
  name: string;           // 版本名称，如"狂热"、"瘟疫"
  description?: string;   // 版本描述
  color?: string;         // 版本标识颜色（可选）
  createdAt: Date;
  updatedAt: Date;
}

const EditionSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  color: { type: String },
}, { timestamps: true });

// Prevent overwrite during hot reload
const Edition: Model<IEdition> = mongoose.models.Edition || mongoose.model<IEdition>('Edition', EditionSchema);

export default Edition;

