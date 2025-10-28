import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import { AppSidebar } from "@/components/AppSidebar";
import { NoteEditor } from "@/components/NoteEditor";
import { TemplateEditor } from "@/components/TemplateEditor";
import { AutoSaveIndicator } from "@/components/AutoSaveIndicator";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Settings } from "lucide-react";
import type { DailyNote, ListItem, CalendarEvent } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'offline'>('saved');
  const [saveTimeout, setSaveTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();
  const dayRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const today = new Date();
  const startDate = today;
  const endDate = addDays(today, 7); // 8 days total (today + 7)

  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');

  // Fetch multiple days for continuous scroll
  const { data: notesData, isLoading } = useQuery<Array<{ note: DailyNote; events: CalendarEvent[] }>>({
    queryKey: ['/api/notes/range', startDateStr, endDateStr],
    queryFn: async () => {
      const response = await fetch(`/api/notes/range?start=${startDateStr}&end=${endDateStr}`);
      if (!response.ok) throw new Error('Failed to fetch notes');
      return response.json();
    },
  });

  // Fetch template
  const { data: templateData } = useQuery<{ content: ListItem[] }>({
    queryKey: ['/api/template'],
  });

  // Fetch all focus texts for sidebar
  const { data: focusTextsData } = useQuery<Record<string, string>>({
    queryKey: ['/api/notes/focus-texts'],
  });

  // Update note mutation
  const updateNoteMutation = useMutation({
    mutationFn: async ({ dateStr, updates }: { dateStr: string; updates: Partial<DailyNote> }) => {
      return apiRequest('PATCH', `/api/notes/${dateStr}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notes/range'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notes/focus-texts'] });
      setSaveStatus('saved');
    },
    onError: () => {
      setSaveStatus('offline');
      toast({
        title: "Save failed",
        description: "Your changes couldn't be saved. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async (content: ListItem[]) => {
      return apiRequest('PUT', '/api/template', { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/template'] });
      toast({
        title: "Template updated",
        description: "Changes will apply to future dates only.",
      });
      setIsTemplateEditorOpen(false);
    },
    onError: () => {
      toast({
        title: "Template update failed",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Debounced auto-save (now accepts dateStr)
  const handleNoteChange = useCallback((dateStr: string, updates: Partial<DailyNote>) => {
    setSaveStatus('saving');
    
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    const timeout = setTimeout(() => {
      updateNoteMutation.mutate({ dateStr, updates });
    }, 100);  // Reduced to 100ms for ultra-snappy feel

    setSaveTimeout(timeout);
  }, [saveTimeout, updateNoteMutation]);

  const handleTemplateOpen = () => {
    setIsTemplateEditorOpen(true);
  };

  const handleTemplateSave = (template: ListItem[]) => {
    updateTemplateMutation.mutate(template);
  };

  // Scroll spy: Update selected date based on which day is in view
  useEffect(() => {
    if (!notesData) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const dateStr = entry.target.id.replace('day-', '');
            const date = new Date(dateStr);
            setSelectedDate(date);
          }
        });
      },
      {
        threshold: [0.5],
        rootMargin: '-100px 0px -50% 0px',
      }
    );

    Object.values(dayRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      observer.disconnect();
    };
  }, [notesData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background w-full">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your notes...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Day Navigation Sidebar */}
      <AppSidebar
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        focusTexts={focusTextsData || {}}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-background sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <h2 className="font-semibold text-foreground">
              Daily Notes
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <AutoSaveIndicator status={saveStatus} />
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleTemplateOpen}
              data-testid="button-open-template"
            >
              <Settings className="w-4 h-4 mr-2" />
              Edit Template
            </Button>
          </div>
        </header>

        {/* Continuous Scroll: Multiple Note Editors */}
        <div className="flex-1 overflow-y-auto">
          {notesData && notesData.map(({ note }) => (
            <div
              key={note.date}
              id={`day-${note.date}`}
              ref={(el) => { dayRefs.current[note.date] = el; }}
            >
              <NoteEditor
                note={note}
                onNoteChange={(updates) => handleNoteChange(note.date, updates)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Template Editor (Right Sidebar) */}
      {isTemplateEditorOpen && templateData && (
        <TemplateEditor
          template={templateData.content}
          onSave={handleTemplateSave}
          onClose={() => setIsTemplateEditorOpen(false)}
        />
      )}
    </>
  );
}
