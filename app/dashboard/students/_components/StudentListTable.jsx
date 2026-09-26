"use client"

import React, { useEffect, useState, useMemo, useRef } from 'react'
import { AgGridReact } from 'ag-grid-react'
import '@/utils/agGrid'
import {
    Search, Trash2, Eye, Pencil, Users, GraduationCap,
    Printer, Download, FileText, FileSpreadsheet, ChevronDown, File,
    ArrowUpCircle, Loader2, X
} from 'lucide-react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import GlobalApi from '@/app/_services/GlobalApi'
import { toast } from 'sonner'
import StudentDetailsDialog from './StudentDetailsDialog'
import EditStudentDialog from './EditStudentDialog'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const pagination = true
const paginationPageSize = 10
const paginationPageSizeSelector = [10, 20, 25, 100]

// ─────────────────────────────────────────────
// Grades & helpers
// ─────────────────────────────────────────────
const GRADES = [
    "Nursery",
    "Prep",
    "1st","2nd","3rd","4th","5th","6th","7th","8th","9th","10th","11th","12th",
]
const SECTIONS = ["A", "B", "C"]
const SESSIONS = Array.from({ length: 100 }, (_, i) => `${2025 + i}-${2026 + i}`)

const PROMOTION_ORDER = [
    "Nursery",
    "Prep",
    "1st","2nd","3rd","4th","5th","6th","7th","8th","9th","10th","11th","12th",
]

function getNextGrade(current) {
    const raw = String(current || "").trim().toLowerCase()
    if (!raw) return null
    if (raw === "graduated") return null

    let i = PROMOTION_ORDER.findIndex(
        (g) => String(g).trim().toLowerCase() === raw
    )

    if (i === -1) {
        const numMatch = raw.match(/^(\d+)/)
        if (numMatch) {
            const num = Number(numMatch[1])
            i = PROMOTION_ORDER.findIndex((g) => {
                const gm = String(g).match(/^(\d+)/)
                return gm && Number(gm[1]) === num
            })
        }
    }

    if (i === -1) return null
    if (i === PROMOTION_ORDER.length - 1) return "Graduated"
    return PROMOTION_ORDER[i + 1]
}

function getNextSession(current) {
    if (!current) return ""
    const m = String(current).match(/^(\d{4})-(\d{4})$/)
    if (!m) return ""
    return `${Number(m[1]) + 1}-${Number(m[2]) + 1}`
}

function sameGrade(a, b) {
    const x = String(a || "").trim().toLowerCase()
    const y = String(b || "").trim().toLowerCase()
    if (!x || !y) return false
    if (x === y) return true
    const numX = x.match(/^(\d+)/)
    const numY = y.match(/^(\d+)/)
    if (numX && numY) return numX[1] === numY[1]
    return false
}

function sameText(a, b) {
    return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase()
}

const FILTER_CLASS =
  "px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 transition-all"

// ─────────────────────────────────────────────
// Image cell renderer
// ─────────────────────────────────────────────
const ImageCellRenderer = (props) => {
    const student = props.data
    const src = student?.image || null
    const initial = (student?.name || "?").trim().charAt(0).toUpperCase()

    return (
        <div className="flex items-center justify-center h-full">
            {src ? (
                <img
                    src={src}
                    alt={student?.name || "Student"}
                    className="w-10 h-10 rounded-full object-cover border-2 border-white shadow ring-1 ring-slate-200 dark:ring-slate-600"
                />
            ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-white font-bold flex items-center justify-center text-sm shadow">
                    {initial}
                </div>
            )}
        </div>
    )
}

function StudentListTable({ StudentList, refreshData, students }) {
    const [rowData, setRowData] = useState([])
    const [searchInput, setSearchInput] = useState("")
    const [selectedStudent, setSelectedStudent] = useState(null)
    const [viewOpen, setViewOpen] = useState(false)
    const [editStudent, setEditStudent] = useState(null)
    const [editOpen, setEditOpen] = useState(false)

    const [gradeFilter, setGradeFilter] = useState("")
    const [sectionFilter, setSectionFilter] = useState("")
    const [sessionFilter, setSessionFilter] = useState("")

    const [schoolInfo, setSchoolInfo] = useState(null)
    const [exportOpen, setExportOpen] = useState(false)
    const dropdownRef = useRef(null)

    // Promote state
    const [promoteOpen, setPromoteOpen] = useState(false)
    const [promoteLoading, setPromoteLoading] = useState(false)
    const [promoteSession, setPromoteSession] = useState("")
    const [promoteProgress, setPromoteProgress] = useState({ current: 0, total: 0 })

    // Load school info
    useEffect(() => {
        let mounted = true
        const load = async () => {
            try {
                const res = await GlobalApi.GetSchoolInfo()
                if (mounted) setSchoolInfo(res?.data || null)
            } catch (e) {
                console.warn("School info load failed:", e?.message)
            }
        }
        load()
        return () => { mounted = false }
    }, [])

    // Close dropdown on outside click
    useEffect(() => {
        const onClick = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setExportOpen(false)
            }
        }
        document.addEventListener("mousedown", onClick)
        return () => document.removeEventListener("mousedown", onClick)
    }, [])

    useEffect(() => {
        if (StudentList) setRowData(StudentList)
    }, [StudentList])

    // Find the newest session in the data
    const newestSession = useMemo(() => {
        const sessions = rowData
            .map((s) => String(s.session || "").trim())
            .filter(Boolean)
        if (sessions.length === 0) return ""
        return sessions.sort((a, b) => {
            const aYear = Number(String(a).match(/^(\d{4})/)?.[1] || 0)
            const bYear = Number(String(b).match(/^(\d{4})/)?.[1] || 0)
            return bYear - aYear
        })[0]
    }, [rowData])

    // Filtered data — grade/section/session filters + smart search
    const filteredData = useMemo(() => {
        const effectiveSession = sessionFilter || newestSession
        const q = searchInput.trim().toLowerCase()

        return rowData.filter((s) => {
            if (gradeFilter && !sameGrade(s.grade, gradeFilter)) return false
            if (sectionFilter && !sameText(s.section, sectionFilter)) return false
            if (effectiveSession && !sameText(s.session, effectiveSession)) return false

            if (q) {
                const haystack = [
                    s.name,
                    s.fatherName,
                    s.fatherOccupation,
                    s.admissionNo,
                    s.rollNo,
                    s.id,
                    s.session,
                    s.grade,
                    s.section,
                    s.contact,
                    s.address,
                ]
                    .filter((v) => v !== null && v !== undefined && v !== "")
                    .map((v) => String(v).toLowerCase())
                    .join(" ")

                if (!haystack.includes(q)) return false
            }

            return true
        })
    }, [rowData, gradeFilter, sectionFilter, sessionFilter, newestSession, searchInput])

    const sessionOptions = useMemo(() => {
        const set = new Set()
        rowData.forEach((s) => { if (s.session) set.add(String(s.session).trim()) })
        SESSIONS.forEach((s) => set.add(s))
        return Array.from(set).sort()
    }, [rowData])

    const DeleteRecord = async (id) => {
        try {
            const resp = await GlobalApi.DeleteStudentRecord(id)
            if (resp?.data?.success && (resp.data.deletedCount ?? 1) > 0) {
                toast.success("Record Deleted Successfully")
                refreshData()
            } else {
                toast.error(resp?.data?.error || "Student not found")
            }
        } catch (error) {
            console.log("DELETE ERROR:", error?.response?.data || error)
            toast.error(error?.response?.data?.error || "Delete failed")
        }
    }

    const handleView = (data) => { setSelectedStudent(data); setViewOpen(true) }
    const handleEditClick = (data) => { setEditStudent(data); setEditOpen(true) }

    // ─────────────────────────────────────────────
    // Promote
    // ─────────────────────────────────────────────
    const openPromoteDialog = () => {
        const sessions = rowData.map(s => s.session).filter(Boolean)
        const counts = {}
        sessions.forEach(v => counts[v] = (counts[v] || 0) + 1)
        const mostCommon = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || "2025-2026"
        setPromoteSession(getNextSession(mostCommon))
        setPromoteOpen(true)
    }

    const handlePromoteAll = async () => {
        if (!promoteSession) {
            toast.error("Please select the new session")
            return
        }

        const sourceSession = sessionFilter || newestSession
        const studentsToPromote = rowData.filter(
            (s) => !sourceSession || sameText(s.session, sourceSession)
        )

        if (studentsToPromote.length === 0) {
            toast.error("No students to promote")
            return
        }

        setPromoteLoading(true)
        setPromoteProgress({ current: 0, total: studentsToPromote.length })

        let created = 0
        let graduated = 0
        let skipped = 0
        const skipReasons = []

        const targetSession = String(promoteSession).trim()

        for (let i = 0; i < studentsToPromote.length; i++) {
            const s = studentsToPromote[i]

            const currentSession = String(s.session || "").trim()
            if (currentSession === targetSession) {
                skipped++
                skipReasons.push(`${s.name}: already in ${targetSession}`)
                setPromoteProgress({ current: i + 1, total: studentsToPromote.length })
                continue
            }

            if (String(s.grade || "").trim().toLowerCase() === "graduated") {
                skipped++
                skipReasons.push(`${s.name}: already graduated`)
                setPromoteProgress({ current: i + 1, total: studentsToPromote.length })
                continue
            }

            const nextGrade = getNextGrade(s.grade)
            if (!nextGrade) {
                skipped++
                skipReasons.push(`${s.name}: unknown grade "${s.grade}"`)
                setPromoteProgress({ current: i + 1, total: studentsToPromote.length })
                continue
            }

            const payload = {
                name: s.name,
                fatherName: s.fatherName || null,
                fatherOccupation: s.fatherOccupation || null,
                admissionNo: s.admissionNo || null,
                contact: s.contact || "",
                grade: nextGrade,
                section: s.section || null,
                rollNo: s.rollNo || null,
                session: targetSession,
                admissionDate: s.admissionDate || null,
                fee: s.fee || 0,
                address: s.address || "",
                image: s.image || null,
                isPromotion: true,
            }

            try {
                const resp = await GlobalApi.CreateNewStudent(payload)
                if (nextGrade === "Graduated") graduated++
                else created++
            } catch (err) {
                const msg = err?.response?.data?.error || err?.message || "unknown error"
                console.error(`[PROMOTE] Failed for ${s.name}:`, msg)
                skipped++
                skipReasons.push(`${s.name}: ${msg}`)
            }

            setPromoteProgress({ current: i + 1, total: studentsToPromote.length })
        }

        if (created === 0 && graduated === 0) {
            toast.error(
                `No students promoted. ${skipped} skipped. Check console for details.`
            )
            console.warn("[PROMOTE] Skip reasons:", skipReasons)
        } else {
            toast.success(
                `Created ${created} new record(s)` +
                (graduated ? ` • ${graduated} graduated` : "") +
                (skipped ? ` • ${skipped} skipped` : "")
            )
        }

        setPromoteOpen(false)
        setPromoteSession("")
        if (refreshData) await refreshData()
        setPromoteLoading(false)
        setPromoteProgress({ current: 0, total: 0 })
    }

    // ─────────────────────────────────────────────
    // Export/Print helpers
    // ─────────────────────────────────────────────
    const schoolName = schoolInfo?.schoolName || schoolInfo?.name || "School"
    const schoolAddress = schoolInfo?.address || ""
    const schoolPhone = schoolInfo?.phone || schoolInfo?.contact || ""
    const schoolEmail = schoolInfo?.email || ""

    const reportTitle = useMemo(() => {
        const bits = []
        if (gradeFilter) bits.push(`Grade: ${gradeFilter}`)
        if (sectionFilter) bits.push(`Section: ${sectionFilter}`)
        if (sessionFilter) bits.push(`Session: ${sessionFilter}`)
        else if (newestSession) bits.push(`Session: ${newestSession}`)
        return bits.length ? `Student Report — ${bits.join(" | ")}` : "Student Report"
    }, [gradeFilter, sectionFilter, sessionFilter, newestSession])

    const EXPORT_COLUMNS = [
        { key: "id",            label: "ID" },
        { key: "rollNo",        label: "Roll No" },
        { key: "admissionNo",   label: "Admission No" },
        { key: "name",          label: "Student Name" },
        { key: "fatherName",    label: "Father Name" },
        { key: "fatherOccupation", label: "Father Occupation" },
        { key: "grade",         label: "Grade" },
        { key: "section",       label: "Section" },
        { key: "session",       label: "Session" },
        { key: "contact",       label: "Contact No" },
        { key: "admissionDate", label: "Admission Date" },
        { key: "address",       label: "Address" },
    ]

    const headerHtml = `
        <div class="header">
            <h1>${schoolName}</h1>
            ${schoolAddress ? `<p class="meta">${schoolAddress}</p>` : ""}
            ${(schoolPhone || schoolEmail) ? `<p class="meta">${[schoolPhone, schoolEmail].filter(Boolean).join(" | ")}</p>` : ""}
            <hr />
            <h2>${reportTitle}</h2>
            <p class="meta">Total Students: ${filteredData.length} &nbsp; | &nbsp; Generated: ${new Date().toLocaleString()}</p>
        </div>
    `

    const tableHtml = () => {
        const rows = filteredData.map((s) => `
            <tr>
                ${EXPORT_COLUMNS.map((c) => `<td>${s[c.key] ?? ""}</td>`).join("")}
            </tr>
        `).join("")

        return `
            <table>
                <thead>
                    <tr>${EXPORT_COLUMNS.map((c) => `<th>${c.label}</th>`).join("")}</tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `
    }

    const baseStyles = `
        * { box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            padding: 30px;
            color: #111;
            background: #fff;
        }
        .header { text-align: center; margin-bottom: 20px; }
        .header h1 { font-size: 24px; margin: 0 0 6px; color: #1e293b; letter-spacing: 0.5px; }
        .header h2 { font-size: 15px; margin: 12px 0 6px; color: #334155; font-weight: 600; }
        .header .meta { font-size: 12px; color: #64748b; margin: 2px 0; }
        .header hr { border: none; border-top: 2px solid #3b82f6; margin: 12px auto; width: 60px; }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 14px;
            font-size: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06);
            border-radius: 6px;
            overflow: hidden;
        }
        th {
            background: #1e293b;
            color: #fff;
            padding: 10px 8px;
            text-align: left;
            font-weight: 600;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        td {
            padding: 9px 8px;
            border-bottom: 1px solid #e2e8f0;
        }
        tr:nth-child(even) td { background: #f8fafc; }
        .footer {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: #555;
        }
        .footer .line {
            border-top: 1px solid #333;
            width: 180px;
            text-align: center;
            padding-top: 4px;
        }
    `

    const handlePrint = () => {
        const printWindow = window.open("", "_blank", "width=1000,height=800")
        if (!printWindow) return

        const html = `
            <html>
            <head>
                <title>${reportTitle}</title>
                <style>
                    ${baseStyles}
                    @media print {
                        body { padding: 10px; }
                        th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        tr:nth-child(even) td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body>
                ${headerHtml}
                ${tableHtml()}
                <div class="footer">
                    <div class="line">Principal Signature</div>
                    <div class="line">Date</div>
                </div>
                <script>window.onload = () => window.print();</script>
            </body>
            </html>
        `
        printWindow.document.open()
        printWindow.document.write(html)
        printWindow.document.close()
    }

    const handleExportPDF = () => {
        setExportOpen(false)

        try {
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4',
            })

            const pageWidth = doc.internal.pageSize.getWidth()

            doc.setFont('helvetica', 'bold')
            doc.setFontSize(18)
            doc.setTextColor(30, 41, 59)
            doc.text(schoolName, pageWidth / 2, 15, { align: 'center' })

            let yPos = 22
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(9)
            doc.setTextColor(100, 116, 139)
            if (schoolAddress) {
                doc.text(schoolAddress, pageWidth / 2, yPos, { align: 'center' })
                yPos += 5
            }
            if (schoolPhone || schoolEmail) {
                const contact = [schoolPhone, schoolEmail].filter(Boolean).join('  |  ')
                doc.text(contact, pageWidth / 2, yPos, { align: 'center' })
                yPos += 5
            }

            doc.setDrawColor(59, 130, 246)
            doc.setLineWidth(0.5)
            doc.line(pageWidth / 2 - 15, yPos, pageWidth / 2 + 15, yPos)
            yPos += 6

            doc.setFont('helvetica', 'bold')
            doc.setFontSize(12)
            doc.setTextColor(51, 65, 85)
            doc.text(reportTitle, pageWidth / 2, yPos, { align: 'center' })
            yPos += 5

            doc.setFont('helvetica', 'normal')
            doc.setFontSize(8)
            doc.setTextColor(100, 116, 139)
            doc.text(
                `Total Students: ${filteredData.length}   |   Generated: ${new Date().toLocaleString()}`,
                pageWidth / 2,
                yPos,
                { align: 'center' }
            )
            yPos += 5

            const head = [EXPORT_COLUMNS.map((c) => c.label)]
            const body = filteredData.map((s) =>
                EXPORT_COLUMNS.map((c) => {
                    const val = s[c.key]
                    return val !== null && val !== undefined && val !== "" ? String(val) : "—"
                })
            )

            autoTable(doc, {
                head,
                body,
                startY: yPos,
                theme: 'grid',
                styles: {
                    fontSize: 8,
                    cellPadding: 2,
                    textColor: [51, 65, 85],
                    lineColor: [226, 232, 240],
                    lineWidth: 0.1,
                },
                headStyles: {
                    fillColor: [30, 41, 59],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 8,
                    halign: 'left',
                },
                alternateRowStyles: {
                    fillColor: [248, 250, 252],
                },
                margin: { left: 10, right: 10 },
            })

            const finalY = doc.lastAutoTable.finalY + 20
            const footerLeft = 40
            const footerRight = pageWidth - 40

            doc.setDrawColor(51, 65, 85)
            doc.setLineWidth(0.3)
            doc.line(footerLeft - 25, finalY, footerLeft + 25, finalY)
            doc.line(footerRight - 25, finalY, footerRight + 25, finalY)

            doc.setFont('helvetica', 'normal')
            doc.setFontSize(9)
            doc.setTextColor(85, 85, 85)
            doc.text('Principal Signature', footerLeft, finalY + 4, { align: 'center' })
            doc.text('Date', footerRight, finalY + 4, { align: 'center' })

            const filename = `${reportTitle.replace(/[^\w\-]+/g, "_")}.pdf`
            doc.save(filename)

            toast.success("PDF downloaded")
        } catch (err) {
            console.error("PDF EXPORT ERROR:", err)
            toast.error("Failed to generate PDF")
        }
    }

    const handleExportWord = () => {
        setExportOpen(false)
        const html = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office'
                  xmlns:w='urn:schemas-microsoft-com:office:word'
                  xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset="utf-8">
                <title>${reportTitle}</title>
                <style>${baseStyles}</style>
            </head>
            <body>
                ${headerHtml}
                ${tableHtml()}
                <div class="footer">
                    <div class="line">Principal Signature</div>
                    <div class="line">Date</div>
                </div>
            </body>
            </html>
        `
        const blob = new Blob(["\ufeff", html], { type: "application/msword" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${reportTitle.replace(/[^\w\-]+/g, "_")}.doc`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success("Word file downloaded")
    }

    const handleExportCSV = () => {
        setExportOpen(false)
        const headers = EXPORT_COLUMNS.map((c) => `"${c.label}"`).join(",")
        const rows = filteredData.map((s) =>
            EXPORT_COLUMNS.map((c) => {
                const val = s[c.key] ?? ""
                return `"${String(val).replace(/"/g, '""')}"`
            }).join(",")
        )
        const csv = [headers, ...rows].join("\n")
        const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${reportTitle.replace(/[^\w\-]+/g, "_")}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success("CSV file downloaded")
    }

    // ─── Action buttons column ───
    const CustomButtons = (props) => (
        <div className="flex items-center gap-1.5 h-full">
            <button
                onClick={() => handleView(props?.data)}
                title="View details"
                className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600
                    dark:bg-blue-900/40 dark:hover:bg-blue-900/60 dark:text-blue-300
                    flex items-center justify-center transition-all duration-200 hover:scale-110"
            >
                <Eye size={15} />
            </button>

            <button
                onClick={() => handleEditClick(props?.data)}
                title="Edit student"
                className="w-8 h-8 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600
                    dark:bg-amber-900/40 dark:hover:bg-amber-900/60 dark:text-amber-300
                    flex items-center justify-center transition-all duration-200 hover:scale-110"
            >
                <Pencil size={15} />
            </button>

            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <button
                        title="Delete student"
                        className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-600
                            dark:bg-red-900/40 dark:hover:bg-red-900/60 dark:text-red-300
                            flex items-center justify-center transition-all duration-200 hover:scale-110"
                    >
                        <Trash2 size={15} />
                    </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this student?</AlertDialogTitle>
                        <AlertDialogDescription className="dark:text-slate-400">
                            This will permanently remove the student from the system.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => DeleteRecord(props?.data?.id)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )

    const defaultColDef = useMemo(() => ({
        resizable: true,
        sortable: true,
        cellStyle: { display: 'flex', alignItems: 'center' },
    }), [])

    const colDefs = useMemo(() => [
        {
            field: "image",
            headerName: "Photo",
            width: 90,
            sortable: false,
            filter: false,
            pinned: "left",
            cellRenderer: ImageCellRenderer,
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        },
        {
            field: "id",
            headerName: "ID",
            width: 70,
            filter: true,
            cellStyle: { display: 'flex', alignItems: 'center', fontWeight: '600', color: '#6366f1' },
        },
        { field: "rollNo", headerName: "Roll No", filter: true, width: 100 },
        { field: "admissionNo", headerName: "Admission No", filter: true, width: 140 },
        {
            field: "name",
            headerName: "Student Name",
            filter: true,
            minWidth: 180,
            flex: 2,
            cellStyle: {
                display: 'flex', alignItems: 'center', fontWeight: '600',
                whiteSpace: 'normal', lineHeight: '1.3',
            },
        },
        {
            field: "fatherName",
            headerName: "Father Name",
            filter: true,
            minWidth: 180,
            flex: 2,
            cellStyle: {
                display: 'flex', alignItems: 'center',
                whiteSpace: 'normal', lineHeight: '1.3',
            },
        },
        { field: "grade", headerName: "Grade", filter: true, width: 100 },
        { field: "section", headerName: "Section", filter: true, width: 100 },
        { field: "session", headerName: "Session", filter: true, width: 130 },
        { field: "contact", headerName: "Contact No", filter: true, width: 150 },
        {
            field: "action",
            headerName: "Action",
            cellRenderer: CustomButtons,
            width: 150,
            pinned: "right",
            sortable: false,
            filter: false,
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        },
    ], [])

    return (
        <div className="my-6 animate-page-in">

            {/* ─── Header card ─── */}
            <div className="bg-gradient-to-r from-indigo-500 via-blue-600 to-cyan-600 rounded-2xl shadow-lg p-5 mb-5 text-white relative z-20 overflow-visible">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_20%_20%,white_0%,transparent_60%)] pointer-events-none" />

                <div className="relative flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                            <Users size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight">Student Records</h2>
                            <p className="text-xs text-blue-100 mt-0.5">
                                {filteredData.length} {filteredData.length === 1 ? "student" : "students"}
                                {searchInput ? ` (searching "${searchInput}")` : ""}
                                {!searchInput && !sessionFilter && newestSession ? ` • Latest session (${newestSession})` : ""}
                                {!searchInput && sessionFilter ? ` • ${sessionFilter}` : ""}
                                {schoolName ? ` • ${schoolName}` : ""}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-sm font-semibold transition-all backdrop-blur-sm"
                        >
                            <Printer size={15} />
                            Print
                        </button>

                        <button
                            onClick={openPromoteDialog}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-sm font-semibold transition-all backdrop-blur-sm"
                        >
                            <ArrowUpCircle size={15} />
                            Promote
                        </button>

                        <div className="relative z-30" ref={dropdownRef}>
                            <button
                                onClick={() => setExportOpen((v) => !v)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 text-sm font-semibold transition-all shadow-md"
                            >
                                <Download size={15} />
                                Export
                                <ChevronDown size={14} className={`transition-transform ${exportOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {exportOpen && (
                                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-[9999]">
                                    <button
                                        onClick={handleExportPDF}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-red-50 hover:text-red-600 transition-colors text-left"
                                    >
                                        <FileText size={16} className="text-red-500" />
                                        Export as PDF
                                    </button>
                                    <button
                                        onClick={handleExportWord}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors text-left border-t border-slate-100"
                                    >
                                        <File size={16} className="text-blue-500" />
                                        Export as Word
                                    </button>
                                    <button
                                        onClick={handleExportCSV}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors text-left border-t border-slate-100"
                                    >
                                        <FileSpreadsheet size={16} className="text-emerald-500" />
                                        Export as Excel (CSV)
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Filter bar ─── */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-3 mb-4 relative z-0">
                <div className="flex flex-wrap items-center gap-2">
                    <GraduationCap size={16} className="text-slate-400" />

                    <select className={FILTER_CLASS} value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>
                        <option value="">All Grades</option>
                        {GRADES.map((g) => (<option key={g} value={g}>{g}</option>))}
                    </select>

                    <select className={FILTER_CLASS} value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)}>
                        <option value="">All Sections</option>
                        {SECTIONS.map((s) => (<option key={s} value={s}>{s}</option>))}
                    </select>

                    <select className={FILTER_CLASS} value={sessionFilter} onChange={(e) => setSessionFilter(e.target.value)}>
                        <option value="">
                            {newestSession ? `Latest (${newestSession})` : "All Sessions"}
                        </option>
                        {sessionOptions.map((s) => (<option key={s} value={s}>{s}</option>))}
                    </select>

                    {(gradeFilter || sectionFilter || sessionFilter) && (
                        <button
                            onClick={() => { setGradeFilter(""); setSectionFilter(""); setSessionFilter("") }}
                            className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 px-2"
                        >
                            Clear
                        </button>
                    )}

                    {/* Working search box */}
                    <div className="ml-auto flex items-center gap-2 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 shadow-sm bg-white dark:bg-slate-800 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/40 transition-all duration-200">
                        <Search size={18} className="text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search name, f/name, adm no, roll no..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="outline-none text-sm w-64 placeholder:text-slate-400 bg-transparent text-slate-800 dark:text-slate-100"
                        />
                        {searchInput && (
                            <button
                                onClick={() => setSearchInput("")}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                title="Clear search"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ─── Table card ─── */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden relative z-0">
                <div className="h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500" />

                <div className="ag-theme-quartz" style={{ height: 580, width: '100%' }}>
                    <AgGridReact
                        rowData={filteredData}
                        columnDefs={colDefs}
                        defaultColDef={defaultColDef}
                        pagination={pagination}
                        paginationPageSize={paginationPageSize}
                        paginationPageSizeSelector={paginationPageSizeSelector}
                        rowHeight={58}
                        headerHeight={52}
                        animateRows={true}
                    />
                </div>
            </div>

            <StudentDetailsDialog
                student={selectedStudent}
                open={viewOpen}
                onOpenChange={setViewOpen}
            />

            <EditStudentDialog
                student={editStudent}
                open={editOpen}
                onOpenChange={setEditOpen}
                refreshData={refreshData}
                students={students || rowData}
            />

            {/* ─── Promote dialog ─── */}
            {promoteOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-5">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center text-white">
                                    <ArrowUpCircle size={22} />
                                </div>
                                <div>
                                    <h3 className="text-white text-lg font-bold">Promote All Students</h3>
                                    <p className="text-emerald-100 text-xs mt-0.5">
                                        Creates new records for the next session
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                                <p className="text-xs text-amber-800 font-medium leading-relaxed">
                                    ⚠️ This will promote students from the{' '}
                                    <strong>{sessionFilter || newestSession || "current"}</strong> session:
                                </p>
                                <ul className="text-xs text-amber-800 mt-2 space-y-1 ml-4 list-disc">
                                    <li>Nursery → Prep → 1st → 2nd → ... → 11th → 12th</li>
                                    <li>Grade 12 students will be marked as <strong>Graduated</strong></li>
                                    <li>Session changes to the one you select below</li>
                                    <li><strong>Old session records are kept</strong> for history</li>
                                </ul>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    New Session <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={promoteSession}
                                    onChange={(e) => setPromoteSession(e.target.value)}
                                    disabled={promoteLoading}
                                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition text-slate-800 bg-white disabled:opacity-60"
                                >
                                    <option value="">Select Session</option>
                                    {sessionOptions.map((s) => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
                            <button
                                onClick={() => { setPromoteOpen(false); setPromoteSession("") }}
                                disabled={promoteLoading}
                                className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePromoteAll}
                                disabled={promoteLoading || !promoteSession}
                                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold transition flex items-center gap-2"
                            >
                                {promoteLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Promoting {promoteProgress.current}/{promoteProgress.total}...
                                    </>
                                ) : (
                                    <>
                                        <ArrowUpCircle size={15} />
                                        Promote All
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .ag-theme-quartz {
                    --ag-font-family: var(--font-inter), system-ui, sans-serif;
                    --ag-font-size: 14px;
                    --ag-row-height: 58px;
                    --ag-header-height: 52px;
                    --ag-border-color: #e2e8f0;
                    --ag-header-background-color: #f8fafc;
                    --ag-header-foreground-color: #475569;
                    --ag-odd-row-background-color: #ffffff;
                    --ag-even-row-background-color: #fafbfc;
                    --ag-row-hover-color: #eef2ff;
                    --ag-selected-row-background-color: #e0e7ff;
                    --ag-borders: none;
                }
                .ag-theme-quartz .ag-header {
                    border-bottom: 1px solid #e2e8f0 !important;
                    font-weight: 700 !important;
                    text-transform: uppercase;
                    font-size: 11px !important;
                    letter-spacing: 0.05em;
                }
                .ag-theme-quartz .ag-header-cell-text { color: #64748b; }
                .ag-theme-quartz .ag-row {
                    border-bottom: 1px solid #f1f5f9 !important;
                    transition: background-color 0.15s ease;
                }
                .ag-theme-quartz .ag-row:hover { background-color: #eef2ff !important; }
                .ag-theme-quartz .ag-cell { color: #334155; font-size: 13.5px; }
                .ag-theme-quartz .ag-paging-panel {
                    border-top: 1px solid #e2e8f0 !important;
                    padding: 12px 16px;
                    color: #64748b;
                    font-size: 13px;
                }
                .dark .ag-theme-quartz {
                    --ag-border-color: #334155;
                    --ag-header-background-color: #0f172a;
                    --ag-header-foreground-color: #cbd5e1;
                    --ag-odd-row-background-color: #1e293b;
                    --ag-even-row-background-color: #1a2536;
                    --ag-row-hover-color: #334155;
                    --ag-selected-row-background-color: #1e40af;
                    --ag-foreground-color: #f1f5f9;
                }
                .dark .ag-theme-quartz .ag-header { border-bottom: 1px solid #334155 !important; }
                .dark .ag-theme-quartz .ag-header-cell-text { color: #94a3b8 !important; }
                .dark .ag-theme-quartz .ag-row { border-bottom: 1px solid #334155 !important; }
                .dark .ag-theme-quartz .ag-row:hover { background-color: #334155 !important; }
                .dark .ag-theme-quartz .ag-cell { color: #e2e8f0 !important; }
                .dark .ag-theme-quartz .ag-paging-panel {
                    border-top: 1px solid #334155 !important;
                    color: #94a3b8;
                }
            `}</style>
        </div>
    )
}

export default StudentListTable