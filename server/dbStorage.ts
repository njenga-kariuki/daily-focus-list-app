import type { Template, InsertTemplate, DailyNote, InsertDailyNote, ListItem } from "@shared/schema";
import { templates, dailyNotes } from "@shared/schema";
import { db } from "./db";
import { eq, gte } from "drizzle-orm";
import { randomUUID } from "crypto";
import { format, addDays } from "date-fns";
import type { IStorage } from "./storage";

const DEFAULT_TEMPLATE: ListItem[] = [
  {
    id: "template-1",
    text: "pre-workout",
    level: 0,
    children: [
      { id: "template-1-1", text: "Check in with family", level: 1 },
      { id: "template-1-2", text: "Check in with a friend", level: 1 },
      { id: "template-1-3", text: "Work", level: 1 },
    ],
  },
  {
    id: "template-2",
    text: "workout",
    level: 0,
  },
  {
    id: "template-3",
    text: "post-workout",
    level: 0,
  },
  {
    id: "template-4",
    text: "Schedule",
    level: 0,
  },
  {
    id: "template-5",
    text: "Priority To Do",
    level: 0,
  },
  {
    id: "template-6",
    text: "Secondary",
    level: 0,
  },
];

export class DbStorage implements IStorage {
  constructor() {}

  async initialize(): Promise<void> {
    // Create default template if none exists
    const existingTemplates = await db.select().from(templates).limit(1);

    if (existingTemplates.length === 0) {
      await db.insert(templates).values({
        content: DEFAULT_TEMPLATE,
      });
    }

    // Generate notes for today + next 7 days if they don't exist
    const template = await this.getTemplate();
    if (!template) {
      throw new Error("Failed to create or retrieve template");
    }

    const today = new Date();
    for (let i = 0; i < 8; i++) {
      const date = addDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');

      const existingNote = await this.getDailyNote(dateStr);
      if (!existingNote) {
        await this.createDailyNote({
          date: dateStr,
          dayName: format(date, 'EEEE'),
          focusText: '',
          content: this.cloneTemplate(template.content),
        });
      }
    }
  }

  private cloneTemplate(content: ListItem[]): ListItem[] {
    return JSON.parse(JSON.stringify(content)).map((item: ListItem) => ({
      ...item,
      id: `note-${randomUUID()}`,
      children: item.children?.map(child => ({
        ...child,
        id: `note-${randomUUID()}`,
      })),
    }));
  }

  async getTemplate(): Promise<Template | undefined> {
    const result = await db.select().from(templates).limit(1);
    return result[0];
  }

  async updateTemplate(templateData: InsertTemplate): Promise<Template> {
    const existingTemplate = await this.getTemplate();

    let updatedTemplate: Template;

    if (existingTemplate) {
      // Update existing template
      const result = await db
        .update(templates)
        .set({
          content: templateData.content,
          updatedAt: new Date(),
        })
        .where(eq(templates.id, existingTemplate.id))
        .returning();

      updatedTemplate = result[0];
    } else {
      // Create new template
      const result = await db
        .insert(templates)
        .values({
          content: templateData.content,
        })
        .returning();

      updatedTemplate = result[0];
    }

    // Only update notes for dates strictly in the future (tomorrow+)
    // Do NOT update today's note or any notes from the past
    const now = new Date();
    const tomorrow = addDays(now, 1);
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');

    // Get all future notes (tomorrow and beyond)
    const futureNotes = await db
      .select()
      .from(dailyNotes)
      .where(gte(dailyNotes.date, tomorrowStr));

    // Update each future note with the new template
    for (const note of futureNotes) {
      await db
        .update(dailyNotes)
        .set({
          content: this.cloneTemplate(updatedTemplate.content),
          updatedAt: new Date(),
        })
        .where(eq(dailyNotes.id, note.id));
    }

    // Also ensure we have notes for the next 7 days
    for (let i = 1; i < 8; i++) {
      const futureDate = addDays(now, i);
      const dateStr = format(futureDate, 'yyyy-MM-dd');

      const existingNote = await this.getDailyNote(dateStr);
      if (!existingNote) {
        await this.createDailyNote({
          date: dateStr,
          dayName: format(futureDate, 'EEEE'),
          focusText: '',
          content: this.cloneTemplate(updatedTemplate.content),
        });
      }
    }

    return updatedTemplate;
  }

  async getDailyNote(date: string): Promise<DailyNote | undefined> {
    const result = await db
      .select()
      .from(dailyNotes)
      .where(eq(dailyNotes.date, date))
      .limit(1);

    return result[0];
  }

  async getAllDailyNotes(): Promise<DailyNote[]> {
    return await db.select().from(dailyNotes);
  }

  async createDailyNote(noteData: InsertDailyNote): Promise<DailyNote> {
    const result = await db
      .insert(dailyNotes)
      .values(noteData)
      .returning();

    return result[0];
  }

  async updateDailyNote(date: string, updates: Partial<DailyNote>): Promise<DailyNote> {
    const existingNote = await this.getDailyNote(date);

    if (!existingNote) {
      throw new Error(`Note not found for date: ${date}`);
    }

    const result = await db
      .update(dailyNotes)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(dailyNotes.date, date))
      .returning();

    return result[0];
  }
}
