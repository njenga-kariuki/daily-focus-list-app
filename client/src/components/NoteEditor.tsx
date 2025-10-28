import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { ListEditor, type ListEditorRef } from "./ListEditor";
import type { DailyNote, ListItem } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

interface NoteEditorProps {
  note: DailyNote;
  onNoteChange: (updates: Partial<DailyNote>) => void;
}

export function NoteEditor({ note, onNoteChange }: NoteEditorProps) {
  const [focusText, setFocusText] = useState(note.focusText);
  const listEditorRef = useRef<ListEditorRef>(null);

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

  // Handle clicks in strategic empty space areas only
  const handleEmptySpaceClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (note.content.length === 0) {
      // Create first item
      const newItem: ListItem = {
        id: `item-${Date.now()}`,
        text: '',
        level: 0,
      };
      onNoteChange({ content: [newItem] });
      
      // Focus it after render
      requestAnimationFrame(() => {
        listEditorRef.current?.focusLastItem();
      });
    } else {
      // Focus FIRST item (zone is at top, not bottom)
      requestAnimationFrame(() => {
        listEditorRef.current?.focusFirstItem();
      });
    }
  };

  return (
    <div 
      className="flex-1 overflow-y-auto px-8 py-3 max-w-3xl mx-auto" 
      data-testid="component-note-editor"
    >
      {/* Header - text is selectable, no item creation */}
      <header className="mb-2">
        <div className="flex items-baseline gap-3 mb-2">
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
        
        <Separator className="mt-2 opacity-20" />
      </header>

      {/* Strategic clickable zone between header and content */}
      <div 
        className="min-h-[8px] cursor-text hover:bg-accent/5 transition-colors rounded"
        onClick={handleEmptySpaceClick}
        title="Click to start typing"
      />

      {/* Content - Single unified list editor */}
      <div>
        <ListEditor
          ref={listEditorRef}
          items={note.content}
          onChange={handleContentChange}
        />
      </div>
    </div>
  );
}
