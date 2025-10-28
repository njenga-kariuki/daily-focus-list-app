import { useState, useRef, useCallback, memo, useImperativeHandle, forwardRef, type KeyboardEvent, type FormEvent, type MouseEvent } from "react";
import type { ListItem } from "@shared/schema";

interface ListEditorProps {
  items: ListItem[];
  onChange: (items: ListItem[]) => void;
  className?: string;
}

export interface ListEditorRef {
  focusLastItem: () => void;
  focusFirstItem: () => void;
  createAndFocusNewItem: () => void;
}

export const ListEditor = forwardRef<ListEditorRef, ListEditorProps>(({ items, onChange, className = "" }, ref) => {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Optimized batched update: update item text and add new item in single state change
  const updateAndAddAfter = (id: string, updates: Partial<ListItem>, newItem: ListItem) => {
    const processRecursive = (items: ListItem[]): ListItem[] => {
      const result: ListItem[] = [];
      for (const item of items) {
        // If this is the item to update
        if (item.id === id) {
          // Push the updated item, preserving children
          const updatedItem = { ...item, ...updates };
          if (item.children) {
            updatedItem.children = item.children;
          }
          result.push(updatedItem);
          result.push(newItem);
        } else {
          // Otherwise, push the item and recurse into children
          const processedItem = { ...item };
          if (item.children) {
            processedItem.children = processRecursive(item.children);
          }
          result.push(processedItem);
        }
      }
      return result;
    };
    onChange(processRecursive(items));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>, item: ListItem) => {
    const target = e.target as HTMLDivElement;
    
    // Shift+Enter: Insert line break within item
    if (e.key === 'Enter' && e.shiftKey) {
      // Allow default behavior (contentEditable will insert <br>)
      return;
    }
    
    // Enter: Create new item (split text if in middle)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      // Get cursor position and split text
      const selection = window.getSelection();
      let textBeforeCursor = '';
      let textAfterCursor = '';
      
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // Get text before cursor
        const beforeRange = range.cloneRange();
        beforeRange.selectNodeContents(target);
        beforeRange.setEnd(range.startContainer, range.startOffset);
        textBeforeCursor = beforeRange.toString();
        
        // Get text after cursor
        const afterRange = range.cloneRange();
        afterRange.selectNodeContents(target);
        afterRange.setStart(range.endContainer, range.endOffset);
        textAfterCursor = afterRange.toString();
      } else {
        textBeforeCursor = target.textContent || '';
      }
      
      // Create new item with text after cursor
      const newItem: ListItem = {
        id: `item-${Date.now()}`,
        text: textAfterCursor,
        level: item.level,
      };
      
      // Batched update: update current item and add new item in one go
      updateAndAddAfter(item.id, { text: textBeforeCursor }, newItem);
      
      // Focus new item immediately - single RAF for snappiness
      requestAnimationFrame(() => {
        const newElement = itemRefs.current.get(newItem.id);
        if (newElement) {
          newElement.focus();
          // Place cursor at start of new item
          const range = document.createRange();
          const sel = window.getSelection();
          if (newElement.firstChild) {
            range.setStart(newElement.firstChild, 0);
            range.collapse(true);
            sel?.removeAllRanges();
            sel?.addRange(range);
          }
        }
      });
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

    // Backspace: Smart deletion (outdent first if indented, then delete)
    if (e.key === 'Backspace') {
      const selection = window.getSelection();
      const cursorAtStart = selection && selection.rangeCount > 0 && 
        selection.getRangeAt(0).startOffset === 0 &&
        selection.isCollapsed;
      
      if (cursorAtStart && target.textContent === '') {
        e.preventDefault();
        // If item is indented, outdent first
        if (item.level > 0) {
          updateItem(item.id, { level: item.level - 1 });
        } else {
          // If at level 0, delete the item and focus previous
          const previousElement = findPreviousItem(item.id);
          
          // Delete current item
          deleteItem(item.id);
          
          // Focus previous item at the end of its text
          if (previousElement) {
            requestAnimationFrame(() => {
              previousElement.focus();
              // Place cursor at end of previous item
              const range = document.createRange();
              const sel = window.getSelection();
              if (previousElement.lastChild) {
                const textNode = previousElement.lastChild;
                const length = textNode.textContent?.length || 0;
                range.setStart(textNode, length);
                range.collapse(true);
                sel?.removeAllRanges();
                sel?.addRange(range);
              }
            });
          }
        }
      }
    }

    // Arrow Up: Navigate to previous item when at start of line
    if (e.key === 'ArrowUp') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const cursorAtStart = range.startOffset === 0 && 
          range.startContainer === target.firstChild;
        
        if (cursorAtStart || !target.firstChild) {
          e.preventDefault();
          const previousElement = findPreviousItem(item.id);
          if (previousElement) {
            previousElement.focus();
            // Place cursor at end
            const range = document.createRange();
            const sel = window.getSelection();
            if (previousElement.lastChild) {
              range.setStart(previousElement.lastChild, previousElement.lastChild.textContent?.length || 0);
              range.collapse(true);
              sel?.removeAllRanges();
              sel?.addRange(range);
            }
          }
        }
      }
    }

    // Arrow Down: Navigate to next item when at end of line
    if (e.key === 'ArrowDown') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const textLength = target.textContent?.length || 0;
        const cursorAtEnd = range.startOffset === textLength && 
          range.startContainer === target.lastChild;
        
        if (cursorAtEnd || !target.lastChild) {
          e.preventDefault();
          const nextElement = findNextItem(item.id);
          if (nextElement) {
            nextElement.focus();
            // Place cursor at start
            const range = document.createRange();
            const sel = window.getSelection();
            if (nextElement.firstChild) {
              range.setStart(nextElement.firstChild, 0);
              range.collapse(true);
              sel?.removeAllRanges();
              sel?.addRange(range);
            }
          }
        }
      }
    }
  };

  // Helper function to find previous item in visual order
  const findPreviousItem = (currentId: string): HTMLDivElement | null => {
    const allItems = Array.from(itemRefs.current.values());
    const currentElement = itemRefs.current.get(currentId);
    if (!currentElement) return null;
    
    const currentIndex = allItems.indexOf(currentElement);
    return currentIndex > 0 ? allItems[currentIndex - 1] : null;
  };

  // Helper function to find next item in visual order
  const findNextItem = (currentId: string): HTMLDivElement | null => {
    const allItems = Array.from(itemRefs.current.values());
    const currentElement = itemRefs.current.get(currentId);
    if (!currentElement) return null;
    
    const currentIndex = allItems.indexOf(currentElement);
    return currentIndex < allItems.length - 1 ? allItems[currentIndex + 1] : null;
  };

  const handleInput = (e: FormEvent<HTMLDivElement>, item: ListItem) => {
    const target = e.target as HTMLDivElement;
    updateItem(item.id, { text: target.textContent || '' });
  };

  // Handle blur - auto-delete empty items like Apple Notes
  const handleBlur = (item: ListItem) => {
    setFocusedId(null);
    
    // Auto-delete empty items (Apple Notes behavior)
    if (item.text === '' || item.text.trim() === '') {
      // Exception 1: Don't delete if it's the only item in the list
      if (items.length === 1) {
        return;
      }
      
      // Exception 2: Don't delete if item has children (is a header/section)
      if (item.children && item.children.length > 0) {
        return;
      }
      
      // Delete the empty item after a brief delay to allow for navigation
      // This prevents deletion when user is just moving between items
      setTimeout(() => {
        // Re-check that item is still empty (user might have typed in the meantime)
        const allItems = Array.from(itemRefs.current.values());
        const itemElement = itemRefs.current.get(item.id);
        
        if (itemElement && (itemElement.textContent === '' || itemElement.textContent?.trim() === '')) {
          deleteItem(item.id);
        }
      }, 100);
    }
  };

  // Expose methods to parent components
  useImperativeHandle(ref, () => ({
    focusLastItem: () => {
      const allItems = Array.from(itemRefs.current.values());
      const lastItem = allItems[allItems.length - 1];
      if (lastItem) {
        lastItem.focus();
        // Place cursor at end
        const range = document.createRange();
        const sel = window.getSelection();
        if (lastItem.lastChild) {
          const textNode = lastItem.lastChild;
          const length = textNode.textContent?.length || 0;
          range.setStart(textNode, length);
          range.collapse(true);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }
    },
    focusFirstItem: () => {
      const allItems = Array.from(itemRefs.current.values());
      const firstItem = allItems[0];
      if (firstItem) {
        firstItem.focus();
        // Place cursor at end of first item
        const range = document.createRange();
        const sel = window.getSelection();
        if (firstItem.lastChild) {
          const textNode = firstItem.lastChild;
          const length = textNode.textContent?.length || 0;
          range.setStart(textNode, length);
          range.collapse(true);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }
    },
    createAndFocusNewItem: () => {
      const newItem: ListItem = {
        id: `item-${Date.now()}`,
        text: '',
        level: 0,
      };
      
      onChange([...items, newItem]);
      
      // Focus the new item
      requestAnimationFrame(() => {
        const newElement = itemRefs.current.get(newItem.id);
        newElement?.focus();
      });
    }
  }), [items, onChange]);

  // Handle clicks on empty space to create new items
  const handleContainerClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    
    // Check if click was on an interactive or content element
    const isInteractive = 
      target.contentEditable === 'true' ||
      target.closest('[contenteditable="true"]') ||
      target.tagName === 'INPUT' ||
      target.tagName === 'BUTTON' ||
      target.tagName === 'TEXTAREA';
    
    // Check if click was on list content (bullets, text, etc.)
    const isListContent =
      target.tagName === 'SPAN' ||  // Bullets
      target.closest('[data-testid^="list-item-"]') ||  // List item containers
      target.closest('[data-testid^="bullet-"]');  // Bullet elements
    
    // If clicked on interactive element or list content, don't create new item
    if (isInteractive || isListContent) {
      return;
    }
    
    // Clicked on true white space - create new item at the end
    const newItem: ListItem = {
      id: `item-${Date.now()}`,
      text: '',
      level: 0,
    };
    
    onChange([...items, newItem]);
    
    // Focus the new item
    requestAnimationFrame(() => {
      const newElement = itemRefs.current.get(newItem.id);
      newElement?.focus();
    });
  }, [items, onChange]);

  const renderItem = (item: ListItem, index: number) => {
    const isHeader = item.children && item.children.length > 0;
    const bulletChar = item.level === 0 ? '•' : item.level === 1 ? '◦' : '−';
    const indentPx = item.level * 32;

    return (
      <div
        key={item.id}
        className="relative"
        style={{ paddingLeft: `${indentPx}px` }}
        data-testid={`list-item-${item.id}`}
      >
        <div className="flex items-start gap-2 py-0.5">
          {/* Bullet - hide for headers */}
          {!isHeader && (
            <span className="text-foreground/60 select-none mt-[6px] text-list-item flex-shrink-0 w-4" data-testid={`bullet-${item.id}`}>
              {bulletChar}
            </span>
          )}

          {/* Editable content */}
          <div
            ref={el => {
              if (el) {
                itemRefs.current.set(item.id, el);
              }
            }}
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => handleInput(e, item)}
            onKeyDown={(e) => handleKeyDown(e, item)}
            onFocus={() => setFocusedId(item.id)}
            onBlur={() => handleBlur(item)}
            data-testid={`input-list-item-${item.id}`}
            data-placeholder={item.text === '' ? '' : undefined}
            className={`
              flex-1 outline-none rounded-md px-2 py-1 -ml-2 min-h-[26px]
              ${isHeader ? 'text-section-header uppercase tracking-wider font-semibold text-foreground/70 mt-4 mb-2' : item.level === 0 ? 'text-list-item' : 'text-list-nested'}
              ${focusedId === item.id ? 'bg-accent/20' : ''}
              transition-all duration-75 cursor-text
            `}
          >
            {item.text}
          </div>
        </div>

        {/* Nested children */}
        {item.children && item.children.length > 0 && (
          <div className="mt-1 mb-2 ml-6">
            {item.children.map((child, idx) => renderItem(child, idx))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      ref={containerRef}
      onClick={handleContainerClick}
      className={`cursor-text pb-8 ${className}`} 
      data-testid="component-list-editor"
    >
      <div className="space-y-0">
        {items.map((item, index) => renderItem(item, index))}
      </div>
      
      {items.length === 0 && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            const newItem: ListItem = {
              id: `item-${Date.now()}`,
              text: '',
              level: 0,
            };
            onChange([newItem]);
            requestAnimationFrame(() => {
              const newElement = itemRefs.current.get(newItem.id);
              newElement?.focus();
            });
          }}
          className="text-muted-foreground/60 cursor-text p-2 text-list-item"
        >
          Click to start typing...
        </div>
      )}
      
      {/* Clickable padding at the bottom for easy access */}
      <div className="min-h-[80px]" />
    </div>
  );
});

ListEditor.displayName = 'ListEditor';
