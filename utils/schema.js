import {
  mysqlTable,
  int,
  varchar,
  boolean,
  timestamp
} from "drizzle-orm/mysql-core";

export const GRADES = mysqlTable("grades", {
  id: int("id").primaryKey().autoincrement(),
  grade: varchar("grade", { length: 50 }).notNull(),
});

export const STUDENTS = mysqlTable("students", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  grade: varchar("grade", { length: 50 }).notNull(),
  contact: varchar("contact", { length: 20 }).default(""),
  address: varchar("address", { length: 255 }).default(""),
  midMarks: int("midMarks").default(0),
  finalMarks: int("finalMarks").default(0),
  gpa: varchar("gpa", { length: 10 }).default("0"),
  cgpa: varchar("cgpa", { length: 10 }).default("0"),
  risk: varchar("risk", { length: 20 }).default("safe"),
});

export const ATTENDANCE = mysqlTable("attendance", {
  id: int("id").primaryKey().autoincrement(),
  studentId: int("studentId").notNull(),
  present: boolean("present").default(false),
  day: int("day").notNull(),
  date: varchar("date", { length: 20 }).notNull(),
});

export const PARENTS = mysqlTable("parents", {
  id: int("id").primaryKey().autoincrement(),
  phone: varchar("phone", { length: 20 }).notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  studentId: int("studentId").notNull(),
});

export const NOTIFICATIONS = mysqlTable("notifications", {
  id: int("id").primaryKey().autoincrement(),
  studentId: int("studentId").notNull(),
  message: varchar("message", { length: 500 }).notNull(),
  readStatus: boolean("read_status").default(false),
  createdAt: timestamp("createdAt").defaultNow(),
  blockNumber: int("block_number").default(0),
  weekStart: int("week_start").default(0),
  weekEnd: int("week_end").default(0),
  type: varchar("type", { length: 20 }).default("attendance"),  // ← new
});