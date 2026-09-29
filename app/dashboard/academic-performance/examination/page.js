"use client"

import React from "react"
import ExaminationModule from "@/components/ExaminationModule"

export default function ExaminationPage() {
  return <ExaminationModule teacherMode={false} storagePrefix="examination" />
}