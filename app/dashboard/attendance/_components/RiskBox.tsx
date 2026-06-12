"use client";
import React, { useEffect, useState } from "react";

const RISK_THRESHOLD = 75;

function Toast({ message }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-sm font-semibold px-6 py-3 rounded-xl shadow-lg animate-fade-in">
      ✅ {message}
    </div>
  );
}

function StudentCard({ student, onSendNotification, sent, sending }) {
  const needsMore = RISK_THRESHOLD - student.percentage;

  return (
    <div className="bg-white rounded-xl p-4 border border-red-200 shadow-sm mb-3">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-red-600 font-bold text-lg">
              {student.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-bold text-slate-800">{student.name}</p>
            <p className="text-xs text-slate-400">{student.grade}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-red-600">
            {student.percentage}%
          </span>
          <p className="text-xs text-slate-400">
            {student.presentDays}/{student.totalDays} days present
          </p>
        </div>
      </div>

      <div className="relative h-3 bg-slate-200 rounded-full overflow-hidden mb-1">
        <div
          className="h-full rounded-full bg-red-500 transition-all"
          style={{ width: `${student.percentage}%` }}
        />
        <div
          className="absolute top-0 h-full w-0.5 bg-orange-400"
          style={{ left: "75%" }}
        />
      </div>
      <div className="flex justify-between text-xs text-slate-400 mb-2">
        <span>0%</span>
        <span className="text-orange-500 font-semibold">75% required</span>
        <span>100%</span>
      </div>

      <div className="flex gap-1 flex-wrap mt-2">
        {Array.from(
          { length: student.weekEnd - student.weekStart + 1 },
          (_, i) => student.weekStart + i
        ).map((day) => (
          <div
            key={day}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
              student.presentDaysList.includes(day)
                ? "bg-green-500 text-white"
                : "bg-gray-200 text-gray-500"
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2 bg-red-50 rounded-lg p-2">
        <span>⚠️</span>
        <p className="text-xs text-red-600 font-medium">
          Needs {needsMore}% more to reach 75% threshold
        </p>
      </div>

      {sent ? (
        <div className="mt-3 flex items-center gap-2 bg-green-50 rounded-lg p-2">
          <span>✅</span>
          <p className="text-xs text-green-600 font-medium">
            Notification sent to parent successfully!
          </p>
        </div>
      ) : (
        <button
          onClick={() => onSendNotification(student)}
          disabled={sending}
          className="mt-3 w-full bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-all disabled:opacity-50"
        >
          {sending ? "Sending..." : "📱 Send Notification to Parent"}
        </button>
      )}
    </div>
  );
}

export default function RiskBox({
  attendanceList,
  selectedMonth,
  weekRange,
  show,
  onHide,
}) {
  const [atRiskStudents, setAtRiskStudents] = useState([]);
  const [sentNotifications, setSentNotifications] = useState({});
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null);

  const blockNumber = weekRange ? Math.ceil(weekRange.weekStart / 7) : null;
  const storageKey = `sent_${selectedMonth}_block_${blockNumber}`;

  useEffect(() => {
    if (typeof window === "undefined" || !selectedMonth || !blockNumber) return;
    const saved = localStorage.getItem(storageKey);
    setSentNotifications(saved ? JSON.parse(saved) : {});
  }, [storageKey]);

  useEffect(() => {
    if (!show || !attendanceList || !weekRange) return;
    calculateRiskStudents();
  }, [show, attendanceList, weekRange]);

  const calculateRiskStudents = () => {
    if (!Array.isArray(attendanceList) || !weekRange) return;
    const { weekStart, weekEnd } = weekRange;
    const totalDays = weekEnd - weekStart + 1;

    const studentMap = {};
    attendanceList.forEach((item) => {
      if (!item.studentId) return;
      if (!studentMap[item.studentId]) {
        studentMap[item.studentId] = {
          studentId: item.studentId,
          name: item.name,
          grade: item.grade,
          presentDays: 0,
          presentDaysList: [],
          totalDays,
          weekStart,
          weekEnd,
        };
      }
      if (
        (item.present === true || item.present === 1) &&
        Number(item.day) >= weekStart &&
        Number(item.day) <= weekEnd
      ) {
        studentMap[item.studentId].presentDays += 1;
        studentMap[item.studentId].presentDaysList.push(Number(item.day));
      }
    });

    const riskList = Object.values(studentMap)
      .map((s) => ({
        ...s,
        percentage: Math.round((s.presentDays / totalDays) * 100),
      }))
      .filter((s) => s.percentage < RISK_THRESHOLD)
      .sort((a, b) => a.percentage - b.percentage);

    setAtRiskStudents(riskList);
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const onSendNotification = async (student) => {
    setSending(true);
    try {
      const message = `Dear Parent, your child ${student.name} has ${student.percentage}% attendance (${student.presentDays}/${student.totalDays} days present) in days ${weekRange.weekStart}-${weekRange.weekEnd} of ${selectedMonth}. This is below the required 75% threshold. Please ensure regular attendance.`;

      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.studentId,
          message,
          blockNumber,
          weekStart: weekRange.weekStart,
          weekEnd: weekRange.weekEnd,
        }),
      });

      const result = await response.json();

      if (response.ok && !result.alreadySent) {
        const newSent = { ...sentNotifications, [student.studentId]: true };
        setSentNotifications(newSent);
        localStorage.setItem(storageKey, JSON.stringify(newSent));
        showToast(`Notification sent to ${student.name}'s parent successfully!`);

        const allDone = atRiskStudents.every((s) => newSent[s.studentId]);
        if (allDone && onHide) {
          setTimeout(() => onHide(), 3200);
        }
      } else if (result.alreadySent) {
        showToast(`Already sent for ${student.name} this block.`);
      }
    } catch (err) {
      console.error("Failed to send notification:", err);
    } finally {
      setSending(false);
    }
  };

  const onSendAll = async () => {
    for (const student of atRiskStudents) {
      if (!sentNotifications[student.studentId]) {
        await onSendNotification(student);
      }
    }
  };

  if (!show || atRiskStudents.length === 0) return null;

  const unsentCount = atRiskStudents.filter(
    (s) => !sentNotifications[s.studentId]
  ).length;

  return (
    <>
      {toast && <Toast message={toast} />}
      <div className="my-5">
        <div className="flex items-center justify-between mb-4 p-4 bg-red-50 border border-red-300 rounded-xl">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚠️</span>
            <div>
              <h2 className="text-lg font-bold text-red-700">
                At-Risk Students ({atRiskStudents.length})
              </h2>
              <p className="text-sm text-red-500">
                Days {weekRange?.weekStart}–{weekRange?.weekEnd} · Block{" "}
                {blockNumber} · Below 75% attendance
              </p>
            </div>
          </div>
          {unsentCount > 0 && (
            <button
              onClick={onSendAll}
              disabled={sending}
              className="bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-all disabled:opacity-50"
            >
              {sending ? "Sending..." : "📱 Send All"}
            </button>
          )}
        </div>

        {atRiskStudents.map((student) => (
          <StudentCard
            key={student.studentId}
            student={student}
            onSendNotification={onSendNotification}
            sent={!!sentNotifications[student.studentId]}
            sending={sending}
          />
        ))}
      </div>
    </>
  );
}