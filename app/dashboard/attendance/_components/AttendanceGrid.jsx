"use client"
import React, { useEffect, useState, useMemo, useRef, useCallback } from "react"
import { AgGridReact } from "ag-grid-react"
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community"
import GlobalApi from "@/app/_services/GlobalApi"
import AttendanceCell from "./AttendanceCell"
import { Calendar, Users } from "lucide-react"

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

// ─── Daily % summary cell (pinned top row) ───────────────
const DaySummaryCell = ({ value }) => {
  if (!value || value.marked === 0) {
    return (
      <div
        className="flex items-center justify-center h-full text-[10px] text-slate-300 dark:text-slate-600"
        title="No attendance marked yet"
      >
        —
      </div>
    )
  }

  const { p, a, l, marked } = value
  const presentPct = Math.round((p / marked) * 100)

  let colorClass = "text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-300"
  if (presentPct >= 90) {
    colorClass = "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-300"
  } else if (presentPct >= 75) {
    colorClass = "text-teal-700 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-300"
  } else if (presentPct >= 50) {
    colorClass = "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300"
  }

  const tooltip = `Present: ${p} (${presentPct}%) · Absent: ${a} · Leave: ${l} · Marked: ${marked}`

  return (
    <div className="flex items-center justify-center h-full" title={tooltip}>
      <span className={`text-[10px] font-bold px-1.5 py-1 rounded-md ${colorClass}`}>
        {presentPct}%
      </span>
    </div>
  )
}

export default function AttendanceGrid({
  attendanceList,
  selectedMonth,
  onWeekComplete,
  onAttendanceChange,
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

  const handleCellChange = useCallback(
    async (studentId, day, status) => {
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

  // ─── Cell renderer: normal editable cell for data rows,
  //     percentage summary for the pinned top row ───────
  const CellRenderer = useCallback((params) => {
    if (params.node.rowPinned) {
      return <DaySummaryCell value={params.value} />
    }
    return (
      <AttendanceCell
        value={params.value}
        studentId={params.data.studentId}
        day={Number(params.colDef.field.slice(1))}
        onChange={(sid, day, status) => onChangeRef.current(sid, day, status)}
      />
    )
  }, [])

  const colDefs = useMemo(() => {
    const base = [
      {
        field: "rollNo",
        headerName: "Roll No",
        width: 90,
        pinned: "left",
        cellStyle: {
          display: "flex",
          alignItems: "center",
          fontWeight: "600",
          color: "#6366f1",
        },
      },
      {
        field: "name",
        headerName: "Student Name",
        width: 200,
        pinned: "left",
        cellStyle: {
          display: "flex",
          alignItems: "center",
          fontWeight: "600",
        },
      },
    ]

    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1
      return {
        field: `d${day}`,
        headerName: String(day),
        width: 52,
        minWidth: 52,
        maxWidth: 52,
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

  // ─── Pinned top row: daily P/A/L percentage summary ────
  const summaryRow = useMemo(() => {
    if (rowData.length === 0) return []

    const row = {
      studentId: "__summary__",
      rollNo: "",
      name: "Daily %",
    }

    for (let d = 1; d <= daysInMonth; d++) {
      let p = 0, a = 0, l = 0
      rowData.forEach((r) => {
        const v = r[`d${d}`]
        if (v === "P") p++
        else if (v === "A") a++
        else if (v === "L") l++
      })
      const marked = p + a + l
      row[`d${d}`] = { p, a, l, marked }
    }

    return [row]
  }, [rowData, daysInMonth])

  const monthLabel = selectedMonth
    ? `${selectedMonth} ${new Date().getFullYear()}`
    : ""

  if (rowData.length === 0) {
    return (
      <div className="animate-page-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md">
            <Calendar size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              Attendance Sheet
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No students found for these filters
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 p-12 text-center text-slate-400 dark:text-slate-500">
          <Users size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-base font-medium">No students match your filters</p>
          <p className="text-sm mt-1">Try changing Grade, Section, or Session</p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-page-in">

      {/* Header card */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform duration-300">
            <Calendar size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              Attendance Sheet
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {monthLabel} · {rowData.length} {rowData.length === 1 ? "student" : "students"}
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Legend</span>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center">P</div>
            <span className="text-xs text-slate-600 dark:text-slate-300">Present</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-md bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center">A</div>
            <span className="text-xs text-slate-600 dark:text-slate-300">Absent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-700 font-bold text-xs flex items-center justify-center">L</div>
            <span className="text-xs text-slate-600 dark:text-slate-300">Leave</span>
          </div>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden">

        {/* Top accent bar */}
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

        <div
          className="ag-theme-quartz"
          style={{ height: 560, width: "100%" }}
        >
          <AgGridReact
            rowData={rowData}
            columnDefs={colDefs}
            pinnedTopRowData={summaryRow}
            rowHeight={52}
            headerHeight={52}
            suppressCellFocus
            animateRows={true}
          />
        </div>
      </div>

      <style jsx global>{`
        /* ─── AG Grid polish for attendance ─────────── */
        .ag-theme-quartz {
          --ag-font-family: var(--font-inter), system-ui, sans-serif;
          --ag-font-size: 14px;
          --ag-border-color: #e2e8f0;
          --ag-header-background-color: #f8fafc;
          --ag-header-foreground-color: #475569;
          --ag-odd-row-background-color: #ffffff;
          --ag-even-row-background-color: #fafbfc;
          --ag-row-hover-color: #ecfdf5;
          --ag-borders: none;
        }

        .ag-theme-quartz .ag-header {
          border-bottom: 1px solid #e2e8f0 !important;
        }

        .ag-theme-quartz .ag-header-cell-text {
          color: #64748b;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.05em;
        }

        .ag-theme-quartz .ag-row {
          border-bottom: 1px solid #f1f5f9 !important;
          transition: background-color 0.15s ease;
        }

        .ag-theme-quartz .ag-row:hover {
          background-color: #ecfdf5 !important;
        }

        .ag-theme-quartz .ag-cell {
          color: #334155;
        }

        /* Pinned summary row styling */
        .ag-theme-quartz .ag-floating-top {
          background: #f8fafc;
          border-bottom: 2px solid #e2e8f0 !important;
        }

        /* Pinned columns get a subtle divider */
        .ag-theme-quartz .ag-pinned-left-cols-container {
          border-right: 2px solid #e2e8f0;
          box-shadow: 4px 0 8px -4px rgba(0, 0, 0, 0.06);
        }

        /* ─── Dark mode ─────────────────── */
        .dark .ag-theme-quartz {
          --ag-border-color: #334155;
          --ag-header-background-color: #0f172a;
          --ag-header-foreground-color: #cbd5e1;
          --ag-odd-row-background-color: #1e293b;
          --ag-even-row-background-color: #1a2536;
          --ag-row-hover-color: #134e4a;
          --ag-foreground-color: #f1f5f9;
        }

        .dark .ag-theme-quartz .ag-floating-top {
          background: #0f172a;
          border-bottom: 2px solid #334155 !important;
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
          background-color: #134e4a !important;
        }

        .dark .ag-theme-quartz .ag-cell {
          color: #e2e8f0 !important;
        }

        .dark .ag-theme-quartz .ag-pinned-left-cols-container {
          border-right: 2px solid #334155;
          box-shadow: 4px 0 8px -4px rgba(0, 0, 0, 0.4);
        }
      `}</style>
    </div>
  )
}