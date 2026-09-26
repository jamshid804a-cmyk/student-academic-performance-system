"use client"

import React from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import {
    Printer, X, User, Users, Phone, MapPin, School,
    Hash, BookOpen, Calendar, CreditCard, Briefcase,
    GraduationCap, Layers, CalendarDays, ImageIcon, IdCard
} from 'lucide-react'

function StudentDetailsDialog({ student, open, onOpenChange }) {
    if (!student) return null

    const initial = (student.name || "?").trim().charAt(0).toUpperCase()

    // ─────────────────────────────────────────────
    // Info card component
    // ─────────────────────────────────────────────
    const Field = ({ icon: Icon, label, value, accent = "blue", full = false }) => {
        const accents = {
            blue:   { bg: "bg-blue-50",   text: "text-blue-600",   ring: "ring-blue-100" },
            indigo: { bg: "bg-indigo-50", text: "text-indigo-600", ring: "ring-indigo-100" },
            green:  { bg: "bg-emerald-50",text: "text-emerald-600",ring: "ring-emerald-100" },
            amber:  { bg: "bg-amber-50",  text: "text-amber-600",  ring: "ring-amber-100" },
            pink:   { bg: "bg-pink-50",   text: "text-pink-600",   ring: "ring-pink-100" },
            violet: { bg: "bg-violet-50", text: "text-violet-600", ring: "ring-violet-100" },
            slate:  { bg: "bg-slate-100", text: "text-slate-600",  ring: "ring-slate-200" },
        }
        const a = accents[accent] || accents.blue

        return (
            <div
                className={`flex items-start gap-3 p-3.5 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${full ? "sm:col-span-2" : ""}`}
            >
                <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${a.bg} ${a.text} flex items-center justify-center ring-1 ${a.ring}`}>
                    <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        {label}
                    </p>
                    <p className="text-[14.5px] font-semibold text-slate-800 break-words leading-snug mt-0.5">
                        {value !== null && value !== undefined && value !== "" ? value : <span className="text-slate-300 font-normal">—</span>}
                    </p>
                </div>
            </div>
        )
    }

    // ─────────────────────────────────────────────
    // Print handler (includes image)
    // ─────────────────────────────────────────────
    const handlePrint = () => {
        const printWindow = window.open("", "_blank", "width=800,height=900")
        if (!printWindow) return

        const rows = [
            ["Student Name", student.name],
            ["Father Name", student.fatherName],
            ["Father Occupation", student.fatherOccupation],
            ["Admission No", student.admissionNo],
            ["Roll No", student.rollNo],
            ["Grade", student.grade],
            ["Section", student.section],
            ["Session", student.session],
            ["Admission Date", student.admissionDate],
            ["Contact No", student.contact],
            ["Address", student.address],
            ["Fee", student.fee ? `Rs. ${student.fee}` : null],
        ]

        const imageHtml = student.image
            ? `<img src="${student.image}" alt="Student" style="width:120px;height:120px;border-radius:50%;object-fit:cover;border:3px solid #3b82f6;margin:0 auto 16px;display:block;" />`
            : ""

        const html = `
            <html>
            <head>
                <title>Student Details - ${student.name || ""}</title>
                <style>
                    * { box-sizing: border-box; }
                    body {
                        font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
                        padding: 40px;
                        color: #111;
                        background: #fff;
                    }
                    h1 {
                        text-align: center;
                        font-size: 24px;
                        margin-bottom: 4px;
                        color: #1e293b;
                    }
                    .sub {
                        text-align: center;
                        color: #64748b;
                        font-size: 13px;
                        margin-bottom: 24px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 10px;
                        border-radius: 8px;
                        overflow: hidden;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.06);
                    }
                    td {
                        padding: 12px 16px;
                        border-bottom: 1px solid #e2e8f0;
                        font-size: 14px;
                    }
                    td.label {
                        font-weight: 600;
                        color: #334155;
                        width: 40%;
                        background: #f8fafc;
                    }
                    .footer {
                        margin-top: 50px;
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
                ${imageHtml}
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
            <DialogContent className="max-w-3xl bg-white rounded-2xl shadow-xl border-0 p-0 overflow-hidden">

                {/* Header */}
                <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-6 py-6">
                    {/* subtle pattern overlay */}
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_20%_50%,white_0%,transparent_50%)]" />

                    <DialogHeader className="relative">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white">
                                    <IdCard size={22} />
                                </div>
                                <div>
                                    <DialogTitle className="text-white text-xl font-bold">
                                        Student Details
                                    </DialogTitle>
                                    <p className="text-blue-100 text-xs mt-0.5">
                                        Complete profile overview
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => onOpenChange(false)}
                                className="text-blue-100 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </DialogHeader>
                </div>

                {/* Body */}
                <div className="px-6 py-6 max-h-[72vh] overflow-y-auto bg-slate-50/50">

                    {/* Profile header with image + name */}
                    <div className="flex items-center gap-5 mb-6 p-5 rounded-2xl bg-white border border-slate-100 shadow-sm">
                        <div className="relative flex-shrink-0">
                            {student.image ? (
                                <img
                                    src={student.image}
                                    alt={student.name || "Student"}
                                    className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-lg ring-1 ring-slate-200"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white text-2xl font-bold flex items-center justify-center shadow-lg">
                                    {initial}
                                </div>
                            )}
                            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-lg font-bold text-slate-800 truncate">
                                {student.name || "Unnamed Student"}
                            </h3>
                            <p className="text-sm text-slate-500 mt-0.5">
                                {student.grade || "—"}{student.section ? ` • Section ${student.section}` : ""}{student.session ? ` • ${student.session}` : ""}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-2.5">
                                {student.rollNo != null && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                                        <BookOpen size={11} /> Roll {student.rollNo}
                                    </span>
                                )}
                                {student.admissionNo && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">
                                        <Hash size={11} /> Adm {student.admissionNo}
                                    </span>
                                )}
                                {student.fee != null && student.fee > 0 && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
                                        <CreditCard size={11} /> Rs. {student.fee}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Section: Personal Information */}
                    <SectionTitle>Personal Information</SectionTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                        <Field icon={User}           label="Student Name"      value={student.name}            accent="blue" />
                        <Field icon={Users}          label="Father Name"       value={student.fatherName}      accent="indigo" />
                        <Field icon={Briefcase}      label="Father Occupation" value={student.fatherOccupation} accent="violet" />
                        <Field icon={Phone}          label="Contact No"        value={student.contact}         accent="green" />
                        <Field icon={MapPin}         label="Address"           value={student.address}         accent="pink" full />
                    </div>

                    {/* Section: Academic Information */}
                    <SectionTitle>Academic Information</SectionTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                        <Field icon={Hash}           label="Admission No"     value={student.admissionNo}     accent="indigo" />
                        <Field icon={BookOpen}       label="Roll No"          value={student.rollNo}          accent="blue" />
                        <Field icon={GraduationCap}  label="Grade"            value={student.grade}           accent="amber" />
                        <Field icon={Layers}         label="Section"          value={student.section}         accent="pink" />
                        <Field icon={Calendar}       label="Session"          value={student.session}         accent="violet" />
                        <Field icon={CalendarDays}   label="Admission Date"   value={student.admissionDate}   accent="green" />
                    </div>

                    {/* Section: Fee Information */}
                    <SectionTitle>Fee Information</SectionTitle>
                    <div className="grid grid-cols-1 gap-3">
                        <Field
                            icon={CreditCard}
                            label="Monthly / Total Fee"
                            value={student.fee != null && student.fee !== "" ? `Rs. ${student.fee}` : null}
                            accent="green"
                            full
                        />
                    </div>

                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-white">
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

// Small section title helper
function SectionTitle({ children }) {
    return (
        <div className="flex items-center gap-2 mb-3 mt-1">
            <span className="w-1 h-4 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600" />
            <h4 className="text-[12px] font-bold uppercase tracking-wider text-slate-500">
                {children}
            </h4>
        </div>
    )
}

export default StudentDetailsDialog