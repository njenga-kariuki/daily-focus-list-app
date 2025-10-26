# Daily Notes - Template-Based Note-Taking App

## Overview
A productivity-focused note-taking application that auto-generates daily notes from customizable templates, extending 7 days into the future. Features exceptional list-editing experience (Apple Notes quality) with Google Calendar integration.

## Purpose
Help users organize daily tasks, schedules, and notes with:
- Auto-generated daily notes from templates
- Real-time auto-save
- Google Calendar event integration
- Smooth, lag-free list editing with keyboard shortcuts

## Current State
**MVP Complete** - All core features implemented and functional

## Recent Changes (December 2024)
- ✅ Implemented complete schema with ListItem, Template, DailyNote, and CalendarEvent models
- ✅ Built all frontend components with exceptional visual quality
- ✅ Created DayNavigationSidebar with 8-day forward view
- ✅ Implemented NoteEditor with Apple Notes-quality list editing
- ✅ Added TemplateEditor with future-only update logic
- ✅ Built CalendarEventCard for schedule visualization
- ✅ Implemented auto-save indicator with debouncing
- ✅ Created all backend API endpoints
- ✅ Implemented in-memory storage with auto-initialization
- ✅ Added template management with future-date-only updates
- ✅ Mock calendar events (ready for Google Calendar API integration)

## Project Architecture

### Data Models
- **Template**: Stores the master template structure as nested ListItems
- **DailyNote**: Individual daily notes with date, focus text, and content
- **ListItem**: Recursive structure supporting multi-level nesting (up to 5 levels)
- **CalendarEvent**: Calendar events from Google Calendar (currently mocked)

### Frontend Components
- **DayNavigationSidebar**: Left sidebar showing today + 7 future days
- **NoteEditor**: Main editing area with section headers and list editing
- **ListEditor**: Apple Notes-quality list editing with Enter/Tab/Shift+Tab/Backspace
- **TemplateEditor**: Right sidebar for template customization
- **CalendarEventCard**: Displays calendar events in Schedule section
- **AutoSaveIndicator**: Shows save status (saving/saved/offline)

### Backend
- **Storage**: In-memory storage with auto-generation of 7-day forward notes
- **API Routes**:
  - `GET /api/template` - Fetch current template
  - `PUT /api/template` - Update template (future dates only)
  - `GET /api/notes/:date` - Fetch daily note with events
  - `PATCH /api/notes/:date` - Update daily note
  - `GET /api/notes/focus-texts` - Fetch all focus texts for sidebar

### Key Features
1. **Auto-Generation**: Creates notes for today + 7 days using template
2. **Template Management**: Edit template with changes applying only to future dates
3. **List Editing**: Full keyboard support (Enter, Tab, Shift+Tab, Backspace, drag-and-drop)
4. **Auto-Save**: Debounced saving (300ms) with visual status indicator
5. **Calendar Integration**: Mock events (ready for Google Calendar API)

## Design System
- **Typography**: Inter for UI, Roboto Mono for dates/times
- **Colors**: Clean blue primary (#3B82F6), neutral grays
- **Spacing**: Consistent 4/8/12/16px scale
- **Interactions**: Subtle hover elevations, smooth transitions

## Future Enhancements
- Google Calendar API integration with OAuth
- Checkbox functionality for to-do items
- Access to past days (archive view)
- Dark mode toggle
- Cross-device sync with user accounts
- Bulk template regeneration
- Search across notes

## Development
- Stack: React + TypeScript, Express, In-Memory Storage
- Build: Vite
- UI: Tailwind CSS + Shadcn UI
- State: TanStack Query
- Dates: date-fns
