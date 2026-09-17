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
                grade: data.grade,
                address: data.address || "",
                contact: data.contactNo || "",
                midMarks: 0,
                finalMarks: 0,
                gpa: 0,
                cgpa: 0,
                risk: "safe",
            }

            console.log("Sending payload:", payload)

            const resp = await GlobalApi.CreateNewStudent(payload)

            toast.success("Student Added Successfully")
            reset()
            setOpen(false)

            if (refreshData) {
                await refreshData()
            }

        } catch (error) {
            console.log("SAVE ERROR:", error?.response?.data || error)
            toast.error(error?.response?.data?.error || "Failed to save student")
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
                                    <option value="1st Semester">1st Semester</option>
                                    <option value="2nd Semester">2nd Semester</option>
                                    <option value="3rd Semester">3rd Semester</option>
                                    <option value="4th Semester">4th Semester</option>
                                    <option value="5th Semester">5th Semester</option>
                                    <option value="6th Semester">6th Semester</option>
                                    <option value="7th Semester">7th Semester</option>
                                    <option value="8th Semester">8th Semester</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Address
                                </label>
                                <input
                                    placeholder="e.g. Gahri Chandan Payan"
                                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition text-gray-900 placeholder:text-gray-400"
                                    {...register("address")}
                                />
                            </div>

                        </div>

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