"use client"

import React, { useEffect, useState } from 'react'
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
import { LoaderIcon } from 'lucide-react'

function EditStudentDialog({ student, open, onOpenChange, refreshData }) {
    const [loading, setLoading] = useState(false)
    const { register, handleSubmit, reset } = useForm()

    // Pre-fill form when a student is selected
    useEffect(() => {
        if (student) {
            reset({
                studentName: student.name || "",
                fatherName: student.fatherName || "",
                admissionNo: student.admissionNo || "",
                contactNo: student.contact || "",
                grade: student.grade || "",
                section: student.section || "",
                rollNo: student.rollNo || "",
                session: student.session || "",
                fee: student.fee || "",
                address: student.address || "",
            })
        }
    }, [student, reset])

    const onSubmit = async (data) => {
        if (!data.studentName || !data.grade) {
            toast.error("Student Name and Grade are required")
            return
        }

        setLoading(true)

        try {
            const payload = {
                name: data.studentName,
                fatherName: data.fatherName || "",
                admissionNo: data.admissionNo || "",
                contact: data.contactNo || "",
                grade: data.grade,
                section: data.section || "",
                rollNo: data.rollNo ? Number(data.rollNo) : null,
                session: data.session || "",
                fee: data.fee ? Number(data.fee) : 0,
                address: data.address || "",
            }

            console.log("Update payload:", payload)
            console.log("Student id:", student.id)

            await GlobalApi.UpdateStudentRecord(student.id, payload)

            toast.success("Student Updated Successfully")
            onOpenChange(false)
            if (refreshData) await refreshData()

        } catch (error) {
            console.log("UPDATE ERROR:", error?.response?.data || error)
            toast.error(error?.response?.data?.error || "Failed to update student")
        }

        setLoading(false)
    }

    if (!student) return null

    const inputClass = "w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100 outline-none transition text-gray-900 placeholder:text-gray-400"
    const labelClass = "block text-sm font-semibold text-gray-700 mb-1"

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-white rounded-2xl shadow-xl border-0 p-0 overflow-hidden">

                <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 px-6 py-5">
                    <DialogHeader>
                        <DialogTitle className="text-white text-xl font-bold">
                            Edit Student
                        </DialogTitle>
                        <DialogDescription className="text-yellow-100 text-sm">
                            Update the student's details below
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-6 space-y-5 max-h-[70vh] overflow-y-auto">

                    <div className="grid grid-cols-2 gap-4">

                        {/* Student Name */}
                        <div>
                            <label className={labelClass}>
                                Student Name <span className="text-red-500">*</span>
                            </label>
                            <input className={inputClass} {...register("studentName", { required: true })} />
                        </div>

                        {/* Father Name */}
                        <div>
                            <label className={labelClass}>Father Name</label>
                            <input className={inputClass} {...register("fatherName")} />
                        </div>

                        {/* Admission No */}
                        <div>
                            <label className={labelClass}>Admission No</label>
                            <input className={inputClass} {...register("admissionNo")} />
                        </div>

                        {/* Contact No */}
                        <div>
                            <label className={labelClass}>Contact No</label>
                            <input className={inputClass} {...register("contactNo")} />
                        </div>

                        {/* Grade */}
                        <div>
                            <label className={labelClass}>
                                Grade <span className="text-red-500">*</span>
                            </label>
                            <select className={inputClass} {...register("grade", { required: true })}>
                                <option value="">Select Grade</option>
                                <option value="1st">1st</option>
                                <option value="2nd">2nd</option>
                                <option value="3rd">3rd</option>
                                <option value="4th">4th</option>
                                <option value="5th">5th</option>
                                <option value="6th">6th</option>
                                <option value="7th">7th</option>
                                <option value="8th">8th</option>
                                <option value="9th">9th</option>
                                <option value="10th">10th</option>
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
                            <input type="number" className={inputClass} {...register("rollNo")} />
                        </div>

                        {/* Session */}
                        <div>
                            <label className={labelClass}>Session</label>
                            <input placeholder="e.g. 2025-2026" className={inputClass} {...register("session")} />
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
                                    className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100 outline-none transition text-gray-900"
                                    {...register("fee")}
                                />
                            </div>
                        </div>

                        {/* Address */}
                        <div>
                            <label className={labelClass}>Address</label>
                            <input className={inputClass} {...register("address")} />
                        </div>

                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="px-5">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-yellow-600 hover:bg-yellow-700 text-white px-6">
                            {loading ? <LoaderIcon className="animate-spin w-4 h-4" /> : "Save Changes"}
                        </Button>
                    </div>

                </form>
            </DialogContent>
        </Dialog>
    )
}

export default EditStudentDialog