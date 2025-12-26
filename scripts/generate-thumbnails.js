/**
 * 为现有卡牌生成缩略图的脚本
 * 运行方式: node scripts/generate-thumbnails.js
 */

const mongoose = require('mongoose');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// MongoDB 连接
const MONGODB_URI = process.env.MONGODB_URI || 
  'mongodb://admin:d2bdagc8aq48ats015b0@127.0.0.1:27017/zoom_game?authSource=admin';

// 缩略图配置
const THUMB_MAX_WIDTH = 400;
const THUMB_MAX_HEIGHT = 600;
const THUMB_QUALITY = 80;
const THUMB_MAX_SIZE = 500 * 1024;

// Card Schema (简化版)
const CardSchema = new mongoose.Schema({
  name: String,
  imgUrl: String,
  thumbUrl: String,
  type: String,
}, { timestamps: true });

const Card = mongoose.model('Card', CardSchema);

async function generateThumbnail(imgPath, thumbPath) {
  try {
    const buffer = fs.readFileSync(imgPath);
    const metadata = await sharp(buffer).metadata();
    
    let width = metadata.width || THUMB_MAX_WIDTH;
    let height = metadata.height || THUMB_MAX_HEIGHT;
    
    if (width > THUMB_MAX_WIDTH || height > THUMB_MAX_HEIGHT) {
      const ratio = Math.min(THUMB_MAX_WIDTH / width, THUMB_MAX_HEIGHT / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }
    
    let quality = THUMB_QUALITY;
    let thumbBuffer = await sharp(buffer)
      .resize(width, height, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
    
    while (thumbBuffer.length > THUMB_MAX_SIZE && quality > 20) {
      quality -= 10;
      thumbBuffer = await sharp(buffer)
        .resize(width, height, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality })
        .toBuffer();
    }
    
    if (thumbBuffer.length > THUMB_MAX_SIZE) {
      width = Math.round(width * 0.7);
      height = Math.round(height * 0.7);
      thumbBuffer = await sharp(buffer)
        .resize(width, height, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 60 })
        .toBuffer();
    }
    
    fs.writeFileSync(thumbPath, thumbBuffer);
    return thumbBuffer.length;
  } catch (error) {
    console.error(`  Error generating thumbnail: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected!\n');
  
  const cards = await Card.find({});
  console.log(`Found ${cards.length} cards\n`);
  
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const card of cards) {
    // 跳过已有缩略图的卡牌
    if (card.thumbUrl) {
      console.log(`[SKIP] ${card.name}: Already has thumbnail`);
      skipped++;
      continue;
    }
    
    // 跳过没有图片的卡牌
    if (!card.imgUrl || !card.imgUrl.startsWith('/uploads/')) {
      console.log(`[SKIP] ${card.name}: No local image (${card.imgUrl})`);
      skipped++;
      continue;
    }
    
    const imgPath = path.join(process.cwd(), 'public', card.imgUrl);
    
    // 检查图片文件是否存在
    if (!fs.existsSync(imgPath)) {
      console.log(`[ERROR] ${card.name}: Image file not found (${imgPath})`);
      errors++;
      continue;
    }
    
    // 生成缩略图文件名
    const ext = path.extname(card.imgUrl);
    const baseName = path.basename(card.imgUrl, ext);
    const thumbFilename = `${baseName}-thumb.webp`;
    const thumbPath = path.join(process.cwd(), 'public/uploads', thumbFilename);
    const thumbUrl = `/uploads/${thumbFilename}`;
    
    // 检查缩略图是否已存在
    if (fs.existsSync(thumbPath)) {
      // 缩略图已存在，只更新数据库
      await Card.findByIdAndUpdate(card._id, { thumbUrl });
      console.log(`[UPDATE] ${card.name}: Thumbnail exists, updating DB`);
      processed++;
      continue;
    }
    
    // 生成缩略图
    const size = await generateThumbnail(imgPath, thumbPath);
    
    if (size !== null) {
      // 更新数据库
      await Card.findByIdAndUpdate(card._id, { thumbUrl });
      console.log(`[OK] ${card.name}: Generated ${thumbFilename} (${(size / 1024).toFixed(1)}KB)`);
      processed++;
    } else {
      errors++;
    }
  }
  
  console.log(`\n--- Summary ---`);
  console.log(`Processed: ${processed}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
  
  await mongoose.disconnect();
  console.log('\nDone!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

