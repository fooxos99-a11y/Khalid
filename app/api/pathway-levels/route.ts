import { NextResponse } from "next/server"

import { requireRoles } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

function getErrorMessage(error: unknown) {
  if (!error) return "حدث خطأ غير معروف"
  if (error instanceof Error) return error.message || "حدث خطأ غير معروف"
  if (typeof error === "object") {
    const candidate = error as { message?: string; details?: string; hint?: string; code?: string }
    return candidate.message || candidate.details || candidate.hint || candidate.code || JSON.stringify(candidate)
  }
  return String(error)
}

export async function POST(request: Request) {
  try {
    const auth = await requireRoles(request, ["admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const body = await request.json()
    const levelNumber = Number(body?.level_number)
    const halaqah = String(body?.halaqah || "").trim()
    const title = String(body?.title || "").trim()
    const description = String(body?.description || "").trim() || null
    const points = Number(body?.points)

    if (!halaqah || !Number.isInteger(levelNumber) || levelNumber <= 0 || !title) {
      return NextResponse.json({ error: "بيانات المستوى غير مكتملة" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: level, error: levelError } = await supabase
      .from("pathway_levels")
      .insert({
        level_number: levelNumber,
        halaqah,
        title,
        description,
        points: Number.isFinite(points) && points > 0 ? points : 100,
        is_locked: false,
        half_points_applied: false,
      })
      .select("*")
      .single()

    if (levelError) {
      throw levelError
    }

    return NextResponse.json({ success: true, level })
  } catch (error) {
    console.error("[pathway-levels] POST:", error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}