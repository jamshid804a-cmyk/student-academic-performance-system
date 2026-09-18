"use client"

import React, { useEffect, useState, useMemo } from 'react'
import { AgGridReact } from 'ag-grid-react'
import '@/utils/agGrid'
import { Search, Trash2, Eye, Pencil, Users } from 'lucide-react'
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

function StudentListTable({ StudentList, refreshData }) {
    const [rowData, setRowData] = useState([])
    const [searchInput, setSearchInput] = useState("")
    const [selectedStudent, setSelectedStudent] = useState(null)
    const [viewOpen, setViewOpen] = useState(false)
    const [editStudent, setEditStudent] = useState(null)
    const [editOpen, setEditOpen] = useState(false)

    useEffect(() => {
        if (StudentList) setRowData(StudentList)
    }, [StudentList])

    const DeleteRecord = async (id) => {
        try {
            await GlobalApi.DeleteStudentRecord(id)
            toast.success("Record Deleted Successfully")
            refreshData()
        } catch (error) {
            console.log(error)
            toast.error("Delete failed")
        }
    }

    const handleView = (data) => {
        setSelectedStudent(data)
        setViewOpen(true)
    }

    const handleEditClick = (data) => {
        setEditStudent(data)
        setEditOpen(true)
    }

    const CustomButtons = (props) => {
        return (
            <div className="flex items-center gap-1.5 h-full">
                <button
                    onClick={() => handleView(props?.data)}
                    title="View details"
                    className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors"
                >
                    <Eye size={15} />
                </button>

                <button
                    onClick={() => handleEditClick(props?.data)}
                    title="Edit student"
                    className="w-8 h-8 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 flex items-center justify-center transition-colors"
                >
                    <Pencil size={15} />
                </button>

                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <button
                            title="Delete student"
                            className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-colors"
                        >
                            <Trash2 size={15} />
                        </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete this student?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently remove the student from the system.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
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
    }

    const colDefs = useMemo(() => [
        // 1. ID (numeric)
        {
            field: "id",
            headerName: "ID",
            width: 70,
            filter: true,
            valueGetter: (params) => {
                const v = params.data?.id
                if (typeof v === "number") return v
                // If id missing, fall back to a short hash of _id
                return v ? String(v).slice(-4) : ""
            },
        },

        // 2. Roll No
        { field: "rollNo", headerName: "Roll No", filter: true, width: 100 },

        // 3. Admission No
        { field: "admissionNo", headerName: "Admission No", filter: true, width: 150 },

        // 4. Student Name
        {
            field: "name",
            headerName: "Student Name",
            filter: true,
            minWidth: 180,
            flex: 2,
            wrapText: true,
            autoHeight: true,
            cellStyle: { whiteSpace: 'normal', lineHeight: '1.3' },
        },

        // 5. Father Name
        {
            field: "fatherName",
            headerName: "Father Name",
            filter: true,
            minWidth: 180,
            flex: 2,
            wrapText: true,
            autoHeight: true,
            cellStyle: { whiteSpace: 'normal', lineHeight: '1.3' },
        },

        // 6. Grade
        { field: "grade", headerName: "Grade", filter: true, width: 100 },

        // 7. Section
        { field: "section", headerName: "Section", filter: true, width: 100 },

        // 8. Session
        { field: "session", headerName: "Session", filter: true, width: 130 },

        // 9. Contact
        { field: "contact", headerName: "Contact No", filter: true, width: 150 },

        // 10. Fee
        {
            field: "fee",
            headerName: "Fee",
            filter: true,
            width: 110,
            valueFormatter: (params) => (params.value ? `Rs. ${params.value}` : "N/A"),
        },

        // 11. Actions
        {
            field: "action",
            headerName: "Action",
            cellRenderer: CustomButtons,
            width: 150,
            pinned: "right",
            sortable: false,
            filter: false,
        },
    ], [])

    return (
        <div className="my-8">

            {/* Header */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
                        <Users size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Student Records</h2>
                        <p className="text-xs text-gray-500">
                            {rowData.length} {rowData.length === 1 ? "student" : "students"} in total
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 shadow-sm bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition">
                    <Search size={18} className="text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search student..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="outline-none text-sm w-52 placeholder:text-gray-400"
                    />
                </div>
            </div>

            {/* Table */}
            <div
                className="ag-theme-quartz rounded-2xl overflow-hidden shadow-lg border border-gray-100 bg-white"
                style={{ height: 580 }}
            >
                <AgGridReact
                    rowData={rowData}
                    columnDefs={colDefs}
                    quickFilterText={searchInput}
                    pagination={pagination}
                    paginationPageSize={paginationPageSize}
                    paginationPageSizeSelector={paginationPageSizeSelector}
                    defaultColDef={{
                        resizable: true,
                        sortable: true,
                    }}
                    rowHeight={55}
                    headerHeight={48}
                />
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
            />
        </div>
    )
}

export default StudentListTable