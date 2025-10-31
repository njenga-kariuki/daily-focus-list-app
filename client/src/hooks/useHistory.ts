import { useState, useCallback, useRef } from 'react';

interface UseHistoryOptions<T> {
  maxHistorySize?: number;
}

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export function useHistory<T>(
  initialValue: T,
  options: UseHistoryOptions<T> = {}
) {
  const { maxHistorySize = 100 } = options;

  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialValue,
    future: [],
  });

  // Track if we're in the middle of an undo/redo operation
  const isUndoRedoRef = useRef(false);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const set = useCallback((newValue: T | ((prev: T) => T)) => {
    setHistory((currentHistory) => {
      const newPresent = typeof newValue === 'function'
        ? (newValue as (prev: T) => T)(currentHistory.present)
        : newValue;

      // Don't add to history if the value hasn't actually changed
      if (JSON.stringify(newPresent) === JSON.stringify(currentHistory.present)) {
        return currentHistory;
      }

      // Don't add to history if this is from an undo/redo operation
      if (isUndoRedoRef.current) {
        return currentHistory;
      }

      const newPast = [...currentHistory.past, currentHistory.present];

      // Limit history size
      if (newPast.length > maxHistorySize) {
        newPast.shift();
      }

      return {
        past: newPast,
        present: newPresent,
        future: [], // Clear future when making a new change
      };
    });
  }, [maxHistorySize]);

  const undo = useCallback(() => {
    setHistory((currentHistory) => {
      if (currentHistory.past.length === 0) {
        return currentHistory;
      }

      const newPast = [...currentHistory.past];
      const newPresent = newPast.pop()!;
      const newFuture = [currentHistory.present, ...currentHistory.future];

      isUndoRedoRef.current = true;

      return {
        past: newPast,
        present: newPresent,
        future: newFuture,
      };
    });

    // Reset the flag after the state update
    setTimeout(() => {
      isUndoRedoRef.current = false;
    }, 0);
  }, []);

  const redo = useCallback(() => {
    setHistory((currentHistory) => {
      if (currentHistory.future.length === 0) {
        return currentHistory;
      }

      const newFuture = [...currentHistory.future];
      const newPresent = newFuture.shift()!;
      const newPast = [...currentHistory.past, currentHistory.present];

      isUndoRedoRef.current = true;

      return {
        past: newPast,
        present: newPresent,
        future: newFuture,
      };
    });

    // Reset the flag after the state update
    setTimeout(() => {
      isUndoRedoRef.current = false;
    }, 0);
  }, []);

  const reset = useCallback((newValue: T) => {
    setHistory({
      past: [],
      present: newValue,
      future: [],
    });
  }, []);

  const clear = useCallback(() => {
    setHistory((currentHistory) => ({
      past: [],
      present: currentHistory.present,
      future: [],
    }));
  }, []);

  return {
    state: history.present,
    set,
    undo,
    redo,
    reset,
    clear,
    canUndo,
    canRedo,
  };
}
