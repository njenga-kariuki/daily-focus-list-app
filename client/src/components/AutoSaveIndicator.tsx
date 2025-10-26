import { Check, Cloud, CloudOff } from "lucide-react";

interface AutoSaveIndicatorProps {
  status: 'saving' | 'saved' | 'offline';
}

export function AutoSaveIndicator({ status }: AutoSaveIndicatorProps) {
  if (status === 'saved') {
    return (
      <div className="flex items-center gap-2 text-muted-foreground/60" data-testid="indicator-autosave">
        <Check className="w-3 h-3" />
        <span className="text-xs">Saved</span>
      </div>
    );
  }

  if (status === 'saving') {
    return (
      <div className="flex items-center gap-2 text-muted-foreground" data-testid="indicator-autosave">
        <Cloud className="w-3 h-3 animate-pulse" />
        <span className="text-xs">Saving...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-muted-foreground" data-testid="indicator-autosave">
      <CloudOff className="w-3 h-3" />
      <span className="text-xs">Offline</span>
    </div>
  );
}
