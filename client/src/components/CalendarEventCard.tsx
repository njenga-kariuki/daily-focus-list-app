import { format, parseISO } from "date-fns";
import type { CalendarEvent } from "@shared/schema";
import { Calendar, Clock } from "lucide-react";

interface CalendarEventCardProps {
  event: CalendarEvent;
}

export function CalendarEventCard({ event }: CalendarEventCardProps) {
  const startTime = parseISO(event.startTime);
  const endTime = parseISO(event.endTime);

  if (event.isAllDay) {
    return (
      <div
        className="flex items-center gap-3 p-3 rounded-md bg-muted/50 border border-muted-border"
        data-testid={`card-event-${event.id}`}
      >
        <div className="flex-shrink-0">
          <Calendar className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-list-item font-medium text-foreground truncate">
            {event.title}
          </p>
          <p className="text-metadata text-muted-foreground">All day</p>
        </div>
        <div className="h-full w-1 bg-primary rounded-full flex-shrink-0" />
      </div>
    );
  }

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-md bg-card border border-card-border hover-elevate"
      data-testid={`card-event-${event.id}`}
    >
      <div className="flex-shrink-0 min-w-[70px]">
        <div className="flex items-center gap-1 text-event-time font-mono text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{format(startTime, 'h:mm a')}</span>
        </div>
        <div className="text-event-time font-mono text-muted-foreground/60 ml-4">
          {format(endTime, 'h:mm a')}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-list-item font-medium text-card-foreground">
          {event.title}
        </p>
      </div>
      <div className="h-full w-1 bg-primary rounded-full flex-shrink-0" />
    </div>
  );
}
