/**
 * Repairs a truncated JSON prefix (from a streaming LLM response) into valid JSON
 * so partial fields and live-streaming code blocks can render immediately.
 */
export function parsePartialJson<T = Record<string, unknown>>(input: string): T | null {
  const trimmed = input.trimStart();
  if (!trimmed || (trimmed[0] !== '{' && trimmed[0] !== '[')) {
    return null;
  }

  // Fast path: already complete JSON
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // Continue to repair truncated prefix
  }

  type ContainerFrame = {
    type: '{' | '[';
    expectingKey?: boolean;
    keyStart?: number;
    lastCommaIndex?: number;
  };

  let inString = false;
  let escaped = false;
  let stringStart = -1;
  let stringIsKey = false;
  const stack: ContainerFrame[] = [];

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
        const top = stack[stack.length - 1];
        if (top && top.type === '{' && stringIsKey) {
          top.expectingKey = false;
        }
      }
      continue;
    }

    if (ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t') {
      continue;
    }

    const top = stack[stack.length - 1];

    if (ch === '"') {
      inString = true;
      escaped = false;
      stringStart = i;
      if (top && top.type === '{' && top.expectingKey) {
        stringIsKey = true;
        top.keyStart = i;
      } else {
        stringIsKey = false;
      }
      continue;
    }

    if (ch === '{') {
      stack.push({ type: '{', expectingKey: true });
      continue;
    }

    if (ch === '[') {
      stack.push({ type: '[' });
      continue;
    }

    if (ch === '}' || ch === ']') {
      stack.pop();
      continue;
    }

    if (ch === ',') {
      if (top) {
        top.lastCommaIndex = i;
        if (top.type === '{') {
          top.expectingKey = true;
          top.keyStart = undefined;
        }
      }
      continue;
    }
  }

  let repaired = trimmed;

  if (inString) {
    if (stringIsKey) {
      // Truncated inside an object property key — drop back before this key (and trailing comma)
      const top = stack[stack.length - 1];
      const cutAt = top?.lastCommaIndex !== undefined ? top.lastCommaIndex : stringStart;
      repaired = repaired.slice(0, cutAt);
    } else {
      // Truncated inside a string value — close string cleanly
      if (escaped) {
        repaired = repaired.slice(0, -1);
      }
      repaired += '"';
    }
  } else {
    repaired = repaired.trimEnd();
    const top = stack[stack.length - 1];

    // If truncated right after ":" or inside an incomplete primitive token
    if (repaired.endsWith(':')) {
      const cutAt =
        top?.lastCommaIndex !== undefined
          ? top.lastCommaIndex
          : top?.keyStart !== undefined
            ? top.keyStart
            : repaired.length - 1;
      repaired = repaired.slice(0, cutAt);
    } else if (/([a-zA-Z-]+|-?\d+(?:\.\d*)?(?:[eE][+-]?)?)$/.test(repaired)) {
      // Check if trailing bare token is valid JSON literal/number or truncated
      const tailMatch = repaired.match(/([^\s,:\[{}\]]+)$/);
      const tail = tailMatch?.[1] ?? '';
      const isCompletePrimitive =
        tail === 'true' ||
        tail === 'false' ||
        tail === 'null' ||
        /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/.test(tail);

      if (!isCompletePrimitive && tail.length > 0) {
        const beforeTail = repaired.slice(0, repaired.length - tail.length).trimEnd();
        if (beforeTail.endsWith(':')) {
          const cutAt =
            top?.lastCommaIndex !== undefined
              ? top.lastCommaIndex
              : top?.keyStart !== undefined
                ? top.keyStart
                : beforeTail.length - 1;
          repaired = repaired.slice(0, cutAt);
        } else {
          repaired = beforeTail;
        }
      }
    }
  }

  repaired = repaired.trimEnd();
  if (repaired.endsWith(',')) {
    repaired = repaired.slice(0, -1).trimEnd();
  }

  // Re-scan container stack on the repaired prefix so closing brackets match 100%
  const closeStack: Array<'}' | ']'> = [];
  let sInStr = false;
  let sEsc = false;
  for (let i = 0; i < repaired.length; i++) {
    const c = repaired[i];
    if (sInStr) {
      if (sEsc) {
        sEsc = false;
      } else if (c === '\\') {
        sEsc = true;
      } else if (c === '"') {
        sInStr = false;
      }
      continue;
    }
    if (c === '"') {
      sInStr = true;
    } else if (c === '{') {
      closeStack.push('}');
    } else if (c === '[') {
      closeStack.push(']');
    } else if (c === '}' || c === ']') {
      closeStack.pop();
    }
  }

  if (sInStr) {
    repaired += '"';
  }
  while (closeStack.length > 0) {
    repaired += closeStack.pop();
  }

  try {
    return JSON.parse(repaired) as T;
  } catch {
    return null;
  }
}
