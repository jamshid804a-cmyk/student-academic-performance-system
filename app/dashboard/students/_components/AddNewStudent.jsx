"use client"

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import GlobalApi from '@/app/_services/GlobalApi'
import { toast } from 'sonner'
import { LoaderIcon, Upload, X, User } from 'lucide-react'

// Build session list: 2025-2026, 2026-2027, ...
const SESSIONS = Array.from({ length: 500 }, (_, i) => {
    const start = 2025 + i
    return `${start}-${start + 1}`
})

// Grade list — Nursery, Prep, 1st..12th
const GRADES = [
    "Nursery",
    "Prep",
    "1st","2nd","3rd","4th","5th","6th","7th","8th","9th","10th","11th","12th",
]

function AddNewStudent({ refreshData, students = [] }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [imagePreview, setImagePreview] = useState(null)
    const [imageFile, setImageFile] = useState(null)

    const { register, handleSubmit, reset, formState: { errors } } = useForm()

    // Handle image selection
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

    const removeImage = () => {
        setImageFile(null)
        setImagePreview(null)
    }

    // ✅ Client-side duplicate check: rollNo within grade+section+session
    const isRollNoDuplicate = (rollNo, grade, section, session) => {
        if (!rollNo || !grade) return false
        return students.some((s) => {
            const sameRoll = Number(s.rollNo) === Number(rollNo)
            const sameGrade = String(s.grade || "").trim().toLowerCase() === String(grade).trim().toLowerCase()
            const sameSection = section ? String(s.section || "").trim() === String(section).trim() : true
            const sameSession = session ? String(s.session || "").trim() === String(session).trim() : true
            return sameRoll && sameGrade && sameSection && sameSession
        })
    }

    // ✅ Client-side duplicate check: admissionNo
    const isAdmissionNoDuplicate = (admissionNo) => {
        if (!admissionNo) return false
        return students.some(
            (s) => String(s.admissionNo || "").trim() === String(admissionNo).trim()
        )
    }

    const onSubmit = async (data) => {
        if (!data.studentName || !data.grade) {
            toast.error("Student Name and Grade are required")
            return
        }

        // Client-side duplicate checks (instant feedback)
        if (data.rollNo && isRollNoDuplicate(data.rollNo, data.grade, data.section, data.session)) {
            toast.error(
                `Roll No ${data.rollNo} already exists for Grade ${data.grade}` +
                (data.section ? ` - Section ${data.section}` : "") +
                (data.session ? ` (${data.session})` : "")
            )
            return
        }

        if (data.admissionNo && isAdmissionNoDuplicate(data.admissionNo)) {
            toast.error(`Admission No ${data.admissionNo} already exists`)
            return
        }

        setLoading(true)

        try {
            const payload = {
                name: data.studentName,
                fatherName: data.fatherName || null,
                fatherOccupation: data.fatherOccupation || null,
                admissionNo: data.admissionNo || null,
                contact: data.contactNo || "",
                grade: data.grade,
                section: data.section || null,
                rollNo: data.rollNo ? Number(data.rollNo) : null,
                session: data.session || null,
                admissionDate: data.admissionDate || null,
                fee: data.fee ? Number(data.fee) : 0,
                address: data.address || "",
                image: imagePreview, // ✅ base64 string
            }

            console.log("Sending payload:", payload)

            await GlobalApi.CreateNewStudent(payload)

            toast.success("Student Added Successfully")
            reset()
            setImageFile(null)
            setImagePreview(null)
            setOpen(false)

            if (refreshData) await refreshData()

        } catch (error) {
            console.log("SAVE ERROR:", error?.response?.data || error)
            toast.error(error?.response?.data?.error || "Failed to save student")
        }

        setLoading(false)
    }

    const inputClass = "w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition text-gray-900 placeholder:text-gray-400 bg-white"
    const labelClass = "block text-sm font-semibold text-gray-700 mb-1.5"

    return (
        <div>
            <Button
                onClick={() => setOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
                + Add New Student
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-3xl bg-white rounded-2xl shadow-xl border-0 p-0 overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-5">
                        <DialogHeader>
                            <DialogTitle className="text-white text-xl font-bold">
                                Add New Student
                            </DialogTitle>
                            <DialogDescription className="text-blue-100 text-sm">
                                Fill in the student's details below
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)}
                        className="px-6 py-6 space-y-5 max-h-[75vh] overflow-y-auto">

                        {/* Image Upload */}
                        <div className="flex items-start gap-6">
                            <div className="flex flex-col items-center gap-2">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
                                        {imagePreview ? (
                                            <img
                                                src={imagePreview}
                                                alt="Student"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <User className="w-8 h-8 text-gray-400" />
                                        )}
                                    </div>
                                    {imagePreview && (
                                        <button
                                            type="button"
                                            onClick={removeImage}
                                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow hover:bg-red-600 transition"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                                <label className="cursor-pointer text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                                    <Upload className="w-3.5 h-3.5" />
                                    Upload Photo
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageChange}
                                    />
                                </label>
                            </div>
                            <div className="flex-1 pt-2">
                                <p className="text-sm text-gray-500">
                                    Upload a clear student photo (max 2MB). This will appear on the student's profile.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">

                            {/* Student Name */}
                            <div>
                                <label className={labelClass}>
                                    Student Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    placeholder="e.g. Ahmed Khan"
                                    className={inputClass}
                                    {...register("studentName", {
                                        required: "Student name is required",
                                        pattern: {
                                            value: /^[A-Za-z\s]+$/,
                                            message: "Only alphabets and spaces allowed"
                                        }
                                    })}
                                />
                                {errors.studentName && (
                                    <p className="text-red-500 text-xs mt-1">{errors.studentName.message}</p>
                                )}
                            </div>

                            {/* Father Name */}
                            <div>
                                <label className={labelClass}>Father Name</label>
                                <input
                                    placeholder="e.g. Imran Khan"
                                    className={inputClass}
                                    {...register("fatherName", {
                                        pattern: {
                                            value: /^[A-Za-z\s]*$/,
                                            message: "Only alphabets and spaces allowed"
                                        }
                                    })}
                                />
                                {errors.fatherName && (
                                    <p className="text-red-500 text-xs mt-1">{errors.fatherName.message}</p>
                                )}
                            </div>

                            {/* Father Occupation */}
                            <div>
                                <label className={labelClass}>Father Occupation</label>
                                <input
                                    placeholder="e.g. Businessman"
                                    className={inputClass}
                                    {...register("fatherOccupation", {
                                        pattern: {
                                            value: /^[A-Za-z\s]*$/,
                                            message: "Only alphabets and spaces allowed"
                                        }
                                    })}
                                />
                                {errors.fatherOccupation && (
                                    <p className="text-red-500 text-xs mt-1">{errors.fatherOccupation.message}</p>
                                )}
                            </div>

                            {/* Contact No */}
                            <div>
                                <label className={labelClass}>Contact No</label>
                                <input
                                    placeholder="e.g. 03001234567"
                                    className={inputClass}
                                    maxLength={11}
                                    {...register("contactNo", {
                                        pattern: {
                                            value: /^[0-9]{11}$/,
                                            message: "Contact must be exactly 11 digits"
                                        }
                                    })}
                                    onInput={(e) => {
                                        e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 11)
                                    }}
                                />
                                {errors.contactNo && (
                                    <p className="text-red-500 text-xs mt-1">{errors.contactNo.message}</p>
                                )}
                            </div>

                            {/* Admission No */}
                            <div>
                                <label className={labelClass}>Admission No</label>
                                <input
                                    placeholder="e.g. 1001"
                                    className={inputClass}
                                    {...register("admissionNo", {
                                        pattern: {
                                            value: /^[1-9][0-9]*$/,
                                            message: "Admission No must be a positive number"
                                        }
                                    })}
                                    onInput={(e) => {
                                        e.target.value = e.target.value.replace(/[^0-9]/g, '').replace(/^0+/, '')
                                    }}
                                />
                                {errors.admissionNo && (
                                    <p className="text-red-500 text-xs mt-1">{errors.admissionNo.message}</p>
                                )}
                            </div>

                            {/* Admission Date */}
                            <div>
                                <label className={labelClass}>Admission Date</label>
                                <input
                                    type="date"
                                    className={inputClass}
                                    {...register("admissionDate")}
                                />
                            </div>

                            {/* Grade */}
                            <div>
                                <label className={labelClass}>
                                    Grade <span className="text-red-500">*</span>
                                </label>
                                <select
                                    className={inputClass}
                                    {...register("grade", { required: true })}
                                >
                                    <option value="">Select Grade</option>
                                    {GRADES.map((g) => (
                                        <option key={g} value={g}>{g}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Section */}
                            <div>
                                <label className={labelClass}>Section</label>
                                <select className={inputClass} {...register("section")}>
                                    <option value="">Select Section</option>
                                    <option value="A">A</option>
                                    <option value="B">B</option>
                                    <option value="C">C</option>
                                </select>
                            </div>

                            {/* Roll No */}
                            <div>
                                <label className={labelClass}>Roll No</label>
                                <input
                                    type="number"
                                    placeholder="e.g. 12"
                                    className={inputClass}
                                    {...register("rollNo", {
                                        min: { value: 1, message: "Roll No must be positive" }
                                    })}
                                    onInput={(e) => {
                                        e.target.value = e.target.value.replace(/[^0-9]/g, '').replace(/^0+/, '')
                                    }}
                                />
                                {errors.rollNo && (
                                    <p className="text-red-500 text-xs mt-1">{errors.rollNo.message}</p>
                                )}
                            </div>

                            {/* Session */}
                            <div>
                                <label className={labelClass}>Session</label>
                                <select className={inputClass} {...register("session")}>
                                    <option value="">Select Session</option>
                                    {SESSIONS.map((s) => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Fee */}
                            <div>
                                <label className={labelClass}>Fee</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                                        Rs.
                                    </span>
                                    <input
                                        type="number"
                                        placeholder="e.g. 5000"
                                        className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition text-gray-900 placeholder:text-gray-400"
                                        {...register("fee", {
                                            min: { value: 0, message: "Fee cannot be negative" }
                                        })}
                                    />
                                </div>
                                {errors.fee && (
                                    <p className="text-red-500 text-xs mt-1">{errors.fee.message}</p>
                                )}
                            </div>

                            {/* Address */}
                            <div>
                                <label className={labelClass}>Address</label>
                                <input
                                    placeholder="e.g. Gahri Chandan Payan"
                                    className={inputClass}
                                    {...register("address")}
                                />
                            </div>

                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpen(false)}
                                className="px-5"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 shadow-sm"
                            >
                                {loading ? (
                                    <LoaderIcon className="animate-spin w-4 h-4" />
                                ) : (
                                    "Save Student"
                                )}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default AddNewStudent