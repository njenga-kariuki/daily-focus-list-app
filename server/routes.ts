import type { Express } from "express";
import { createServer, type Server } from "http";
import { storagePromise } from "./storage";
import { format, addDays, parseISO } from "date-fns";
import type { CalendarEvent } from "@shared/schema";
import { getCalendarEvents } from "./calendarService";

export async function registerRoutes(app: Express): Promise<Server> {
  // Wait for storage to be created and then initialize it
  const storage = await storagePromise;
  await storage.initialize();

  // Get template
  app.get("/api/template", async (req, res) => {
    try {
      const template = await storage.getTemplate();
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json({ content: template.content });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch template" });
    }
  });

  // Update template
  app.put("/api/template", async (req, res) => {
    try {
      const { content } = req.body;
      if (!content || !Array.isArray(content)) {
        return res.status(400).json({ error: "Invalid template content" });
      }

      const template = await storage.updateTemplate({ content });
      res.json({ content: template.content });
    } catch (error) {
      res.status(500).json({ error: "Failed to update template" });
    }
  });

  // Get all focus texts (for sidebar) - MUST come before :date route
  app.get("/api/notes/focus-texts", async (req, res) => {
    try {
      const notes = await storage.getAllDailyNotes();
      const focusTexts: Record<string, string> = {};
      
      notes.forEach(note => {
        focusTexts[note.date] = note.focusText;
      });

      res.json(focusTexts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch focus texts" });
    }
  });

  // Get multiple days at once for continuous scroll
  app.get("/api/notes/range", async (req, res) => {
    try {
      const { start, end } = req.query;
      
      if (!start || !end) {
        return res.status(400).json({ error: "start and end dates required" });
      }

      const startDate = parseISO(start as string);
      const endDate = parseISO(end as string);
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff < 0 || daysDiff > 30) {
        return res.status(400).json({ error: "Invalid date range (max 30 days)" });
      }

      const template = await storage.getTemplate();
      if (!template) {
        return res.status(500).json({ error: "Template not found" });
      }

      const notesWithEvents = [];
      
      for (let i = 0; i <= daysDiff; i++) {
        const currentDate = addDays(startDate, i);
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        
        let note = await storage.getDailyNote(dateStr);
        
        // Create note from template if it doesn't exist
        if (!note) {
          const dayName = format(currentDate, 'EEEE');
          note = await storage.createDailyNote({
            date: dateStr,
            dayName,
            focusText: '',
            content: JSON.parse(JSON.stringify(template.content)),
          });
        }

        const events = await getCalendarEvents(dateStr);
        notesWithEvents.push({ note, events });
      }

      res.json(notesWithEvents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notes range" });
    }
  });

  // Get daily note with calendar events
  app.get("/api/notes/:date", async (req, res) => {
    try {
      const { date } = req.params;
      let note = await storage.getDailyNote(date);

      // If note doesn't exist, create it from template
      if (!note) {
        const template = await storage.getTemplate();
        if (!template) {
          return res.status(500).json({ error: "Template not found" });
        }

        const parsedDate = parseISO(date);
        const dayName = format(parsedDate, 'EEEE');
        
        note = await storage.createDailyNote({
          date,
          dayName,
          focusText: '',
          content: JSON.parse(JSON.stringify(template.content)),
        });
      }

      // Fetch real calendar events from Google Calendar
      const events: CalendarEvent[] = await getCalendarEvents(date);

      res.json({ note, events });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch note" });
    }
  });

  // Update daily note
  app.patch("/api/notes/:date", async (req, res) => {
    try {
      const { date } = req.params;
      const updates = req.body;

      const note = await storage.updateDailyNote(date, updates);
      res.json(note);
    } catch (error) {
      res.status(500).json({ error: "Failed to update note" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
