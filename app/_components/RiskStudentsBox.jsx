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
  const [sendingId, setSendingId] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const saved = localStorage.getItem("academic_sent_ids")
    if (saved) setSentIds(JSON.parse(saved))
  }, [])

  // ✅ FIXED: Convert strings to numbers
  const riskStudents = students?.filter(s => {
    const gpa = Number(s.gpa || 0);     // Convert string to number
    const cgpa = Number(s.cgpa || 0);   // Convert string to number
    const lowGpa = gpa < 2.5 && gpa !== 0
    const lowCgpa = cgpa < 2.5 && cgpa !== 0
    
    if (lowGpa || lowCgpa) {
      console.log(`⚠️ RISK STUDENT: ${s.name} (GPA: ${gpa}, CGPA: ${cgpa})`)
    }
    
    return lowGpa || lowCgpa
  }) || []

  console.log("Total students:", students?.length, "At risk:", riskStudents.length)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handleSend = async (student) => {
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
        showToast(`Notification sent to parent of ${student.name} successfully!`)
        if (!sentIds.includes(student.id)) {
          const newSentIds = [...sentIds, student.id]
          setSentIds(newSentIds)
          localStorage.setItem("academic_sent_ids", JSON.stringify(newSentIds))
        }
      } else {
        showToast("Failed to send. Try again.")
      }
    } catch (err) {
      console.error("Failed to send:", err)
      showToast("Failed to send notification. Try again.")
    } finally {
      setSendingId(null)
    }
  }

  const handleClearCache = () => {
    localStorage.removeItem("academic_sent_ids")
    setSentIds([])
    showToast("Cache cleared - refresh the page")
  }

  if (riskStudents.length === 0) {
    if (students?.length > 0) {
      return (
        <div className='mb-5 p-4 bg-yellow-50 border border-yellow-200 rounded-lg'>
          <p className='text-yellow-700'>📊 No at-risk students found. All students have CGPA/GPA above 2.5!</p>
        </div>
      )
    }
    return null
  }

  return (
    <>
      {toast && <Toast message={toast} />}

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
              Reset
            </button>
          </div>

          <div className='flex flex-col gap-3'>
            {riskStudents.map((student) => {
              const gpa = Number(student.gpa || 0)
              const cgpa = Number(student.cgpa || 0)
              const lowGpa = gpa < 2.5 && gpa !== 0
              const lowCgpa = cgpa < 2.5 && cgpa !== 0

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

                  <button
                    onClick={() => handleSend(student)}
                    disabled={sendingId === student.id}
                    className='mt-3 w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-all'
                  >
                    {sendingId === student.id ? "Sending..." : "📱 Send to Parent"}
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