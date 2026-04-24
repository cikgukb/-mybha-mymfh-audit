import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { email, role, full_name, hotel_id } = await request.json()

  if (!email || !role) {
    return NextResponse.json({ error: 'Email and role required' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  // Verify caller is admin
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Create user with service role (bypasses email confirmation)
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: full_name || email.split('@')[0], role },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Update profile with hotel_id if hotel_manager
  if (data.user && hotel_id && role === 'hotel_manager') {
    await supabase
      .from('profiles')
      .update({ hotel_id })
      .eq('id', data.user.id)
  }

  // Generate recovery link so admin can share manually
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
  })

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    userId: data.user?.id,
    actionLink: linkData?.properties?.action_link,
  })
}
