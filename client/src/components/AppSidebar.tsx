import { format, addDays, isSameDay } from "date-fns";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  focusTexts: Record<string, string>;
}

export function AppSidebar({ selectedDate, onDateSelect, focusTexts }: AppSidebarProps) {
  const today = new Date();
  const dates = Array.from({ length: 8 }, (_, i) => addDays(today, i));

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <h1 className="text-xl font-semibold text-sidebar-foreground">Daily Notes</h1>
        <p className="text-metadata text-sidebar-foreground/60 mt-1">Template-based planning</p>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel>Your Days</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu data-testid="nav-day-list">
              {dates.map((date) => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const isSelected = isSameDay(date, selectedDate);
                const isToday = isSameDay(date, today);
                const focusText = focusTexts[dateStr] || '';

                return (
                  <SidebarMenuItem key={dateStr}>
                    <SidebarMenuButton
                      onClick={() => onDateSelect(date)}
                      data-testid={`button-select-day-${dateStr}`}
                      isActive={isSelected}
                      className="flex-col items-start h-auto py-3 px-4"
                    >
                      <div className="flex items-baseline justify-between w-full mb-1">
                        <span className="font-semibold text-[15px]">
                          {format(date, 'EEE M/d')}
                        </span>
                        {isToday && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                            Today
                          </span>
                        )}
                      </div>
                      {focusText && (
                        <p className="text-metadata text-sidebar-foreground/60 truncate w-full text-left">
                          {focusText}
                        </p>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-4 pt-4 border-t border-sidebar-border px-2">
          <p className="text-xs text-sidebar-foreground/50 text-center">
            Auto-generates 7 days ahead
          </p>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
