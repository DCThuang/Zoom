import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Edition from '@/models/Edition';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await dbConnect();
    const edition = await Edition.findById(params.id);
    if (!edition) {
      return NextResponse.json({ success: false, error: 'Edition not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: edition });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await dbConnect();
    const body = await request.json();
    
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ success: false, error: '版本名称不能为空' }, { status: 400 });
    }
    
    const edition = await Edition.findByIdAndUpdate(
      params.id, 
      {
        name: body.name.trim(),
        description: body.description?.trim() || '',
        color: body.color || '',
      },
      { new: true }
    );
    
    if (!edition) {
      return NextResponse.json({ success: false, error: 'Edition not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: edition });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ success: false, error: '该版本名称已存在' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await dbConnect();
    const edition = await Edition.findByIdAndDelete(params.id);
    if (!edition) {
      return NextResponse.json({ success: false, error: 'Edition not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: edition });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

