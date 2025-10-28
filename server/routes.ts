import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { format, addDays, parseISO } from "date-fns";
import type { CalendarEvent } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize storage with default template and notes
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

        const events = generateMockEvents(dateStr);
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

      // Mock calendar events (would integrate with Google Calendar API)
      const events: CalendarEvent[] = generateMockEvents(date);

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

// Mock calendar events generator (placeholder for Google Calendar integration)
function generateMockEvents(dateStr: string): CalendarEvent[] {
  const date = parseISO(dateStr);
  const today = new Date();
  
  // Only generate events for today and tomorrow as examples
  if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
    return [
      {
        id: "event-1",
        title: "Team Standup",
        startTime: new Date(date.setHours(9, 0, 0)).toISOString(),
        endTime: new Date(date.setHours(9, 30, 0)).toISOString(),
        isAllDay: false,
        source: "google",
      },
      {
        id: "event-2",
        title: "Project Review",
        startTime: new Date(date.setHours(14, 0, 0)).toISOString(),
        endTime: new Date(date.setHours(15, 0, 0)).toISOString(),
        isAllDay: false,
        source: "google",
      },
    ];
  }

  if (format(date, 'yyyy-MM-dd') === format(addDays(today, 1), 'yyyy-MM-dd')) {
    return [
      {
        id: "event-3",
        title: "Client Meeting",
        startTime: new Date(date.setHours(10, 0, 0)).toISOString(),
        endTime: new Date(date.setHours(11, 30, 0)).toISOString(),
        isAllDay: false,
        source: "google",
      },
    ];
  }

  return [];
}
