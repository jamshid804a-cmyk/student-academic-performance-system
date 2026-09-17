"use client"

import React, { useEffect } from 'react'
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
import { useState } from 'react'

function EditStudentDialog({ student, open, onOpenChange, refreshData }) {
    const [loading, setLoading] = useState(false)
    const { register, handleSubmit, reset } = useForm()

    // Pre-fill the form whenever a different student is selected
    useEffect(() => {
        if (student) {
            reset({
                studentName: student.studentName || "",
                fatherName: student.fatherName || "",
                admissionNo: student.admissionNo || "",
                contactNo: student.contactNo || "",
                grade: student.grade || "",
                section: student.section || "",
                rollNo: student.rollNo || "",
                session: student.session || "",
                fee: student.fee || "",
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
                studentName: data.studentName,
                fatherName: data.fatherName || "",
                admissionNo: data.admissionNo || "",
                contactNo: data.contactNo || "",
                grade: data.grade,
                section: data.section || "",
                rollNo: data.rollNo || "",
                session: data.session || "",
                fee: data.fee ? Number(data.fee) : 0,
            }

            // ⚠️ Confirm this matches your actual GlobalApi update function name
            const resp = await GlobalApi.UpdateStudentRecord(student.id, payload)

            if (resp?.status === 200 || resp?.status === 201) {
                toast.success("Student Updated Successfully")
                onOpenChange(false)
                if (refreshData) await refreshData()
            } else {
                toast.error("Failed to update student")
            }
        } catch (error) {
            console.log("UPDATE ERROR:", error)
            toast.error("Server error while updating student")
        }

        setLoading(false)
    }

    if (!student) return null

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
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Student Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100 outline-none transition text-gray-900"
                                {...register("studentName", { required: true })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Father Name
                            </label>
                            <input
                                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100 outline-none transition text-gray-900"
                                {...register("fatherName")}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Admission No
                            </label>
                            <input
                                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100 outline-none transition text-gray-900"
                                {...register("admissionNo")}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Contact No
                            </label>
                            <input
                                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100 outline-none transition text-gray-900"
                                {...register("contactNo")}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Grade <span className="text-red-500">*</span>
                            </label>
                            <select
                                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100 outline-none transition text-gray-900"
                                {...register("grade", { required: true })}
                            >
                                <option value="">Select Grade</option>
                                {[1,2,3,4,5,6,7,8,9,10].map((g) => (
                                    <option key={g} value={g}>Grade {g}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Section
                            </label>
                            <select
                                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100 outline-none transition text-gray-900"
                                {...register("section")}
                            >
                                <option value="">Select Section</option>
                                {["A","B","C","D"].map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Roll No
                            </label>
                            <input
                                type="number"
                                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100 outline-none transition text-gray-900"
                                {...register("rollNo")}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Session
                            </label>
                            <input
                                placeholder="e.g. 2025-2026"
                                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100 outline-none transition text-gray-900"
                                {...register("session")}
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Fee
                            </label>
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