"use client"

import React from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'

function StudentDetailsDialog({ student, open, onOpenChange }) {
    if (!student) return null

    const Field = ({ label, value }) => (
        <div>
            <label className="text-sm font-bold text-gray-600">{label}</label>
            <p className="text-lg font-semibold text-gray-900">{value || "N/A"}</p>
        </div>
    )

    const handlePrint = () => {
        const printWindow = window.open("", "_blank", "width=800,height=900")
        if (!printWindow) return

        const rows = [
            ["Student Name", student.name],
            ["Father Name", student.fatherName],
            ["Admission No", student.admissionNo],
            ["Roll No", student.rollNo],
            ["Grade", student.grade],
            ["Section", student.section],
            ["Session", student.session],
            ["Contact No", student.contact],
            ["Address", student.address],
            ["Fee", student.fee ? `Rs. ${student.fee}` : null],
            ["Mid Marks", student.midMarks],
            ["Final Marks", student.finalMarks],
            ["GPA", student.gpa],
            ["CGPA", student.cgpa],
            ["Risk", student.risk],
        ]

        const html = `
            <html>
            <head>
                <title>Student Details - ${student.name || ""}</title>
                <style>
                    * { box-sizing: border-box; }
                    body {
                        font-family: Arial, Helvetica, sans-serif;
                        padding: 40px;
                        color: #111;
                    }
                    h1 {
                        text-align: center;
                        font-size: 22px;
                        margin-bottom: 4px;
                    }
                    .sub {
                        text-align: center;
                        color: #555;
                        font-size: 13px;
                        margin-bottom: 24px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 10px;
                    }
                    td {
                        padding: 10px 12px;
                        border-bottom: 1px solid #ddd;
                        font-size: 14px;
                    }
                    td.label {
                        font-weight: bold;
                        color: #333;
                        width: 40%;
                        background: #f7f7f7;
                    }
                    .footer {
                        margin-top: 40px;
                        display: flex;
                        justify-content: space-between;
                        font-size: 12px;
                        color: #555;
                    }
                    .line {
                        border-top: 1px solid #333;
                        width: 180px;
                        margin-top: 40px;
                        text-align: center;
                        padding-top: 4px;
                    }
                </style>
            </head>
            <body>
                <h1>Student Report</h1>
                <div class="sub">Student Academic Performance System</div>
                <table>
                    ${rows
                        .map(
                            ([label, value]) => `
                        <tr>
                            <td class="label">${label}</td>
                            <td>${value ?? "N/A"}</td>
                        </tr>`
                        )
                        .join("")}
                </table>
                <div class="footer">
                    <div class="line">Principal Signature</div>
                    <div class="line">Date</div>
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                    }
                </script>
            </body>
            </html>
        `

        printWindow.document.open()
        printWindow.document.write(html)
        printWindow.document.close()
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <span>Student Details</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-6 pt-2">
                    <Field label="Student Name" value={student.name} />
                    <Field label="Father Name" value={student.fatherName} />
                    <Field label="Admission No" value={student.admissionNo} />
                    <Field label="Roll No" value={student.rollNo} />
                    <Field label="Grade" value={student.grade} />
                    <Field label="Section" value={student.section} />
                    <Field label="Session" value={student.session} />
                    <Field label="Contact No" value={student.contact} />
                    <Field label="Address" value={student.address} />
                    <Field label="Fee" value={student.fee ? `Rs. ${student.fee}` : null} />
                    <Field label="Mid Marks" value={student.midMarks} />
                    <Field label="Final Marks" value={student.finalMarks} />
                    <Field label="GPA" value={student.gpa} />
                    <Field label="CGPA" value={student.cgpa} />
                    <Field label="Risk" value={student.risk} />
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Close
                    </Button>
                    <Button
                        onClick={handlePrint}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        <Printer className="w-4 h-4 mr-2" />
                        Print
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default StudentDetailsDialog