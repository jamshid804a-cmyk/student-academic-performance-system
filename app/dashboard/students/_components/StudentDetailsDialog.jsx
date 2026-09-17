"use client"

import React from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

function StudentDetailsDialog({ student, open, onOpenChange }) {
    if (!student) return null

    const Field = ({ label, value }) => (
        <div>
            <label className="text-sm font-bold text-gray-600">{label}</label>
            <p className="text-lg font-semibold text-gray-900">{value || "N/A"}</p>
        </div>
    )

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
                <DialogHeader>
                    <DialogTitle>Student Details</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-6 pt-2">
                    <Field label="Student Name" value={student.studentName} />
                    <Field label="Father Name" value={student.fatherName} />
                    <Field label="Admission No" value={student.admissionNo} />
                    <Field label="Roll No" value={student.rollNo} />
                    <Field label="Grade" value={student.grade} />
                    <Field label="Section" value={student.section} />
                    <Field label="Session" value={student.session} />
                    <Field label="Contact No" value={student.contactNo} />
                    <Field label="Fee" value={student.fee ? `Rs. ${student.fee}` : null} />
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default StudentDetailsDialog