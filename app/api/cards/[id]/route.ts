import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Card from '@/models/Card';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

// 生成缩略图的配置
const THUMB_MAX_WIDTH = 400;  // 缩略图最大宽度
const THUMB_MAX_HEIGHT = 600; // 缩略图最大高度
const THUMB_QUALITY = 80;     // 缩略图质量 (1-100)
const THUMB_MAX_SIZE = 500 * 1024; // 最大 500KB

/**
 * 生成缩略图
 */
async function generateThumbnail(
  buffer: Buffer, 
  originalFilename: string, 
  uploadDir: string
): Promise<string> {
  const ext = path.extname(originalFilename);
  const baseName = path.basename(originalFilename, ext);
  const thumbFilename = `${baseName}-thumb.webp`;
  const thumbPath = path.join(uploadDir, thumbFilename);
  
  try {
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
    
    await writeFile(thumbPath, thumbBuffer);
    console.log(`Generated thumbnail: ${thumbFilename} (${(thumbBuffer.length / 1024).toFixed(1)}KB)`);
    
    return `/uploads/${thumbFilename}`;
  } catch (error) {
    console.error('Thumbnail generation failed:', error);
    return '';
  }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await dbConnect();
    const id = params.id;
    
    const contentType = request.headers.get('content-type') || '';
    let updateData: any = {};
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('image') as File | null;
      
      formData.forEach((value, key) => {
        if (key !== 'image') {
           updateData[key] = value;
        }
      });

      if (file) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const uploadDir = path.join(process.cwd(), 'public/uploads');
        await mkdir(uploadDir, { recursive: true });
        
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.name) || '.jpg';
        const filename = `card-${uniqueSuffix}${ext}`;
        const filepath = path.join(uploadDir, filename);

        // 保存原图
        await writeFile(filepath, buffer);
        updateData.imgUrl = `/uploads/${filename}`;
        
        // 生成缩略图
        const thumbUrl = await generateThumbnail(buffer, filename, uploadDir);
        if (thumbUrl) {
          updateData.thumbUrl = thumbUrl;
        }
      }
    } else {
      updateData = await request.json();
    }

    const card = await Card.findByIdAndUpdate(id, updateData, { new: true });
    
    if (!card) {
        return NextResponse.json({ success: false, error: 'Card not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: card });
  } catch (error: any) {
    console.error('Update Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        await dbConnect();
        const card = await Card.findByIdAndDelete(params.id);
        if (!card) {
            return NextResponse.json({ success: false, error: 'Card not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: {} });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await dbConnect();
    const card = await Card.findById(params.id);
    if (!card) {
      return NextResponse.json({ success: false, error: 'Card not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: card });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
