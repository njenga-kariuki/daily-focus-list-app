# Design Guidelines: Daily Template Note-Taking App

## Design Approach: Apple HIG-Inspired System

**Rationale**: This productivity-focused application prioritizes efficiency, clarity, and exceptional interaction quality. Drawing from Apple Human Interface Guidelines ensures a content-first approach with emphasis on typography hierarchy, clean spacing, and intuitive list management—perfectly aligned with the "Apple Notes-quality" editing requirement.

## Core Design Principles

1. **Content-First Philosophy**: Interface elements serve the content, never compete with it
2. **Immediate Clarity**: User's current day, template structure, and calendar events instantly recognizable
3. **Fluid Interactions**: Every keystroke, tap, and transition feels instant and natural
4. **Adaptive Simplicity**: Interface complexity scales with user actions—dormant when typing, supportive when navigating

---

## Typography System

**Primary Font**: Inter (via Google Fonts CDN)
**Secondary Font**: SF Mono or Roboto Mono for date headers

### Hierarchy
- **Day Headers**: 28px/700 weight, tracking tight (-0.02em)
- **Section Headers** (Schedule, Priority To Do): 16px/600 weight, uppercase tracking (0.05em), opacity-70
- **List Items**: 15px/400 weight, line-height 1.6
- **Nested List Items**: 14px/400 weight, line-height 1.5
- **Calendar Event Times**: 13px/500 weight, tabular numbers
- **Metadata** (focus text, timestamps): 13px/400 weight, opacity-60

---

## Layout System

**Spacing Primitives**: Tailwind units of **2, 4, 8, 12, 16**

### Application Structure
- **Three-panel layout (desktop)**:
  - Left sidebar: Day navigation (240px fixed width, p-4)
  - Center panel: Active note editing area (max-w-3xl, px-8, py-12)
  - Right sidebar: Template editor (280px, collapsible, p-4)
  
- **Mobile**: Single-panel with bottom navigation for day switching, slide-up template editor

### Spacing Conventions
- Section vertical spacing: mb-12
- List item spacing: py-2
- Nested list indentation: pl-8
- Panel padding: p-4 (mobile), p-8 (desktop)
- Header to content: mb-8

---

## Component Library

### 1. Day Navigation (Left Sidebar - Desktop)
- Vertical list of 8 days (today + 7 future)
- Each day: rounded-lg card with p-4, subtle border
- Active day: filled background, bold typography
- Hover state: subtle background lift
- Day format: "Mon 12/25" on first line, focus text below in smaller, muted type

### 2. Note Editor (Center Panel)
**Header Section**:
- Large day name + date (28px)
- Custom focus text as editable inline field (underlined on hover)
- Divider line below (opacity-20)

**List Editing Interface**:
- Bullet character: "•" for L1, "◦" for L2, "-" for L3+
- Indentation visual guide: subtle vertical line connecting nested items
- Drag handles: Six-dot icon appearing on hover (left of bullet)
- Active editing: subtle highlight on current line background
- Empty bullet: placeholder text "Type or press Enter to add..."

**Template Sections**:
- Section headers: all-caps, tracked, with horizontal rule extending right
- Collapsible sections with chevron icon
- Pre-populated schedule section styled distinctly (lighter background block)

### 3. Calendar Events (Schedule Section)
- Time-blocked cards with rounded corners
- Event structure: Time on left (13px mono), title on right
- All-day events: full-width banner style at top
- Multi-event stacking with 2px gaps
- Calendar source indicator: subtle colored bar on left edge

### 4. Template Editor (Right Sidebar)
- "Edit Template" header with save/cancel actions
- Live preview of template structure
- Editable bullet hierarchy with same interaction model as notes
- Warning banner when editing: "Changes apply to future dates only"
- Collapsed by default on mobile, expandable modal

### 5. Navigation & Controls
**Top Bar** (mobile):
- Hamburger menu (day selector)
- Current day indicator (center)
- Template edit icon (right)

**Keyboard Shortcuts Panel** (accessible via "?" key):
- Floating modal with shortcut reference
- Organized by category: Navigation, Editing, Formatting

### 6. Auto-Save Indicator
- Subtle status text in top-right corner
- States: "Saving...", "Saved", "Offline"
- Fades to near-invisible when idle

---

## Interaction Design

### List Editing Behaviors
- **Enter**: New bullet at same level, cursor positioned after bullet
- **Tab**: Indent current bullet, increase nesting level
- **Shift+Tab**: Outdent, decrease nesting level
- **Backspace on empty bullet**: Delete bullet, merge with previous
- **Drag & Drop**: Hover state shows insertion line, maintains nesting level unless Shift held
- **Click bullet**: Select entire line
- **Double-click bullet**: Toggle collapse of nested items

### Micro-interactions
- Focus ring: 2px solid with subtle glow
- Selection highlight: semi-transparent overlay
- Drag preview: slightly elevated with shadow, 90% opacity
- Template change warning: slide-down banner animation
- Day transition: content cross-fade (200ms)

### Mobile Adaptations
- Touch targets: minimum 44px height
- Swipe gestures: Left swipe on day for quick delete, right swipe to mark complete
- Long-press: Activate drag mode for reordering
- Pinch-to-zoom disabled for focused editing experience
- Floating action button for template access

---

## Responsive Breakpoints

- **Mobile**: < 768px (single column, bottom nav, slide-up modals)
- **Tablet**: 768px - 1024px (two columns: notes + collapsible sidebar)
- **Desktop**: > 1024px (three columns: navigation, notes, template)

---

## Accessibility Specifications

- Semantic HTML: `<main>`, `<aside>`, `<nav>`, `<article>` for structure
- ARIA labels on all interactive elements
- Keyboard navigation: Tab order follows visual hierarchy
- Focus indicators: Clearly visible, never removed
- Screen reader announcements: Auto-save status, day changes, template modifications
- Reduced motion: Respect `prefers-reduced-motion` for all animations
- Contrast ratio: Minimum 4.5:1 for all text, 3:1 for interactive elements

---

## Performance Considerations

- Virtual scrolling for day list if extended beyond 30 days
- Debounced auto-save (300ms after last keystroke)
- Optimistic UI updates for instant perceived performance
- Lazy-load calendar events only for visible date range
- Local-first architecture: IndexedDB for offline functionality

---

**Critical Success Metrics**: Zero perceived input lag, one-tap day switching, drag-and-drop success rate >95%, template changes applied without data loss.