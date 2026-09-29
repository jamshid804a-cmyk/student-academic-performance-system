"use client"
import React, { useState } from "react"
import {
  Eye,
  Pencil,
  Trash2,
  Link2,
  MessageCircle,
  LoaderIcon,
} from "lucide-react"
import GlobalApi from "@/app/_services/GlobalApi"
import { toast } from "sonner"

export default function TeacherListTable({
  teachers,
  onEdit,
  onView,
  onCopyLink,
  onRegenerateLink,
  onWhatsApp,
  onDeleted,
}) {
  const [deletingId, setDeletingId] = useState(null)
  const [regeneratingId, setRegeneratingId] = useState(null)

  const handleDelete = async (teacher) => {
    if (!confirm(`Delete teacher "${teacher.name}"? This cannot be undone.`)) return
    setDeletingId(teacher._id)
    try {
      await GlobalApi.DeleteTeacher(teacher._id)
      toast.success(`"${teacher.name}" removed`)
      onDeleted?.()
    } catch (err) {
      console.error(err)
      toast.error("Failed to delete teacher")
    }
    setDeletingId(null)
  }

  const handleRegenerate = async (teacher) => {
    setRegeneratingId(teacher._id)
    try {
      await onRegenerateLink(teacher)
    } finally {
      setRegeneratingId(null)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
              <th className="px-4 py-3.5 font-bold text-slate-600 dark:text-slate-300 uppercase text-[11px] tracking-wider text-left">
                Teacher ID
              </th>
              <th className="px-4 py-3.5 font-bold text-slate-600 dark:text-slate-300 uppercase text-[11px] tracking-wider text-left">
                Name
              </th>
              <th className="px-4 py-3.5 font-bold text-slate-600 dark:text-slate-300 uppercase text-[11px] tracking-wider text-left">
                Subject
              </th>
              <th className="px-4 py-3.5 font-bold text-slate-600 dark:text-slate-300 uppercase text-[11px] tracking-wider text-left">
                Phone
              </th>
              <th className="px-4 py-3.5 font-bold text-slate-600 dark:text-slate-300 uppercase text-[11px] tracking-wider text-left">
                Classes
              </th>
              <th className="px-4 py-3.5 font-bold text-slate-600 dark:text-slate-300 uppercase text-[11px] tracking-wider text-center">
                Status
              </th>
              <th className="px-4 py-3.5 font-bold text-slate-600 dark:text-slate-300 uppercase text-[11px] tracking-wider text-center">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((t) => (
              <tr
                key={t._id}
                className="border-b border-slate-100 dark:border-slate-700 hover:bg-indigo-50/40 dark:hover:bg-slate-700/40 transition-colors"
              >
                <td className="px-4 py-3 font-bold text-indigo-600 dark:text-indigo-400">
                  {t.teacherId || "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm shrink-0">
                      {String(t.name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {t.name}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{t.email || "—"}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {t.subject || "—"}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {t.phone || "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {Array.isArray(t.classes) && t.classes.length > 0 ? (
                      t.classes.map((c, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
                        >
                          {c.grade}
                          {c.section ? `-${c.section}` : ""}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">None</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                      String(t.status).toLowerCase() === "active"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                    }`}
                  >
                    {t.status || "Active"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => onView(t)}
                      title="View details"
                      className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => onEdit(t)}
                      title="Edit teacher"
                      className="w-8 h-8 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 flex items-center justify-center transition"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleRegenerate(t)}
                      disabled={regeneratingId === t._id}
                      title="Generate new public link & copy"
                      className="w-8 h-8 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-600 flex items-center justify-center transition disabled:opacity-50"
                    >
                      {regeneratingId === t._id ? (
                        <LoaderIcon size={14} className="animate-spin" />
                      ) : (
                        <Link2 size={14} />
                      )}
                    </button>
                    <button
                      onClick={() => onWhatsApp(t)}
                      title="Share link on WhatsApp"
                      className="w-8 h-8 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 flex items-center justify-center transition"
                    >
                      <MessageCircle size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(t)}
                      disabled={deletingId === t._id}
                      title="Delete teacher"
                      className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition disabled:opacity-50"
                    >
                      {deletingId === t._id ? (
                        <LoaderIcon size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}