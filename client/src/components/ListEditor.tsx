import { useState, useRef, type KeyboardEvent, type DragEvent, type FormEvent } from "react";
import { GripVertical, Plus } from "lucide-react";
import type { ListItem } from "@shared/schema";

interface ListEditorProps {
  items: ListItem[];
  onChange: (items: ListItem[]) => void;
  className?: string;
}

export function ListEditor({ items, onChange, className = "" }: ListEditorProps) {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const updateItem = (id: string, updates: Partial<ListItem>) => {
    const updateRecursive = (items: ListItem[]): ListItem[] => {
      return items.map(item => {
        if (item.id === id) {
          return { ...item, ...updates };
        }
        if (item.children) {
          return { ...item, children: updateRecursive(item.children) };
        }
        return item;
      });
    };
    onChange(updateRecursive(items));
  };

  const deleteItem = (id: string) => {
    const deleteRecursive = (items: ListItem[]): ListItem[] => {
      return items.filter(item => {
        if (item.id === id) return false;
        if (item.children) {
          item.children = deleteRecursive(item.children);
        }
        return true;
      });
    };
    onChange(deleteRecursive(items));
  };

  const addItemAfter = (id: string, newItem: ListItem) => {
    const addRecursive = (items: ListItem[]): ListItem[] => {
      const result: ListItem[] = [];
      for (const item of items) {
        result.push(item);
        if (item.id === id) {
          result.push(newItem);
        }
        if (item.children) {
          item.children = addRecursive(item.children);
        }
      }
      return result;
    };
    onChange(addRecursive(items));
  };

  const moveItem = (dragId: string, targetId: string) => {
    let draggedItem: ListItem | null = null;
    
    // Find and remove dragged item
    const removeRecursive = (items: ListItem[]): ListItem[] => {
      return items.filter(item => {
        if (item.id === dragId) {
          draggedItem = item;
          return false;
        }
        if (item.children) {
          item.children = removeRecursive(item.children);
        }
        return true;
      });
    };

    // Insert before target
    const insertRecursive = (items: ListItem[]): ListItem[] => {
      const result: ListItem[] = [];
      for (const item of items) {
        if (item.id === targetId && draggedItem) {
          result.push(draggedItem);
        }
        result.push(item);
        if (item.children) {
          item.children = insertRecursive(item.children);
        }
      }
      return result;
    };

    const withoutDragged = removeRecursive([...items]);
    const withInserted = insertRecursive(withoutDragged);
    onChange(withInserted);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>, item: ListItem) => {
    const target = e.target as HTMLDivElement;
    
    // Enter: Create new item at same level
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const newItem: ListItem = {
        id: `item-${Date.now()}`,
        text: '',
        level: item.level,
      };
      addItemAfter(item.id, newItem);
      setTimeout(() => {
        const newElement = itemRefs.current.get(newItem.id);
        newElement?.focus();
      }, 10);
    }

    // Tab: Indent (increase level)
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      if (item.level < 5) {
        updateItem(item.id, { level: item.level + 1 });
      }
    }

    // Shift+Tab: Outdent (decrease level)
    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      if (item.level > 0) {
        updateItem(item.id, { level: item.level - 1 });
      }
    }

    // Backspace on empty item: Delete and focus previous
    if (e.key === 'Backspace' && target.textContent === '') {
      e.preventDefault();
      deleteItem(item.id);
    }
  };

  const handleInput = (e: FormEvent<HTMLDivElement>, item: ListItem) => {
    const target = e.target as HTMLDivElement;
    updateItem(item.id, { text: target.textContent || '' });
  };

  const handleDragStart = (e: DragEvent<HTMLButtonElement>, item: ListItem) => {
    setDraggedId(item.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, item: ListItem) => {
    e.preventDefault();
    if (draggedId && draggedId !== item.id) {
      setDragOverId(item.id);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, item: ListItem) => {
    e.preventDefault();
    if (draggedId && draggedId !== item.id) {
      moveItem(draggedId, item.id);
    }
    setDraggedId(null);
    setDragOverId(null);
  };

  const renderItem = (item: ListItem, index: number) => {
    const bulletChar = item.level === 0 ? '•' : item.level === 1 ? '◦' : '−';
    const indentPx = item.level * 32;
    const isDragging = draggedId === item.id;
    const isDropTarget = dragOverId === item.id;

    return (
      <div
        key={item.id}
        className={`group relative ${isDragging ? 'opacity-50' : ''} ${isDropTarget ? 'border-t-2 border-primary' : ''}`}
        style={{ paddingLeft: `${indentPx}px` }}
        onDragOver={(e) => handleDragOver(e, item)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, item)}
        data-testid={`list-item-${item.id}`}
      >
        <div className="flex items-start gap-2 py-2">
          {/* Drag handle */}
          <button
            className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 hover-elevate rounded"
            data-testid={`button-drag-${item.id}`}
            draggable
            onDragStart={(e) => handleDragStart(e, item)}
            onDragEnd={() => setDraggedId(null)}
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Bullet */}
          <span className="text-foreground/60 select-none mt-1 text-list-item" data-testid={`bullet-${item.id}`}>
            {bulletChar}
          </span>

          {/* Editable content */}
          <div
            ref={el => {
              if (el) {
                itemRefs.current.set(item.id, el);
                // Ensure content is synced if it differs from item.text
                if (el.textContent !== item.text) {
                  el.textContent = item.text;
                }
              }
            }}
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => handleInput(e, item)}
            onKeyDown={(e) => handleKeyDown(e, item)}
            onFocus={() => setFocusedId(item.id)}
            onBlur={() => setFocusedId(null)}
            data-testid={`input-list-item-${item.id}`}
            data-placeholder={item.text === '' ? 'Type or press Enter to add...' : undefined}
            className={`
              flex-1 outline-none rounded px-2 py-1 -ml-2
              ${item.level === 0 ? 'text-list-item' : 'text-list-nested'}
              ${focusedId === item.id ? 'bg-accent/30' : ''}
              transition-colors
            `}
          />
        </div>

        {/* Nested children */}
        {item.children && item.children.length > 0 && (
          <div className="border-l-2 border-border/50 ml-2">
            {item.children.map((child, idx) => renderItem(child, idx))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`space-y-1 ${className}`} data-testid="component-list-editor">
      {items.map((item, index) => renderItem(item, index))}
      
      {items.length === 0 && (
        <button
          onClick={() => {
            const newItem: ListItem = {
              id: `item-${Date.now()}`,
              text: '',
              level: 0,
            };
            onChange([newItem]);
            setTimeout(() => {
              const newElement = itemRefs.current.get(newItem.id);
              newElement?.focus();
            }, 10);
          }}
          data-testid="button-add-first-item"
          className="flex items-center gap-2 text-muted-foreground hover-elevate active-elevate-2 p-3 rounded-md w-full"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">Add first item</span>
        </button>
      )}
    </div>
  );
}
