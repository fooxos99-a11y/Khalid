import { createAdminClient } from "@/lib/supabase/admin"
import { normalizeWhatsAppPhoneNumber } from "@/lib/phone-number"

import { NextResponse } from "next/server"

type QueueMessageInput = {
  id: string
  phoneNumber: string
  message: string
  userId?: string
}

type BulkQueueRecipientInput = {
  phoneNumber?: string | null
  userId?: string | null
}

/**
 * Queue-based WhatsApp Send Endpoint
 * POST /api/whatsapp/send
 * يضيف الرسالة إلى طابور الإرسال ليعالجها الـ Worker الخارجي
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { phoneNumber, message, userId, recipients } = body

    if (!message || !String(message).trim()) {
      return NextResponse.json(
        { error: "رقم الهاتف والرسالة مطلوبان" },
        { status: 400 }
      )
    }

    if (Array.isArray(recipients)) {
      const bulkResult = await enqueueMessagesBulk({
        message: String(message).trim(),
        recipients,
      })

      return NextResponse.json({
        success: true,
        queuedCount: bulkResult.queuedCount,
        failedCount: bulkResult.failedCount,
        invalidPhoneCount: bulkResult.invalidPhoneCount,
        missingPhoneCount: bulkResult.missingPhoneCount,
        message: `تمت إضافة ${bulkResult.queuedCount} رسالة إلى طابور الإرسال`,
      })
    }

    // التحقق من البيانات المطلوبة
    if (!phoneNumber || !message) {
      return NextResponse.json(
        { error: "رقم الهاتف والرسالة مطلوبان" },
        { status: 400 }
      )
    }

    const queuedMessage = await enqueueMessage({
      id: crypto.randomUUID(),
      phoneNumber: normalizeWhatsAppPhoneNumber(phoneNumber),
      message: message.trim(),
      userId,
    })

    return NextResponse.json({
      success: true,
      queuedMessage,
      message: "تمت إضافة الرسالة إلى طابور الإرسال بنجاح",
    })
  } catch (error) {
    console.error("[WhatsApp] Send error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "حدث خطأ أثناء إضافة الرسالة إلى الطابور",
      },
      { status: 500 }
    )
  }
}

/**
 * إضافة الرسالة إلى الطابور مع إنشاء سجل تاريخي متزامن معها
 */
async function enqueueMessage(data: QueueMessageInput) {
  const supabase = createAdminClient()

  const { data: queuedMessage, error: queueError } = await supabase
    .from("whatsapp_queue")
    .insert({
      id: data.id,
      phone_number: data.phoneNumber,
      message: data.message,
      status: "pending",
    })
    .select()
    .single()

  if (queueError) {
    console.error("[WhatsApp Queue] Error enqueuing message:", queueError)
    throw new Error("فشل في إضافة الرسالة إلى طابور واتساب")
  }

  const { error: historyError } = await supabase.from("whatsapp_messages").insert({
    id: data.id,
    phone_number: data.phoneNumber,
    message_text: data.message,
    status: "pending",
    sent_by: data.userId,
    sent_at: null,
  })

  if (historyError) {
    console.error("[WhatsApp History] Error saving message history:", historyError)
  }

  return queuedMessage
}

async function enqueueMessagesBulk(params: {
  message: string
  recipients: BulkQueueRecipientInput[]
}) {
  const supabase = createAdminClient()
  const queueRows: Array<{ id: string; phone_number: string; message: string; status: string }> = []
  const historyRows: Array<{
    id: string
    phone_number: string
    message_text: string
    status: string
    sent_by: string | null
    sent_at: null
  }> = []
  let invalidPhoneCount = 0
  let missingPhoneCount = 0

  for (const recipient of params.recipients) {
    if (!recipient?.phoneNumber || !String(recipient.phoneNumber).trim()) {
      missingPhoneCount += 1
      continue
    }

    let normalizedPhone
    try {
      normalizedPhone = normalizeWhatsAppPhoneNumber(String(recipient.phoneNumber))
    } catch {
      invalidPhoneCount += 1
      continue
    }

    const id = crypto.randomUUID()
    queueRows.push({
      id,
      phone_number: normalizedPhone,
      message: params.message,
      status: "pending",
    })
    historyRows.push({
      id,
      phone_number: normalizedPhone,
      message_text: params.message,
      status: "pending",
      sent_by: recipient.userId ? String(recipient.userId) : null,
      sent_at: null,
    })
  }

  if (queueRows.length > 0) {
    const { error: queueError } = await supabase
      .from("whatsapp_queue")
      .insert(queueRows)

    if (queueError) {
      console.error("[WhatsApp Queue] Error bulk enqueuing messages:", queueError)
      throw new Error("فشل في إضافة الرسائل إلى طابور واتساب")
    }

    const { error: historyError } = await supabase
      .from("whatsapp_messages")
      .insert(historyRows)

    if (historyError) {
      console.error("[WhatsApp History] Error bulk saving message history:", historyError)
    }
  }

  return {
    queuedCount: queueRows.length,
    failedCount: invalidPhoneCount + missingPhoneCount,
    invalidPhoneCount,
    missingPhoneCount,
  }
}

/**
 * GET /api/whatsapp/send
 * الحصول على قائمة الرسائل المرسلة
 */
export async function GET() {
  try {
    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()

    const { data: messages, error } = await supabase
      .from("whatsapp_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) {
      console.error("[Database] Error fetching messages:", error)
      return NextResponse.json(
        { error: "فشل في جلب الرسائل" },
        { status: 500 }
      )
    }

    return NextResponse.json({ messages })
  } catch (error) {
    console.error("[WhatsApp] Get messages error:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب الرسائل" },
      { status: 500 }
    )
  }
}
