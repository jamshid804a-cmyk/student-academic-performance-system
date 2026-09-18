"use client"

import React from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Printer, X, User, Users, Phone, MapPin, School, Hash, BookOpen, Calendar, CreditCard } from 'lucide-react'

function StudentDetailsDialog({ student, open, onOpenChange }) {
    if (!student) return null

    const Field = ({ icon: Icon, label, value }) => (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 hover:bg-blue-50 transition-colors border border-gray-100">
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <Icon size={18} />
            </div>
            <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {label}
                </p>
                <p className="text-base font-semibold text-gray-900 break-words">
                    {value || "—"}
                </p>
            </div>
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
            <DialogContent className="max-w-2xl bg-white rounded-2xl shadow-xl border-0 p-0 overflow-hidden">

                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-5">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <DialogTitle className="text-white text-xl font-bold">
                                    Student Details
                                </DialogTitle>
                                <p className="text-blue-100 text-sm mt-0.5">
                                    Complete profile overview
                                </p>
                            </div>
                            <button
                                onClick={() => onOpenChange(false)}
                                className="text-blue-100 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </DialogHeader>
                </div>

                {/* Body */}
                <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                        <Field icon={User}  label="Student Name"  value={student.name} />
                        <Field icon={Users} label="Father Name"   value={student.fatherName} />

                        <Field icon={Hash}      label="Admission No" value={student.admissionNo} />
                        <Field icon={BookOpen}  label="Roll No"      value={student.rollNo} />

                        <Field icon={School}    label="Grade"        value={student.grade} />
                        <Field icon={School}    label="Section"      value={student.section} />

                        <Field icon={Calendar}  label="Session"      value={student.session} />
                        <Field icon={Phone}     label="Contact No"   value={student.contact} />

                        <div className="sm:col-span-2">
                            <Field icon={MapPin} label="Address" value={student.address} />
                        </div>

                        <div className="sm:col-span-2">
                            <Field
                                icon={CreditCard}
                                label="Fee"
                                value={student.fee ? `Rs. ${student.fee}` : null}
                            />
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="px-5"
                    >
                        Close
                    </Button>
                    <Button
                        onClick={handlePrint}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 shadow-sm"
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