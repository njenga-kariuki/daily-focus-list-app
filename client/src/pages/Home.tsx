import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
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

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  // Fetch current note
  const { data: noteData, isLoading } = useQuery<{ note: DailyNote; events: CalendarEvent[] }>({
    queryKey: ['/api/notes', dateStr],
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
    mutationFn: async (updates: Partial<DailyNote>) => {
      return apiRequest('PATCH', `/api/notes/${dateStr}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notes', dateStr] });
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

  // Debounced auto-save
  const handleNoteChange = useCallback((updates: Partial<DailyNote>) => {
    setSaveStatus('saving');
    
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    const timeout = setTimeout(() => {
      updateNoteMutation.mutate(updates);
    }, 300);

    setSaveTimeout(timeout);
  }, [saveTimeout, updateNoteMutation]);

  const handleTemplateOpen = () => {
    setIsTemplateEditorOpen(true);
  };

  const handleTemplateSave = (template: ListItem[]) => {
    updateTemplateMutation.mutate(template);
  };

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
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
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

        {/* Note Editor */}
        {noteData && (
          <NoteEditor
            note={noteData.note}
            events={noteData.events}
            onNoteChange={handleNoteChange}
          />
        )}
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
