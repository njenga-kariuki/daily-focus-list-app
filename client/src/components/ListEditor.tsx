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

  const cloneItems = (itemsToClone: ListItem[]): ListItem[] => {
    return itemsToClone.map(item => ({
      ...item,
      children: item.children ? cloneItems(item.children) : undefined,
    }));
  };

  interface ItemLocation {
    parent: ListItem | null;
    array: ListItem[];
    index: number;
  }

  const findItemLocation = (
    list: ListItem[],
    id: string,
    parent: ListItem | null = null,
  ): ItemLocation | null => {
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (item.id === id) {
        return { parent, array: list, index: i };
      }
      if (item.children) {
        const result = findItemLocation(item.children, id, item);
        if (result) {
          return result;
        }
      }
    }
    return null;
  };

  const adjustSubtreeLevels = (item: ListItem, delta: number) => {
    const applyDelta = (node: ListItem) => {
      node.level = Math.min(5, Math.max(0, node.level + delta));
      if (node.children) {
        node.children.forEach((child: ListItem) => applyDelta(child));
      }
    };
    applyDelta(item);
  };

  const cleanupEmptyChildren = (node: ListItem) => {
    if (node.children) {
      node.children.forEach((child: ListItem) => cleanupEmptyChildren(child));
      if (node.children.length === 0) {
        node.children = undefined;
      }
    }
  };

  const getSubtreeLevelBounds = (node: ListItem): { min: number; max: number } => {
    let min = node.level;
    let max = node.level;
    if (node.children) {
      for (const child of node.children) {
        const childBounds = getSubtreeLevelBounds(child);
        min = Math.min(min, childBounds.min);
        max = Math.max(max, childBounds.max);
      }
    }
    return { min, max };
  };

  const indentItem = (id: string) => {
    const cloned = cloneItems(items);
    const location = findItemLocation(cloned, id);
    if (!location) return;

    const { array, index } = location;
    if (index === 0) return; // No previous sibling to indent under

    const previousSibling = array[index - 1];
    const targetLevel = Math.min(previousSibling.level + 1, 5);
    if (targetLevel <= previousSibling.level) return;

    const itemToMove = array[index];
    const bounds = getSubtreeLevelBounds(itemToMove);
    const levelDelta = targetLevel - itemToMove.level;
    if (bounds.max + levelDelta > 5 || bounds.min + levelDelta < 0) return;

    array.splice(index, 1);

    if (levelDelta !== 0) {
      adjustSubtreeLevels(itemToMove, levelDelta);
    }

    if (!previousSibling.children) {
      previousSibling.children = [];
    }
    previousSibling.children.push(itemToMove);

    if (location.parent) {
      cleanupEmptyChildren(location.parent);
    }

    onChange(cloned);
  };

  const outdentItem = (id: string) => {
    const cloned = cloneItems(items);
    const location = findItemLocation(cloned, id);
    if (!location || !location.parent) return;

    const { array, index, parent } = location;
    const parentLocation = findItemLocation(cloned, parent.id);
    if (!parentLocation) return;

    const itemToMove = array[index];
    const levelDelta = parent.level - itemToMove.level;
    const bounds = getSubtreeLevelBounds(itemToMove);
    if (bounds.max + levelDelta > 5 || bounds.min + levelDelta < 0) return;

    array.splice(index, 1);

    const insertionArray = parentLocation.array;
    const parentIndex = parentLocation.index;

    insertionArray.splice(parentIndex + 1, 0, itemToMove);

    if (levelDelta !== 0) {
      adjustSubtreeLevels(itemToMove, levelDelta);
    }

    cleanupEmptyChildren(parent);

    onChange(cloned);
  };

  const updateItem = (id: string, updates: Partial<ListItem>) => {
    const cloned = cloneItems(items);

    const applyUpdate = (list: ListItem[]): boolean => {
      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (item.id === id) {
          const updated: ListItem = {
            ...item,
            ...updates,
            children: item.children ? cloneItems(item.children) : undefined,
          };
          list[i] = updated;
          return true;
        }
        if (item.children && applyUpdate(item.children)) {
          return true;
        }
      }
      return false;
    };

    applyUpdate(cloned);
    onChange(cloned);
  };

  const deleteItem = (id: string) => {
    const cloned = cloneItems(items);

    const removeRecursive = (list: ListItem[]): ListItem[] => {
      return list
        .filter(item => item.id !== id)
        .map(item => {
          if (item.children) {
            const updatedChildren = removeRecursive(item.children);
            return {
              ...item,
              children: updatedChildren.length > 0 ? updatedChildren : undefined,
            };
          }
          return item;
        });
    };

    onChange(removeRecursive(cloned));
  };

  const addItemAfter = (id: string, newItem: ListItem) => {
    const cloned = cloneItems(items);

    const insertAfter = (list: ListItem[]): boolean => {
      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (item.id === id) {
          list.splice(i + 1, 0, newItem);
          return true;
        }
        if (item.children && insertAfter(item.children)) {
          return true;
        }
      }
      return false;
    };

    if (!insertAfter(cloned)) {
      cloned.push(newItem);
    }

    onChange(cloned);
  };

  // Optimized batched update: update item text and add new item in single state change
  const updateAndAddAfter = (id: string, updates: Partial<ListItem>, newItem: ListItem) => {
    const cloned = cloneItems(items);

    const processRecursive = (list: ListItem[]): boolean => {
      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (item.id === id) {
          const updatedItem: ListItem = {
            ...item,
            ...updates,
            children: item.children ? cloneItems(item.children) : undefined,
          };
          list[i] = updatedItem;
          list.splice(i + 1, 0, newItem);
          return true;
        }
        if (item.children && processRecursive(item.children)) {
          return true;
        }
      }
      return false;
    };

    if (!processRecursive(cloned)) {
      cloned.push(newItem);
    }

    onChange(cloned);
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

        // If text is selected, delete the selection first
        if (!selection.isCollapsed) {
          // Delete selected text by replacing with empty string
          range.deleteContents();
          // Update the item text
          updateItem(item.id, { text: target.textContent || '' });
        }

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
          setCursorPosition(newElement, 0, false);
        }
      });
    }

    // Tab: Indent (increase level)
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();

      // Save cursor position before state update
      const selection = window.getSelection();
      let cursorOffset = 0;
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        cursorOffset = range.startOffset;
      }

      indentItem(item.id);

      // Restore cursor position after re-render
      requestAnimationFrame(() => {
        const element = itemRefs.current.get(item.id);
        if (element) {
          element.focus();
          setCursorPosition(element, cursorOffset, false);
        }
      });
    }

    // Shift+Tab: Outdent (decrease level)
    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();

      // Save cursor position before state update
      const selection = window.getSelection();
      let cursorOffset = 0;
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        cursorOffset = range.startOffset;
      }

      outdentItem(item.id);

      // Restore cursor position after re-render
      requestAnimationFrame(() => {
        const element = itemRefs.current.get(item.id);
        if (element) {
          element.focus();
          setCursorPosition(element, cursorOffset, false);
        }
      });
    }

    // Backspace: Smart deletion (outdent first if indented, then delete)
    if (e.key === 'Backspace') {
      const selection = window.getSelection();

      // If there's a text selection, let default behavior handle it
      if (selection && !selection.isCollapsed) {
        return; // Allow default deletion of selected text
      }

      const cursorAtStart = selection && selection.rangeCount > 0 &&
        selection.getRangeAt(0).startOffset === 0 &&
        selection.isCollapsed;

      if (cursorAtStart && target.textContent === '') {
        e.preventDefault();
        // If item is indented, outdent first
        if (item.level > 0) {
          outdentItem(item.id);

          requestAnimationFrame(() => {
            const element = itemRefs.current.get(item.id);
            if (element) {
              element.focus();
              setCursorPosition(element, 0, false);
            }
          });
        } else {
          // If at level 0, delete the item and focus previous
          const previousElement = findPreviousItem(item.id);

          // Delete current item
          deleteItem(item.id);

          // Focus previous item at the end of its text
          if (previousElement) {
            requestAnimationFrame(() => {
              previousElement.focus();
              setCursorPosition(previousElement, 0, true);
            });
          }
        }
      }
    }

    // Delete: Forward deletion (merge with next item when at end)
    if (e.key === 'Delete') {
      const selection = window.getSelection();

      // If there's a text selection, let default behavior handle it
      if (selection && !selection.isCollapsed) {
        return; // Allow default deletion of selected text
      }

      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const textLength = target.textContent?.length || 0;
        const cursorAtEnd = range.startOffset === textLength &&
          range.startContainer === target.lastChild;

        // If cursor is at end of current item and text is empty
        if ((cursorAtEnd || textLength === 0) && target.textContent === '') {
          e.preventDefault();
          const nextElement = findNextItem(item.id);

          if (nextElement) {
            const nextItemId = Array.from(itemRefs.current.entries())
              .find(([_, el]) => el === nextElement)?.[0];

            if (nextItemId) {
              // Get the next item's text
              const nextItemText = nextElement.textContent || '';

              // Delete the next item
              deleteItem(nextItemId);

              // Update current item with merged text (which is just next item's text since current is empty)
              updateItem(item.id, { text: nextItemText });

              // Keep focus on current item
              requestAnimationFrame(() => {
                target.focus();
                setCursorPosition(target, 0, false);
              });
            }
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
            setCursorPosition(previousElement, 0, true);
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
            setCursorPosition(nextElement, 0, false);
          }
        }
      }
    }

    // Arrow Left: Navigate to previous item when at start
    if (e.key === 'ArrowLeft') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const cursorAtStart = range.startOffset === 0 &&
          range.startContainer === target.firstChild;

        if ((cursorAtStart || !target.firstChild) && selection.isCollapsed) {
          e.preventDefault();
          const previousElement = findPreviousItem(item.id);
          if (previousElement) {
            previousElement.focus();
            setCursorPosition(previousElement, 0, true);
          }
        }
      }
    }

    // Arrow Right: Navigate to next item when at end
    if (e.key === 'ArrowRight') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const textLength = target.textContent?.length || 0;
        const cursorAtEnd = range.startOffset === textLength &&
          range.startContainer === target.lastChild;

        if ((cursorAtEnd || textLength === 0) && selection.isCollapsed) {
          e.preventDefault();
          const nextElement = findNextItem(item.id);
          if (nextElement) {
            nextElement.focus();
            setCursorPosition(nextElement, 0, false);
          }
        }
      }
    }
  };

  // Helper function to safely set cursor position, handling empty elements
  const setCursorPosition = (element: HTMLElement, offset: number, atEnd: boolean = false) => {
    try {
      const range = document.createRange();
      const sel = window.getSelection();

      // If element has no text node, create one
      if (!element.firstChild) {
        const textNode = document.createTextNode('');
        element.appendChild(textNode);
      }

      const textNode = element.firstChild as Text;
      const maxOffset = textNode.textContent?.length || 0;
      const finalOffset = atEnd ? maxOffset : Math.min(offset, maxOffset);

      range.setStart(textNode, finalOffset);
      range.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(range);
    } catch (e) {
      // Fallback: just focus the element
      element.focus();
    }
  };

  // Helper function to flatten items in visual/DOM order (depth-first traversal)
  const getVisualOrderItems = useCallback((itemsList: ListItem[]): string[] => {
    const result: string[] = [];
    const traverse = (items: ListItem[]) => {
      for (const item of items) {
        result.push(item.id);
        if (item.children && item.children.length > 0) {
          traverse(item.children);
        }
      }
    };
    traverse(itemsList);
    return result;
  }, []);

  // Helper function to find previous item in visual order
  const findPreviousItem = (currentId: string): HTMLDivElement | null => {
    const visualOrder = getVisualOrderItems(items);
    const currentIndex = visualOrder.indexOf(currentId);

    if (currentIndex > 0) {
      const previousId = visualOrder[currentIndex - 1];
      return itemRefs.current.get(previousId) || null;
    }
    return null;
  };

  // Helper function to find next item in visual order
  const findNextItem = (currentId: string): HTMLDivElement | null => {
    const visualOrder = getVisualOrderItems(items);
    const currentIndex = visualOrder.indexOf(currentId);

    if (currentIndex >= 0 && currentIndex < visualOrder.length - 1) {
      const nextId = visualOrder[currentIndex + 1];
      return itemRefs.current.get(nextId) || null;
    }
    return null;
  };

  const handleInput = (e: FormEvent<HTMLDivElement>, item: ListItem) => {
    const target = e.target as HTMLDivElement;
    const newText = target.textContent || '';

    // Save cursor position before state update
    const selection = window.getSelection();
    let cursorOffset = 0;
    let isAtEnd = false;

    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      // Calculate offset from start of text
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(target);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      cursorOffset = preCaretRange.toString().length;
      isAtEnd = cursorOffset === newText.length;
    }

    updateItem(item.id, { text: newText });

    // Restore cursor position after React re-renders
    requestAnimationFrame(() => {
      const element = itemRefs.current.get(item.id);
      if (element && element === document.activeElement) {
        // Only restore if this element is still focused
        setCursorPosition(element, cursorOffset, isAtEnd);
      }
    });
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

  // Handle paste - only allow plain text, no rich formatting
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>, item: ListItem) => {
    e.preventDefault();

    // Get plain text from clipboard
    const text = e.clipboardData.getData('text/plain');

    if (text) {
      // Insert plain text at cursor position
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();

        const textNode = document.createTextNode(text);
        range.insertNode(textNode);

        // Move cursor to end of inserted text
        range.setStartAfter(textNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);

        // Update item state with new text
        const target = e.target as HTMLDivElement;
        updateItem(item.id, { text: target.textContent || '' });
      }
    }
  };

  // Expose methods to parent components
  useImperativeHandle(ref, () => ({
    focusLastItem: () => {
      const visualOrder = getVisualOrderItems(items);
      if (visualOrder.length > 0) {
        const lastId = visualOrder[visualOrder.length - 1];
        const lastItem = itemRefs.current.get(lastId);
        if (lastItem) {
          lastItem.focus();
          setCursorPosition(lastItem, 0, true);
        }
      }
    },
    focusFirstItem: () => {
      const visualOrder = getVisualOrderItems(items);
      if (visualOrder.length > 0) {
        const firstId = visualOrder[0];
        const firstItem = itemRefs.current.get(firstId);
        if (firstItem) {
          firstItem.focus();
          setCursorPosition(firstItem, 0, true);
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
        if (newElement) {
          newElement.focus();
          setCursorPosition(newElement, 0, false);
        }
      });
    }
  }), [items, onChange, getVisualOrderItems]);

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
      if (newElement) {
        newElement.focus();
        setCursorPosition(newElement, 0, false);
      }
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
            onPaste={(e) => handlePaste(e, item)}
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
            {item.children.map((child: ListItem, idx: number) => renderItem(child, idx))}
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
              if (newElement) {
                newElement.focus();
                setCursorPosition(newElement, 0, false);
              }
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
