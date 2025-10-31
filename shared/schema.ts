import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod";

// List Item structure for nested bullet lists
export type ListItem = {
  id: string;
  text: string;
  level: number;
  children?: ListItem[];
};

export const listItemSchema: z.ZodType<ListItem> = z.object({
  id: z.string(),
  text: z.string(),
  level: z.number().min(0).max(5),
  children: z.array(z.lazy(() => listItemSchema)).optional(),
});

// Template structure
export const templates = pgTable("templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  content: jsonb("content").notNull().$type<ListItem[]>(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTemplateSchema = z.object({
  content: z.array(listItemSchema),
});

export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Template = typeof templates.$inferSelect;

// Daily Notes
export const dailyNotes = pgTable("daily_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: text("date").notNull().unique(), // YYYY-MM-DD format
  dayName: text("day_name").notNull(), // e.g., "Monday"
  focusText: text("focus_text").notNull().default(""),
  content: jsonb("content").notNull().$type<ListItem[]>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDailyNoteSchema = z.object({
  date: z.string(),
  dayName: z.string(),
  focusText: z.string().default(""),
  content: z.array(listItemSchema),
});

export type InsertDailyNote = z.infer<typeof insertDailyNoteSchema>;
export type DailyNote = typeof dailyNotes.$inferSelect;

// Calendar Events (from Google Calendar)
export const calendarEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  startTime: z.string(), // ISO timestamp
  endTime: z.string(), // ISO timestamp
  isAllDay: z.boolean().default(false),
  source: z.string().default("google"),
});

export type CalendarEvent = z.infer<typeof calendarEventSchema>;

// API Response types
export const dailyNoteWithEventsSchema = z.object({
  note: z.custom<DailyNote>(),
  events: z.array(calendarEventSchema),
});

export type DailyNoteWithEvents = z.infer<typeof dailyNoteWithEventsSchema>;
