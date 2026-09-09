"use client"

import React, { useEffect, useState } from 'react'

function RiskStudentsBox({ students }) {
  const [sentIds, setSentIds] = useState([])
  const [sendingId, setSendingId] = useState(null)
  const [toast, setToast] = useState(null)
  const [hiddenIds, setHiddenIds] = useState([])
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem("academic_sent_ids")
    if (saved) setSentIds(JSON.parse(saved))
    setHiddenIds([])
    setIsVisible(true)
  }, [])

  useEffect(() => {
    setHiddenIds([])
    setIsVisible(true)
  }, [students])

  // Ensure students is an array
  const studentList = Array.isArray(students) ? students : []

  const isAtRisk = (s) => {
    const gpa = Number(s.gpa || 0)
    const cgpa = Number(s.cgpa || 0)
    return (gpa < 2.5 && gpa !== 0) || (cgpa < 2.5 && cgpa !== 0)
  }

  // 🔥 FILTER EACH STUDENT INDIVIDUALLY - NO GROUPING
  const riskStudents = studentList.filter(isAtRisk)

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSendNotification = async (student) => {
    setSendingId(student.id)
    const contact = student.contact || student.phone || student.mobile || 'N/A'

    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          type: "academic",
          message: `Dear Parent, your child ${student.name} is academically at risk. CGPA: ${student.cgpa}, GPA: ${student.gpa}, Semester: ${student.grade}. Please meet with the academic advisor.`,
          name: student.name,
          cgpa: student.cgpa,
          gpa: student.gpa,
          semester: student.grade,
          contact: contact,
        }),
      })

      if (response.ok) {
        showToast(`✅ Notification sent for: ${student.name}`, false)

        if (!sentIds.includes(student.id)) {
          const newSentIds = [...sentIds, student.id]
          setSentIds(newSentIds)
          localStorage.setItem("academic_sent_ids", JSON.stringify(newSentIds))
        }

        setTimeout(() => {
          setHiddenIds(prev => [...prev, student.id])
          setIsVisible(true)
        }, 5000)

      } else {
        showToast(`⚠️ Failed to send notification for ${student.name}`, true)
      }

    } catch (err) {
      console.error(err)
      showToast("❌ Network error", true)
    } finally {
      setSendingId(null)
    }
  }

  const handleShowAll = () => {
    setHiddenIds([])
    setIsVisible(true)
    showToast("📋 All at-risk students are now visible again", false)
  }

  const handleToggleVisibility = () => {
    setIsVisible(!isVisible)
    showToast(isVisible ? "📦 Risk box hidden" : "🔓 Risk box shown", false)
  }

  const visibleRiskStudents = riskStudents.filter(s => !hiddenIds.includes(s.id))

  if (riskStudents.length === 0) return null

  if (visibleRiskStudents.length === 0 && hiddenIds.length > 0) {
    return (
      <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex justify-between items-center">
          <p className="text-green-700">✅ All at-risk students have been notified!</p>
          <button
            onClick={handleShowAll}
            className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg transition-all"
          >
            📋 Show All ({hiddenIds.length} hidden)
          </button>
        </div>
      </div>
    )
  }

  if (!isVisible) {
    return (
      <div className="mb-5">
        <button
          onClick={handleToggleVisibility}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all flex items-center gap-2"
        >
          🔓 Show Risk Box ({riskStudents.length} at-risk)
        </button>
      </div>
    )
  }

  return (
    <>
      {toast && (
        <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 text-white px-4 py-2 rounded z-50 ${
          toast.isError ? 'bg-red-600' : 'bg-green-600'
        }`}>
          {toast.msg}
        </div>
      )}
      <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-red-600 text-lg">
            ⚠️ At Risk Students ({visibleRiskStudents.length})
          </h3>
          <div className="flex gap-2">
            <button
              onClick={handleToggleVisibility}
              className="text-sm bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded-lg transition-all"
            >
              ➖ Less
            </button>
            {hiddenIds.length > 0 && (
              <button
                onClick={handleShowAll}
                className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg transition-all"
              >
                📋 Show All ({hiddenIds.length} hidden)
              </button>
            )}
          </div>
        </div>

        {/* 🔥 EACH STUDENT GETS THEIR OWN BOX - EVEN WITH SAME PHONE */}
        {visibleRiskStudents.map((student) => {
          const contact = student.contact || student.phone || student.mobile || 'N/A'
          const alreadySent = sentIds.includes(student.id)
          const isSending = sendingId === student.id
          const gpa = Number(student.gpa || 0)
          const cgpa = Number(student.cgpa || 0)

          return (
            <div key={student.id} className="bg-white border border-red-200 rounded-lg p-3 mb-3">
              <div className="flex justify-between items-center mb-2">
                <p className="font-semibold text-red-700">📞 {contact}</p>
                <span className="text-xs text-gray-400">ID: {student.id}</span>
              </div>

              <div className="ml-2">
                <p className="font-medium">👤 {student.name}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><span className="text-gray-500">Grade:</span> {student.grade || 'Not set'}</p>
                  <p><span className="text-gray-500">CGPA:</span> {student.cgpa || 'N/A'} {cgpa < 2.5 && cgpa !== 0 && '⚠️'}</p>
                  <p><span className="text-gray-500">GPA:</span> {student.gpa || 'N/A'} {gpa < 2.5 && gpa !== 0 && '⚠️'}</p>
                </div>
              </div>

              <button
                onClick={() => handleSendNotification(student)}
                disabled={isSending}
                className={`mt-3 w-full text-white py-2 rounded transition-all ${
                  alreadySent ? 'bg-blue-500 hover:bg-blue-600' : 'bg-red-500 hover:bg-red-600'
                } disabled:opacity-50`}
              >
                {isSending ? "⏳ Sending..." : alreadySent ? "📱 Send Again to Parent" : "📱 Send to Parent"}
              </button>
            </div>
          )
        })}
      </div>
    </>
  )
}

export default RiskStudentsBox