import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('test_groups')
    .select('*, videos(*)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ testGroups: data })
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const { name } = await req.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('test_groups')
    .insert({ name: name.trim(), status: 'active' })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ testGroup: data }, { status: 201 })
}
