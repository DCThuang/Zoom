import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Campaign from '@/models/Campaign';
import mongoose from 'mongoose';

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    
    // Ensure cards is properly formatted
    // Expected format: [{ card: "objectIdString", color?: "RED" | "BLUE" | "GREEN", count?: number }]
    if (body.cards && Array.isArray(body.cards)) {
      body.cards = body.cards.map((item: any) => {
        // If item is a string (legacy), convert to new format
        if (typeof item === 'string') {
          return { card: new mongoose.Types.ObjectId(item) };
        }
        // If item is an object with card property
        if (item && typeof item === 'object' && item.card) {
          return {
            card: new mongoose.Types.ObjectId(item.card),
            color: item.color || undefined,
            count: item.count || 1
          };
        }
        return item;
      });
    }
    
    const campaign = await Campaign.create(body);
    return NextResponse.json({ success: true, data: campaign }, { status: 201 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function GET(request: Request) {
  try {
    await dbConnect();
    const campaigns = await Campaign.find().populate('cards.card');
    return NextResponse.json({ success: true, data: campaigns });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
