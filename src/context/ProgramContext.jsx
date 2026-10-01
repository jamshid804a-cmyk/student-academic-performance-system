"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from "react"

/**
 * ProgramContext
 * ─────────────────────────────────────────────────────────────
 * Tracks which section the user is currently in:
 *   "school"  — School section
 *   "academy" — Academy section
 *
 * - Persists to localStorage so refresh keeps the last selection.
 * - Any page can call useProgram() to read or set the current program.
 * - The sidebar writes to it; pages read from it.
 *
 * NOTE: This context does NOT decide which programs are *allowed*.
 *       That's the org's package (school / academy / both), checked in
 *       the dashboard layout. This context only tracks the *current* one.
 */

const ProgramContext = createContext(null)

const STORAGE_KEY = "saps.currentProgram"
const VALID = ["school", "academy"]

export function ProgramProvider({ children, initialProgram = "school" }) {
  // Start with a safe default so SSR and first paint match.
  const [program, setProgramState] = useState(
    VALID.includes(initialProgram) ? initialProgram : "school"
  )
  const [hydrated, setHydrated] = useState(false)

  // After mount, restore from localStorage (client only).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved && VALID.includes(saved)) {
        setProgramState(saved)
      } else {
        // No saved value → use initialProgram
        const fallback = VALID.includes(initialProgram) ? initialProgram : "school"
        setProgramState(fallback)
        window.localStorage.setItem(STORAGE_KEY, fallback)
      }
    } catch {
      // localStorage unavailable (private mode, etc.) → keep default
    }
    setHydrated(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setProgram = useCallback((next) => {
    if (!VALID.includes(next)) return
    setProgramState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {}
  }, [])

  const clearProgram = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {}
    setProgramState("school")
  }, [])

  const value = {
    program,          // "school" | "academy"
    setProgram,       // (next) => void
    clearProgram,     // () => void
    hydrated,         // true once localStorage has been read
  }

  return (
    <ProgramContext.Provider value={value}>
      {children}
    </ProgramContext.Provider>
  )
}

/**
 * useProgram()
 * Returns { program, setProgram, clearProgram, hydrated }
 * Throws if used outside <ProgramProvider>.
 */
export function useProgram() {
  const ctx = useContext(ProgramContext)
  if (!ctx) {
    throw new Error("useProgram() must be used inside <ProgramProvider>")
  }
  return ctx
}

export default ProgramContext