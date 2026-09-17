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
import { LoaderIcon } from 'lucide-react'

function AddNewStudent({ refreshData }) {

    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const { register, handleSubmit, reset, formState: { errors } } = useForm()

    const onSubmit = async (data) => {
        if (!data.studentName || !data.grade) {
            toast.error("Student Name and Grade are required")
            return
        }

        setLoading(true)

        try {
            const payload = {
                name: data.studentName,
                fatherName: data.fatherName || null,
                admissionNo: data.admissionNo || null,
                contact: data.contactNo || "",
                grade: data.grade,
                section: data.section || null,
                rollNo: data.rollNo ? Number(data.rollNo) : null,
                session: data.session || null,
                fee: data.fee ? Number(data.fee) : 0,
                address: data.address || "",
                midMarks: 0,
                finalMarks: 0,
                gpa: 0,
                cgpa: 0,
                risk: "safe",
            }

            console.log("Sending payload:", payload)

            await GlobalApi.CreateNewStudent(payload)

            toast.success("Student Added Successfully")
            reset()
            setOpen(false)

            if (refreshData) await refreshData()

        } catch (error) {
            console.log("SAVE ERROR:", error?.response?.data || error)
            toast.error(error?.response?.data?.error || "Failed to save student")
        }

        setLoading(false)
    }

    const inputClass = "w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition text-gray-900 placeholder:text-gray-400"
    const labelClass = "block text-sm font-semibold text-gray-700 mb-1"

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

                        <div className="grid grid-cols-2 gap-4">

                            {/* Student Name */}
                            <div>
                                <label className={labelClass}>
                                    Student Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    placeholder="e.g. Ahmed Khan"
                                    className={inputClass}
                                    {...register("studentName", { required: true })}
                                />
                            </div>

                            {/* Father Name */}
                            <div>
                                <label className={labelClass}>Father Name</label>
                                <input
                                    placeholder="e.g. Imran Khan"
                                    className={inputClass}
                                    {...register("fatherName")}
                                />
                            </div>

                            {/* Contact No */}
                            <div>
                                <label className={labelClass}>Contact No</label>
                                <input
                                    placeholder="e.g. 0300-1234567"
                                    className={inputClass}
                                    {...register("contactNo")}
                                />
                            </div>

                            {/* Admission No */}
                            <div>
                                <label className={labelClass}>Admission No</label>
                                <input
                                    placeholder="e.g. ADM-2025-001"
                                    className={inputClass}
                                    {...register("admissionNo")}
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
                                <input
                                    type="number"
                                    placeholder="e.g. 12"
                                    className={inputClass}
                                    {...register("rollNo")}
                                />
                            </div>

                            {/* Session */}
                            <div>
                                <label className={labelClass}>Session</label>
                                <input
                                    placeholder="e.g. 2025-2026"
                                    className={inputClass}
                                    {...register("session")}
                                />
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
                                        {...register("fee")}
                                    />
                                </div>
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