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

    const { register, handleSubmit, reset } = useForm()

    // ✅ Risk if GPA < 2.5 OR CGPA < 2.5
    const getRiskStatus = (gpa, cgpa) => {
        const g = Number(gpa || 0)
        const c = Number(cgpa || 0)
        if (g < 2.5 || c < 2.5) {
            return "at-risk"
        }
        return "safe"
    }

    const onSubmit = async (data) => {
        if (!data.name || !data.grade) {
            toast.error("Name and Grade are required")
            return
        }

        setLoading(true)

        try {
            const gpa = Number(data.gpa || 0)
            const cgpa = Number(data.cgpa || 0)
            const risk = getRiskStatus(gpa, cgpa)

            const payload = {
                name: data.name,
                grade: data.grade,
                contact: data.contact || "",
                address: data.address || "",
                midMarks: 0,
                finalMarks: 0,
                gpa,
                cgpa,
                risk
            }

            const resp = await GlobalApi.CreateNewStudent(payload)

            if (resp?.status === 200 || resp?.status === 201) {
                toast.success("Student Added Successfully")
                reset()
                setOpen(false)
                
                // ✅ IMPORTANT: Force refresh and wait for it to complete
                if (refreshData) {
                    await refreshData()
                    // Add small delay to ensure data is fetched
                    setTimeout(() => {
                        console.log("Data refreshed - risk box should update")
                    }, 100)
                }
                
                // ✅ Show warning if student is at risk
                if (risk === "at-risk") {
                    toast.warning(`⚠️ ${data.name} is at risk! Parent notification available.`)
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

    const inputStyle = {
        width: '100%',
        padding: '10px 12px',
        border: '2px solid black',
        borderRadius: '6px',
        backgroundColor: 'white',
        color: 'black',
        fontSize: '14px',
        outline: 'none',
    }

    return (
        <div>
            <Button
                onClick={() => setOpen(true)}
                className='bg-blue-600 hover:bg-blue-700 text-white'
            >
                + Add New Student
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-xl" style={{ backgroundColor: 'white' }}>

                    <DialogHeader>
                        <DialogTitle style={{ color: 'black' }}>
                            Add New Student
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Student Form
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

                        <input
                            placeholder="Full Name"
                            style={inputStyle}
                            {...register("name")}
                        />

                        <select
                            style={inputStyle}
                            {...register("grade", { required: true })}
                        >
                            <option value="">Select Semester</option>
                            <option value="1st Semester">1st Semester</option>
                            <option value="2nd Semester">2nd Semester</option>
                            <option value="3rd Semester">3rd Semester</option>
                            <option value="4th Semester">4th Semester</option>
                            <option value="5th Semester">5th Semester</option>
                            <option value="6th Semester">6th Semester</option>
                            <option value="7th Semester">7th Semester</option>
                            <option value="8th Semester">8th Semester</option>
                        </select>

                        <input
                            placeholder="Contact"
                            style={inputStyle}
                            {...register("contact")}
                        />

                        <input
                            placeholder="Address"
                            style={inputStyle}
                            {...register("address")}
                        />

                        <input
                            type="number"
                            step="0.01"
                            placeholder="GPA"
                            style={inputStyle}
                            {...register("gpa")}
                        />

                        <input
                            type="number"
                            step="0.01"
                            placeholder="CGPA"
                            style={inputStyle}
                            {...register("cgpa")}
                        />

                        {/* ✅ Risk Preview with Real-time Check */}
                        <div style={{
                            padding: '10px',
                            borderRadius: '6px',
                            backgroundColor: '#fef2f2',
                            border: '1px solid #fca5a5',
                            fontSize: '13px',
                            color: '#dc2626'
                        }}>
                            ⚠️ Student will be marked <strong>At Risk</strong> if GPA or CGPA is less than 2.5
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setOpen(false)}
                            >
                                Cancel
                            </Button>

                            <Button
                                type="submit"
                                disabled={loading}
                                className='bg-blue-600 text-white'
                            >
                                {loading ? (
                                    <LoaderIcon className="animate-spin" />
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