import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const SETTINGS_ID = "00000000-0000-0000-0000-000000000001"

const DEFAULT_ROLES = {
  roles: ["مدير", "سكرتير", "مشرف تعليمي", "مشرف تربوي", "مشرف برامج"],
  permissions: {
    "مدير": ["all"],
    "سكرتير": [],
    "مشرف تعليمي": [],
    "مشرف تربوي": [],
    "مشرف برامج": []
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("programs")
      .select("description")
      .eq("id", SETTINGS_ID)
      .maybeSingle()

    if (error) {
      return NextResponse.json(DEFAULT_ROLES)
    }

    if (data && data.description) {
      try {
        const parsed = JSON.parse(data.description)
        return NextResponse.json({
          roles: parsed.roles || DEFAULT_ROLES.roles,
          permissions: parsed.permissions || DEFAULT_ROLES.permissions
        })
      } catch (e) {
        return NextResponse.json(DEFAULT_ROLES)
      }
    }

    return NextResponse.json(DEFAULT_ROLES)
  } catch (e) {
    return NextResponse.json(DEFAULT_ROLES)
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    // Upsert into programs
    const { error } = await supabase
      .from("programs")
      .upsert({
        id: SETTINGS_ID,
        name: 'ROLES_SETTINGS',
        is_active: true,
        date: 'settings',
        duration: 'settings',
        points: 0,
        description: JSON.stringify(body)
      })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
