"use client"

import React from "react"
import TestingModule from "@/components/TestingModule"

export default function TestingPage() {
  return <TestingModule teacherMode={false} storagePrefix="testing" />
}