"use client"

import React, { useEffect, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import '@/utils/agGrid'
import { Search, Trash, Eye, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

    // View dialog state
    const [selectedStudent, setSelectedStudent] = useState(null)
    const [viewOpen, setViewOpen] = useState(false)

    // Edit dialog state
    const [editStudent, setEditStudent] = useState(null)
    const [editOpen, setEditOpen] = useState(false)

    useEffect(() => {
        if (StudentList) setRowData(StudentList)
    }, [StudentList])

    const DeleteRecord = async (id) => {
        try {
            const resp = await GlobalApi.DeleteStudentRecord(id)
            if (resp) {
                toast.success("Record Deleted Successfully")
                refreshData()
            }
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
            <div className="flex items-center gap-2 h-full">
                {/* View */}
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleView(props?.data)}
                    title="View details"
                >
                    <Eye size={16} className="text-blue-600" />
                </Button>

                {/* Edit */}
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditClick(props?.data)}
                    title="Edit student"
                >
                    <Pencil size={16} className="text-yellow-600" />
                </Button>

                {/* Delete */}
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <span>
                            <Button size="sm" variant="destructive" title="Delete student">
                                <Trash size={16} />
                            </Button>
                        </span>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>You want to?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Delete this student permanently.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => DeleteRecord(props?.data?.id)}>
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        )
    }

    const [colDefs] = useState([
        { field: "id", headerName: "ID", filter: true, width: 80 },
        { field: "name", headerName: "Student Name", filter: true, flex: 1 },
        { field: "fatherName", headerName: "Father Name", filter: true, flex: 1 },
        { field: "admissionNo", headerName: "Admission No", filter: true, width: 140 },
        { field: "rollNo", headerName: "Roll No", filter: true, width: 110 },
        { field: "grade", headerName: "Grade", filter: true, width: 100 },
        { field: "section", headerName: "Section", filter: true, width: 100 },
        { field: "session", headerName: "Session", filter: true, width: 130 },
        { field: "contact", headerName: "Contact No", filter: true, width: 140 },
        {
            field: "fee",
            headerName: "Fee",
            filter: true,
            width: 110,
            valueFormatter: (params) => (params.value ? `Rs. ${params.value}` : "N/A"),
        },
        { field: "action", headerName: "Action", cellRenderer: CustomButtons, width: 160 },
    ])

    return (
        <div className="my-8">
            <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">Student Records</h2>
                <div className="flex items-center gap-2 border rounded-xl px-3 py-2 shadow-sm bg-white">
                    <Search size={18} className="text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search student..."
                        className="outline-none text-sm w-48"
                        onChange={(e) => setSearchInput(e.target.value)}
                    />
                </div>
            </div>
            <div className="ag-theme-quartz rounded-xl overflow-hidden shadow-md border bg-white" style={{ height: 520 }}>
                <AgGridReact
                    rowData={rowData}
                    columnDefs={colDefs}
                    quickFilterText={searchInput}
                    pagination={pagination}
                    paginationPageSize={paginationPageSize}
                    paginationPageSizeSelector={paginationPageSizeSelector}
                    rowHeight={50}
                />
            </div>

            {/* View dialog */}
            <StudentDetailsDialog
                student={selectedStudent}
                open={viewOpen}
                onOpenChange={setViewOpen}
            />

            {/* Edit dialog */}
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