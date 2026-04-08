import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  createSignedSessionToken,
  getClearedSessionCookieOptions,
  getSessionCookieOptions,
  getSessionFromCookieHeader,
  normalizeAppRole,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session"

export async function GET(request: NextRequest) {
  const session = await getSessionFromCookieHeader(request.headers.get("cookie"))

  if (!session) {
    return NextResponse.json({ error: "لا توجد جلسة صالحة" }, { status: 401 })
  }

  return NextResponse.json({ success: true, user: session })
}

export async function POST(request: NextRequest) {
  try {
    const { account_number } = await request.json()

    if (!account_number || typeof account_number !== "string" || !/^[0-9]+$/.test(account_number)) {
      return NextResponse.json({ error: "رقم الحساب يجب أن يكون أرقام فقط" }, { status: 400 })
    }

    const accountNum = Number.parseInt(account_number)
    if (isNaN(accountNum) || accountNum <= 0) {
      return NextResponse.json({ error: "رقم الحساب غير صحيح" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, name, role, account_number, halaqah")
      .eq("account_number", accountNum)
      .maybeSingle()

    if (userError) {
      return NextResponse.json({ error: "حدث خطأ أثناء التحقق من الحساب" }, { status: 500 })
    }

    if (user) {
      const normalizedRole = normalizeAppRole(user.role)

      if (!normalizedRole) {
        return NextResponse.json({ error: "الدور الوظيفي لهذا الحساب غير مدعوم" }, { status: 403 })
      }

      const sessionData = {
        id: String(user.id),
        name: user.name,
        role: normalizedRole,
        accountNumber: String(user.account_number),
        halaqah: user.halaqah || "",
      } as const

      const { token, expiresAt } = await createSignedSessionToken(sessionData)
      const response = NextResponse.json({
        success: true,
        user: {
          id: sessionData.id,
          name: user.name,
          role: normalizedRole,
          accountNumber: user.account_number,
          halaqah: user.halaqah,
        },
      })

      response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions(expiresAt))
      return response
    }

    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, name, account_number, halaqah")
      .eq("account_number", accountNum)
      .maybeSingle()

    if (studentError) {
      return NextResponse.json({ error: "حدث خطأ أثناء التحقق من الحساب" }, { status: 500 })
    }

    if (student) {
      const sessionData = {
        id: String(student.id),
        name: student.name,
        role: "student" as const,
        accountNumber: String(student.account_number),
        halaqah: student.halaqah || "",
      }

      const { token, expiresAt } = await createSignedSessionToken(sessionData)
      const response = NextResponse.json({
        success: true,
        user: {
          id: sessionData.id,
          name: student.name,
          role: "student",
          accountNumber: student.account_number,
          halaqah: student.halaqah,
        },
      })

      response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions(expiresAt))
      return response
    }

    return NextResponse.json({ error: "رقم الحساب غير صحيح" }, { status: 401 })
  } catch (error) {
    console.error("[v0] Auth error:", error)
    return NextResponse.json({ error: "حدث خطأ أثناء تسجيل الدخول" }, { status: 500 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(SESSION_COOKIE_NAME, "", getClearedSessionCookieOptions())
  return response
}
