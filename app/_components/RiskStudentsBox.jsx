"use client"

import React, { useEffect, useState } from 'react'

function RiskStudentsBox({ students }) {
  const [sentNumbers, setSentNumbers] = useState([])
  const [sendingNumber, setSendingNumber] = useState(null)
  const [toast, setToast] = useState(null)
  const [hiddenNumbers, setHiddenNumbers] = useState([])
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem("academic_sent_numbers")
    if (saved) setSentNumbers(JSON.parse(saved))
    
    // Clear hidden numbers on page refresh
    setHiddenNumbers([])
    setIsVisible(true)
  }, [])

  // ✅ When students prop changes (new data), reset everything
  useEffect(() => {
    setHiddenNumbers([])
    setIsVisible(true)
  }, [students])

  const studentList = Array.isArray(students) ? students : []
  
  const studentsByContact = studentList.reduce((acc, student) => {
    const contact = student.contact || student.phone || student.mobile || 'N/A'
    if (!acc[contact]) acc[contact] = []
    acc[contact].push(student)
    return acc
  }, {})

  const atRiskContacts = Object.keys(studentsByContact).filter(contact => {
    return studentsByContact[contact].some(s => {
      const gpa = Number(s.gpa || 0)
      const cgpa = Number(s.cgpa || 0)
      return (gpa < 2.5 && gpa !== 0) || (cgpa < 2.5 && cgpa !== 0)
    })
  })

  // ✅ Filter out hidden contacts
  const visibleContacts = atRiskContacts.filter(contact => !hiddenNumbers.includes(contact))
  
  const riskStudents = visibleContacts.flatMap(contact => 
    studentsByContact[contact].filter(s => {
      const gpa = Number(s.gpa || 0)
      const cgpa = Number(s.cgpa || 0)
      return (gpa < 2.5 && gpa !== 0) || (cgpa < 2.5 && cgpa !== 0)
    })
  )

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSendToNumber = async (contact, studentsToNotify) => {
    setSendingNumber(contact)
    
    try {
      const results = await Promise.all(
        studentsToNotify.map(async (student) => {
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
          return { student, success: response.ok }
        })
      )
      
      const allSuccess = results.every(r => r.success)
      const successCount = results.filter(r => r.success).length
      
      if (allSuccess) {
        const studentNames = studentsToNotify.map(s => s.name).join(', ')
        showToast(`✅ Notifications sent for: ${studentNames}`, false)
        
        if (!sentNumbers.includes(contact)) {
          const newSentNumbers = [...sentNumbers, contact]
          setSentNumbers(newSentNumbers)
          localStorage.setItem("academic_sent_numbers", JSON.stringify(newSentNumbers))
        }
        
        // ✅ Hide this contact after 5 seconds
        setTimeout(() => {
          setHiddenNumbers(prev => [...prev, contact])
        }, 5000)
        
      } else {
        showToast(`⚠️ Sent ${successCount}/${studentsToNotify.length} notifications`, true)
      }
      
    } catch (err) {
      console.error(err)
      showToast("❌ Network error", true)
    } finally {
      setSendingNumber(null)
    }
  }

  // ✅ SHOW ALL - Clear ALL hidden numbers and ensure visibility
  const handleShowAll = () => {
    setHiddenNumbers([])  // Clear all hidden contacts
    setIsVisible(true)     // Make sure box is visible
    showToast("📋 All at-risk students are now visible again", false)
  }

  // ✅ TOGGLE HIDE/SHOW
  const handleToggleVisibility = () => {
    setIsVisible(!isVisible)
    showToast(isVisible ? "📦 Risk box hidden" : "🔓 Risk box shown", false)
  }

  const riskGroups = riskStudents.reduce((acc, student) => {
    const contact = student.contact || student.phone || student.mobile || 'N/A'
    if (!acc[contact]) acc[contact] = []
    acc[contact].push(student)
    return acc
  }, {})

  // Don't show anything if no risk students
  if (Object.keys(riskGroups).length === 0) {
    // ✅ If there were hidden numbers but no visible students, show "Show All" button
    if (hiddenNumbers.length > 0) {
      return (
        <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex justify-between items-center">
            <p className="text-green-700">✅ All at-risk students have been notified!</p>
            <button 
              onClick={handleShowAll}
              className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg transition-all"
            >
              📋 Show All ({hiddenNumbers.length} hidden)
            </button>
          </div>
        </div>
      )
    }
    return null
  }

  // ✅ If hidden by toggle, show expand button
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
            ⚠️ At Risk Students ({riskStudents.length})
          </h3>
          <div className="flex gap-2">
            <button 
              onClick={handleToggleVisibility}
              className="text-sm bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded-lg transition-all"
            >
              ➖ Less
            </button>
            {hiddenNumbers.length > 0 && (
              <button 
                onClick={handleShowAll}
                className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg transition-all"
              >
                📋 Show All ({hiddenNumbers.length} hidden)
              </button>
            )}
          </div>
        </div>
        
        {Object.entries(riskGroups).map(([contact, groupStudents]) => {
          const alreadySent = sentNumbers.includes(contact)
          const isSending = sendingNumber === contact
          
          return (
            <div key={contact} className="bg-white border border-red-200 rounded-lg p-3 mb-3">
              <div className="flex justify-between items-center mb-2">
                <p className="font-semibold text-red-700">📞 {contact}</p>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {groupStudents.length} student{groupStudents.length > 1 ? 's' : ''}
                </span>
              </div>
              
              <div className="ml-2 space-y-2">
                {groupStudents.map((student) => {
                  const gpa = Number(student.gpa || 0)
                  const cgpa = Number(student.cgpa || 0)
                  return (
                    <div key={student.id} className="border-l-2 border-red-300 pl-3 py-1">
                      <p className="font-medium">👤 {student.name}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <p><span className="text-gray-500">Grade:</span> {student.grade || 'Not set'}</p>
                        <p><span className="text-gray-500">CGPA:</span> {student.cgpa || 'N/A'} {cgpa < 2.5 && cgpa !== 0 && '⚠️'}</p>
                        <p><span className="text-gray-500">GPA:</span> {student.gpa || 'N/A'} {gpa < 2.5 && gpa !== 0 && '⚠️'}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
              
              <button
                onClick={() => handleSendToNumber(contact, groupStudents)}
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