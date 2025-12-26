import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Card from '@/models/Card';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

// 生成缩略图的配置
const THUMB_MAX_WIDTH = 400;  // 缩略图最大宽度
const THUMB_MAX_HEIGHT = 600; // 缩略图最大高度
const THUMB_QUALITY = 80;     // 缩略图质量 (1-100)
const THUMB_MAX_SIZE = 500 * 1024; // 最大 500KB

/**
 * 生成缩略图
 * @param buffer 原始图片 buffer
 * @param originalFilename 原始文件名
 * @param uploadDir 上传目录
 * @returns 缩略图的公共路径
 */
async function generateThumbnail(
  buffer: Buffer, 
  originalFilename: string, 
  uploadDir: string
): Promise<string> {
  // 生成缩略图文件名
  const ext = path.extname(originalFilename);
  const baseName = path.basename(originalFilename, ext);
  const thumbFilename = `${baseName}-thumb.webp`;
  const thumbPath = path.join(uploadDir, thumbFilename);
  
  try {
    // 获取原图信息
    const metadata = await sharp(buffer).metadata();
    
    // 计算目标尺寸，保持纵横比
    let width = metadata.width || THUMB_MAX_WIDTH;
    let height = metadata.height || THUMB_MAX_HEIGHT;
    
    if (width > THUMB_MAX_WIDTH || height > THUMB_MAX_HEIGHT) {
      const ratio = Math.min(THUMB_MAX_WIDTH / width, THUMB_MAX_HEIGHT / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }
    
    // 生成缩略图，使用 webp 格式压缩
    let quality = THUMB_QUALITY;
    let thumbBuffer = await sharp(buffer)
      .resize(width, height, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
    
    // 如果文件仍然太大，逐步降低质量
    while (thumbBuffer.length > THUMB_MAX_SIZE && quality > 20) {
      quality -= 10;
      thumbBuffer = await sharp(buffer)
        .resize(width, height, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality })
        .toBuffer();
    }
    
    // 如果还是太大，进一步缩小尺寸
    if (thumbBuffer.length > THUMB_MAX_SIZE) {
      width = Math.round(width * 0.7);
      height = Math.round(height * 0.7);
      thumbBuffer = await sharp(buffer)
        .resize(width, height, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 60 })
        .toBuffer();
    }
    
    await writeFile(thumbPath, thumbBuffer);
    
    console.log(`Generated thumbnail: ${thumbFilename} (${(thumbBuffer.length / 1024).toFixed(1)}KB)`);
    
    return `/uploads/${thumbFilename}`;
  } catch (error) {
    console.error('Thumbnail generation failed:', error);
    // 如果缩略图生成失败，返回空字符串，前端会回退到原图
    return '';
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    
    // Check Content-Type to decide how to parse
    const contentType = request.headers.get('content-type') || '';
    
    let body: any = {};
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('image') as File | null;
      
      // Extract other fields
      formData.forEach((value, key) => {
        if (key !== 'image') {
           body[key] = value;
        }
      });

      // Handle File Upload
      if (file) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        // Ensure uploads directory exists
        const uploadDir = path.join(process.cwd(), 'public/uploads');
        await mkdir(uploadDir, { recursive: true });

        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.name) || '.jpg';
        const filename = `card-${uniqueSuffix}${ext}`;
        const filepath = path.join(uploadDir, filename);

        // 保存原图
        await writeFile(filepath, buffer);
        body.imgUrl = `/uploads/${filename}`;
        
        // 生成缩略图
        const thumbUrl = await generateThumbnail(buffer, filename, uploadDir);
        if (thumbUrl) {
          body.thumbUrl = thumbUrl;
        }
      } else if (!body.imgUrl) {
         // Fallback if no file and no imgUrl provided (though UI should enforce one)
         // Maybe use a placeholder or fail
      }
    } else {
      // Fallback for JSON requests (legacy or manual API calls)
      body = await request.json();
    }

    const card = await Card.create(body);
    return NextResponse.json({ success: true, data: card }, { status: 201 });
  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    
    // 支持通过 ids 参数批量获取卡牌
    const idsParam = searchParams.get('ids');
    if (idsParam) {
      const ids = idsParam.split(',').filter(id => id.trim());
      const cards = await Card.find({ _id: { $in: ids } });
      return NextResponse.json({ success: true, cards });
    }
    
    // 普通查询
    const query: any = {};
    searchParams.forEach((value, key) => {
      query[key] = value;
    });

    const cards = await Card.find(query);
    
    return NextResponse.json({ success: true, data: cards });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
