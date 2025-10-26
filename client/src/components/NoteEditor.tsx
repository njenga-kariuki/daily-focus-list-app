import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ListEditor } from "./ListEditor";
import { CalendarEventCard } from "./CalendarEventCard";
import type { DailyNote, ListItem, CalendarEvent } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

interface NoteEditorProps {
  note: DailyNote;
  events: CalendarEvent[];
  onNoteChange: (updates: Partial<DailyNote>) => void;
}

export function NoteEditor({ note, events, onNoteChange }: NoteEditorProps) {
  const [focusText, setFocusText] = useState(note.focusText);

  useEffect(() => {
    setFocusText(note.focusText);
  }, [note.focusText]);

  const handleFocusTextBlur = () => {
    if (focusText !== note.focusText) {
      onNoteChange({ focusText });
    }
  };

  const handleContentChange = (newContent: ListItem[]) => {
    onNoteChange({ content: newContent });
  };

  // Find "Schedule" section in content
  const scheduleIndex = note.content.findIndex(
    item => item.text.toLowerCase() === 'schedule'
  );

  return (
    <div className="flex-1 overflow-y-auto px-8 py-12 max-w-3xl mx-auto" data-testid="component-note-editor">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-baseline gap-3 mb-4">
          <h1 className="text-header-day text-foreground">
            {note.dayName} {format(new Date(note.date), 'M/d')}
          </h1>
        </div>
        
        <Input
          type="text"
          value={focusText}
          onChange={(e) => setFocusText(e.target.value)}
          onBlur={handleFocusTextBlur}
          placeholder="Add focus text..."
          data-testid="input-focus-text"
          className="text-base border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary transition-colors"
        />
        
        <Separator className="mt-6 opacity-20" />
      </header>

      {/* Content */}
      <div className="space-y-12">
        {note.content.map((section, index) => {
          const isScheduleSection = section.text.toLowerCase() === 'schedule';
          
          return (
            <section key={section.id} className="space-y-4">
              {/* Section Header */}
              <div className="flex items-center gap-4">
                <h2 className="text-section-header uppercase text-foreground/70 tracking-wider">
                  {section.text}
                </h2>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Calendar Events for Schedule section */}
              {isScheduleSection && events.length > 0 && (
                <div className="space-y-2 mb-6 ml-8">
                  {events.map(event => (
                    <CalendarEventCard key={event.id} event={event} />
                  ))}
                </div>
              )}

              {/* Editable Content */}
              {section.children && section.children.length > 0 && (
                <div className="ml-8">
                  <ListEditor
                    items={section.children}
                    onChange={(newChildren) => {
                      const newContent = [...note.content];
                      newContent[index] = { ...section, children: newChildren };
                      handleContentChange(newContent);
                    }}
                  />
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
