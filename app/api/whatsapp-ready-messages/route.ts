import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// جدول الرسائل الجاهزة: whatsapp_ready_messages
// الحقل: text

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("whatsapp_ready_messages")
      .select("*")
      .order("created_at", { ascending: false })
    if (error) throw error
    return NextResponse.json({ messages: data || [] })
  } catch (error) {
    return NextResponse.json({ error: "فشل في جلب الرسائل الجاهزة" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { text } = await request.json()
    const { data, error } = await supabase
      .from("whatsapp_ready_messages")
      .insert([{ text }])
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ message: data })
  } catch (error) {
    return NextResponse.json({ error: "فشل في إضافة الرسالة الجاهزة" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { id } = await request.json()
    const { error } = await supabase
      .from("whatsapp_ready_messages")
      .delete()
      .eq("id", id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "فشل في حذف الرسالة الجاهزة" }, { status: 500 })
  }
}
