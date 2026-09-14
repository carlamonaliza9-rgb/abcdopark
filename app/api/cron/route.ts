import { NextResponse } from 'next/server';

export async function GET() {
  // Your cron job logic here
  
  return NextResponse.json({ success: true });
}