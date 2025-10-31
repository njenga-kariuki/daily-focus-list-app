import type { Template, InsertTemplate, DailyNote, InsertDailyNote, ListItem } from "@shared/schema";
import { randomUUID } from "crypto";
import { format, addDays } from "date-fns";

export interface IStorage {
  // Template operations
  getTemplate(): Promise<Template | undefined>;
  updateTemplate(template: InsertTemplate): Promise<Template>;
  
  // Daily Note operations
  getDailyNote(date: string): Promise<DailyNote | undefined>;
  getAllDailyNotes(): Promise<DailyNote[]>;
  createDailyNote(note: InsertDailyNote): Promise<DailyNote>;
  updateDailyNote(date: string, updates: Partial<DailyNote>): Promise<DailyNote>;
  
  // Initialize with default template and generate initial notes
  initialize(): Promise<void>;
}

const DEFAULT_TEMPLATE: ListItem[] = [
  {
    id: "template-1",
    text: "Preworkout",
    level: 0,
    children: [
      { id: "template-1-1", text: "Text Mom", level: 1 },
      { id: "template-1-2", text: "Talk to Alyssa", level: 1 },
      { id: "template-1-3", text: "Work", level: 1 },
    ],
  },
  {
    id: "template-2",
    text: "Workout Post Workout",
    level: 0,
  },
  {
    id: "template-3",
    text: "Schedule",
    level: 0,
  },
  {
    id: "template-4",
    text: "Priority To Do",
    level: 0,
  },
  {
    id: "template-5",
    text: "Secondary",
    level: 0,
  },
];

export class MemStorage implements IStorage {
  private template: Template | null = null;
  private dailyNotes: Map<string, DailyNote> = new Map();

  constructor() {}

  async initialize(): Promise<void> {
    // Create default template if none exists
    if (!this.template) {
      this.template = {
        id: randomUUID(),
        content: DEFAULT_TEMPLATE,
        updatedAt: new Date(),
      };
    }

    // Generate notes for today + next 7 days
    const today = new Date();
    for (let i = 0; i < 8; i++) {
      const date = addDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      if (!this.dailyNotes.has(dateStr)) {
        await this.createDailyNote({
          date: dateStr,
          dayName: format(date, 'EEEE'),
          focusText: '',
          content: this.cloneTemplate(this.template.content),
        });
      }
    }
  }

  private cloneTemplate(content: ListItem[]): ListItem[] {
    const cloneItems = (items: ListItem[]): ListItem[] => {
      return items.map((item) => ({
        ...item,
        id: `note-${randomUUID()}`,
        children: item.children ? cloneItems(item.children) : undefined,
      }));
    };

    return cloneItems(content);
  }

  async getTemplate(): Promise<Template | undefined> {
    return this.template || undefined;
  }

  async updateTemplate(templateData: InsertTemplate): Promise<Template> {
    const template: Template = {
      id: this.template?.id || randomUUID(),
      content: templateData.content as ListItem[],
      updatedAt: new Date(),
    };
    this.template = template;

    // Only update notes for dates strictly in the future (tomorrow+)
    // Do NOT update today's note or any notes from the past
    const now = new Date();
    const tomorrow = addDays(now, 1);
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
    
    // Update all notes in storage that are for future dates (tomorrow or later)
    this.dailyNotes.forEach((note, dateStr) => {
      // Only update if the note's date is >= tomorrow
      if (dateStr >= tomorrowStr) {
        note.content = this.cloneTemplate(template.content);
        note.updatedAt = new Date();
      }
    });

    // Also ensure we have notes for the next 7 days
    for (let i = 1; i < 8; i++) {
      const futureDate = addDays(now, i);
      const dateStr = format(futureDate, 'yyyy-MM-dd');
      
      if (!this.dailyNotes.has(dateStr)) {
        await this.createDailyNote({
          date: dateStr,
          dayName: format(futureDate, 'EEEE'),
          focusText: '',
          content: this.cloneTemplate(template.content),
        });
      }
    }

    return template;
  }

  async getDailyNote(date: string): Promise<DailyNote | undefined> {
    return this.dailyNotes.get(date);
  }

  async getAllDailyNotes(): Promise<DailyNote[]> {
    return Array.from(this.dailyNotes.values());
  }

  async createDailyNote(noteData: InsertDailyNote): Promise<DailyNote> {
    const note: DailyNote = {
      id: randomUUID(),
      ...noteData,
      focusText: noteData.focusText ?? '',
      content: noteData.content as ListItem[],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.dailyNotes.set(noteData.date, note);
    return note;
  }

  async updateDailyNote(date: string, updates: Partial<DailyNote>): Promise<DailyNote> {
    const existingNote = this.dailyNotes.get(date);
    if (!existingNote) {
      throw new Error(`Note not found for date: ${date}`);
    }

    const updatedNote: DailyNote = {
      ...existingNote,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.dailyNotes.set(date, updatedNote);
    return updatedNote;
  }
}

export const storage = new MemStorage();
