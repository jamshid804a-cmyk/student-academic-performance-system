"use client"
import React from "react"
import {
  X, Mail, Phone, Calendar, DollarSign, MapPin, Users, Briefcase
} from "lucide-react"

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0">
        <Icon size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-0.5 break-words">
          {value || "—"}
        </p>
      </div>
    </div>
  )
}

export default function TeacherDetailsDialog({ teacher, onClose }) {
  const initial = String(teacher.name || "?").charAt(0).toUpperCase()

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full my-8">
        <div className="relative px-6 pt-6 pb-8 bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-600 rounded-t-2xl overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/10 translate-y-1/2 -translate-x-1/2" />

          <button onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition z-10">
            <X size={18} />
          </button>

          <div className="relative flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-lg">
              <span className="text-2xl font-bold text-purple-600">{initial}</span>
            </div>
            <div className="min-w-0">
              <h3 className="text-xl font-bold text-white truncate">{teacher.name}</h3>
              <p className="text-xs text-purple-100 mt-0.5">
                {teacher.teacherId || "—"}
              </p>
              <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                String(teacher.status).toLowerCase() === "active"
                  ? "bg-emerald-400/90 text-emerald-950"
                  : "bg-slate-300/90 text-slate-700"
              }`}>
                {teacher.status || "Active"}
              </span>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 max-h-[55vh] overflow-y-auto">
          <InfoRow icon={Mail} label="Email" value={teacher.email} />
          <InfoRow icon={Phone} label="Phone" value={teacher.phone} />
          <InfoRow icon={Briefcase} label="Qualification" value={teacher.qualification} />
          <InfoRow icon={Calendar} label="Joining Date" value={teacher.joiningDate} />
          <InfoRow icon={DollarSign} label="Salary"
            value={teacher.salary ? `Rs. ${Number(teacher.salary).toLocaleString()}` : "—"} />
          <InfoRow icon={MapPin} label="Address" value={teacher.address} />

          <div className="flex items-start gap-3 py-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0">
              <Users size={15} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wide mb-1.5">
                Assigned Courses
              </p>
              {Array.isArray(teacher.classes) && teacher.classes.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {teacher.classes.map((c, i) => (
                    <span key={i}
                      className="text-xs font-bold px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800">
                      {c.course || c.grade}
                      {c.section ? ` - ${c.section}` : ""}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">No courses assigned</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 rounded-b-2xl">
          <button onClick={onClose}
            className="px-5 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}