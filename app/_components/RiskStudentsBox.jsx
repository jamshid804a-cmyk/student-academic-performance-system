"use client"

import React, { useEffect, useState } from 'react'

function Toast({ message }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-sm font-semibold px-6 py-3 rounded-xl shadow-lg">
      ✅ {message}
    </div>
  )
}

function RiskStudentsBox({ students }) {
  const [sentIds, setSentIds] = useState([])
  const [sendingId, setSendingId] = useState(null) // Track which student is currently sending
  const [toast, setToast] = useState(null)

  // Load sent IDs from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("academic_sent_ids")
    if (saved) {
      try {
        setSentIds(JSON.parse(saved))
      } catch (e) {
        console.error("Failed to parse sentIds:", e)
      }
    }
  }, [])

  // Improved risk detection
  const riskStudents = students?.filter(s => {
    const gpa = parseFloat(s.gpa) || 0
    const cgpa = parseFloat(s.cgpa) || 0
    return (gpa < 2.5 && gpa !== 0) || (cgpa < 2.5 && cgpa !== 0)
  }) || []

  const showToast = (msg, isError = false) => {
    setToast({ message: msg, isError })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSend = async (student) => {
    // Prevent multiple sends for the same student
    if (sendingId === student.id) return
    
    setSendingId(student.id)
    
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
        }),
      })

      if (response.ok) {
        showToast(`✅ Notification sent to parent of ${student.name} successfully!`)
        
        // ✅ FIX: Add to sent IDs only after successful send
        if (!sentIds.includes(student.id)) {
          const newSentIds = [...sentIds, student.id]
          setSentIds(newSentIds)
          localStorage.setItem("academic_sent_ids", JSON.stringify(newSentIds))
        }
      } else {
        const errorData = await response.json()
        showToast(`❌ Failed to send: ${errorData.message || "Try again"}`, true)
      }
    } catch (err) {
      console.error("Failed to send:", err)
      showToast("❌ Network error. Failed to send notification.", true)
    } finally {
      setSendingId(null) // ✅ Clear sending state
    }
  }

  const handleClearCache = () => {
    localStorage.removeItem("academic_sent_ids")
    setSentIds([])
    showToast("🗑️ Cache cleared! You can now resend to all students.")
  }

  // Debug info
  useEffect(() => {
    if (students?.length > 0) {
      console.log("=== Risk Box Status ===")
      console.log("Total students:", students.length)
      console.log("At risk students:", riskStudents.length)
      console.log("Already sent IDs:", sentIds)
    }
  }, [students, riskStudents, sentIds])

  if (riskStudents.length === 0) {
    if (students?.length > 0) {
      return (
        <div className='mb-5 p-4 bg-green-50 border border-green-200 rounded-lg'>
          <p className='text-green-700'>✅ No at-risk students found. All students have CGPA/GPA above 2.5!</p>
        </div>
      )
    }
    return null
  }

  return (
    <>
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 text-white text-sm font-semibold px-6 py-3 rounded-xl shadow-lg ${
          toast.isError ? 'bg-red-600' : 'bg-green-600'
        }`}>
          {toast.message}
        </div>
      )}

      <div className='mb-5'>
        <div className='p-4 bg-red-50 border border-red-200 rounded-lg'>
          
          <div className='flex justify-between items-center mb-3'>
            <h3 className='font-bold text-red-600 text-lg'>
              ⚠️ At Risk Students ({riskStudents.length})
            </h3>
            <button
              onClick={handleClearCache}
              className='text-xs text-gray-400 hover:text-red-500 underline'
            >
              Reset All Sent Status
            </button>
          </div>

          <div className='flex flex-col gap-3'>
            {riskStudents.map((student) => {
              const gpa = parseFloat(student.gpa || 0)
              const cgpa = parseFloat(student.cgpa || 0)
              const lowGpa = gpa < 2.5 && gpa !== 0
              const lowCgpa = cgpa < 2.5 && cgpa !== 0
              const isSending = sendingId === student.id
              const alreadySent = sentIds.includes(student.id)

              return (
                <div key={student.id} className='bg-white border border-red-200 rounded-lg p-3'>
                  <p className='font-semibold text-red-700 mb-2 text-sm'>
                    👤 {student.name}
                  </p>

                  <div className='grid grid-cols-2 gap-2 mb-2'>
                    <div className='bg-red-50 rounded-md p-2'>
                      <p className='text-xs text-gray-500'>Student ID</p>
                      <p className='font-medium text-sm text-gray-800'>{student.id}</p>
                    </div>
                    <div className='bg-red-50 rounded-md p-2'>
                      <p className='text-xs text-gray-500'>Semester</p>
                      <p className='font-medium text-sm text-gray-800'>{student.grade}</p>
                    </div>
                    <div className={`rounded-md p-2 ${lowCgpa ? 'bg-red-100' : 'bg-red-50'}`}>
                      <p className='text-xs text-gray-500'>CGPA</p>
                      <p className={`font-medium text-sm ${lowCgpa ? 'text-red-600 font-bold' : 'text-gray-800'}`}>
                        {student.cgpa} {lowCgpa ? '⚠️' : ''}
                      </p>
                    </div>
                    <div className={`rounded-md p-2 ${lowGpa ? 'bg-red-100' : 'bg-red-50'}`}>
                      <p className='text-xs text-gray-500'>GPA</p>
                      <p className={`font-medium text-sm ${lowGpa ? 'text-red-600 font-bold' : 'text-gray-800'}`}>
                        {student.gpa} {lowGpa ? '⚠️' : ''}
                      </p>
                    </div>
                  </div>

                  <div className='flex gap-2 flex-wrap mb-2'>
                    {lowCgpa && (
                      <span className='inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs px-3 py-1 rounded-full border border-red-300'>
                        ⚠️ Low CGPA
                      </span>
                    )}
                    {lowGpa && (
                      <span className='inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs px-3 py-1 rounded-full border border-red-300'>
                        ⚠️ Low GPA
                      </span>
                    )}
                    {alreadySent && (
                      <span className='inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full border border-green-300'>
                        ✓ Already Sent
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleSend(student)}
                    disabled={isSending}
                    className={`mt-3 w-full text-white text-sm font-semibold py-2 px-4 rounded-lg transition-all ${
                      alreadySent 
                        ? 'bg-blue-500 hover:bg-blue-600' 
                        : 'bg-red-500 hover:bg-red-600'
                    } disabled:opacity-50`}
                  >
                    {isSending ? "⏳ Sending..." : alreadySent ? "📱 Send Again to Parent" : "📱 Send to Parent"}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

export default RiskStudentsBox