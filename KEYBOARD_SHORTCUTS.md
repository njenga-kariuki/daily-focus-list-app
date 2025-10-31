# Keyboard Shortcuts Guide

This document outlines all keyboard shortcuts available in the Daily Focus List App, matching best practices from apps like Apple Notes and Notion.

## Core Editing

| Shortcut | Action | Description |
|----------|--------|-------------|
| **Enter** | New item | Creates a new list item below the current one. Text after cursor moves to new item. |
| **Shift+Enter** | Line break | Inserts a line break within the current item (soft return). |
| **Backspace** | Smart delete | At start of empty item: outdents or deletes. At start of text: merges with previous item. |
| **Delete** | Forward delete | At end of item: merges next item into current one. |

## Indentation

| Shortcut | Action | Description |
|----------|--------|-------------|
| **Tab** | Indent | Increases indent level (max 5 levels). |
| **Shift+Tab** | Outdent | Decreases indent level (min 0). |
| **Cmd+]** or **Ctrl+]** | Indent (alternative) | Modern editor-style indent shortcut. |
| **Cmd+[** or **Ctrl+[** | Outdent (alternative) | Modern editor-style outdent shortcut. |

## Navigation

| Shortcut | Action | Description |
|----------|--------|-------------|
| **Up Arrow** | Navigate up | When at line start, moves to previous item (end of text). |
| **Down Arrow** | Navigate down | When at line end, moves to next item (start of text). |
| **Left Arrow** | Navigate left | When at item start, moves to previous item (end of text). |
| **Right Arrow** | Navigate right | When at item end, moves to next item (start of text). |

## Item Manipulation

| Shortcut | Action | Description |
|----------|--------|-------------|
| **Cmd+Shift+Up** or **Ctrl+Shift+Up** | Move item up | Swaps current item with the one above it. |
| **Cmd+Shift+Down** or **Ctrl+Shift+Down** | Move item down | Swaps current item with the one below it. |
| **Cmd+D** or **Ctrl+D** | Duplicate item | Creates a copy of the current item (including children) below it. |
| **Cmd+Shift+Backspace** or **Ctrl+Shift+Backspace** | Delete item | Deletes the entire current item and focuses the next/previous item. |

## Undo/Redo

| Shortcut | Action | Description |
|----------|--------|-------------|
| **Cmd+Z** or **Ctrl+Z** | Undo | Undoes the last change to the list content. |
| **Cmd+Shift+Z** or **Ctrl+Shift+Z** | Redo | Redoes the last undone change. |
| **Cmd+Y** or **Ctrl+Y** | Redo (alternative) | Alternative redo shortcut (Windows-style). |

## Other

| Shortcut | Action | Description |
|----------|--------|-------------|
| **Escape** | Unfocus | Blurs the current item, removing focus. |
| **Cmd+A** or **Ctrl+A** | Select all | Selects all text in current item (native behavior). |
| **Cmd+C / X / V** or **Ctrl+C / X / V** | Copy/Cut/Paste | Standard clipboard operations (native behavior). |

## Features Implemented

### ✅ Fixed Bugs
- **Enter key cursor movement**: Fixed timing issue where cursor wasn't moving to new line after pressing Enter
- **Undo/Redo**: Implemented comprehensive history tracking with 100-item limit per note

### ✅ New Keyboard Shortcuts
- **Cmd+[ / Cmd+]**: Alternative indent/outdent (matching modern editors like VS Code, Notion)
- **Cmd+Shift+Up/Down**: Move items up/down (essential for reordering)
- **Cmd+D**: Duplicate item (common in many editors)
- **Cmd+Shift+Backspace**: Delete entire item (quick cleanup)
- **Escape**: Unfocus current item (common UX pattern)

### ✅ UX Improvements
- Double `requestAnimationFrame` pattern ensures cursor reliably moves to new items
- Cursor position is preserved during indent/outdent operations
- Smart focus management after item deletion
- History resets when switching between different notes

## Platform Compatibility

- **Mac**: Use `Cmd` (⌘) key for all shortcuts
- **Windows/Linux**: Use `Ctrl` key for all shortcuts
- All shortcuts work consistently across platforms

## Best Practices Implemented

This implementation matches or exceeds the keyboard shortcut functionality found in:
- **Apple Notes**: Core editing, navigation, and undo/redo
- **Notion**: Advanced shortcuts like Cmd+[/], Cmd+D, item movement
- **VS Code**: Modern editor patterns for indentation and duplication
- **Standard text editors**: Native clipboard and selection behavior

## History Management

The undo/redo system:
- Tracks up to 100 previous states per note
- Automatically resets when switching notes
- Compares state using JSON serialization to avoid duplicate entries
- Clears future history when making new changes after undo
