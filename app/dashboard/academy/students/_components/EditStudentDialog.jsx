"use client"

import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { toast } from 'sonner'
import { LoaderIcon, Upload, X, User, Plus, Loader2 } from 'lucide-react'

const SECTIONS = ["A", "B", "C"]

const START_YEAR = 2025
const END_YEAR = new Date().getFullYear() + 30
const YEARS = []
for (let y = START_YEAR; y <= END_YEAR; y++) YEARS.push(String(y))

const DURATIONS = Array.from({ length: 12 }, (_, i) => {
  const n = i + 1
  return `${n} Month${n === 1 ? "" : "s"}`
})

const BATCHES = Array.from({ length: 20 }, (_, i) => `Batch ${i + 1}`)

function EditStudentDialog({ student, open, onOpenChange, refreshData, students = [], email }) {
    const [loading, setLoading] = useState(false)
    const [imagePreview, setImagePreview] = useState(null)
    const [imageFile, setImageFile] = useState(null)

    const [courses, setCourses] = useState([])
    const [coursesLoading, setCoursesLoading] = useState(false)

    const [addCourseOpen, setAddCourseOpen] = useState(false)
    const [newCourseName, setNewCourseName] = useState("")
    const [newCourseCategory, setNewCourseCategory] = useState("Custom")
    const [addCourseSaving, setAddCourseSaving] = useState(false)

    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm()

    useEffect(() => {
        if (!open || !email) return
        setCoursesLoading(true)
        fetch(`/api/academy/courses?email=${encodeURIComponent(email)}`, { cache: 'no-store' })
            .then(r => r.json())
            .then(d => { if (d.success) setCourses(d.courses || []) })
            .catch(() => {})
            .finally(() => setCoursesLoading(false))
    }, [open, email])

    useEffect(() => {
        if (student) {
            reset({
                studentName: student.name || "",
                fatherName: student.fatherName || "",
                fatherOccupation: student.fatherOccupation || "",
                admissionNo: student.admissionNo || "",
                contactNo: student.contact || "",
                course: student.subject || "",
                section: student.section || "",
                rollNo: student.rollNo || "",
                year: student.year || "",
                courseDuration: student.courseDuration || "",
                batchNo: student.batchNo || "",
                admissionDate: student.admissionDate || "",
                fee: student.fee || student.monthlyFee || "",
                address: student.address || "",
            })
            setImagePreview(student.image || null)
            setImageFile(null)
        }
    }, [student, reset])

    const handleImageChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            if (file.size > 2 * 1024 * 1024) { toast.error("Image size should be less than 2MB"); return }
            setImageFile(file)
            const reader = new FileReader()
            reader.onloadend = () => setImagePreview(reader.result)
            reader.readAsDataURL(file)
        }
    }

    const removeImage = () => { setImageFile(null); setImagePreview(null) }

    const isRollNoDuplicate = (rollNo, course, section, year) => {
        if (!rollNo || !course) return false
        return students.some((s) => {
            if (s._id === student._id) return false
            const sameRoll = Number(s.rollNo) === Number(rollNo)
            const sameCourse = String(s.subject || "").trim().toLowerCase() === String(course).trim().toLowerCase()
            const sameSection = section ? String(s.section || "").trim() === String(section).trim() : true
            const sameYear = year ? String(s.year || "").trim() === String(year).trim() : true
            return sameRoll && sameCourse && sameSection && sameYear
        })
    }

    const isAdmissionNoDuplicate = (admissionNo) => {
        if (!admissionNo) return false
        return students.some(
            (s) => s._