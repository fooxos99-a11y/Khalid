"use client"

import { useEffect, useState } from "react"
import { useRouter } from 'next/navigation'
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { UserPlus, ArrowRight, Shield, PlusCircle, Trash2, Plus } from 'lucide-react'
import { createClient } from "@/lib/supabase/client"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { SiteLoader } from "@/components/ui/site-loader"

interface UserEntry {
  id: string
  name: string
  account_number: number
  phone_number?: string
  id_number?: string
  role: string
}

export default function AdminsManagement() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("الهيكل الإداري");

  const [isLoading, setIsLoading] = useState(true)
  const [users, setUsers] = useState<UserEntry[]>([])
  const [roles, setRoles] = useState<string[]>(["سكرتير", "مشرف تعليمي", "مشرف تربوي", "مشرف برامج"])

  const [isAddMode, setIsAddMode] = useState(false)
  const [isAddRoleMode, setIsAddRoleMode] = useState(false)

  const [newAdmin, setNewAdmin] = useState({ name: "", account_number: "", phone_number: "", id_number: "", role: "سكرتير" })
  const [newRoleName, setNewRoleName] = useState("")

  const [isSubmitting, setIsSubmitting] = useState(false)

  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true"
    const userRole = localStorage.getItem("userRole")

    if (!loggedIn || !userRole || userRole === "student" || userRole === "teacher" || userRole === "deputy_teacher") {
      router.push("/login")
    } else {
      fetchData()
    }
  }, [router])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()

      const { data: usersData, error } = await supabase
        .from("users")
        .select("*")
        .neq("role", "student")
        .neq("role", "teacher")
        .neq("role", "deputy_teacher")
        .neq("account_number", 2)
        .order("account_number", { ascending: true })

      if (!error && usersData) {
        setUsers(usersData)
      }

      const rolesRes = await fetch("/api/roles")
      const rolesData = await rolesRes.json()
      if (rolesData && rolesData.roles && rolesData.roles.length > 0) {
        const filteredRoles = rolesData.roles.filter((r: string) => r !== "مدير")
        setRoles(filteredRoles)
        setNewAdmin(prev => ({ ...prev, role: filteredRoles[0] || "سكرتير" }))
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteRole = async (roleToDelete: string) => {
    try {
      const rolesRes = await fetch("/api/roles")
      const rolesData = await rolesRes.json()
      const updatedRoles = (rolesData.roles || roles).filter((r: string) => r !== roleToDelete)
      const updatedPermissions = { ...(rolesData.permissions || {}) }
      delete updatedPermissions[roleToDelete]
      const saveRes = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles: updatedRoles, permissions: updatedPermissions })
      })
      if (saveRes.ok) {
        toast({ title: "تم الحذف", description: `تم حذف "مسمى ${roleToDelete}"` })
        setRoles(updatedRoles)
      } else {
        throw new Error("Failed")
      }
    } catch {
      toast({ title: "خطأ", description: "حدث خطأ أثناء حذف المسمى", variant: "destructive" })
    }
  }

  const RESERVED_ROLE_NAMES = ["طالب", "student", "معلم", "teacher", "نائب معلم", "deputy_teacher", "مدير", "admin"]

  const handleAddRole = async () => {
    if (!newRoleName.trim()) {
      toast({ title: "تنبيه", description: "الرجاء إدخال المسمى الوظيفي", variant: "destructive" })
      return
    }

    if (RESERVED_ROLE_NAMES.some(r => newRoleName.trim().toLowerCase() === r.toLowerCase())) {
      toast({ title: "مسمى محجوز", description: `"${newRoleName.trim()}" اسم محجوز ولا يمكن استخدامه كمسمى وظيفي`, variant: "destructive" })
      return
    }

    if (roles.includes(newRoleName.trim())) {
      toast({ title: "تنبيه", description: "المسمى الوظيفي مسجل مسبقاً", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      const rolesRes = await fetch("/api/roles")
      const rolesData = await rolesRes.json()

      const updatedRoles = {
        roles: [...(rolesData.roles || roles), newRoleName.trim()],
        permissions: { ...(rolesData.permissions || {}), [newRoleName.trim()]: [] }
      }

      const saveRes = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedRoles)
      })

      if (saveRes.ok) {
        toast({ title: "تم الإضافة", description: `تم إضافة "${newRoleName}" بنجاح` })
        setRoles(updatedRoles.roles)
        setNewRoleName("")
        setIsAddRoleMode(false)
      } else {
        throw new Error("Failed to save")
      }
    } catch {
      toast({ title: "خطأ", description: "حدث خطأ أثناء حفظ المسمى", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddAdmin = async () => {
    if (!newAdmin.name || !newAdmin.account_number) {
      toast({ title: "تنبيه", description: "يرجى ملء الحقول الإجبارية", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("users").insert({
        name: newAdmin.name,
        account_number: Number.parseInt(newAdmin.account_number),
        phone_number: newAdmin.phone_number || null,
        id_number: newAdmin.id_number || null,
        role: newAdmin.role,
        halaqah: ""
      })

      if (error) throw error

      toast({ title: "نجاح", description: "تم إضافة المستخدم بنجاح" })
      setNewAdmin({ name: "", account_number: "", phone_number: "", id_number: "", role: roles[0] || "سكرتير" })
      setIsAddMode(false)
      fetchData()
    } catch {
      toast({ title: "خطأ", description: "حدث خطأ أثناء الإضافة", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase.from("users").delete().eq("id", userId)
      if (error) throw error
      toast({ title: "تم الحذف", description: "تم حذف المستخدم بنجاح" })
      setUsers(users.filter(u => u.id !== userId))
    } catch {
      toast({ title: "خطأ", description: "فشل في حذف المستخدم", variant: "destructive" })
    }
  }

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase.from("users").update({ role: newRole }).eq("id", userId)
      if (error) throw error

      toast({ title: "نجاح", description: "تم تحديث المسمى الوظيفي بنجاح" })
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
    } catch {
      toast({ title: "خطأ", description: "فشل في تحديث المسمى الوظيفي", variant: "destructive" })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf9]">
        <SiteLoader size="lg" />
      </div>
    )
  }

    if (authLoading || !authVerified) return (<div className="min-h-screen flex items-center justify-center bg-[#fafaf9]"><SiteLoader size="md" /></div>);

  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf9]" dir="rtl">
      <Header />
      <main className="flex-1 py-10 px-4">
        <div className="container mx-auto max-w-4xl space-y-8">

          <div className="flex items-center justify-between border-b border-[#3453a7]/40 pb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/admin")}
                className="w-10 h-10 rounded-full bg-white border border-[#3453a7]/30 flex items-center justify-center text-neutral-600 hover:bg-[#3453a7]/10 hover:text-[#3453a7] transition-all"
              >
                <ArrowRight className="w-5 h-5 rotate-180" />
              </button>
              <h1 className="text-2xl font-bold text-[#1a2332]">الهيكل الإداري</h1>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#3453a7]/50 bg-[#3453a7]/10 hover:bg-[#3453a7]/20 text-[#4f73d1] hover:text-[#3453a7] text-sm font-semibold shadow-none">
                  <Plus className="w-4 h-4" />
                  إضافة
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[190px] rounded-xl border border-[#3453a7]/20 p-1.5" dir="rtl">
                <DropdownMenuItem
                  onClick={() => setIsAddMode(true)}
                  className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-[#1a2332] focus:bg-[#3453a7]/10"
                >
                  <span>إضافة إداري</span>
                  <UserPlus className="w-4 h-4 text-[#3453a7]" />
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setIsAddRoleMode(true)}
                  className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-[#1a2332] focus:bg-[#3453a7]/10"
                >
                  <span>إضافة مسمى</span>
                  <PlusCircle className="w-4 h-4 text-[#3453a7]" />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Dialog: Add Role */}
          <Dialog open={isAddRoleMode} onOpenChange={setIsAddRoleMode}>
            <DialogContent className="sm:max-w-md bg-white border-[#3453a7]/20 font-cairo" dir="rtl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-[#1a2332]">إضافة مسمى وظيفي جديد</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>اسم المسمى الوظيفي</Label>
                  <Input
                    value={newRoleName}
                    onChange={e => setNewRoleName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleAddRole() }}
                  />
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <p className="text-xs text-neutral-500 w-full">المسميات الحالية:</p>
                  {roles.map(r => (
                    <span key={r} className="text-xs bg-[#3453a7]/10 text-[#4f73d1] border border-[#3453a7]/30 rounded-full pl-3 pr-2 py-1 flex items-center gap-1">
                      {r}
                      <button
                        onClick={() => handleDeleteRole(r)}
                        className="w-4 h-4 rounded-full bg-[#3453a7]/20 hover:bg-red-100 hover:text-red-500 flex items-center justify-center text-[#4f73d1] transition-colors text-[10px] font-bold leading-none"
                        title="حذف المسمى"
                      >×</button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsAddRoleMode(false)}>إلغاء</Button>
                <Button onClick={handleAddRole} disabled={isSubmitting} className="bg-[#3453a7] text-white border-none">
                  {isSubmitting ? "جاري الحفظ..." : "حفظ المسمى"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Dialog: Add User */}
          <Dialog open={isAddMode} onOpenChange={setIsAddMode}>
            <DialogContent className="sm:max-w-md bg-white border-[#3453a7]/20 font-cairo" dir="rtl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-[#1a2332]">إضافة اداري جديد</DialogTitle>
                <DialogDescription>أدخل بيانات الإداري والمسمى الوظيفي</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>الاسم الكامل *</Label>
                  <Input value={newAdmin.name} onChange={e => setNewAdmin({ ...newAdmin, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>رقم الحساب *</Label>
                  <Input type="number" value={newAdmin.account_number} onChange={e => setNewAdmin({ ...newAdmin, account_number: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>المسمى الوظيفي *</Label>
                  <Select value={newAdmin.role} onValueChange={(val) => setNewAdmin({ ...newAdmin, role: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المسمى" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      {roles.map(r => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>رقم الجوال</Label>
                    <Input value={newAdmin.phone_number} onChange={e => setNewAdmin({ ...newAdmin, phone_number: e.target.value })} dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label>رقم الهوية</Label>
                    <Input value={newAdmin.id_number} onChange={e => setNewAdmin({ ...newAdmin, id_number: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsAddMode(false)}>إلغاء</Button>
                <Button onClick={handleAddAdmin} disabled={isSubmitting} className="bg-[#3453a7] text-white border-none">
                  {isSubmitting ? "جاري الحفظ..." : "حفظ"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Users List */}
          {users.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#3453a7]/40 shadow-sm p-16 text-center">
              <Shield className="w-10 h-10 text-[#3453a7] mx-auto mb-4" />
              <p className="text-lg font-semibold text-neutral-500">لا يوجد مستخدمين لعرضهم</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#3453a7]/40 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-[#3453a7]/40 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#3453a7]/10 border border-[#3453a7]/30 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-[#3453a7]" />
                </div>
                <h2 className="text-base font-bold text-[#1a2332]">قائمة الإداريين</h2>
              </div>
              <div className="divide-y divide-[#3453a7]/20">
                {users.map((user) => (
                  <div key={user.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-4 hover:bg-[#3453a7]/5 transition-colors gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#3453a7]/10 border border-[#3453a7]/30 flex items-center justify-center shrink-0">
                        <Shield className="w-4 h-4 text-[#3453a7]" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#1a2332]">{user.name}</p>
                        <p className="text-xs text-neutral-500">حساب رقم: {user.account_number}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-[160px]">
                        <Select value={user.role} onValueChange={(val) => handleChangeRole(user.id, val)}>
                          <SelectTrigger className="h-9 border-[#3453a7]/30 text-sm w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent dir="rtl">
                            {roles.map(r => (
                              <SelectItem key={r} value={r}>{r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {user.account_number !== 2 && (
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="w-9 h-9 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors border border-transparent hover:border-red-200"
                          title="حذف المستخدم"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
