import { useState } from "react";
import { ListEditor } from "./ListEditor";
import type { ListItem } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X, Save, AlertTriangle } from "lucide-react";

interface TemplateEditorProps {
  template: ListItem[];
  onSave: (template: ListItem[]) => void;
  onClose: () => void;
}

export function TemplateEditor({ template, onSave, onClose }: TemplateEditorProps) {
  const [editedTemplate, setEditedTemplate] = useState<ListItem[]>(template);
  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = (newTemplate: ListItem[]) => {
    setEditedTemplate(newTemplate);
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(editedTemplate);
    setHasChanges(false);
  };

  return (
    <aside className="w-80 bg-sidebar border-l border-sidebar-border p-4 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-sidebar-foreground">Edit Template</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          data-testid="button-close-template"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Warning Banner */}
      <Alert className="mb-6 bg-muted/50 border-muted-border">
        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        <AlertDescription className="text-sm text-muted-foreground">
          Changes apply to future dates only. Existing notes remain unchanged.
        </AlertDescription>
      </Alert>

      {/* Template Editor */}
      <div className="flex-1 overflow-y-auto mb-6 pr-2" data-testid="component-template-editor">
        <ListEditor
          items={editedTemplate}
          onChange={handleChange}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t border-sidebar-border">
        <Button
          variant="outline"
          onClick={onClose}
          className="flex-1"
          data-testid="button-cancel-template"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!hasChanges}
          className="flex-1"
          data-testid="button-save-template"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Template
        </Button>
      </div>
    </aside>
  );
}
