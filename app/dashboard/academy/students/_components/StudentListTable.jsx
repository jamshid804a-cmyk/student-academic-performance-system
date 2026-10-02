"use client"

import React, { useEffect, useState, useMemo, useRef } from 'react'
import { AgGridReact } from 'ag-grid-react'
import '@/utils/agGrid'
import {
    Search, Trash2, Eye, Pencil, Users,
    Printer, Download, FileText, FileSpreadsheet, ChevronDown, File,
    X
} from 'lucide-react'
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
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

const SECTIONS = ["A", "B", "C"]
const START_YEAR = 2025
const END_YEAR = new Date().getFullYear() + 30
const YEARS = []
for (let y = START_YEAR; y <= END_YEAR; y++) YEARS.push(String(y))

const BATCHES = Array.from({ length: 20 }, (_, i) => `Batch ${i + 1}`)

function sameText(a, b) {
    return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase()
}

const FILTER_CLASS =
  "px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"

const ImageCellRenderer = (props) => {
    const student = props.data
    const src = student?.image || null
    const initial = (student?.name || "?").trim().charAt(0).toUpperCase()
    return (
        <div className="flex items-center justify-center h-full">
            {src ? (
                <img src={src} alt={student?.name} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow ring-1 ring-slate-200" />
            ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white font-bold flex items-center justify-center text-sm shadow">
                    {initial}
                </div>
            )}
        </div>
    )
}

function StudentListTable({ StudentList, refreshData, students, email }) {
    const [rowData, setRowData] = useState([])
    const [searchInput, setSearchInput] = useState("")
    const [selectedStudent, setSelectedStudent] = useState(null)
    const [viewOpen, setViewOpen] = useState(false)
    const [editStudent, setEditStudent] = useState(null)
    const [editOpen, setEditOpen] = useState(false)

    const [courseFilter, setCourseFilter] = useState("")
    const [sectionFilter, setSectionFilter] = useState("")
    const [yearFilter, setYearFilter] = useState("")
    const [batchFilter, setBatchFilter] = useState("")

    const [courses, setCourses] = useState([])
    const [schoolInfo, setSchoolInfo] = useState(null)
    const [exportOpen, setExportOpen] = useState(false)
    const dropdownRef = useRef(null)

    useEffect(() => {
        let mounted = true
        GlobalApi.GetSchoolInfo().then(r => { if (mounted) setSchoolInfo(r?.data || null) }).catch(() => {})
        return () => { mounted = false }
    }, [])

    useEffect(() => {
        if (!email) return
        fetch(`/api/academy/courses?email=${encodeURIComponent(email)}`, { cache: 'no-store' })
            .then(r => r.json()).then(d => { if (d.success) setCourses(d.courses || []) }).catch(() => {})
    }, [email])

    useEffect(() => {
        const onClick = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setExportOpen(false)
        }
        document.addEventListener("mousedown", onClick)
        return () => document.removeEventListener("mousedown", onClick)
    }, [])

    useEffect(() => { if (StudentList) setRowData(StudentList) }, [StudentList])

    const newestYear = useMemo(() => {
        const ys = rowData.map(s => Number(s.year)).filter(y => Number.isFinite(y) && y > 0)
        return ys.length === 0 ? "" : String(Math.max(...ys))
    }, [rowData])

    const filteredData = useMemo(() => {
        const q = String(searchInput || "").trim().toLowerCase()
        if (q.length > 0) {
            const isNumeric = /^\d+$/.test(q)
            return rowData.filter((s) => {
                if (isNumeric) {
                    return String(s.admissionNo ?? "") === q ||
                           String(s.rollNo ?? "") === q ||
                           String(s.id ?? "") === q
                }
                const fields = [s.name, s.fatherName, s.fatherOccupation, s.admissionNo, s.rollNo, s.id, s.contact, s.year, s.subject, s.section, s.batchNo, s.courseDuration, s.address]
                return fields.some(v => v && String(v).toLowerCase().includes(q))
            })
        }
        const effYear = yearFilter || newestYear
        return rowData.filter((s) => {
            if (courseFilter && !sameText(s.subject, courseFilter)) return false
            if (sectionFilter && !sameText(s.section, sectionFilter)) return false
            if (batchFilter && !sameText(s.batchNo, batchFilter)) return false
            if (effYear && !sameText(s.year, effYear)) return false
            return true
        })
    }, [rowData, courseFilter, sectionFilter, yearFilter, batchFilter, newestYear, searchInput])

    const DeleteRecord = async (id) => {
        if (!email) { toast.error("Session not ready"); return }
        try {
            const res = await fetch(`/api/academy/student?id=${id}&email=${encodeURIComponent(email)}`, { method: 'DELETE' })
            const data = await res.json()
            if (data.success) { toast.success("Record Deleted Successfully"); refreshData() }
            else toast.error(data.error || "Delete failed")
        } catch { toast.error("Delete failed") }
    }

    const handleView = (d) => { setSelectedStudent(d); setViewOpen(true) }
    const handleEditClick = (d) => { setEditStudent(d); setEditOpen(true) }

    const schoolName = schoolInfo?.schoolName || schoolInfo?.name || "Academy"
    const schoolAddress = schoolInfo?.address || ""
    const schoolPhone = schoolInfo?.phone || schoolInfo?.contact || ""
    const schoolEmail = schoolInfo?.email || ""

    const reportTitle = useMemo(() => {
        const bits = []
        if (searchInput) bits.push(`Search: "${searchInput}"`)
        else {
            if (courseFilter) bits.push(`Course: ${courseFilter}`)
            if (sectionFilter) bits.push(`Section: ${sectionFilter}`)
            if (batchFilter) bits.push(`Batch: ${batchFilter}`)
            if (yearFilter) bits.push(`Year: ${yearFilter}`)
            else if (newestYear) bits.push(`Year: ${newestYear}`)
        }
        return bits.length ? `Academy Student Report — ${bits.join(" | ")}` : "Academy Student Report"
    }, [courseFilter, sectionFilter, yearFilter, batchFilter, newestYear, searchInput])

    const EXPORT_COLUMNS = [
        { key: "id",                label: "ID" },
        { key: "rollNo",            label: "Roll No" },
        { key: "admissionNo",       label: "Admission No" },
        { key: "name",              label: "Student Name" },
        { key: "fatherName",        label: "Father Name" },
        { key: "subject",           label: "Course" },
        { key: "section",           label: "Section" },
        { key: "year",              label: "Year" },
        { key: "courseDuration",    label: "Duration" },
        { key: "batchNo",           label: "Batch No" },
        { key: "fee",               label: "Fee" },
        { key: "contact",           label: "Contact No" },
    ]

    const headerHtml = `
        <div class="header">
            <h1>${schoolName}</h1>
            ${schoolAddress ? `<p class="meta">${schoolAddress}</p>` : ""}
            <hr />
            <h2>${reportTitle}</h2>
            <p class="meta">Total: ${filteredData.length} | Generated: ${new Date().toLocaleString()}</p>
        </div>
    `

    const tableHtml = () => {
        const rows = filteredData.map((s) => `<tr>${EXPORT_COLUMNS.map(c => `<td>${s[c.key] ?? ""}</td>`).join("")}</tr>`).join("")
        return `<table><thead><tr>${EXPORT_COLUMNS.map(c => `<th>${c.label}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>`
    }

    const baseStyles = `
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #111; }
        .header { text-align: center; margin-bottom: 20px; }
        .header h1 { font-size: 24px; margin: 0 0 6px; color: #1e293b; }
        .header h2 { font-size: 15px; margin: 12px 0 6px; color: #334155; }
        .header hr { border: none; border-top: 2px solid #a855f7; margin: 12px auto; width: 60px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #1e293b; color: #fff; padding: 10px 8px; text-align: left; font-size: 11px; }
        td { padding: 9px 8px; border-bottom: 1px solid #e2e8f0; }
    `

    const handlePrint = () => {
        const w = window.open("", "_blank", "width=1000,height=800")
        if (!w) return
        w.document.write(`<html><head><title>${reportTitle}</title><style>${baseStyles}</style></head><body>${headerHtml}${tableHtml()}<script>window.onload=()=>window.print();</script></body></html>`)
        w.document.close()
    }

    const handleExportPDF = () => {
        setExportOpen(false)
        try {
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
            const pw = doc.internal.pageSize.getWidth()
            doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(30, 41, 59)
            doc.text(schoolName, pw / 2, 15, { align: 'center' })
            doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139)
            doc.text(reportTitle, pw / 2, 22, { align: 'center' })
            const head = [EXPORT_COLUMNS.map(c => c.label)]
            const body = filteredData.map(s => EXPORT_COLUMNS.map(c => String(s[c.key] ?? "—")))
            autoTable(doc, { head, body, startY: 28, theme: 'grid', styles: { fontSize: 8 }, headStyles: { fillColor: [30, 41, 59] } })
            doc.save(`${reportTitle.replace(/[^\w\-]+/g, "_")}.pdf`)
            toast.success("PDF downloaded")
        } catch { toast.error("Failed to generate PDF") }
    }

    const handleExportWord = () => {
        setExportOpen(false)
        const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset="utf-8"><style>${baseStyles}</style></head><body>${headerHtml}${tableHtml()}</body></html>`
        const blob = new Blob(["\ufeff", html], { type: "application/msword" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a"); a.href = url; a.download = `${reportTitle.replace(/[^\w\-]+/g, "_")}.doc`
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
        toast.success("Word file downloaded")
    }

    const handleExportCSV = () => {
        setExportOpen(false)
        const headers = EXPORT_COLUMNS.map(c => `"${c.label}"`).join(",")
        const rows = filteredData.map(s => EXPORT_COLUMNS.map(c => `"${String(s[c.key] ?? "").replace(/"/g, '""')}"`).join(","))
        const csv = [headers, ...rows].join("\n")
        const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a"); a.href = url; a.download = `${reportTitle.replace(/[^\w\-]+/g, "_")}.csv`
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
        toast.success("CSV file downloaded")
    }

    const CustomButtons = (props) => (
        <div className="flex items-center gap-1.5 h-full">
            <button onClick={() => handleView(props?.data)} title="View details"
                className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition">
                <Eye size={15} />
            </button>
            <button onClick={() => handleEditClick(props?.data)} title="Edit student"
                className="w-8 h-8 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 flex items-center justify-center transition">
                <Pencil size={15} />
            </button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <button title="Delete student"
                        className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition">
                        <Trash2 size={15} />
                    </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this student?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently remove the student.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => DeleteRecord(props?.data?.id)} className="bg-red-600 hover:bg-red-700 text-white">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )

    const defaultColDef = useMemo(() => ({
        resizable: true, sortable: true, cellStyle: { display: 'flex', alignItems: 'center' },
    }), [])

    const colDefs = useMemo(() => [
        { field: "image", headerName: "Photo", width: 90, sortable: false, filter: false, pinned: "left",
          cellRenderer: ImageCellRenderer, cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' } },
        { field: "id", headerName: "ID", width: 70, filter: true,
          cellStyle: { display: 'flex', alignItems: 'center', fontWeight: '600', color: '#a855f7' } },
        { field: "rollNo", headerName: "Roll No", filter: true, width: 100 },
        { field: "admissionNo", headerName: "Admission No", filter: true, width: 130,
          comparator: (a, b) => (Number(a) || 0) - (Number(b) || 0) },
        { field: "name", headerName: "Student Name", filter: true, minWidth: 180, flex: 2,
          cellStyle: { display: 'flex', alignItems: 'center', fontWeight: '600', whiteSpace: 'normal' } },
        { field: "fatherName", headerName: "Father Name", filter: true, minWidth: 160, flex: 2 },
        { field: "subject", headerName: "Course", filter: true, minWidth: 160 },
        { field: "section", headerName: "Section", filter: true, width: 100 },
        { field: "year", headerName: "Year", filter: true, width: 90 },
        { field: "courseDuration", headerName: "Duration", filter: true, width: 110 },
        { field: "batchNo", headerName: "Batch No", filter: true, width: 110 },
        { field: "fee", headerName: "Fee", filter: true, width: 100,
          valueFormatter: (p) => p.value ? `Rs. ${p.value}` : "—" },
        { field: "contact", headerName: "Contact No", filter: true, width: 140 },
        { field: "action", headerName: "Action", cellRenderer: CustomButtons, width: 150, pinned: "right",
          sortable: false, filter: false, cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' } },
    ], [])

    return (
        <div className="my-6">
            <div className="bg-gradient-to-r from-purple-500 via-fuchsia-600 to-pink-600 rounded-2xl shadow-lg p-5 mb-5 text-white relative">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
                            <Users size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Academy Student Records</h2>
                            <p className="text-xs text-purple-100 mt-0.5">
                                {filteredData.length} student{filteredData.length === 1 ? "" : "s"} • {schoolName}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-sm font-semibold">
                            <Printer size={15} /> Print
                        </button>
                        <div className="relative" ref={dropdownRef}>
                            <button onClick={() => setExportOpen(v => !v)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-purple-700 hover:bg-purple-50 text-sm font-semibold shadow-md">
                                <Download size={15} /> Export
                                <ChevronDown size={14} className={`transition-transform ${exportOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {exportOpen && (
                                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-[9999]">
                                    <button onClick={handleExportPDF} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-red-50 text-left">
                                        <FileText size={16} className="text-red-500" /> Export as PDF
                                    </button>
                                    <button onClick={handleExportWord} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 text-left border-t border-slate-100">
                                        <File size={16} className="text-blue-500" /> Export as Word
                                    </button>
                                    <button onClick={handleExportCSV} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-emerald-50 text-left border-t border-slate-100">
                                        <FileSpreadsheet size={16} className="text-emerald-500" /> Export as Excel (CSV)
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 mb-4">
                <div className="flex flex-wrap items-center gap-2">
                    <Users size={16} className="text-slate-400" />
                    <select className={FILTER_CLASS} value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
                        <option value="">All Courses</option>
                        {courses.map((c) => <option key={c._id} value={c.name}>{c.name}</option>)}
                    </select>
                    <select className={FILTER_CLASS} value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)}>
                        <option value="">All Sections</option>
                        {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select className={FILTER_CLASS} value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)}>
                        <option value="">All Batches</option>
                        {BATCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                    <select className={FILTER_CLASS} value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
                        <option value="">{newestYear ? `Latest (${newestYear})` : "All Years"}</option>
                        {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                    {(courseFilter || sectionFilter || yearFilter || batchFilter) && (
                        <button onClick={() => { setCourseFilter(""); setSectionFilter(""); setYearFilter(""); setBatchFilter("") }}
                            className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-2">
                            Clear
                        </button>
                    )}
                    <div className="ml-auto flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm bg-white focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-100">
                        <Search size={18} className="text-slate-400" />
                        <input type="text" placeholder="Search name, adm no, roll no, ID..." value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="outline-none text-sm w-64 placeholder:text-slate-400 bg-transparent text-slate-800" />
                        {searchInput && (
                            <button onClick={() => setSearchInput("")} className="text-slate-400 hover:text-slate-600">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500" />
                <div className="ag-theme-quartz" style={{ height: 580, width: '100%' }}>
                    <AgGridReact
                        getRowId={(p) => String(p.data?.id ?? p.data?._id)}
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

            <StudentDetailsDialog student={selectedStudent} open={viewOpen} onOpenChange={setViewOpen} />
            <EditStudentDialog
                student={editStudent}
                open={editOpen}
                onOpenChange={setEditOpen}
                refreshData={refreshData}
                students={students || rowData}
                email={email}
            />

            <style jsx global>{`
                .ag-theme-quartz {
                    --ag-font-family: var(--font-inter), system-ui, sans-serif;
                    --ag-font-size: 14px;
                    --ag-header-background-color: #f8fafc;
                    --ag-row-hover-color: #faf5ff;
                    --ag-borders: none;
                }
            `}</style>
        </div>
    )
}

export default StudentListTable