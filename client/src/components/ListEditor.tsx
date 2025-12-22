import { useState, useRef, useCallback, memo, useImperativeHandle, forwardRef, type KeyboardEvent, type FormEvent, type MouseEvent } from "react";
import { flushSync } from "react-dom";
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
  syncFocusedItem: () => void;
}

export const ListEditor = forwardRef<ListEditorRef, ListEditorProps>(({ items, onChange, className = "" }, ref) => {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  const cloneItems = (itemsList: ListItem[]): ListItem[] => {
    return itemsList.map(currentItem => ({
      ...currentItem,
      children: currentItem.children ? cloneItems(currentItem.children) : undefined,
    }));
  };

  const findItemPath = (itemsList: ListItem[], targetId: string, currentPath: number[] = []): number[] | null => {
    for (let index = 0; index < itemsList.length; index++) {
      const item = itemsList[index];
      const newPath = [...currentPath, index];

      if (item.id === targetId) {
        return newPath;
      }

      if (item.children && item.children.length > 0) {
        const childPath = findItemPath(item.children, targetId, newPath);
        if (childPath) {
          return childPath;
        }
      }
    }

    return null;
  };

  const getItemAndParentByPath = (itemsList: ListItem[], path: number[]): {
    item: ListItem | null;
    parentArray: ListItem[] | null;
    index: number;
  } => {
    let parentArray: ListItem[] | null = itemsList;
    let currentItem: ListItem | null = null;

    for (let depth = 0; depth < path.length; depth++) {
      if (!parentArray) {
        return { item: null, parentArray: null, index: -1 };
      }

      const index = path[depth];
      currentItem = parentArray[index] ?? null;

      if (!currentItem) {
        return { item: null, parentArray: null, index: -1 };
      }

      if (depth === path.length - 1) {
        return { item: currentItem, parentArray, index };
      }

      parentArray = currentItem.children ?? null;
    }

    return { item: null, parentArray: null, index: -1 };
  };

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
      let changed = false;
      const nextItems: ListItem[] = [];

      for (const item of items) {
        if (item.id === id) {
          changed = true;
          continue;
        }

        let nextChildren = item.children;
        if (item.children) {
          const updatedChildren = deleteRecursive(item.children);
          if (updatedChildren !== item.children) {
            nextChildren = updatedChildren;
            changed = true;
          }
        }

        if (nextChildren !== item.children) {
          nextItems.push({
            ...item,
            children: nextChildren,
          });
        } else {
          nextItems.push(item);
        }
      }

      if (!changed && nextItems.length === items.length) {
        return items;
      }

      return nextItems;
    };
    onChange(deleteRecursive(items));
  };

  const addItemAfter = (id: string, newItem: ListItem) => {
    const addRecursive = (items: ListItem[]): ListItem[] => {
      let changed = false;
      const nextItems: ListItem[] = [];

      for (const item of items) {
        let nextChildren = item.children;
        if (item.children) {
          const updatedChildren = addRecursive(item.children);
          if (updatedChildren !== item.children) {
            nextChildren = updatedChildren;
            changed = true;
          }
        }

        if (nextChildren !== item.children) {
          nextItems.push({
            ...item,
            children: nextChildren,
          });
        } else {
          nextItems.push(item);
        }

        if (item.id === id) {
          nextItems.push(newItem);
          changed = true;
        }
      }

      if (!changed) {
        return items;
      }

      return nextItems;
    };
    onChange(addRecursive(items));
  };

  // Optimized batched update: update item text and add new item in single state change
  const updateAndAddAfter = (id: string, updates: Partial<ListItem>, newItem: ListItem) => {
    const processRecursive = (items: ListItem[]): ListItem[] => {
      let changed = false;
      const nextItems: ListItem[] = [];

      for (const item of items) {
        if (item.id === id) {
          const updatedItem: ListItem = {
            ...item,
            ...updates,
            ...(item.children ? { children: item.children } : {}),
          };
          nextItems.push(updatedItem);
          nextItems.push(newItem);
          changed = true;
          continue;
        }

        let nextChildren = item.children;
        if (item.children) {
          const updatedChildren = processRecursive(item.children);
          if (updatedChildren !== item.children) {
            nextChildren = updatedChildren;
            changed = true;
          }
        }

        if (nextChildren !== item.children) {
          nextItems.push({
            ...item,
            children: nextChildren,
          });
        } else {
          nextItems.push(item);
        }
      }

      if (!changed) {
        return items;
      }

      return nextItems;
    };
    onChange(processRecursive(items));
  };

  // Move item up in the list
  const moveItemUp = (id: string) => {
    const path = findItemPath(items, id);
    if (!path || path.length === 0) return;

    const parentPath = path.slice(0, -1);
    const index = path[path.length - 1];

    if (index === 0) return; // Already at the top

    const processRecursive = (items: ListItem[], currentPath: number[]): ListItem[] => {
      if (currentPath.length === 0) {
        const newItems = [...items];
        [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
        return newItems;
      }

      return items.map((item, idx) => {
        if (idx === currentPath[0]) {
          return {
            ...item,
            children: item.children ? processRecursive(item.children, currentPath.slice(1)) : undefined,
          };
        }
        return item;
      });
    };

    onChange(processRecursive(items, parentPath));
  };

  // Move item down in the list
  const moveItemDown = (id: string) => {
    const path = findItemPath(items, id);
    if (!path || path.length === 0) return;

    const parentPath = path.slice(0, -1);
    const index = path[path.length - 1];

    const { parentArray } = getItemAndParentByPath(items, path);
    if (!parentArray || index >= parentArray.length - 1) return; // Already at the bottom

    const processRecursive = (items: ListItem[], currentPath: number[]): ListItem[] => {
      if (currentPath.length === 0) {
        const newItems = [...items];
        [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
        return newItems;
      }

      return items.map((item, idx) => {
        if (idx === currentPath[0]) {
          return {
            ...item,
            children: item.children ? processRecursive(item.children, currentPath.slice(1)) : undefined,
          };
        }
        return item;
      });
    };

    onChange(processRecursive(items, parentPath));
  };

  // Duplicate the current item
  const duplicateItem = (id: string) => {
    const path = findItemPath(items, id);
    if (!path) return;

    const { item } = getItemAndParentByPath(items, path);
    if (!item) return;

    const duplicatedItem: ListItem = {
      ...item,
      id: `item-${Date.now()}`,
      children: item.children ? cloneItems(item.children) : undefined,
    };

    flushSync(() => {
      addItemAfter(id, duplicatedItem);
    });

    // Focus the duplicated item
    const newElement = itemRefs.current.get(duplicatedItem.id);
    if (newElement) {
      const textNode = ensureTextNode(newElement);
      newElement.focus();

      // Place cursor at end
      const range = document.createRange();
      const sel = window.getSelection();
      range.setStart(textNode, textNode.length);
      range.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  };

  type SavedCaretPosition = {
    containerPath: number[];
    offset: number;
    textOffset: number;
    isAtEnd: boolean;
  };

  const getNodePath = (root: Node, target: Node): number[] => {
    const path: number[] = [];
    let current: Node | null = target;

    while (current && current !== root) {
      const parent = current.parentNode;
      if (!parent) break;
      const index = Array.prototype.indexOf.call(parent.childNodes, current);
      path.unshift(index);
      current = parent;
    }

    return path;
  };

  const getNodeByPath = (root: Node, path: number[]): Node | null => {
    let current: Node | null = root;

    for (const index of path) {
      if (!current || !current.childNodes || index < 0 || index >= current.childNodes.length) {
        return null;
      }
      current = current.childNodes[index] ?? null;
    }

    return current;
  };

  const getContainerSize = (node: Node): number => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent?.length ?? 0;
    }
    return node.childNodes.length;
  };

  const ensureTextNode = (element: HTMLElement): Text => {
    let textNode = Array.from(element.childNodes).find(child => child.nodeType === Node.TEXT_NODE) as Text | undefined;
    if (textNode) {
      return textNode;
    }

    textNode = document.createTextNode("");
    element.appendChild(textNode);
    return textNode;
  };

  const findTextPosition = (element: HTMLElement, textOffset: number, placeAtEnd: boolean): { node: Node; offset: number } => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
    let currentNode = walker.nextNode() as Text | null;
    let accumulated = 0;
    let lastTextNode: Text | null = null;

    while (currentNode) {
      const length = currentNode.textContent?.length ?? 0;
      if (!placeAtEnd && accumulated + length >= textOffset) {
        const offsetInNode = Math.min(textOffset - accumulated, length);
        return { node: currentNode, offset: offsetInNode };
      }

      accumulated += length;
      lastTextNode = currentNode;
      currentNode = walker.nextNode() as Text | null;
    }

    if (placeAtEnd && lastTextNode) {
      return { node: lastTextNode, offset: lastTextNode.textContent?.length ?? 0 };
    }

    if (lastTextNode) {
      const offsetInLast = Math.min(textOffset, lastTextNode.textContent?.length ?? 0);
      return { node: lastTextNode, offset: offsetInLast };
    }

    const fallbackNode = ensureTextNode(element);
    const fallbackOffset = placeAtEnd
      ? fallbackNode.textContent?.length ?? 0
      : Math.min(textOffset, fallbackNode.textContent?.length ?? 0);
    return { node: fallbackNode, offset: fallbackOffset };
  };

  const captureCaretPosition = (element: HTMLElement): SavedCaretPosition | null => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }

    const range = selection.getRangeAt(0);
    if (!element.contains(range.startContainer)) {
      return null;
    }

    const containerPath = getNodePath(element, range.startContainer);

    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.startContainer, range.startOffset);
    const textOffset = preCaretRange.toString().length;

    const isAtEnd = textOffset >= (element.textContent?.length ?? 0);

    return {
      containerPath,
      offset: range.startOffset,
      textOffset,
      isAtEnd,
    };
  };

  // Helper to check if cursor is on the first visual line
  const isOnFirstLine = (element: HTMLDivElement): boolean => {
    // Simple approach: if there are no <br> tags, we're always on first line
    // If there are <br> tags, check if cursor is before the first one
    const sel = window.getSelection();
    if (!sel?.rangeCount) return true;

    const textContent = element.textContent || '';
    const brTags = element.querySelectorAll('br');

    // No line breaks = single line = always on first line
    if (brTags.length === 0) {
      console.log('[isOnFirstLine] Single line item - always true');
      return true;
    }

    // Multi-line item: check cursor position relative to first <br>
    const range = sel.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.startContainer, range.startOffset);
    const textBeforeCursor = preCaretRange.toString();

    // If there's a newline before cursor, we're NOT on first line
    const result = !textBeforeCursor.includes('\n');
    console.log('[isOnFirstLine]', { brCount: brTags.length, textBeforeCursor, result });
    return result;
  };

  // Helper to check if cursor is on the last visual line
  const isOnLastLine = (element: HTMLDivElement): boolean => {
    // Simple approach: if there are no <br> tags, we're always on last line
    // If there are <br> tags, check if cursor is after the last one
    const sel = window.getSelection();
    if (!sel?.rangeCount) return true;

    const textContent = element.textContent || '';
    const brTags = element.querySelectorAll('br');

    // No line breaks = single line = always on last line
    if (brTags.length === 0) {
      console.log('[isOnLastLine] Single line item - always true');
      return true;
    }

    // Multi-line item: check if there's any text after cursor that contains newline
    const range = sel.getRangeAt(0);
    const afterCaretRange = range.cloneRange();
    afterCaretRange.selectNodeContents(element);
    afterCaretRange.setStart(range.endContainer, range.endOffset);
    const textAfterCursor = afterCaretRange.toString();

    // If there's a newline after cursor, we're NOT on last line
    const result = !textAfterCursor.includes('\n');
    console.log('[isOnLastLine]', { brCount: brTags.length, textAfterCursor, result });
    return result;
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
      console.log('[Enter] Key pressed');

      // Get cursor position and split text
      const selection = window.getSelection();
      let textBeforeCursor = '';
      let textAfterCursor = '';

      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);

        // If text is selected, delete the selection first
        if (!selection.isCollapsed) {
          range.deleteContents();
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

      console.log('[Enter] Split text:', { textBeforeCursor, textAfterCursor });

      // Create new item with text after cursor
      const newItem: ListItem = {
        id: `item-${Date.now()}`,
        text: textAfterCursor,
        level: item.level,
      };

      console.log('[Enter] Created new item:', newItem.id);

      // Update state - this triggers parent (NoteEditor) to re-render
      // Can't use flushSync because items is a prop from parent
      // Must wait for: ListEditor -> NoteEditor (state update) -> ListEditor (re-render with new items)
      updateAndAddAfter(item.id, { text: textBeforeCursor }, newItem);

      console.log('[Enter] Called updateAndAddAfter, waiting for re-render...');

      // Use double RAF to ensure DOM has updated after parent re-renders
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          console.log('[Enter] After double RAF');

          // Check what's actually in the DOM now
          const allListItems = Array.from(document.querySelectorAll('[data-testid^="input-list-item-"]'));
          console.log('[Enter] All list items in DOM now:', allListItems.map(el => el.getAttribute('data-testid')));

          // Try refs first, then DOM query
          let newElement = itemRefs.current.get(newItem.id);

          if (!newElement) {
            console.log('[Enter] Element not in refs yet, querying DOM directly...');
            const testId = `input-list-item-${newItem.id}`;
            console.log('[Enter] Looking for:', testId);
            newElement = document.querySelector(`[data-testid="${testId}"]`) as HTMLDivElement | null;

            // Populate the ref manually for future use
            if (newElement) {
              console.log('[Enter] Found element in DOM, adding to refs manually');
              itemRefs.current.set(newItem.id, newElement);
            }
          }

          console.log('[Enter] Got new element:', {
            found: !!newElement,
            elementId: newElement?.getAttribute('data-testid'),
            method: itemRefs.current.has(newItem.id) ? 'from refs' : 'from DOM query'
          });

          if (newElement) {
            const textNode = ensureTextNode(newElement);
            console.log('[Enter] Ensured text node:', {
              textNodeLength: textNode.length,
              textNodeValue: textNode.textContent
            });

            newElement.focus();
            console.log('[Enter] Called focus(), activeElement is:', {
              activeElementTestId: document.activeElement?.getAttribute('data-testid'),
              isSameElement: document.activeElement === newElement
            });

            // Simple cursor positioning at start
            const range = document.createRange();
            const sel = window.getSelection();
            range.setStart(textNode, 0);
            range.collapse(true);
            sel?.removeAllRanges();
            sel?.addRange(range);

            console.log('[Enter] Set cursor position, final check:', {
              activeElement: document.activeElement?.getAttribute('data-testid'),
              selectionRangeCount: window.getSelection()?.rangeCount,
              cursorOffset: window.getSelection()?.getRangeAt(0)?.startOffset
            });
          } else {
            console.error('[Enter] ERROR: Could not find new element even after RAF!');
          }
        });
      });
    }

    // Tab: Indent (increase level)
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      if (item.level < 5) {
        flushSync(() => {
          updateItem(item.id, { level: item.level + 1 });
        });
        // ContentEditable maintains cursor position for non-text changes
        const element = itemRefs.current.get(item.id);
        element?.focus();
      }
    }

    // Shift+Tab: Outdent (decrease level)
    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      if (item.level > 0) {
        flushSync(() => {
          updateItem(item.id, { level: item.level - 1 });
        });
        // ContentEditable maintains cursor position for non-text changes
        const element = itemRefs.current.get(item.id);
        element?.focus();
      }
    }

    // Cmd+] or Ctrl+]: Alternative indent shortcut
    if ((e.metaKey || e.ctrlKey) && e.key === ']') {
      e.preventDefault();
      if (item.level < 5) {
        flushSync(() => {
          updateItem(item.id, { level: item.level + 1 });
        });
        const element = itemRefs.current.get(item.id);
        element?.focus();
      }
    }

    // Cmd+[ or Ctrl+[: Alternative outdent shortcut
    if ((e.metaKey || e.ctrlKey) && e.key === '[') {
      e.preventDefault();
      if (item.level > 0) {
        flushSync(() => {
          updateItem(item.id, { level: item.level - 1 });
        });
        const element = itemRefs.current.get(item.id);
        element?.focus();
      }
    }

    // Cmd+Shift+Up or Ctrl+Shift+Up: Move item up
    // Only move item if no text is selected (allow native selection extension when text is selected)
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'ArrowUp') {
      const selection = window.getSelection();
      if (selection && selection.isCollapsed) {
        e.preventDefault();
        moveItemUp(item.id);
        const element = itemRefs.current.get(item.id);
        element?.focus();
      }
    }

    // Cmd+Shift+Down or Ctrl+Shift+Down: Move item down
    // Only move item if no text is selected (allow native selection extension when text is selected)
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'ArrowDown') {
      const selection = window.getSelection();
      if (selection && selection.isCollapsed) {
        e.preventDefault();
        moveItemDown(item.id);
        const element = itemRefs.current.get(item.id);
        element?.focus();
      }
    }

    // Cmd+D or Ctrl+D: Duplicate item
    if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
      e.preventDefault();
      duplicateItem(item.id);
    }

    // Escape: Blur/unfocus current item
    if (e.key === 'Escape') {
      e.preventDefault();
      target.blur();
      return;
    }

    // Cmd+Shift+Backspace or Ctrl+Shift+Backspace: Delete entire item
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'Backspace') {
      e.preventDefault();

      // Find the next or previous item to focus after deletion
      const visualOrder = getVisualOrderItems(items);
      const currentIndex = visualOrder.indexOf(item.id);
      let nextFocusId: string | null = null;

      if (currentIndex < visualOrder.length - 1) {
        nextFocusId = visualOrder[currentIndex + 1];
      } else if (currentIndex > 0) {
        nextFocusId = visualOrder[currentIndex - 1];
      }

      flushSync(() => {
        deleteItem(item.id);
      });

      // Focus the next item after deletion
      if (nextFocusId) {
        const nextElement = itemRefs.current.get(nextFocusId);
        if (nextElement) {
          const textNode = ensureTextNode(nextElement);
          nextElement.focus();

          // Position cursor at start
          const range = document.createRange();
          const sel = window.getSelection();
          range.setStart(textNode, 0);
          range.collapse(true);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }
    }

    // Backspace: Smart deletion (outdent first if indented, then delete)
    if (e.key === 'Backspace') {
      const selection = window.getSelection();

      // If there's a text selection, let default behavior handle it
      if (selection && !selection.isCollapsed) {
        return; // Allow default deletion of selected text
      }

      if (!selection || selection.rangeCount === 0) {
        return;
      }

      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(target);
      preCaretRange.setEnd(range.startContainer, range.startOffset);

      const cursorOffset = preCaretRange.toString().length;
      const textContent = target.textContent || '';
      const cursorAtStart = selection.isCollapsed && cursorOffset === 0;

      if (cursorAtStart && textContent === '') {
        e.preventDefault();
        // If item is indented, outdent first
        if (item.level > 0) {
          flushSync(() => {
            updateItem(item.id, { level: item.level - 1 });
          });
          const element = itemRefs.current.get(item.id);
          element?.focus();
        } else {
          // If at level 0, delete the item and focus previous
          const previousElement = findPreviousItem(item.id);

          flushSync(() => {
            deleteItem(item.id);
          });

          // Focus previous item at the end of its text
          if (previousElement) {
            const textNode = ensureTextNode(previousElement);
            previousElement.focus();

            // Position cursor at end
            const range = document.createRange();
            const sel = window.getSelection();
            range.setStart(textNode, textNode.length);
            range.collapse(true);
            sel?.removeAllRanges();
            sel?.addRange(range);
          }
        }
      } else if (cursorAtStart) {
        e.preventDefault();
        const previousElement = findPreviousItem(item.id);

        if (!previousElement) {
          return;
        }

        const previousEntry = Array.from(itemRefs.current.entries())
          .find(([_, el]) => el === previousElement);

        const previousId = previousEntry?.[0];
        if (!previousId) {
          return;
        }

        const previousPath = findItemPath(items, previousId);
        const currentPath = findItemPath(items, item.id);

        if (!previousPath || !currentPath) {
          return;
        }

        const itemsCopy = cloneItems(items);
        const { item: previousItemClone } = getItemAndParentByPath(itemsCopy, previousPath);
        const {
          item: currentItemClone,
          parentArray: currentParentArray,
          index: currentIndex,
        } = getItemAndParentByPath(itemsCopy, currentPath);

        if (!previousItemClone || !currentItemClone || !currentParentArray) {
          return;
        }

        const previousTextLength = previousItemClone.text.length;
        const currentItemText = currentItemClone.text;
        const currentItemChildren = currentItemClone.children;

        // Remove the current item from its parent array
        currentParentArray.splice(currentIndex, 1);

        // Merge text
        previousItemClone.text = `${previousItemClone.text}${currentItemText}`;

        // Move children over to the previous item
        if (currentItemChildren && currentItemChildren.length > 0) {
          if (!previousItemClone.children) {
            previousItemClone.children = [];
          }
          previousItemClone.children.push(...currentItemChildren);
        }

        flushSync(() => {
          onChange(itemsCopy);
        });

        const previousDomElement = itemRefs.current.get(previousId);
        if (previousDomElement) {
          const textNode = ensureTextNode(previousDomElement);
          previousDomElement.focus();

          // Position cursor at merge point
          const range = document.createRange();
          const sel = window.getSelection();
          range.setStart(textNode, previousTextLength);
          range.collapse(true);
          sel?.removeAllRanges();
          sel?.addRange(range);
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

      if (!selection || selection.rangeCount === 0) {
        return;
      }

      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(target);
      preCaretRange.setEnd(range.startContainer, range.startOffset);

      const cursorOffset = preCaretRange.toString().length;
      const textContent = target.textContent || '';
      const textLength = textContent.length;
      const cursorAtEnd = selection.isCollapsed && cursorOffset === textLength;

      if (cursorAtEnd) {
        e.preventDefault();
        const nextElement = findNextItem(item.id);

        if (!nextElement) {
          return;
        }

        const nextItemEntry = Array.from(itemRefs.current.entries())
          .find(([_, el]) => el === nextElement);

        const nextItemId = nextItemEntry?.[0];

        if (!nextItemId) {
          return;
        }

        const currentPath = findItemPath(items, item.id);
        const nextPath = findItemPath(items, nextItemId);

        if (!currentPath || !nextPath) {
          return;
        }

        const itemsCopy = cloneItems(items);
        const { item: currentItemClone } = getItemAndParentByPath(itemsCopy, currentPath);
        const {
          item: nextItemClone,
          parentArray: nextParentArray,
          index: nextIndex,
        } = getItemAndParentByPath(itemsCopy, nextPath);

        if (!currentItemClone || !nextItemClone || !nextParentArray) {
          return;
        }

        const currentTextLength = currentItemClone.text.length;
        const nextItemText = nextItemClone.text;
        const nextItemChildren = nextItemClone.children;

        // Remove the next item from its parent array
        nextParentArray.splice(nextIndex, 1);

        // Merge text
        currentItemClone.text = `${currentItemClone.text}${nextItemText}`;

        // Append children from the next item
        if (nextItemChildren && nextItemChildren.length > 0) {
          if (!currentItemClone.children) {
            currentItemClone.children = [];
          }
          currentItemClone.children.push(...nextItemChildren);
        }

        flushSync(() => {
          onChange(itemsCopy);
        });

        const currentDomElement = itemRefs.current.get(item.id);
        if (currentDomElement) {
          const textNode = ensureTextNode(currentDomElement);
          currentDomElement.focus();

          // Position cursor at merge point
          const range = document.createRange();
          const sel = window.getSelection();
          range.setStart(textNode, currentTextLength);
          range.collapse(true);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }
    }

    // Arrow Up: Navigate to previous item when cursor can't move up further
    if (e.key === 'ArrowUp' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const cursorPosition = range.startOffset;

        // Save the current cursor position
        const beforeRange = range.cloneRange();
        beforeRange.selectNodeContents(target);
        beforeRange.setEnd(range.startContainer, range.startOffset);
        const textOffsetBefore = beforeRange.toString().length;

        // Check if we're on the first line by testing if default behavior would change cursor position vertically
        // For single-line items or when on first line, we should navigate
        const shouldNavigate = isOnFirstLine(target);

        if (shouldNavigate) {
          e.preventDefault();
          const previousElement = findPreviousItem(item.id);
          if (previousElement) {
            const textNode = ensureTextNode(previousElement);
            previousElement.focus();

            // Position cursor at end
            const range = document.createRange();
            const sel = window.getSelection();
            range.setStart(textNode, textNode.length);
            range.collapse(true);
            sel?.removeAllRanges();
            sel?.addRange(range);
          }
        }
      }
    }

    // Arrow Down: Navigate to next item when cursor can't move down further
    if (e.key === 'ArrowDown' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        // Check if we're on the last line
        const shouldNavigate = isOnLastLine(target);

        if (shouldNavigate) {
          e.preventDefault();
          const nextElement = findNextItem(item.id);
          if (nextElement) {
            const textNode = ensureTextNode(nextElement);
            nextElement.focus();

            // Position cursor at start
            const range = document.createRange();
            const sel = window.getSelection();
            range.setStart(textNode, 0);
            range.collapse(true);
            sel?.removeAllRanges();
            sel?.addRange(range);
          }
        }
      }
    }

    // Arrow Left: Navigate to previous item when at start
    if (e.key === 'ArrowLeft') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(target);
        preCaretRange.setEnd(range.startContainer, range.startOffset);
        const cursorOffset = preCaretRange.toString().length;

        if (cursorOffset === 0) {
          e.preventDefault();
          const previousElement = findPreviousItem(item.id);
          if (previousElement) {
            const textNode = ensureTextNode(previousElement);
            previousElement.focus();

            // Position cursor at end
            const range = document.createRange();
            const sel = window.getSelection();
            range.setStart(textNode, textNode.length);
            range.collapse(true);
            sel?.removeAllRanges();
            sel?.addRange(range);
          }
        }
      }
    }

    // Arrow Right: Navigate to next item when at end
    if (e.key === 'ArrowRight') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(target);
        preCaretRange.setEnd(range.startContainer, range.startOffset);
        const cursorOffset = preCaretRange.toString().length;
        const textLength = target.textContent?.length || 0;

        if (cursorOffset >= textLength) {
          e.preventDefault();
          const nextElement = findNextItem(item.id);
          if (nextElement) {
            const textNode = ensureTextNode(nextElement);
            nextElement.focus();

            // Position cursor at start
            const range = document.createRange();
            const sel = window.getSelection();
            range.setStart(textNode, 0);
            range.collapse(true);
            sel?.removeAllRanges();
            sel?.addRange(range);
          }
        }
      }
    }
  };

  // Helper function to safely set cursor position, handling nested elements and node paths
  const setCursorPosition = (
    element: HTMLElement,
    position: number | SavedCaretPosition = 0,
    atEnd: boolean = false,
  ) => {
    try {
      const range = document.createRange();
      const selection = window.getSelection();

      if (typeof position !== 'number') {
        const preferEnd = position.isAtEnd || atEnd;
        const container = getNodeByPath(element, position.containerPath);

        if (container && element.contains(container)) {
          const maxOffset = getContainerSize(container);
          const finalOffset = preferEnd ? maxOffset : Math.min(position.offset, maxOffset);
          range.setStart(container, finalOffset);
        } else {
          const fallback = findTextPosition(element, position.textOffset, preferEnd);
          range.setStart(fallback.node, fallback.offset);
        }
      } else {
        const fallback = findTextPosition(element, position, atEnd);
        range.setStart(fallback.node, fallback.offset);
      }

      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);
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

  // Handle blur - sync contentEditable text to React state
  const handleBlur = (item: ListItem) => {
    console.log('[Blur] Item blurred:', item.id);
    setFocusedId(null);

    // Sync contentEditable DOM text to React state
    const element = itemRefs.current.get(item.id);
    if (element) {
      const currentText = element.textContent || '';
      console.log('[Blur] Checking text sync:', {
        itemId: item.id,
        currentText,
        itemText: item.text,
        needsUpdate: currentText !== item.text
      });
      if (currentText !== item.text) {
        console.log('[Blur] Calling updateItem - this will trigger re-render!');
        updateItem(item.id, { text: currentText });
      }
    }
    // Do NOT auto-delete empty items
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
          const textNode = ensureTextNode(lastItem);
          lastItem.focus();

          // Position cursor at end
          const range = document.createRange();
          const sel = window.getSelection();
          range.setStart(textNode, textNode.length);
          range.collapse(true);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }
    },
    focusFirstItem: () => {
      const visualOrder = getVisualOrderItems(items);
      if (visualOrder.length > 0) {
        const firstId = visualOrder[0];
        const firstItem = itemRefs.current.get(firstId);
        if (firstItem) {
          const textNode = ensureTextNode(firstItem);
          firstItem.focus();

          // Position cursor at end
          const range = document.createRange();
          const sel = window.getSelection();
          range.setStart(textNode, textNode.length);
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

      flushSync(() => {
        onChange([...items, newItem]);
      });

      // Focus the new item
      const newElement = itemRefs.current.get(newItem.id);
      if (newElement) {
        const textNode = ensureTextNode(newElement);
        newElement.focus();

        // Position cursor at start
        const range = document.createRange();
        const sel = window.getSelection();
        range.setStart(textNode, 0);
        range.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    },
    syncFocusedItem: () => {
      // Sync currently focused item's DOM text to React state
      if (focusedId) {
        const element = itemRefs.current.get(focusedId);
        if (element) {
          const currentText = element.textContent || '';
          const path = findItemPath(items, focusedId);
          if (path) {
            const { item } = getItemAndParentByPath(items, path);
            if (item && currentText !== item.text) {
              updateItem(focusedId, { text: currentText });
            }
          }
        }
      }
    },
  }), [items, onChange, getVisualOrderItems, focusedId]);

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

    flushSync(() => {
      onChange([...items, newItem]);
    });

    // Focus the new item
    const newElement = itemRefs.current.get(newItem.id);
    if (newElement) {
      const textNode = ensureTextNode(newElement);
      newElement.focus();

      // Position cursor at start
      const range = document.createRange();
      const sel = window.getSelection();
      range.setStart(textNode, 0);
      range.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
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

            flushSync(() => {
              onChange([newItem]);
            });

            // Focus the new item
            const newElement = itemRefs.current.get(newItem.id);
            if (newElement) {
              const textNode = ensureTextNode(newElement);
              newElement.focus();

              // Position cursor at start
              const range = document.createRange();
              const sel = window.getSelection();
              range.setStart(textNode, 0);
              range.collapse(true);
              sel?.removeAllRanges();
              sel?.addRange(range);
            }
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
