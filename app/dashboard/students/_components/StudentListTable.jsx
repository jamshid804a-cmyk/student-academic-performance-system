"use client"

import React, { useEffect, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import '@/utils/agGrid'
import { Search, Trash } from 'lucide-react'
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

const pagination = true
const paginationPageSize = 10
const paginationPageSizeSelector = [10, 20, 25, 100]

function StudentListTable({ StudentList, refreshData }) {
    const [rowData, setRowData] = useState([])
    const [searchInput, setSearchInput] = useState("")

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

    const CustomButtons = (props) => {
        return (
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <span>
                        <Button size='sm' variant='destructive'>
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
        )
    }

    const RiskBadge = (props) => {
        const isRisk = props.value === "at-risk"
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isRisk ? "bg-red-100 text-red-600 border border-red-300" : "bg-green-100 text-green-600 border border-green-300"}`}>
                {isRisk ? "At Risk" : "Safe"}
            </span>
        )
    }

    const [colDefs] = useState([
        { field: "id", filter: true, width: 90 },
        { field: "name", filter: true, flex: 1 },
        { field: "grade", filter: true, width: 120 },
        { field: "gpa", filter: true, width: 120 },
        { field: "cgpa", filter: true, width: 120 },
        { field: "risk", filter: true, cellRenderer: RiskBadge, width: 130 },
        { field: "contact", filter: true, flex: 1 },
        { field: "address", filter: true, flex: 1 },
        { field: "action", cellRenderer: CustomButtons, width: 100 }
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
        </div>
    )
}

export default StudentListTable