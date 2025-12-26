import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import GameSession from '@/models/GameSession';

// GET - List all game sessions
export async function GET(request: Request) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    
    const query: any = {};
    if (campaignId) {
      query.campaignId = campaignId;
    }
    
    const sessions = await GameSession.find(query)
      .sort({ updatedAt: -1 })
      .select('name campaignName roleName roleImgUrl gameStarted createdAt updatedAt');
    
    return NextResponse.json({ success: true, data: sessions });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

// POST - Create new game session
export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    
    const session = await GameSession.create(body);
    return NextResponse.json({ success: true, data: session }, { status: 201 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

