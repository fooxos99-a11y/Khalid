"use client"

import { useEffect, useState } from "react"
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Settings, Users, User, Edit2 } from 'lucide-react'
import { useConfirmDialog } from "@/hooks/use-confirm-dialog"
import { useAlertDialog } from "@/hooks/use-confirm-dialog"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { SiteLoader } from "@/components/ui/site-loader"

interface Teacher {
  id: string
  name: string
  accountNumber: string
  idNumber: string
  halaqah: string
  studentCount: number
  phoneNumber?: string
  role?: string
}

interface Circle {
  id: string
  name: string
}

export function GlobalTeachersDialog() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("إدارة المعلمين");

  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(true)
  const handleClose = (open: boolean) => { if(!open) { setIsOpen(false); setTimeout(() => router.push(window.location.pathname), 300) } }
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [circles, setCircles] = useState<Circle[]>([])
  const [newTeacherName, setNewTeacherName] = useState("")
  const [newTeacherIdNumber, setNewTeacherIdNumber] = useState("")
  const [newTeacherAccountNumber, setNewTeacherAccountNumber] = useState("")
  const [selectedHalaqah, setSelectedHalaqah] = useState("")
  const [newTeacherRole, setNewTeacherRole] = useState<"teacher" | "deputy_teacher">("teacher")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isSavingAdd, setIsSavingAdd] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null)
  const [editTeacherName, setEditTeacherName] = useState("")
  const [editTeacherAccountNumber, setEditTeacherAccountNumber] = useState("")
  const [editTeacherHalaqah, setEditTeacherHalaqah] = useState("")
  const [editTeacherRole, setEditTeacherRole] = useState<"teacher" | "deputy_teacher">("teacher")
  const [editPhoneNumber, setEditPhoneNumber] = useState("")
  const [editIdNumber, setEditIdNumber] = useState("")
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const router = useRouter()
  const confirmDialog = useConfirmDialog()
  const showAlert = useAlertDialog()

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true"
    const userRole = localStorage.getItem("userRole")
    if (!loggedIn || !userRole || userRole === "student" || userRole === "teacher" || userRole === "deputy_teacher") {
      router.push("/login")
    } else {
      setIsLoading(false)
      loadData()
    }
  }, [router])

  const loadData = async () => {
    setIsLoadingData(true)
    await Promise.all([fetchTeachers(), fetchCircles()])
    setIsLoadingData(false)
  }

  const fetchTeachers = async () => {
    try {
      const response = await fetch("/api/teachers")
      const data = await response.json()
      if (data.teachers) {
        const mappedTeachers = data.teachers.map((t: any) => ({
          ...t,
          phoneNumber: t.phoneNumber || "",
          idNumber: t.idNumber || "",
        }))
        setTeachers(mappedTeachers)
      }
    } catch (error) {
      console.error("[v0] Error fetching teachers:", error)
    }
  }

  const fetchCircles = async () => {
    try {
      const response = await fetch("/api/circles")
      const data = await response.json()
      if (data.circles) {
        setCircles(data.circles)
      }
    } catch (error) {
      console.error("[v0] Error fetching circles:", error)
    }
  }

  const handleAddTeacher = async () => {
    if (isSavingAdd) return

    if (
      newTeacherName.trim() &&
      newTeacherIdNumber.trim() &&
      newTeacherAccountNumber.trim() &&
      selectedHalaqah.trim()
    ) {
      try {
        setIsSavingAdd(true)
        const response = await fetch("/api/teachers", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: newTeacherName,
            id_number: newTeacherIdNumber,
            account_number: Number.parseInt(newTeacherAccountNumber),
            halaqah: selectedHalaqah,
            role: newTeacherRole,
          }),
        })

        const data = await response.json().catch(() => null)

        if (response.ok && data?.success) {
          setTeachers((currentTeachers) => [...currentTeachers, data.teacher])
          const roleLabel = newTeacherRole === "deputy_teacher" ? "نائب معلم" : "معلم"
          const addedTeacherName = newTeacherName
          const addedTeacherHalaqah = selectedHalaqah
          setNewTeacherName("")
          setNewTeacherIdNumber("")
          setNewTeacherAccountNumber("")
          setSelectedHalaqah("")
          setNewTeacherRole("teacher")
          setIsAddDialogOpen(false)
          await showAlert(`تم إضافة ${roleLabel} ${addedTeacherName} إلى ${addedTeacherHalaqah} بنجاح`, "نجاح")
        } else {
          await showAlert(data?.error || "فشل في إضافة المعلم", "خطأ")
        }
      } catch (error) {
        console.error("[v0] Error adding teacher:", error)
        await showAlert("حدث خطأ أثناء إضافة المعلم", "خطأ")
      } finally {
        setIsSavingAdd(false)
      }
    } else {
      await showAlert("الرجاء ملء جميع الحقول", "تنبيه")
    }
  }

  const handleRemoveTeacher = async (id: string, name: string) => {
    const confirmed = await confirmDialog(`هل أنت متأكد من إزالة المعلم ${name}؟`)
    if (confirmed) {
      try {
        const response = await fetch(`/api/teachers?id=${id}`, {
          method: "DELETE",
        })

        const data = await response.json()

        if (data.success) {
          setTeachers(teachers.filter((t) => t.id !== id))
          await showAlert(`تم إزالة المعلم ${name} بنجاح`, "نجاح")
        } else {
          await showAlert("فشل في إزالة المعلم", "خطأ")
        }
      } catch (error) {
        console.error("[v0] Error removing teacher:", error)
        await showAlert("حدث خطأ أثناء إزالة المعلم", "خطأ")
      }
    }
  }

  const handleEditTeacher = (teacher: Teacher) => {
    setEditingTeacher(teacher)
    setEditTeacherName(teacher.name || "")
    setEditTeacherAccountNumber(teacher.accountNumber || "")
    setEditTeacherHalaqah(teacher.halaqah || "")
    setEditTeacherRole(teacher.role === "deputy_teacher" ? "deputy_teacher" : "teacher")
    setEditPhoneNumber(teacher.phoneNumber || "")
    setEditIdNumber(teacher.idNumber || "")
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingTeacher || isSavingEdit) return

    if (
      !editTeacherName.trim() ||
      !editTeacherAccountNumber.trim() ||
      !editTeacherHalaqah.trim() ||
      !editIdNumber.trim()
    ) {
      await showAlert("الرجاء تعبئة الحقول المطلوبة", "تنبيه")
      return
    }

    try {
      setIsSavingEdit(true)
      const response = await fetch("/api/teachers", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingTeacher.id,
          name: editTeacherName,
          account_number: Number.parseInt(editTeacherAccountNumber),
          halaqah: editTeacherHalaqah,
          role: editTeacherRole,
          phone_number: editPhoneNumber,
          id_number: editIdNumber,
        }),
      })

      const data = await response.json()

      if (data.success) {
        const updatedTeacher = data.teacher
          ? {
              id: data.teacher.id,
              name: data.teacher.name,
              accountNumber: data.teacher.account_number?.toString() || data.teacher.accountNumber || "",
              idNumber: data.teacher.id_number || data.teacher.idNumber || "",
              halaqah: data.teacher.halaqah || "",
              studentCount: editingTeacher.studentCount,
              phoneNumber: data.teacher.phone_number || data.teacher.phoneNumber || "",
              role: data.teacher.role || "teacher",
            }
          : {
              ...editingTeacher,
              name: editTeacherName,
              accountNumber: editTeacherAccountNumber,
              idNumber: editIdNumber,
              halaqah: editTeacherHalaqah,
              phoneNumber: editPhoneNumber,
              role: editTeacherRole,
            }

        setTeachers((currentTeachers) =>
          currentTeachers.map((teacher) => (teacher.id === editingTeacher.id ? updatedTeacher : teacher)),
        )
        setIsEditDialogOpen(false)
        setEditingTeacher(null)
        setEditTeacherName("")
        setEditTeacherAccountNumber("")
        setEditTeacherHalaqah("")
        setEditTeacherRole("teacher")
        setEditPhoneNumber("")
        setEditIdNumber("")
        void showAlert(`تم تحديث معلومات المعلم ${updatedTeacher.name} بنجاح`, "نجاح")
      } else {
        void showAlert(data.error || "فشل في تحديث المعلم", "خطأ")
      }
    } catch (error) {
      console.error("[v0] Error updating teacher:", error)
      void showAlert("حدث خطأ أثناء تحديث المعلم", "خطأ")
    } finally {
      setIsSavingEdit(false)
    }
  }

  if (isLoading) {
    return null
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl bg-white rounded-2xl p-0 overflow-hidden" dir="rtl">
          <DialogHeader className="relative px-6 py-5 border-b border-[#3453a7]/30 bg-gradient-to-r from-[#3453a7]/8 to-transparent text-right">
            <DialogTitle className="relative w-full text-center text-lg font-bold text-[#1a2332]">
              <Settings className="absolute right-0 top-1/2 h-5 w-5 -translate-y-1/2 text-[#3453a7]" />
              <span>إدارة المعلمين</span>
            </DialogTitle>
            <div className="absolute left-6 top-1/2 flex -translate-y-1/2 items-center gap-2">
              <Button onClick={() => setIsAddDialogOpen(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#3453a7] bg-[#3453a7] hover:bg-[#28448e] text-white hover:text-white text-sm font-semibold shadow-none">
                <Plus className="w-4 h-4" />
                إضافة
              </Button>
            </div>
          </DialogHeader>

          <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
            {isLoadingData ? (
              <div className="flex justify-center py-8">
                <SiteLoader size="md" />
              </div>
            ) : (
              <div className="space-y-3">
                {teachers.map((teacher) => (
                  <div key={teacher.id} className="flex items-center justify-between p-4 bg-white border border-[#3453a7]/20 rounded-xl hover:border-[#3453a7]/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#1a2332]/5 flex items-center justify-center text-[#1a2332]">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-[#1a2332] text-sm">{teacher.name}</h3>
                        <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500">
                          <span className="bg-[#1a2332]/5 px-2 py-0.5 rounded-full">{teacher.halaqah}</span>
                          <span className="bg-[#3453a7]/10 text-[#3453a7] px-2 py-0.5 rounded-full">
                            {teacher.role === 'deputy_teacher' ? 'نائب معلم' : 'معلم'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditTeacher(teacher)} className="h-8 border-[#3453a7]/30 hover:bg-[#3453a7]/10 text-[#3453a7]">
                        <Edit2 className="w-3.5 h-3.5 ml-1" />
                        تعديل
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleRemoveTeacher(teacher.id, teacher.name)} className="h-8 border-red-200 hover:bg-red-50 text-red-600">
                        <Trash2 className="w-3.5 h-3.5 ml-1" />
                        إزالة
                      </Button>
                    </div>
                  </div>
                ))}
                {teachers.length === 0 && (
                  <div className="text-center py-12 text-neutral-500">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>لا يوجد معلمين حالياً</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[480px]" dir="rtl" style={{ zIndex: 110 }}>
          <DialogHeader>
            <DialogTitle className="text-xl text-[#1a2332] text-right">إضافة معلم جديد</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 text-right">
            <div className="space-y-2">
              <Label htmlFor="teacherName" className="text-sm font-semibold text-[#1a2332]">اسم المعلم</Label>
              <Input id="teacherName" value={newTeacherName} onChange={(e) => setNewTeacherName(e.target.value)} placeholder="أدخل اسم المعلم" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacherAccountNumber" className="text-sm font-semibold text-[#1a2332]">رقم الحساب</Label>
              <Input id="teacherAccountNumber" value={newTeacherAccountNumber} onChange={(e) => setNewTeacherAccountNumber(e.target.value)} placeholder="أدخل رقم الحساب" dir="ltr" type="number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacherIdNumber" className="text-sm font-semibold text-[#1a2332]">رقم الهوية</Label>
              <Input id="teacherIdNumber" value={newTeacherIdNumber} onChange={(e) => setNewTeacherIdNumber(e.target.value)} placeholder="أدخل رقم الهوية" dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="halaqah" className="text-sm font-semibold text-[#1a2332]">اختر الحلقة</Label>
              <Select value={selectedHalaqah} onValueChange={setSelectedHalaqah} dir="rtl">
                <SelectTrigger><SelectValue placeholder="اختر الحلقة" /></SelectTrigger>
                <SelectContent style={{ zIndex: 120 }}>
                  {circles.map((circle) => (
                    <SelectItem key={circle.id} value={circle.name}>{circle.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacherRole" className="text-sm font-semibold text-[#1a2332]">المسمى الوظيفي</Label>
              <Select value={newTeacherRole} onValueChange={(value) => setNewTeacherRole(value as "teacher" | "deputy_teacher")} dir="rtl">
                <SelectTrigger><SelectValue placeholder="اختر المسمى" /></SelectTrigger>
                <SelectContent style={{ zIndex: 120 }}>
                  <SelectItem value="teacher">معلم</SelectItem>
                  <SelectItem value="deputy_teacher">نائب معلم</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3" dir="rtl">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="border-[#3453a7]/50 text-neutral-600">إلغاء</Button>
            <Button onClick={handleAddTeacher} disabled={isSavingAdd} className="bg-[#3453a7] hover:bg-[#24428f] text-white border-none disabled:bg-[#8ea2df] disabled:text-white disabled:opacity-100">{isSavingAdd ? "جاري الحفظ..." : "حفظ"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[480px]" dir="rtl" style={{ zIndex: 110 }}>
          <DialogHeader>
            <DialogTitle className="text-xl text-[#1a2332] text-right">تعديل معلومات المعلم</DialogTitle>
            <DialogDescription className="text-sm text-neutral-500 text-right">تعديل بيانات المعلم {editingTeacher?.name}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 text-right">
            <div className="space-y-2">
              <Label htmlFor="editTeacherName" className="text-sm font-semibold text-[#1a2332]">اسم المعلم</Label>
              <Input id="editTeacherName" value={editTeacherName} onChange={(e) => setEditTeacherName(e.target.value)} placeholder="أدخل اسم المعلم" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editTeacherAccountNumber" className="text-sm font-semibold text-[#1a2332]">رقم الحساب</Label>
              <Input id="editTeacherAccountNumber" value={editTeacherAccountNumber} onChange={(e) => setEditTeacherAccountNumber(e.target.value)} placeholder="أدخل رقم الحساب" dir="ltr" type="number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editIdNumber" className="text-sm font-semibold text-[#1a2332]">رقم الهوية</Label>
              <Input id="editIdNumber" value={editIdNumber} onChange={(e) => setEditIdNumber(e.target.value)} placeholder="أدخل رقم الهوية" dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPhoneNumber" className="text-sm font-semibold text-[#1a2332]">رقم الجوال</Label>
              <Input id="editPhoneNumber" value={editPhoneNumber} onChange={(e) => setEditPhoneNumber(e.target.value)} placeholder="أدخل رقم الجوال" dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editTeacherHalaqah" className="text-sm font-semibold text-[#1a2332]">الحلقة</Label>
              <Select value={editTeacherHalaqah} onValueChange={setEditTeacherHalaqah} dir="rtl">
                <SelectTrigger id="editTeacherHalaqah"><SelectValue placeholder="اختر الحلقة" /></SelectTrigger>
                <SelectContent style={{ zIndex: 120 }}>
                  {circles.map((circle) => (
                    <SelectItem key={circle.id} value={circle.name}>{circle.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editTeacherRole" className="text-sm font-semibold text-[#1a2332]">المسمى الوظيفي</Label>
              <Select value={editTeacherRole} onValueChange={(value) => setEditTeacherRole(value as "teacher" | "deputy_teacher")} dir="rtl">
                <SelectTrigger id="editTeacherRole"><SelectValue placeholder="اختر المسمى" /></SelectTrigger>
                <SelectContent style={{ zIndex: 120 }}>
                  <SelectItem value="teacher">معلم</SelectItem>
                  <SelectItem value="deputy_teacher">نائب معلم</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3" dir="rtl">
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setEditingTeacher(null) }} className="border-[#3453a7]/50 text-neutral-600">إلغاء</Button>
            <Button onClick={handleSaveEdit} disabled={isSavingEdit} className="bg-[#3453a7] hover:bg-[#24428f] text-white border-none disabled:bg-[#8ea2df] disabled:text-white disabled:opacity-100">
              {isSavingEdit ? (
                <span className="flex items-center gap-2">
                  <SiteLoader size="sm" />
                  جاري الحفظ...
                </span>
              ) : "حفظ التعديلات"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
