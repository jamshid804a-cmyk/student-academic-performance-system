"use client"

import React, { useEffect, useState, useMemo } from 'react'
import { AgGridReact } from 'ag-grid-react'
import '@/utils/agGrid'
import { Search, Trash2, Eye, Pencil, Users, GraduationCap } from 'lucide-react'
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

const pagination = true
const paginationPageSize = 10
const paginationPageSizeSelector = [10, 20, 25, 100]

// ✅ Grade list — Nursery, Prep, 1st..12th
const GRADES = [
    "Nursery",
    "Prep",
    "1st","2nd","3rd","4th","5th","6th","7th","8th","9th","10th","11th","12th",
]
const SECTIONS = ["A", "B", "C"]
const SESSIONS = Array.from({ length: 100 }, (_, i) => `${2025 + i}-${2026 + i}`)

// ✅ Forgiving grade matcher: "1" ↔ "1st", "Nursery" ↔ "nursery", etc.
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

// ✅ Image cell renderer — shows photo or a fallback avatar with initials
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
                    onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.nextSibling.style.display = 'flex'
                    }}
                />
            ) : null}
            {!src && (
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

    useEffect(() => {
        if (StudentList) setRowData(StudentList)
    }, [StudentList])

    const filteredData = useMemo(() => {
        return rowData.filter((s) => {
            if (gradeFilter && !sameGrade(s.grade, gradeFilter)) return false
            if (sectionFilter && !sameText(s.section, sectionFilter)) return false
            if (sessionFilter && !sameText(s.session, sessionFilter)) return false
            return true
        })
    }, [rowData, gradeFilter, sectionFilter, sessionFilter])

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
        cellStyle: {
            display: 'flex',
            alignItems: 'center',
        },
    }), [])

    const colDefs = useMemo(() => [
        // ✅ NEW: Image column (first)
        {
            field: "image",
            headerName: "Photo",
            width: 90,
            sortable: false,
            filter: false,
            pinned: "left",
            cellRenderer: ImageCellRenderer,
            cellStyle: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            },
        },
        {
            field: "id",
            headerName: "ID",
            width: 70,
            filter: true,
            cellStyle: {
                display: 'flex',
                alignItems: 'center',
                fontWeight: '600',
                color: '#6366f1',
            },
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
                display: 'flex',
                alignItems: 'center',
                fontWeight: '600',
                whiteSpace: 'normal',
                lineHeight: '1.3',
            },
        },
        {
            field: "fatherName",
            headerName: "Father Name",
            filter: true,
            minWidth: 180,
            flex: 2,
            cellStyle: {
                display: 'flex',
                alignItems: 'center',
                whiteSpace: 'normal',
                lineHeight: '1.3',
            },
        },
        { field: "grade", headerName: "Grade", filter: true, width: 100 },
        { field: "section", headerName: "Section", filter: true, width: 100 },
        { field: "session", headerName: "Session", filter: true, width: 130 },
        { field: "contact", headerName: "Contact No", filter: true, width: 150 },
        // ❌ REMOVED: Fee column
        {
            field: "action",
            headerName: "Action",
            cellRenderer: CustomButtons,
            width: 150,
            pinned: "right",
            sortable: false,
            filter: false,
            cellStyle: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            },
        },
    ], [])

    return (
        <div className="my-6 animate-page-in">

            {/* Header card */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform duration-300">
                        <Users size={22} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                            Student Records
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {filteredData.length} of {rowData.length}{" "}
                            {rowData.length === 1 ? "student" : "students"}
                        </p>
                    </div>
                </div>

                {/* Filters + search */}
                <div className="flex flex-wrap items-center gap-2">
                    <GraduationCap size={16} className="text-slate-400" />

                    <select
                        className={FILTER_CLASS}
                        value={gradeFilter}
                        onChange={(e) => setGradeFilter(e.target.value)}
                    >
                        <option value="">All Grades</option>
                        {GRADES.map((g) => (
                            <option key={g} value={g}>{g}</option>
                        ))}
                    </select>

                    <select
                        className={FILTER_CLASS}
                        value={sectionFilter}
                        onChange={(e) => setSectionFilter(e.target.value)}
                    >
                        <option value="">All Sections</option>
                        {SECTIONS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>

                    <select
                        className={FILTER_CLASS}
                        value={sessionFilter}
                        onChange={(e) => setSessionFilter(e.target.value)}
                    >
                        <option value="">All Sessions</option>
                        {sessionOptions.map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>

                    {(gradeFilter || sectionFilter || sessionFilter) && (
                        <button
                            onClick={() => {
                                setGradeFilter("")
                                setSectionFilter("")
                                setSessionFilter("")
                            }}
                            className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 px-2"
                        >
                            Clear
                        </button>
                    )}

                    <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 shadow-sm bg-white dark:bg-slate-800 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/40 transition-all duration-200">
                        <Search size={18} className="text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search student..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="outline-none text-sm w-52 placeholder:text-slate-400 bg-transparent text-slate-800 dark:text-slate-100"
                        />
                    </div>
                </div>
            </div>

            {/* Table card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden">

                <div className="h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500" />

                <div
                    className="ag-theme-quartz"
                    style={{ height: 580, width: '100%' }}
                >
                    <AgGridReact
                        rowData={filteredData}
                        columnDefs={colDefs}
                        defaultColDef={defaultColDef}
                        quickFilterText={searchInput}
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

                .ag-theme-quartz .ag-header-cell-text {
                    color: #64748b;
                }

                .ag-theme-quartz .ag-row {
                    border-bottom: 1px solid #f1f5f9 !important;
                    transition: background-color 0.15s ease;
                }

                .ag-theme-quartz .ag-row:hover {
                    background-color: #eef2ff !important;
                }

                .ag-theme-quartz .ag-cell {
                    color: #334155;
                    font-size: 13.5px;
                }

                .ag-theme-quartz .ag-paging-panel {
                    border-top: 1px solid #e2e8f0 !important;
                    padding: 12px 16px;
                    color: #64748b;
                    font-size: 13px;
                }

                .ag-theme-quartz .ag-paging-button {
                    border-radius: 6px;
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

                .dark .ag-theme-quartz .ag-header {
                    border-bottom: 1px solid #334155 !important;
                }

                .dark .ag-theme-quartz .ag-header-cell-text {
                    color: #94a3b8 !important;
                }

                .dark .ag-theme-quartz .ag-row {
                    border-bottom: 1px solid #334155 !important;
                }

                .dark .ag-theme-quartz .ag-row:hover {
                    background-color: #334155 !important;
                }

                .dark .ag-theme-quartz .ag-cell {
                    color: #e2e8f0 !important;
                }

                .dark .ag-theme-quartz .ag-paging-panel {
                    border-top: 1px solid #334155 !important;
                    color: #94a3b8;
                }
            `}</style>
        </div>
    )
}

export default StudentListTable