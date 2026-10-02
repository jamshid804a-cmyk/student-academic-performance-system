"use client"

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { toast } from 'sonner'
import { LoaderIcon, Upload, X, User, Plus, Loader2 } from 'lucide-react'

const SECTIONS = ["A", "B", "C"]

const START_YEAR = 2025
const END_YEAR = new Date().getFullYear() + 30
const YEARS = []
for (let y = START_YEAR; y <= END_YEAR; y++) YEARS.push(String(y))

// Course Duration: 1 Month, 2 Months, ..., 12 Months
const DURATIONS = Array.from({ length: 12 }, (_, i) => {
  const n = i + 1
  return `${n} Month${n === 1 ? "" : "s"}`
})

// Batch No: Batch 1, Batch 2, ..., Batch 20
const BATCHES = Array.from({ length: 20 }, (_, i) => `Batch ${i + 1}`)

function AddNewStudent({ refreshData, email, students = [] }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [imagePreview, setImagePreview] = useState(null)
    const [imageFile, setImageFile] = useState(null)

    const [courses, setCourses] = useState([])
    const [coursesLoading, setCoursesLoading] = useState(false)

    const [addCourseOpen, setAddCourseOpen] = useState(false)
    const [newCourseName, setNewCourseName] = useState("")
    const [newCourseCategory, setNewCourseCategory] = useState("Custom")
    const [addCourseSaving, setAddCourseSaving] = useState(false)

    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm()

    useEffect(() => {
        if (!open || !email) return
        setCoursesLoading(true)
        fetch(`/api/academy/courses?email=${encodeURIComponent(email)}`, { cache: 'no-store' })
            .then(r => r.json())
            .then(d => { if (d.success) setCourses(d.courses || []) })
            .catch(() => {})
            .finally(() => setCoursesLoading(false))
    }, [open, email])

    const handleImageChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                toast.error("Image size should be less than 2MB")
                return
            }
            setImageFile(file)
            const reader = new FileReader()
            reader.onloadend = () => setImagePreview(reader.result)
            reader.readAsDataURL(file)
        }
    }

    const removeImage = () => { setImageFile(null); setImagePreview(null) }

    const isRollNoDuplicate = (rollNo, course, section, year) => {
        if (!rollNo || !course) return false
        return students.some((s) => {
            const sameRoll = Number(s.rollNo) === Number(rollNo)
            const sameCourse = String(s.subject || "").trim().toLowerCase() === String(course).trim().toLowerCase()
            const sameSection = section ? String(s.section || "").trim() === String(section).trim() : true
            const sameYear = year ? String(s.year || "").trim() === String(year).trim() : true
            return sameRoll && sameCourse && sameSection && sameYear
        })
    }

    const isAdmissionNoDuplicate = (admissionNo) => {
        if (!admissionNo) return false
        return students.some(
            (s) => String(s.admissionNo || "").trim() === String(admissionNo).trim()
        )
    }

    const onSubmit = async (data) => {
        if (!data.studentName || !data.course) {
            toast.error("Student Name and Course are required")
            return
        }
        if (data.rollNo && isRollNoDuplicate(data.rollNo, data.course, data.section, data.year)) {
            toast.error(`Roll No ${data.rollNo} already exists`)
            return
        }
        if (data.admissionNo && isAdmissionNoDuplicate(data.admissionNo)) {
            toast.error(`Admission No ${data.admissionNo} already exists`)
            return
        }

        setLoading(true)
        try {
            const payload = {
                email,
                name: data.studentName,
                fatherName: data.fatherName || "",
                fatherOccupation: data.fatherOccupation || "",
                admissionNo: data.admissionNo || null,
                contact: data.contactNo || "",
                subject: data.course,
                section: data.section || "",
                rollNo: data.rollNo ? Number(data.rollNo) : null,
                year: data.year || "",
                courseDuration: data.courseDuration || "",
                batchNo: data.batchNo || "",
                admissionDate: data.admissionDate || null,
                fee: data.fee ? Number(data.fee) : 0,
                address: data.address || "",
                image: imagePreview,
            }

            const res = await fetch('/api/academy/student', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const result = await res.json()

            if (result.success) {
                toast.success("Student Added Successfully")
                reset()
                setImageFile(null)
                setImagePreview(null)
                setOpen(false)
                if (refreshData) await refreshData()
            } else {
                toast.error(result.error || "Failed to save student")
            }
        } catch (error) {
            toast.error("Failed to save student")
        }
        setLoading(false)
    }

    const saveNewCourse = async () => {
        if (!newCourseName.trim() || newCourseName.trim().length < 2) {
            toast.error("Course name must be at least 2 characters")
            return
        }
        setAddCourseSaving(true)
        try {
            const res = await fetch('/api/academy/courses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    name: newCourseName.trim(),
                    category: newCourseCategory.trim() || 'Custom',
                }),
            })
            const data = await res.json()
            if (data.success) {
                toast.success("Course added")
                setCourses((prev) => [...prev, data.course])
                setValue("course", data.course.name)
                setNewCourseName("")
                setNewCourseCategory("Custom")
                setAddCourseOpen(false)
            } else {
                toast.error(data.error || "Failed to add course")
            }
        } catch { toast.error("Failed to add course") }
        setAddCourseSaving(false)
    }

    const inputClass = "w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition text-gray-900 placeholder:text-gray-400 bg-white"
    const labelClass = "block text-sm font-semibold text-gray-700 mb-1.5"

    const groupedCourses = courses.reduce((acc, c) => {
        const cat = c.category || 'Other'
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(c)
        return acc
    }, {})

    return (
        <div>
            <Button onClick={() => setOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm">
                + Add New Student
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-3xl bg-white rounded-2xl shadow-xl border-0 p-0 overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-5">
                        <DialogHeader>
                            <DialogTitle className="text-white text-xl font-bold">Add New Academy Student</DialogTitle>
                            <DialogDescription className="text-purple-100 text-sm">
                                Fill in the student's details below
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)}
                        className="px-6 py-6 space-y-5 max-h-[75vh] overflow-y-auto">

                        <div className="flex items-start gap-6">
                            <div className="flex flex-col items-center gap-2">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
                                        {imagePreview ? (
                                            <img src={imagePreview} alt="Student" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-8 h-8 text-gray-400" />
                                        )}
                                    </div>
                                    {imagePreview && (
                                        <button type="button" onClick={removeImage}
                                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow hover:bg-red-600 transition">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                                <label className="cursor-pointer text-xs font-medium text-purple-600 hover:text-purple-700 flex items-center gap-1">
                                    <Upload className="w-3.5 h-3.5" /> Upload Photo
                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                                </label>
                            </div>
                            <div className="flex-1 pt-2">
                                <p className="text-sm text-gray-500">Upload a clear student photo (max 2MB).</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Student Name <span className="text-red-500">*</span></label>
                                <input placeholder="e.g. Ahmed Khan" className={inputClass}
                                    {...register("studentName", {
                                        required: "Student name is required",
                                        pattern: { value: /^[A-Za-z\s]+$/, message: "Only alphabets and spaces allowed" }
                                    })} />
                                {errors.studentName && <p className="text-red-500 text-xs mt-1">{errors.studentName.message}</p>}
                            </div>
                            <div>
                                <label className={labelClass}>Father Name</label>
                                <input placeholder="e.g. Imran Khan" className={inputClass}
                                    {...register("fatherName", {
                                        pattern: { value: /^[A-Za-z\s]*$/, message: "Only alphabets and spaces allowed" }
                                    })} />
                                {errors.fatherName && <p className="text-red-500 text-xs mt-1">{errors.fatherName.message}</p>}
                            </div>
                            <div>
                                <label className={labelClass}>Father Occupation</label>
                                <input placeholder="e.g. Businessman" className={inputClass}
                                    {...register("fatherOccupation", {
                                        pattern: { value: /^[A-Za-z\s]*$/, message: "Only alphabets and spaces allowed" }
                                    })} />
                                {errors.fatherOccupation && <p className="text-red-500 text-xs mt-1">{errors.fatherOccupation.message}</p>}
                            </div>
                            <div>
                                <label className={labelClass}>Contact No</label>
                                <input placeholder="e.g. 03001234567" className={inputClass} maxLength={11}
                                    {...register("contactNo", {
                                        pattern: { value: /^[0-9]{11}$/, message: "Contact must be exactly 11 digits" }
                                    })}
                                    onInput={(e) => { e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 11) }} />
                                {errors.contactNo && <p className="text-red-500 text-xs mt-1">{errors.contactNo.message}</p>}
                            </div>
                            <div>
                                <label className={labelClass}>Admission No</label>
                                <input placeholder="e.g. 1001" className={inputClass}
                                    {...register("admissionNo", {
                                        pattern: { value: /^[1-9][0-9]*$/, message: "Admission No must be a positive number" }
                                    })}
                                    onInput={(e) => { e.target.value = e.target.value.replace(/[^0-9]/g, '').replace(/^0+/, '') }} />
                                {errors.admissionNo && <p className="text-red-500 text-xs mt-1">{errors.admissionNo.message}</p>}
                            </div>
                            <div>
                                <label className={labelClass}>Admission Date</label>
                                <input type="date" className={inputClass} {...register("admissionDate")} />
                            </div>

                            <div>
                                <label className={labelClass}>Course <span className="text-red-500">*</span></label>
                                <div className="flex gap-2">
                                    <select className={inputClass} {...register("course", { required: true })} disabled={coursesLoading}>
                                        <option value="">{coursesLoading ? "Loading…" : "Select Course"}</option>
                                        {Object.keys(groupedCourses).sort().map((cat) => (
                                            <optgroup key={cat} label={cat}>
                                                {groupedCourses[cat].map((c) => (
                                                    <option key={c._id} value={c.name}>{c.name}</option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                    <button type="button" onClick={() => setAddCourseOpen(true)}
                                        className="shrink-0 px-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1 text-sm font-semibold transition">
                                        <Plus size={15} /> Add
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Section</label>
                                <select className={inputClass} {...register("section")}>
                                    <option value="">Select Section</option>
                                    {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Roll No</label>
                                <input type="number" placeholder="e.g. 12" className={inputClass}
                                    {...register("rollNo", { min: { value: 1, message: "Roll No must be positive" } })}
                                    onInput={(e) => { e.target.value = e.target.value.replace(/[^0-9]/g, '').replace(/^0+/, '') }} />
                                {errors.rollNo && <p className="text-red-500 text-xs mt-1">{errors.rollNo.message}</p>}
                            </div>
                            <div>
                                <label className={labelClass}>Year</label>
                                <select className={inputClass} {...register("year")}>
                                    <option value="">Select Year</option>
                                    {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>

                            {/* Course Duration */}
                            <div>
                                <label className={labelClass}>Course Duration</label>
                                <select className={inputClass} {...register("courseDuration")}>
                                    <option value="">Select Duration</option>
                                    {DURATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>

                            {/* Batch No */}
                            <div>
                                <label className={labelClass}>Batch No</label>
                                <select className={inputClass} {...register("batchNo")}>
                                    <option value="">Select Batch</option>
                                    {BATCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className={labelClass}>Fee</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">Rs.</span>
                                    <input type="number" placeholder="e.g. 5000"
                                        className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition text-gray-900 placeholder:text-gray-400"
                                        {...register("fee", { min: { value: 0, message: "Fee cannot be negative" } })} />
                                </div>
                                {errors.fee && <p className="text-red-500 text-xs mt-1">{errors.fee.message}</p>}
                            </div>
                            <div>
                                <label className={labelClass}>Address</label>
                                <input placeholder="e.g. Gahri Chandan Payan" className={inputClass} {...register("address")} />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="px-5">Cancel</Button>
                            <Button type="submit" disabled={loading}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-6 shadow-sm">
                                {loading ? <LoaderIcon className="animate-spin w-4 h-4" /> : "Save Student"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Add Course mini dialog */}
            <Dialog open={addCourseOpen} onOpenChange={setAddCourseOpen}>
                <DialogContent className="max-w-md bg-white rounded-2xl shadow-xl border-0 p-0 overflow-hidden z-[10001]">
                    <div className="bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-5">
                        <DialogHeader>
                            <DialogTitle className="text-white text-lg font-bold">Add Course</DialogTitle>
                            <DialogDescription className="text-purple-100 text-xs">Add a new course to your academy</DialogDescription>
                        </DialogHeader>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className={labelClass}>Course Name <span className="text-red-500">*</span></label>
                            <input value={newCourseName} onChange={(e) => setNewCourseName(e.target.value)}
                                placeholder="e.g. IELTS Preparation" className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Category</label>
                            <input value={newCourseCategory} onChange={(e) => setNewCourseCategory(e.target.value)}
                                placeholder="Custom" className={inputClass} />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
                        <Button type="button" variant="outline" onClick={() => setAddCourseOpen(false)} disabled={addCourseSaving}>Cancel</Button>
                        <Button type="button" onClick={saveNewCourse} disabled={addCourseSaving}
                            className="bg-purple-600 hover:bg-purple-700 text-white">
                            {addCourseSaving ? <Loader2 className="animate-spin w-4 h-4" /> : "Add Course"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default AddNewStudent