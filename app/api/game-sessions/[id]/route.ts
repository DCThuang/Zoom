import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import GameSession from '@/models/GameSession';

// GET - Get single game session
export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await dbConnect();
    const session = await GameSession.findById(params.id);
    
    if (!session) {
      return NextResponse.json({ success: false, error: 'Game session not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: session });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

// PUT - Update game session
export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await dbConnect();
    
    // 安全解析请求体
    let body;
    try {
      const text = await request.text();
      if (!text || text.trim() === '') {
        return NextResponse.json({ success: false, error: 'Empty request body' }, { status: 400 });
      }
      body = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json({ success: false, error: 'Invalid JSON in request body' }, { status: 400 });
    }
    
    const session = await GameSession.findByIdAndUpdate(
      params.id, 
      { ...body, updatedAt: new Date() },
      { new: true }
    );
    
    if (!session) {
      return NextResponse.json({ success: false, error: 'Game session not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: session });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

// DELETE - Delete game session
export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await dbConnect();
    const session = await GameSession.findByIdAndDelete(params.id);
    
    if (!session) {
      return NextResponse.json({ success: false, error: 'Game session not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: {} });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

