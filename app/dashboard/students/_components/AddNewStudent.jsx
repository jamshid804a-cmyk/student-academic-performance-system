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

            const resp = await GlobalApi.CreateNewStudent(payload)

            if (resp?.status === 200 || resp?.status === 201) {
                toast.success("Student Added Successfully")
                reset()
                setOpen(false)

                if (refreshData) {
                    await refreshData()
                }
            } else {
                toast.error("Failed to save student")
            }

        } catch (error) {
            console.log("SAVE ERROR:", error)
            toast.error("Server error while saving student")
        }

        setLoading(false)
    }

    return (
        <div>
            <Button
                onClick={() => setOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
                + Add New Student
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl bg-white rounded-2xl shadow-xl border-0 p-0 overflow-hidden">

                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
                        <DialogHeader>
                            <DialogTitle className="text-white text-xl font-bold">
                                Add New Student
                            </DialogTitle>
                            <DialogDescription className="text-blue-100 text-sm">
                                Fill in the student's details below
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
                                    placeholder="e.g. Ahmed Khan"
                                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition text-gray-900 placeholder:text-gray-400"
                                    {...register("studentName", { required: true })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Father Name
                                </label>
                                <input
                                    placeholder="e.g. Imran Khan"
                                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition text-gray-900 placeholder:text-gray-400"
                                    {...register("fatherName")}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Admission No
                                </label>
                                <input
                                    placeholder="e.g. ADM-2025-001"
                                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition text-gray-900 placeholder:text-gray-400"
                                    {...register("admissionNo")}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Contact No
                                </label>
                                <input
                                    placeholder="e.g. 0300-1234567"
                                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition text-gray-900 placeholder:text-gray-400"
                                    {...register("contactNo")}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Grade <span className="text-red-500">*</span>
                                </label>
                                <select
                                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition text-gray-900"
                                    {...register("grade", { required: true })}
                                >
                                    <option value="">Select Grade</option>
                                    <option value="1">Grade 1</option>
                                    <option value="2">Grade 2</option>
                                    <option value="3">Grade 3</option>
                                    <option value="4">Grade 4</option>
                                    <option value="5">Grade 5</option>
                                    <option value="6">Grade 6</option>
                                    <option value="7">Grade 7</option>
                                    <option value="8">Grade 8</option>
                                    <option value="9">Grade 9</option>
                                    <option value="10">Grade 10</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Section
                                </label>
                                <select
                                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition text-gray-900"
                                    {...register("section")}
                                >
                                    <option value="">Select Section</option>
                                    <option value="A">A</option>
                                    <option value="B">B</option>
                                    <option value="C">C</option>
                                    <option value="D">D</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Roll No
                                </label>
                                <input
                                    type="number"
                                    placeholder="e.g. 12"
                                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition text-gray-900 placeholder:text-gray-400"
                                    {...register("rollNo")}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Session
                                </label>
                                <input
                                    placeholder="e.g. 2025-2026"
                                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition text-gray-900 placeholder:text-gray-400"
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
                                        placeholder="e.g. 5000"
                                        className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition text-gray-900 placeholder:text-gray-400"
                                        {...register("fee")}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer buttons */}
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