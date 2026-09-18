"use client"
import React, { useEffect, useState, useMemo, useRef, useCallback } from "react"
import { AgGridReact } from "ag-grid-react"
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community"
import GlobalApi from "@/app/_services/GlobalApi"
import AttendanceCell from "./AttendanceCell"

ModuleRegistry.registerModules([AllCommunityModule])

const monthNameToNumber = (name) => {
  const map = {
    January: "01", February: "02", March: "03", April: "04",
    May: "05", June: "06", July: "07", August: "08",
    September: "09", October: "10", November: "11", December: "12",
  }
  return map[name] || "01"
}

const getDaysInMonth = (monthName, year = new Date().getFullYear()) => {
  const m = Number(monthNameToNumber(monthName))
  return new Date(year, m, 0).getDate()
}

export default function AttendanceGrid({
  attendanceList,
  selectedMonth,
  selectedGrade,
  selectedSection,
  selectedSession,
  onAttendanceChange,
  onWeekComplete,
}) {
  const [rowData, setRowData] = useState([])
  const onChangeRef = useRef(null)

  const monthKey = useMemo(() => {
    if (!selectedMonth) return ""
    return `${monthNameToNumber(selectedMonth)}/${new Date().getFullYear()}`
  }, [selectedMonth])

  const daysInMonth = useMemo(
    () => (selectedMonth ? getDaysInMonth(selectedMonth) : 31),
    [selectedMonth]
  )

  // Handle cell click — save immediately, optimistic update
  const handleCellChange = useCallback(
    async (studentId, day, status) => {
      // Instant UI update
      setRowData((prev) =>
        prev.map((r) =>
          r.studentId === studentId ? { ...r, [`d${day}`]: status } : r
        )
      )

      try {
        await GlobalApi.SaveAttendance({
          studentId,
          day,
          date: monthKey,
          status,
        })

        if (onWeekComplete) {
          const lastDayOfWeek = Math.min(Math.ceil(day / 7) * 7, daysInMonth)
          const firstDayOfWeek = Math.floor((day - 1) / 7) * 7 + 1
          if (day === lastDayOfWeek) {
            onWeekComplete({ weekStart: firstDayOfWeek, weekEnd: lastDayOfWeek })
          }
        }

        if (onAttendanceChange) onAttendanceChange()
      } catch (err) {
        console.error("Save attendance error:", err)
      }
    },
    [monthKey, daysInMonth, onWeekComplete, onAttendanceChange]
  )

  useEffect(() => {
    onChangeRef.current = handleCellChange
  }, [handleCellChange])

  // Cell renderer — uses ref so the grid doesn't re-create on every change
  const CellRenderer = useCallback(
    (params) => (
      <AttendanceCell
        value={params.value}
        studentId={params.data.studentId}
        day={Number(params.colDef.field.slice(1))}
        onChange={(sid, day, status) => onChangeRef.current(sid, day, status)}
      />
    ),
    []
  )

  const colDefs = useMemo(() => {
    const base = [
      {
        field: "rollNo",
        headerName: "Roll No",
        width: 85,
        pinned: "left",
        cellStyle: {
          display: "flex",
          alignItems: "center",
          fontWeight: "600",
        },
      },
      {
        field: "name",
        headerName: "Student Name",
        width: 190,
        pinned: "left",
        cellStyle: {
          display: "flex",
          alignItems: "center",
        },
      },
    ]
    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1
      return {
        field: `d${day}`,
        headerName: String(day),
        width: 44,
        minWidth: 44,
        maxWidth: 44,
        cellRenderer: CellRenderer,
        sortable: false,
        resizable: false,
        cellStyle: {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
        },
      }
    })
    return [...base, ...days]
  }, [daysInMonth, CellRenderer])

  useEffect(() => {
    if (!attendanceList) return
    const rows = attendanceList.map((s) => {
      const row = {
        studentId: s.studentId,
        rollNo: s.rollNo,
        name: s.name,
      }
      for (let d = 1; d <= daysInMonth; d++) {
        row[`d${d}`] = s.attendance?.[String(d)] || null
      }
      return row
    })
    setRowData(rows)
  }, [attendanceList, daysInMonth])

  if (rowData.length === 0) {
    return (
      <div className="ag-theme-quartz rounded-xl bg-white border" style={{ height: 400 }}>
        <div className="flex items-center justify-center h-full text-gray-400 text-lg">
          No students found for these filters.
        </div>
      </div>
    )
  }

  return (
    <div className="ag-theme-quartz rounded-xl overflow-hidden border shadow-sm" style={{ height: 560, width: "100%" }}>
      <AgGridReact
        rowData={rowData}
        columnDefs={colDefs}
        rowHeight={44}
        headerHeight={44}
        suppressCellFocus
        animateRows={false}
        suppressColumnVirtualisation={false}
      />
    </div>
  )
}