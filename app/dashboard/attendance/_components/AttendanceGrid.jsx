"use client";

import React, { useEffect, useState, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import GlobalApi from "@/app/_services/GlobalApi";

ModuleRegistry.registerModules([AllCommunityModule]);

const getTotalDays = (selectedMonth) => {
  if (!selectedMonth) return 31;
  try {
    if (selectedMonth.includes("/")) {
      const [month, year] = selectedMonth.split("/");
      return new Date(year, Number(month), 0).getDate();
    } else {
      const d = new Date(selectedMonth + " 1");
      return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    }
  } catch {
    return 31;
  }
};

const getWeekLastDay = (day, totalDays) => {
  const weekEnd = Math.ceil(day / 7) * 7;
  return Math.min(weekEnd, totalDays);
};

const getWeekStartDay = (day) => {
  return Math.floor((day - 1) / 7) * 7 + 1;
};

const CheckboxRenderer = (props) => {
  const [checked, setChecked] = useState(!!props.value);

  useEffect(() => {
    setChecked(!!props.value);
  }, [props.value]);

  const handleChange = (e) => {
    e.stopPropagation();
    const newValue = !checked;
    setChecked(newValue);
    const onCheckboxChange = props.context?.onCheckboxChange;
    if (onCheckboxChange) {
      onCheckboxChange(props.data.studentId, props.colDef.field, newValue);
    }
  };

  return (
    <div
      onClick={handleChange}
      style={{
        width: 20,
        height: 20,
        border: checked ? "2px solid #2563eb" : "2px solid #94a3b8",
        borderRadius: 4,
        backgroundColor: checked ? "#2563eb" : "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        marginTop: 7,
        transition: "all 0.15s ease",
      }}
    >
      {checked && (
        <svg
          viewBox="0 0 12 12"
          width="13"
          height="13"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="1,6 4,10 11,2" />
        </svg>
      )}
    </div>
  );
};

export default function AttendanceGrid({
  attendanceList,
  selectedMonth,
  onWeekComplete,
  onAttendanceChange,
}) {
  const [rowData, setRowData] = useState([]);
  const [colDefs, setColDefs] = useState([]);

  const getDaysArray = () => {
    if (!selectedMonth) return [];
    const totalDays = getTotalDays(selectedMonth);
    return Array.from({ length: totalDays }, (_, i) => i + 1);
  };

  const isPresent = (studentId, day) => {
    if (!Array.isArray(attendanceList)) return false;
    return attendanceList.some(
      (item) =>
        Number(item.day) === Number(day) &&
        Number(item.studentId) === Number(studentId) &&
        (item.present === 1 || item.present === true || item.present === "1")
    );
  };

  const getUniqueRecord = () => {
    const uniqueRecord = [];
    const existingUser = new Set();
    (Array.isArray(attendanceList) ? attendanceList : []).forEach((item) => {
      if (!existingUser.has(item.studentId)) {
        existingUser.add(item.studentId);
        uniqueRecord.push({
          studentId: Number(item.studentId),
          name: item.name,
          grade: item.grade,
        });
      }
    });
    return uniqueRecord;
  };

  const onCheckboxChange = useCallback(
    (studentId, dayField, present) => {
      const day = Number(dayField);
      if (!day || !studentId) return;

      const totalDays = getTotalDays(selectedMonth);
      const lastDayOfWeek = getWeekLastDay(day, totalDays);
      const firstDayOfWeek = getWeekStartDay(day);

      // Update local UI instantly
      setRowData((prev) =>
        prev.map((row) =>
          row.studentId === Number(studentId)
            ? { ...row, [day]: present }
            : row
        )
      );

      if (present) {
        GlobalApi.SaveAttendance({
          studentId: Number(studentId),
          day,
          date: selectedMonth,
          present: true,
        })
          .then((resp) => console.log("✅ Saved:", resp.data))
          .catch((err) => console.error("❌ Save error:", err));
      } else {
        GlobalApi.DeleteAttendance(studentId, day, selectedMonth)
          .then((resp) => console.log("✅ Deleted:", resp.data))
          .catch((err) => console.error("❌ Delete error:", err));
      }

      // Trigger RiskBox via page.js when last day of block is clicked
      if (day === lastDayOfWeek) {
        const range = { weekStart: firstDayOfWeek, weekEnd: lastDayOfWeek };
        if (onWeekComplete) onWeekComplete(range);
      }
    },
    [selectedMonth, onWeekComplete]
  );

  // Create columns
  useEffect(() => {
    if (!selectedMonth) return;
    const daysArrays = getDaysArray();
    const baseCols = [
      { field: "studentId", headerName: "Student ID", width: 120 },
      { field: "name", headerName: "Name", width: 180 },
    ];
    const dynamicCols = daysArrays.map((day) => ({
      field: day.toString(),
      headerName: day.toString(),
      width: 60,
      cellRenderer: CheckboxRenderer,
    }));
    setColDefs([...baseCols, ...dynamicCols]);
  }, [selectedMonth]);

  // Build rows from backend data
  useEffect(() => {
    if (!attendanceList || !selectedMonth) return;
    const daysArrays = getDaysArray();
    const userList = getUniqueRecord();
    const updatedList = userList.map((obj) => {
      const newObj = { ...obj };
      daysArrays.forEach((day) => {
        newObj[day] = isPresent(obj.studentId, day);
      });
      return newObj;
    });
    setRowData(updatedList);
  }, [attendanceList, selectedMonth]);

  return (
    <div className="ag-theme-quartz" style={{ height: 500, width: "100%" }}>
      {rowData.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-400 text-lg">
          No students found. Please select a grade and month.
        </div>
      ) : (
        <AgGridReact
          rowData={rowData}
          columnDefs={colDefs}
          context={{ onCheckboxChange }}
        />
      )}
    </div>
  );
}