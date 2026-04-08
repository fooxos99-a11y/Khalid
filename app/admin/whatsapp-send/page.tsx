"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useWhatsAppStatus } from "@/hooks/use-whatsapp-status"
import { MessageCircle, Send, Users, CheckCircle2, XCircle, Phone } from "lucide-react"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { SiteLoader } from "@/components/ui/site-loader"
import { formatGuardianPhoneForDisplay } from "@/lib/phone-number"

interface Student {
  id: string
  name: string
  guardian_phone: string
  account_number: number
}

export default function WhatsAppSendPage() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("الإرسال إلى أولياء الأمور");
  const { isReady: isWhatsAppReady, isLoading: isWhatsAppStatusLoading } = useWhatsAppStatus()

    // إدارة الرسائل الجاهزة المشتركة
    const [readyMessages, setReadyMessages] = useState<{id:number,text:string}[]>([])
    const [isLoadingReady, setIsLoadingReady] = useState(false)

    // جلب الرسائل الجاهزة من قاعدة البيانات
    const fetchReadyMessages = async () => {
      setIsLoadingReady(true)
      try {
        const res = await fetch("/api/whatsapp-ready-messages")
        const data = await res.json()
        if (data.messages) setReadyMessages(data.messages)
      } catch (e) {
        setReadyMessages([])
      } finally {
        setIsLoadingReady(false)
      }
    }

    // إضافة رسالة جاهزة
    const handleAddReadyMessage = async () => {
      if (!quickText.trim()) return
      try {
        const res = await fetch("/api/whatsapp-ready-messages", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({text: quickText})
        })
        const data = await res.json()
        if (data.message) {
          setQuickText("")
          fetchReadyMessages()
        }
      } catch {}
    }

    // حذف رسالة جاهزة
    const handleDeleteReadyMessage = async (id:number) => {
      try {
        await fetch("/api/whatsapp-ready-messages", {
          method: "DELETE",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({id})
        })
        fetchReadyMessages()
      } catch {}
    }

    useEffect(() => {
      fetchReadyMessages()
    }, [])
  const [isLoading, setIsLoading] = useState(true)
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [message, setMessage] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [sendResults, setSendResults] = useState<{ success: number; failed: number } | null>(null)
  const router = useRouter()
  const { toast } = useToast()

    // نص مخصص للإدراج السريع
    const [quickText, setQuickText] = useState("")

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true"
    const userRole = localStorage.getItem("userRole")

    if (!loggedIn || !userRole || userRole === "student" || userRole === "teacher" || userRole === "deputy_teacher") {
      router.push("/login")
    } else {
      fetchStudents()
    }
  }, [router])

  useEffect(() => {
    // تصفية الطلاب حسب البحث
    if (searchTerm) {
      const filtered = students.filter(
        (student) =>
          student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.guardian_phone?.includes(searchTerm) ||
          student.account_number.toString().includes(searchTerm)
      )
      setFilteredStudents(filtered)
    } else {
      setFilteredStudents(students)
    }
  }, [searchTerm, students])

  const fetchStudents = async () => {
    try {
      const response = await fetch("/api/students")
      const data = await response.json()

      if (data.students) {
        // فلترة الطلاب الذين لديهم أرقام أولياء أمور
        const studentsWithPhones = data.students.filter(
          (s: Student) => s.guardian_phone && s.guardian_phone.trim() !== ""
        )
        setStudents(studentsWithPhones)
        setFilteredStudents(studentsWithPhones)
      }
    } catch (error) {
      console.error("Error fetching students:", error)
      toast({
        title: "خطأ",
        description: "فشل في جلب بيانات الطلاب",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([])
    } else {
      setSelectedStudents(filteredStudents.map((s) => s.id))
    }
  }

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    )
  }

  const handleSendMessages = async () => {
    if (!isWhatsAppReady) {
      toast({
        title: "واتساب غير مربوط",
        description: "يجب ربط واتساب أولاً من نافذة باركود الواتساب قبل إرسال الرسائل.",
        variant: "destructive",
      })
      return
    }

    if (selectedStudents.length === 0) {
      toast({
        title: "تنبيه",
        description: "الرجاء اختيار طالب واحد على الأقل",
        variant: "destructive",
      })
      return
    }

    if (!message.trim()) {
      toast({
        title: "تنبيه",
        description: "الرجاء كتابة نص الرسالة",
        variant: "destructive",
      })
      return
    }

    setIsSending(true)
    setSendResults(null)

    const selectedStudentsData = students.filter((s) => selectedStudents.includes(s.id))

    try {
      const response = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          recipients: selectedStudentsData.map((student) => ({
            phoneNumber: student.guardian_phone,
            userId: localStorage.getItem("userId") || undefined,
          })),
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.success) {
        throw new Error(data.error || "فشل في تجهيز رسائل واتساب")
      }

      const successCount = Number(data.queuedCount) || 0
      const failedCount = Number(data.failedCount) || 0

      setSendResults({ success: successCount, failed: failedCount })
      setIsSending(false)

      if (successCount > 0) {
      toast({
        title: "تم تجهيز الرسائل",
        description: `تم تجهيز ${successCount} رسالة واتساب${failedCount > 0 ? ` وتعذر تجهيز ${failedCount}` : ""}`,
      })

      // إعادة تعيين النموذج
      setMessage("")
      setSelectedStudents([])
      } else {
      toast({
        title: "فشل",
        variant: "destructive",
      })
      }
    } catch (error) {
      setIsSending(false)
      toast({
        title: "فشل",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SiteLoader size="lg" />
      </div>
    )
  }

    if (authLoading || !authVerified) return (<div className="min-h-screen flex items-center justify-center bg-[#fafaf9]"><SiteLoader size="md" /></div>);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1 py-4 md:py-8 lg:py-12 px-3 md:px-4">
        <div className="container mx-auto max-w-[2200px] px-2 md:px-8 lg:px-16">
          <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-[#1a2332] mb-2 flex items-center gap-3">
                  <MessageCircle className="w-8 h-8 text-[#3453a7]" />
                  الإرسال إلى أولياء الأمور
                </h1>
              </div>
              <Button
                variant="outline"
                onClick={() => router.push("/admin/whatsapp-replies")}
                className="text-sm h-9 rounded-lg border-[#3453a7]/50 text-neutral-600"
              >
                <MessageCircle className="w-4 h-4 ml-2" />
                عرض الردود
              </Button>
            </div>

            {!isWhatsAppReady ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                واتساب غير مربوط حالياً. اربط الحساب أولاً من نافذة باركود الواتساب قبل إرسال الرسائل إلى أولياء الأمور.
              </div>
            ) : null}

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* تم حذف مربعي المحددون ومعهم واتساب */}
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Message Composer */}
              <div className="lg:col-span-1">
                <Card className="border-2 border-[#3453a7]/20">
                  <CardHeader>
                    <CardTitle className="text-[#1a2332]">كتابة الرسالة</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="message">نص الرسالة</Label>
                      <div className="flex gap-2 mb-2 items-center">
                        <Input
                          type="text"
                          placeholder="اكتب نص لإضافته كرسالة جاهزة"
                          value={quickText}
                          onChange={e => setQuickText(e.target.value)}
                          className="text-xs w-2/3"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="text-sm h-9 rounded-lg border-[#3453a7]/50 text-neutral-600"
                          onClick={handleAddReadyMessage}
                        >
                          إضافة
                        </Button>
                      </div>
                      {/* قائمة الرسائل الجاهزة */}
                      <div className="space-y-1 mb-2">
                        {isLoadingReady ? (
                          <div className="py-1"><SiteLoader /></div>
                        ) : readyMessages.length === 0 ? (
                          <div className="text-xs text-gray-400">لا توجد رسائل جاهزة</div>
                        ) : (
                          readyMessages.map(msg => (
                            <div key={msg.id} className="flex items-center gap-2 bg-gray-100 rounded px-2 py-1">
                              <span className="flex-1 text-xs text-gray-700">{msg.text}</span>
                              <div className="flex gap-2">
                                <Button type="button" size="sm" variant="outline" className="text-sm h-9 rounded-lg border-[#3453a7]/50 text-neutral-600" onClick={()=>setMessage(prev=>prev?prev+"\n"+msg.text:msg.text)}>
                                  إدراج
                                </Button>
                                <Button type="button" size="sm" variant="outline" className="text-sm h-9 rounded-lg border-red-300 text-red-500 hover:bg-red-50 hover:text-red-600" onClick={()=>handleDeleteReadyMessage(msg.id)}>
                                  حذف
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      <Textarea
                        id="message"
                        placeholder="اكتب رسالتك هنا..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={8}
                        className="resize-none"
                      />
                      <p className="text-xs text-gray-500">{message.length} حرف</p>
                    </div>

                    {sendResults && (
                      <div className="space-y-2 rounded-lg bg-white p-4">
                        <h4 className="font-semibold text-[#1a2332]">نتائج الإرسال:</h4>
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>تم الإرسال إلى: {sendResults.success}</span>
                        </div>
                        {sendResults.failed > 0 && (
                          <div className="flex items-center gap-2 text-red-600">
                            <XCircle className="w-4 h-4" />
                            <span>فشل: {sendResults.failed}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <Button
                      onClick={handleSendMessages}
                      disabled={isSending || isWhatsAppStatusLoading || !isWhatsAppReady || selectedStudents.length === 0 || !message.trim()}
                      variant="outline"
                      className="w-full text-sm h-9 rounded-lg border-[#3453a7]/50 text-neutral-600"
                    >
                      {isSending ? (
                        <>جاري الإرسال</>
                      ) : (
                        <>
                          <Send className="w-4 h-4 ml-2" />
                          إرسال ({selectedStudents.length})
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Students List */}
              <div className="lg:col-span-2">
                <Card className="border-2 border-[#3453a7]/20">
                  <CardHeader>
                    <CardTitle className="text-[#1a2332]">اختيار الطلاب</CardTitle>
                    <CardDescription>حدد أولياء الأمور الذين تريد إرسال الرسالة لهم</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Search & Select All */}
                    <div className="flex flex-col md:flex-row gap-3">
                      <div className="flex-1">
                        <Input
                          type="text"
                          placeholder="بحث بالاسم أو رقم الهاتف..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <Button
                        onClick={handleSelectAll}
                        variant="outline"
                        className="text-sm h-9 rounded-lg border-[#3453a7]/50 text-neutral-600 whitespace-nowrap"
                      >
                        {selectedStudents.length === filteredStudents.length
                          ? "إلغاء تحديد الكل"
                          : "تحديد الكل"}
                      </Button>
                    </div>

                    {/* Students Grid */}
                    <div className="max-h-[600px] overflow-y-auto space-y-2">
                      {filteredStudents.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                          <p>لا توجد نتائج</p>
                        </div>
                      ) : (
                        filteredStudents.map((student) => (
                          <label
                            key={student.id}
                            className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-[#3453a7] ${
                              selectedStudents.includes(student.id)
                                ? "border-[#3453a7] bg-[#3453a7]/5"
                                : "border-gray-200"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedStudents.includes(student.id)}
                              onChange={() => handleSelectStudent(student.id)}
                              className="w-5 h-5 text-[#3453a7] rounded"
                            />
                            <div className="flex-1">
                              <p className="font-semibold text-[#1a2332]">{student.name}</p>
                              <p className="text-sm text-gray-600 flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {formatGuardianPhoneForDisplay(student.guardian_phone)}
                              </p>
                            </div>
                            <div className="text-sm text-gray-500">#{student.account_number}</div>
                          </label>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
