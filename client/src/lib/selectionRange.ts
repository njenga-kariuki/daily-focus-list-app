export interface SerializedPosition {
  path: number[];
  offset: number;
}

export interface SerializedSelection {
  anchor: SerializedPosition;
  focus: SerializedPosition;
}

const getNodePath = (node: Node | null, root: Node): number[] | null => {
  if (!node) return null;

  const path: number[] = [];
  let current: Node | null = node;

  while (current && current !== root) {
    const parentNode = current.parentNode as (Node & ParentNode) | null;
    if (!parentNode) return null;

    const siblings = Array.from(parentNode.childNodes);
    const index = siblings.indexOf(current as ChildNode);
    if (index === -1) return null;

    path.unshift(index);
    current = parentNode;
  }

  return current === root ? path : null;
};

const getNodeFromPath = (root: Node, path: number[]): Node | null => {
  let current: Node | null = root;

  for (const index of path) {
    if (!current || !current.childNodes || index >= current.childNodes.length) {
      return null;
    }
    current = current.childNodes[index];
  }

  return current;
};

const clampOffsetForNode = (node: Node, offset: number): number => {
  if (node.nodeType === Node.TEXT_NODE) {
    const textLength = node.textContent?.length ?? 0;
    return Math.min(offset, textLength);
  }

  const length = node.childNodes.length;
  return Math.min(offset, length);
};

export const serializeSelection = (root: HTMLElement): SerializedSelection | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const { anchorNode, focusNode } = selection;
  if (!anchorNode || !focusNode) {
    return null;
  }

  if (!(root === anchorNode || root.contains(anchorNode))) {
    return null;
  }

  if (!(root === focusNode || root.contains(focusNode))) {
    return null;
  }

  const anchorPath = getNodePath(anchorNode, root);
  const focusPath = getNodePath(focusNode, root);

  if (!anchorPath || !focusPath) {
    return null;
  }

  return {
    anchor: {
      path: anchorPath,
      offset: selection.anchorOffset,
    },
    focus: {
      path: focusPath,
      offset: selection.focusOffset,
    },
  };
};

export const restoreSelection = (root: HTMLElement, serialized: SerializedSelection): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  const selection = window.getSelection();
  if (!selection) {
    return false;
  }

  const anchorNode = getNodeFromPath(root, serialized.anchor.path);
  const focusNode = getNodeFromPath(root, serialized.focus.path);

  if (!anchorNode || !focusNode) {
    return false;
  }

  const anchorOffset = clampOffsetForNode(anchorNode, serialized.anchor.offset);
  const focusOffset = clampOffsetForNode(focusNode, serialized.focus.offset);

  selection.removeAllRanges();

  if (typeof selection.setBaseAndExtent === "function") {
    selection.setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset);
  } else {
    const range = document.createRange();
    range.setStart(anchorNode, anchorOffset);
    range.setEnd(focusNode, focusOffset);
    selection.addRange(range);
  }

  return true;
};
