"use client";
import React, { useEffect, useState } from "react";
import GlobalApi from "@/app/_services/GlobalApi";

const RISK_THRESHOLD = 75;

function Toast({ message, type = "success" }) {
  const bg = type === "error" ? "bg-red-600" : type === "info" ? "bg-slate-700" : "bg-green-600";
  const icon = type === "error" ? "❌" : type === "info" ? "ℹ️" : "✅";
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 ${bg} text-white text-sm font-semibold px-6 py-3 rounded-xl shadow-lg animate-fade-in`}>
      {icon} {message}
    </div>
  );
}

function StudentCard({ student, onSendNotification, sent, sending }) {
  const needsMore = Math.max(0, RISK_THRESHOLD - student.percentage);

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
  teacherMode = false,
  token = "",
}) {
  const [atRiskStudents, setAtRiskStudents] = useState([]);
  const [sentNotifications, setSentNotifications] = useState({});
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null);

  const blockNumber = weekRange ? Math.ceil(weekRange.weekStart / 7) : null;
  const storageKey = `sent_${selectedMonth}_block_${blockNumber}_${token || "admin"}`;

  useEffect(() => {
    if (typeof window === "undefined" || !selectedMonth || !blockNumber) return;
    const saved = localStorage.getItem(storageKey);
    setSentNotifications(saved ? JSON.parse(saved) : {});
  }, [storageKey, selectedMonth, blockNumber]);

  useEffect(() => {
    if (!show || !attendanceList || !weekRange) return;
    calculateRiskStudents();
    // eslint-disable-next-line
  }, [show, attendanceList, weekRange]);

  // ✅ Reads the attendance map: { "1":"P", "2":"A", ... }
  const calculateRiskStudents = () => {
    if (!Array.isArray(attendanceList) || !weekRange) return;
    const { weekStart, weekEnd } = weekRange;
    const totalDays = weekEnd - weekStart + 1;

    const riskList = attendanceList
      .map((s) => {
        // ✅ FIX: Safely grab the true ID regardless of what the API named it
        const trueId = s.studentId || s._id || s.id;
        if (!trueId) return null;

        const map = s.attendance || {};
        let presentDays = 0;
        const presentDaysList = [];
        for (let d = weekStart; d <= weekEnd; d++) {
          if (map[String(d)] === "P") {
            presentDays += 1;
            presentDaysList.push(d);
          }
        }
        const percentage = Math.round((presentDays / totalDays) * 100);
        return {
          studentId: trueId, // 👈 Use the safe ID here
          name: s.name,
          grade: s.grade,
          presentDays,
          presentDaysList,
          totalDays,
          weekStart,
          weekEnd,
          percentage,
        };
      })
      .filter(Boolean)
      .filter((s) => s.percentage < RISK_THRESHOLD)
      .sort((a, b) => a.percentage - b.percentage);

    setAtRiskStudents(riskList);
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const buildMessage = (student) =>
    `Dear Parent, your child ${student.name} has ${student.percentage}% attendance (${student.presentDays}/${student.totalDays} days present) in days ${weekRange.weekStart}-${weekRange.weekEnd} of ${selectedMonth}. This is below the required 75% threshold. Please ensure regular attendance.`;

  // ✅ One notification per student; teacher mode uses token route
  const onSendNotification = async (student) => {
    setSending(true);
    try {
      const payload = {
        studentId: student.studentId, // This is now guaranteed to be the correct ID
        message: buildMessage(student),
        blockNumber,
        weekStart: weekRange.weekStart,
        weekEnd: weekRange.weekEnd,
        type: "attendance",
      };

      let alreadySent = false;

      if (teacherMode) {
        const resp = await GlobalApi.SaveTeacherPublicNotification(token, payload);
        alreadySent = !!resp?.data?.alreadySent;
      } else {
        const response = await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result?.error || `HTTP ${response.status}`);
        alreadySent = !!result.alreadySent;
      }

      const newSent = { ...sentNotifications, [student.studentId]: true };
      setSentNotifications(newSent);
      try { localStorage.setItem(storageKey, JSON.stringify(newSent)); } catch {}

      if (alreadySent) {
        showToast(`Already sent for ${student.name} this block.`, "info");
      } else {
        showToast(`Notification sent to ${student.name}'s parent!`);
        const allDone = atRiskStudents.every((s) => newSent[s.studentId]);
        if (allDone && onHide) setTimeout(() => onHide(), 3200);
      }
    } catch (err) {
      console.error("Failed to send notification:", err);
      showToast(err.message || "Failed to send notification", "error");
    } finally {
      setSending(false);
    }
  };

  // ✅ Send All — one request per unsent student, one summary toast
  const onSendAll = async () => {
    const pending = atRiskStudents.filter((s) => !sentNotifications[s.studentId]);
    if (pending.length === 0) {
      showToast("All notifications already sent.", "info");
      return;
    }
    setSending(true);
    let ok = 0;
    let fail = 0;
    for (const student of pending) {
      try {
        const payload = {
          studentId: student.studentId, // This is now guaranteed to be the correct ID
          message: buildMessage(student),
          blockNumber,
          weekStart: weekRange.weekStart,
          weekEnd: weekRange.weekEnd,
          type: "attendance",
        };
        if (teacherMode) {
          await GlobalApi.SaveTeacherPublicNotification(token, payload);
        } else {
          const res = await fetch("/api/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
        }
        setSentNotifications((prev) => {
          const next = { ...prev, [student.studentId]: true };
          try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
          return next;
        });
        ok++;
      } catch (e) {
        console.error("Send-all failed for", student.name, e);
        fail++;
      }
    }
    setSending(false);
    if (ok && !fail) showToast(`Sent ${ok} notification${ok === 1 ? "" : "s"}.`);
    else if (ok && fail) showToast(`Sent ${ok}, failed ${fail}.`, "info");
    else if (fail) showToast(`Failed to send ${fail} notification${fail === 1 ? "" : "s"}.`, "error");
  };

  if (!show || atRiskStudents.length === 0) return null;

  const unsentCount = atRiskStudents.filter((s) => !sentNotifications[s.studentId]).length;

  return (
    <>
      {toast && <Toast message={toast.msg} type={toast.type} />}
      <div className="my-5">
        <div className="flex items-center justify-between mb-4 p-4 bg-red-50 border border-red-300 rounded-xl">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚠️</span>
            <div>
              <h2 className="text-lg font-bold text-red-700">
                At-Risk Students ({atRiskStudents.length})
              </h2>
              <p className="text-sm text-red-500">
                Days {weekRange?.weekStart}–{weekRange?.weekEnd} · Block {blockNumber} · Below 75% attendance
              </p>
            </div>
          </div>
          {unsentCount > 0 && (
            <button
              onClick={onSendAll}
              disabled={sending}
              className="bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-all disabled:opacity-50"
            >
              {sending ? "Sending..." : `📱 Send All (${unsentCount})`}
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