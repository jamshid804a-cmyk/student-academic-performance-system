"use client"

import React, { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import GlobalApi from '@/app/_services/GlobalApi'
import { toast } from 'sonner'
import { FileSpreadsheet, Loader2, Download } from 'lucide-react'

const GRADES = [
    "Nursery", "Prep",
    "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th",
]

const WORD_NUMBERS = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
    seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
}

// Accepted Excel header names (spaces, dots and case are ignored)
const ALIASES = {
    name: ['studentname', 'name', 'sname', 'nameofstudent'],
    fatherName: ['fathername', 'father', 'fname'],
    fatherOccupation: ['fatheroccupation', 'occupation'],
    admissionNo: ['admissionno', 'admno', 'admissionnumber', 'admission', 'adno'],
    contact: ['contactno', 'contact', 'phone', 'mobile', 'phoneno', 'mobileno'],
    grade: [
        'grade', 'class', 'classname', 'gradeclass', 'classgrade',
        'standard', 'std', 'currentclass', 'admittedclass', 'cls',
    ],
    section: ['section', 'sec'],
    rollNo: ['rollno', 'roll', 'rollnumber'],
    session: ['session', 'year', 'academicyear'],
    admissionDate: ['admissiondate', 'dateofadmission'],
    fee: ['fee', 'fees'],
    address: ['address'],
}

const norm = (k) => String(k ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
const clean = (v) => String(v ?? '').trim()

const isNameHeader = (c) => {
    const n = norm(c)
    return (
        n === 'name' ||
        n === 'sname' ||
        n === 'nameofstudent' ||
        (n.includes('student') && n.includes('name'))
    )
}

function normalizeGrade(v) {
    const raw = clean(v).toLowerCase()
    if (!raw) return ''

    const direct = GRADES.find((g) => g.toLowerCase() === raw)
    if (direct) return direct

    if (raw.includes('nursery')) return 'Nursery'
    if (raw.includes('prep')) return 'Prep'

    // "Class 5", "Grade 5", "5th", "5"
    let n = null
    const m = raw.match(/(\d+)/)
    if (m) {
        n = Number(m[1])
    } else {
        const word = Object.keys(WORD_NUMBERS).find((w) => raw.includes(w))
        if (word) n = WORD_NUMBERS[word]
    }

    if (n && n >= 1 && n <= 12) {
        const suffix = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'
        return `${n}${suffix}`
    }
    return ''
}

function normalizeDate(v) {
    if (!v) return null
    if (v instanceof Date && !isNaN(v)) {
        const d = new Date(v.getTime() + 12 * 3600 * 1000) // avoids timezone off-by-one
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        return `${d.getFullYear()}-${mm}-${dd}`
    }
    return clean(v) || null // text like 2025-04-01
}

function ImportStudents({ refreshData, students = [] }) {
    const fileRef = useRef(null)
    const [loading, setLoading] = useState(false)
    const [progress, setProgress] = useState({ done: 0, total: 0 })
    const [report, setReport] = useState(null)

    const downloadTemplate = () => {
        const headers = [[
            'Student Name', 'Father Name', 'Father Occupation', 'Admission No',
            'Contact No', 'Grade', 'Section', 'Roll No', 'Session',
            'Admission Date', 'Fee', 'Address',
        ]]
        const sample = [[
            'Ahmed Khan', 'Imran Khan', 'Businessman', 1001,
            '03001234567', '5th', 'A', 1, '2025-2026',
            '2025-04-01', 5000, 'Peshawar',
        ]]
        const ws = XLSX.utils.aoa_to_sheet([...headers, ...sample])
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Students')
        XLSX.writeFile(wb, 'students-template.xlsx')
    }

    const handleFile = async (e) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return

        setLoading(true)
        setReport(null)

        try {
            const buffer = await file.arrayBuffer()
            const wb = XLSX.read(buffer, { cellDates: true })
            const sheet = wb.Sheets[wb.SheetNames[0]]
            const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

            // Find the heading row (searches the first 15 rows)
            const headerIdx = grid.findIndex(
                (r, i) => i < 15 && r.some(isNameHeader)
            )

            if (headerIdx === -1) {
                const firstRow = grid.find((r) => r.some((c) => clean(c) !== '')) || []
                const found = firstRow.map(clean).filter(Boolean)
                setReport({
                    saved: 0,
                    total: Math.max(grid.length - 1, 0),
                    columns: found,
                    errors: ['Could not find a Student Name column.'],
                })
                setLoading(false)
                return
            }

            const originalHeaders = grid[headerIdx].map(clean).filter(Boolean)
            const headerRow = grid[headerIdx].map((h) => norm(h))
            const nameKey = headerRow.find(isNameHeader)

            // Stop early if the Grade/Class column is missing
            const hasGradeColumn = ALIASES.grade.some((a) => headerRow.includes(a))
            if (!hasGradeColumn) {
                setReport({
                    saved: 0,
                    total: 0,
                    columns: originalHeaders,
                    errors: [
                        'Could not find a Grade / Class column. Rename your class column to "Grade" and try again.',
                    ],
                })
                setLoading(false)
                return
            }

            const rawRows = grid
                .slice(headerIdx + 1)
                .filter((r) => r.some((c) => clean(c) !== ''))
                .map((r) => {
                    const o = {}
                    headerRow.forEach((h, i) => { if (h) o[h] = r[i] })
                    return o
                })

            if (rawRows.length === 0) {
                toast.error('No student rows found in the file')
                setLoading(false)
                return
            }

            // Existing students (for duplicate checks)
            const usedAdmission = new Set(
                students.map((s) => clean(s.admissionNo)).filter(Boolean)
            )
            const rollKey = (roll, grade, section, session) =>
                [roll, grade, section, session].map((x) => clean(x).toLowerCase()).join('|')
            const usedRoll = new Set(
                students
                    .filter((s) => s.rollNo)
                    .map((s) => rollKey(s.rollNo, s.grade, s.section, s.session))
            )

            const valid = []
            const errors = []

            rawRows.forEach((map, idx) => {
                const rowNo = idx + headerIdx + 2 // real Excel row number

                const get = (field) => {
                    for (const a of ALIASES[field]) {
                        if (map[a] !== undefined && map[a] !== '') return map[a]
                    }
                    return ''
                }

                const name = clean(map[nameKey])
                const gradeRaw = clean(get('grade'))
                const grade = normalizeGrade(gradeRaw)

                if (!name) return errors.push(`Row ${rowNo}: Student Name is missing`)
                if (!/^[A-Za-z\s]+$/.test(name)) {
                    return errors.push(`Row ${rowNo}: Name "${name}" must be letters only`)
                }
                if (!grade) {
                    return errors.push(
                        gradeRaw
                            ? `Row ${rowNo}: Grade "${gradeRaw}" is not valid`
                            : `Row ${rowNo}: Grade is empty`
                    )
                }

                let contact = clean(get('contact')).replace(/[^0-9]/g, '')
                if (contact.length === 10) contact = '0' + contact // Excel removes leading 0
                if (contact && contact.length !== 11) {
                    return errors.push(`Row ${rowNo}: Contact must be 11 digits`)
                }

                const admissionNo = clean(get('admissionNo')).replace(/[^0-9]/g, '').replace(/^0+/, '')
                const rollNo = clean(get('rollNo')).replace(/[^0-9]/g, '').replace(/^0+/, '')
                const section = clean(get('section')).toUpperCase()
                const session = clean(get('session'))

                if (admissionNo && usedAdmission.has(admissionNo)) {
                    return errors.push(`Row ${rowNo}: Admission No ${admissionNo} already exists`)
                }
                const rk = rollKey(rollNo, grade, section, session)
                if (rollNo && usedRoll.has(rk)) {
                    return errors.push(
                        `Row ${rowNo}: Roll No ${rollNo} already exists in ${grade} ${section} ${session}`
                    )
                }
                if (admissionNo) usedAdmission.add(admissionNo)
                if (rollNo) usedRoll.add(rk)

                valid.push({
                    rowNo,
                    payload: {
                        name,
                        fatherName: clean(get('fatherName')) || null,
                        fatherOccupation: clean(get('fatherOccupation')) || null,
                        admissionNo: admissionNo || null,
                        contact,
                        grade,
                        section: section || null,
                        rollNo: rollNo ? Number(rollNo) : null,
                        session: session || null,
                        admissionDate: normalizeDate(get('admissionDate')),
                        fee: Number(get('fee')) || 0,
                        address: clean(get('address')),
                        image: null,
                    },
                })
            })

            // Save in small parallel batches
            const BATCH = 5
            let saved = 0
            setProgress({ done: 0, total: valid.length })

            for (let i = 0; i < valid.length; i += BATCH) {
                const chunk = valid.slice(i, i + BATCH)
                const results = await Promise.allSettled(
                    chunk.map((r) => GlobalApi.CreateNewStudent(r.payload))
                )
                results.forEach((res, j) => {
                    if (res.status === 'fulfilled') {
                        saved++
                    } else {
                        const msg = res.reason?.response?.data?.error || 'Failed to save'
                        errors.push(`Row ${chunk[j].rowNo} (${chunk[j].payload.name}): ${msg}`)
                    }
                })
                setProgress({ done: Math.min(i + BATCH, valid.length), total: valid.length })
            }

            setReport({
                saved,
                errors,
                total: rawRows.length,
                columns: originalHeaders,
            })
            if (saved > 0) toast.success(`${saved} student(s) imported`)
            else toast.error('No students were imported')

            if (refreshData) await refreshData()
        } catch (err) {
            console.error('IMPORT ERROR:', err)
            toast.error('Could not read the Excel file')
        }

        setLoading(false)
        setProgress({ done: 0, total: 0 })
    }

    return (
        <>
            <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFile}
            />

            <Button
                variant="outline"
                onClick={downloadTemplate}
                disabled={loading}
                className="gap-2"
            >
                <Download className="w-4 h-4" />
                Template
            </Button>

            <Button
                onClick={() => fileRef.current?.click()}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm gap-2"
            >
                {loading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {progress.total
                            ? `Importing ${progress.done}/${progress.total}...`
                            : 'Reading file...'}
                    </>
                ) : (
                    <>
                        <FileSpreadsheet className="w-4 h-4" />
                        Import Excel
                    </>
                )}
            </Button>

            <Dialog open={!!report} onOpenChange={(o) => !o && setReport(null)}>
                <DialogContent className="max-w-lg bg-white">
                    <DialogHeader>
                        <DialogTitle>Import Result</DialogTitle>
                        <DialogDescription>
                            {report?.saved} of {report?.total} rows imported
                            {report?.errors.length ? `, ${report.errors.length} skipped` : ''}.
                        </DialogDescription>
                    </DialogHeader>

                    {report?.columns?.length > 0 && (
                        <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
                            <p className="font-semibold mb-1">Columns found in your file:</p>
                            <p>{report.columns.join(' | ')}</p>
                        </div>
                    )}

                    {report?.errors.length > 0 && (
                        <div className="max-h-64 overflow-y-auto rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-700 space-y-1">
                            {report.errors.slice(0, 100).map((m, i) => <p key={i}>{m}</p>)}
                            {report.errors.length > 100 && (
                                <p className="font-semibold">
                                    ...and {report.errors.length - 100} more
                                </p>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end">
                        <Button onClick={() => setReport(null)}>Close</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}

export default ImportStudents