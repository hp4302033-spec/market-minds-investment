import { NextRequest, NextResponse } from 'next/server';
import { getAllLeads } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const adminKey = request.headers.get('x-admin-key');
  const expectedKey = process.env.ADMIN_SECRET_KEY || 'mmi_admin_2024';

  if (adminKey !== expectedKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const leads = await getAllLeads();
    const totalAUM = leads.reduce((sum, l) => sum + (l.final_value || 0), 0);
    return NextResponse.json({
      success: true,
      leads,
      stats: {
        total: leads.length,
        totalAUM,
        sipCount: leads.filter(l => l.investment_type === 'SIP').length,
        lumpSumCount: leads.filter(l => l.investment_type === 'LUMPSUM').length,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}
