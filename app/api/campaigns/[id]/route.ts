import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Campaign from '@/models/Campaign';
import Card from '@/models/Card'; // Ensure Card model is registered
import mongoose from 'mongoose';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await dbConnect();
    // Populate cards
    const campaign = await Campaign.findById(params.id).populate('cards.card');
    if (!campaign) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: campaign });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await dbConnect();
    const body = await request.json();
    
    // Ensure cards is properly formatted
    if (body.cards && Array.isArray(body.cards)) {
      body.cards = body.cards.map((item: any) => {
        if (typeof item === 'string') {
          return { card: new mongoose.Types.ObjectId(item) };
        }
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
    
    const campaign = await Campaign.findByIdAndUpdate(params.id, body, { new: true }).populate('cards.card');
    if (!campaign) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: campaign });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await dbConnect();
    const campaign = await Campaign.findByIdAndDelete(params.id);
    if (!campaign) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: campaign });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
