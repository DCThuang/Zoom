import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Edition from '@/models/Edition';

export async function GET() {
  try {
    await dbConnect();
    const editions = await Edition.find().sort({ name: 1 });
    return NextResponse.json({ success: true, data: editions });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ success: false, error: '版本名称不能为空' }, { status: 400 });
    }
    
    const edition = await Edition.create({
      name: body.name.trim(),
      description: body.description?.trim() || '',
      color: body.color || '',
    });
    
    return NextResponse.json({ success: true, data: edition }, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ success: false, error: '该版本名称已存在' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

