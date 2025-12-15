/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Represents a parsed query segment from a multi-query string
 */
export interface ParsedQuery {
  /** Label for the query (A, B, C, ..., Z, AA, AB, ...) */
  label: string;
  /** The query string content (trimmed) */
  query: string;
  /** Starting line number (0-indexed) in the original text */
  startLine: number;
  /** Ending line number (0-indexed) in the original text */
  endLine: number;
  /** Starting character offset in the original text */
  startOffset: number;
  /** Ending character offset in the original text */
  endOffset: number;
}

/**
 * Generates a label for a query index (0 -> A, 1 -> B, ..., 25 -> Z, 26 -> AA, etc.)
 */
export function getQueryLabel(index: number): string {
  if (index < 26) {
    return String.fromCharCode(65 + index); // A-Z
  }
  // For indices >= 26, use AA, AB, etc.
  const firstChar = String.fromCharCode(65 + Math.floor((index - 26) / 26));
  const secondChar = String.fromCharCode(65 + ((index - 26) % 26));
  return firstChar + secondChar;
}

/**
 * Checks if a character at the given position is inside a string literal
 * Handles both single and double quotes, and escaped quotes
 */
function isInsideString(text: string, position: number): boolean {
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;

  for (let i = 0; i < position; i++) {
    const char = text[i];
    const prevChar = i > 0 ? text[i - 1] : '';

    // Skip escaped characters
    if (prevChar === '\\') {
      continue;
    }

    if (char === "'" && !inDoubleQuote && !inBacktick) {
      inSingleQuote = !inSingleQuote;
    } else if (char === '"' && !inSingleQuote && !inBacktick) {
      inDoubleQuote = !inDoubleQuote;
    } else if (char === '`' && !inSingleQuote && !inDoubleQuote) {
      inBacktick = !inBacktick;
    }
  }

  return inSingleQuote || inDoubleQuote || inBacktick;
}

/**
 * Finds all semicolon positions that are valid query delimiters
 * (not inside strings or comments)
 */
function findDelimiterPositions(text: string): number[] {
  const positions: number[] = [];

  for (let i = 0; i < text.length; i++) {
    if (text[i] === ';' && !isInsideString(text, i)) {
      positions.push(i);
    }
  }

  return positions;
}

/**
 * Calculates line number for a given character offset
 */
function getLineNumber(text: string, offset: number): number {
  let lineNumber = 0;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === '\n') {
      lineNumber++;
    }
  }
  return lineNumber;
}

/**
 * Splits a multi-query string (delimited by semicolons) into individual query segments.
 * Handles edge cases like semicolons inside strings and empty segments.
 *
 * @param queryString - The full query string potentially containing multiple queries
 * @returns Array of parsed query objects with labels and position information
 */
export function splitPromQLQueries(queryString: string): ParsedQuery[] {
  if (!queryString || !queryString.trim()) {
    return [];
  }

  const delimiterPositions = findDelimiterPositions(queryString);

  // If no delimiters, return single query
  if (delimiterPositions.length === 0) {
    const trimmed = queryString.trim();
    if (!trimmed) {
      return [];
    }
    return [
      {
        label: 'A',
        query: trimmed,
        startLine: 0,
        endLine: getLineNumber(queryString, queryString.length),
        startOffset: 0,
        endOffset: queryString.length,
      },
    ];
  }

  const queries: ParsedQuery[] = [];
  let currentIndex = 0;
  let queryIndex = 0;

  // Process each segment
  const allPositions = [...delimiterPositions, queryString.length];

  for (const delimPos of allPositions) {
    const segment = queryString.substring(currentIndex, delimPos);
    const trimmedSegment = segment.trim();

    if (trimmedSegment) {
      // Find actual start (skip leading whitespace)
      let actualStart = currentIndex;
      while (actualStart < delimPos && /\s/.test(queryString[actualStart])) {
        actualStart++;
      }

      // Find actual end (skip trailing whitespace)
      let actualEnd = delimPos;
      while (actualEnd > actualStart && /\s/.test(queryString[actualEnd - 1])) {
        actualEnd--;
      }

      queries.push({
        label: getQueryLabel(queryIndex),
        query: trimmedSegment,
        startLine: getLineNumber(queryString, actualStart),
        endLine: getLineNumber(queryString, actualEnd),
        startOffset: actualStart,
        endOffset: actualEnd,
      });

      queryIndex++;
    }

    currentIndex = delimPos + 1;
  }

  return queries;
}

/**
 * Finds which query segment contains the given cursor position
 *
 * @param queryString - The full multi-query string
 * @param cursorOffset - The cursor position (character offset)
 * @returns The parsed query containing the cursor, or undefined if not found
 */
export function findQueryAtPosition(
  queryString: string,
  cursorOffset: number
): ParsedQuery | undefined {
  const queries = splitPromQLQueries(queryString);

  if (queries.length === 0) {
    return undefined;
  }

  // Check each query - use < for endOffset since it's exclusive
  for (const query of queries) {
    if (cursorOffset >= query.startOffset && cursorOffset < query.endOffset) {
      return query;
    }
  }

  // If cursor is exactly at the end of a query (on the last character)
  for (const query of queries) {
    if (cursorOffset === query.endOffset) {
      return query;
    }
  }

  // If cursor is after all queries, return the last one (user typing at end)
  const lastQuery = queries[queries.length - 1];
  if (cursorOffset >= lastQuery.endOffset) {
    return lastQuery;
  }

  // If cursor is between queries (on delimiter or whitespace), find the next query
  // This handles the case where user just typed a semicolon and is starting a new query
  for (let i = 0; i < queries.length - 1; i++) {
    const currentQuery = queries[i];
    const nextQuery = queries[i + 1];

    // Cursor is between currentQuery.endOffset and nextQuery.startOffset
    if (cursorOffset >= currentQuery.endOffset && cursorOffset < nextQuery.startOffset) {
      // Return the next query since user is typing into it
      return nextQuery;
    }
  }

  // Default to first query if nothing else matches
  return queries[0];
}

/**
 * Gets the query-relative cursor offset for autocomplete
 *
 * @param queryString - The full multi-query string
 * @param cursorOffset - The absolute cursor position
 * @returns Object with the query segment and relative cursor position
 */
export function getQueryRelativePosition(
  queryString: string,
  cursorOffset: number
): { query: ParsedQuery; relativeOffset: number } | undefined {
  const queries = splitPromQLQueries(queryString);

  // If no queries, check if cursor is after a semicolon (new query context)
  if (queries.length === 0) {
    return undefined;
  }

  const currentQuery = findQueryAtPosition(queryString, cursorOffset);

  if (!currentQuery) {
    // Check if cursor is after last query's end and after a semicolon
    // This means user is typing a new query after semicolon
    const lastQuery = queries[queries.length - 1];
    const textAfterLastQuery = queryString.substring(lastQuery.endOffset);

    if (textAfterLastQuery.includes(';') && cursorOffset > lastQuery.endOffset) {
      // Find position after the semicolon
      const semicolonPos = queryString.indexOf(';', lastQuery.endOffset);
      if (semicolonPos !== -1 && cursorOffset > semicolonPos) {
        // User is typing after semicolon - treat as empty new query
        const newQueryStart = semicolonPos + 1;
        // Skip any whitespace after semicolon
        let actualStart = newQueryStart;
        while (actualStart < cursorOffset && /\s/.test(queryString[actualStart])) {
          actualStart++;
        }
        const partialQuery = queryString.substring(actualStart, cursorOffset).trim();

        return {
          query: {
            label: getQueryLabel(queries.length),
            query: partialQuery,
            startLine: getLineNumber(queryString, actualStart),
            endLine: getLineNumber(queryString, cursorOffset),
            startOffset: actualStart,
            endOffset: cursorOffset,
          },
          relativeOffset: cursorOffset - actualStart,
        };
      }
    }

    return undefined;
  }

  return {
    query: currentQuery,
    relativeOffset: cursorOffset - currentQuery.startOffset,
  };
}

/**
 * Creates a cache key for a specific query in a multi-query context
 */
export function createMultiQueryCacheKey(label: string, queryString: string): string {
  return `${label}:${queryString}`;
}

/**
 * Parses a multi-query cache key back to label and query
 */
export function parseMultiQueryCacheKey(cacheKey: string): { label: string; query: string } | null {
  const match = cacheKey.match(/^([A-Z]+):(.*)$/);
  if (match) {
    return { label: match[1], query: match[2] };
  }
  return null;
}

/**
 * Converts a character offset within a string to line and column position (1-indexed, Monaco style)
 *
 * @param text - The text to analyze
 * @param offset - The character offset (0-indexed)
 * @returns Object with lineNumber and column (both 1-indexed for Monaco compatibility)
 */
export function offsetToLineColumn(
  text: string,
  offset: number
): { lineNumber: number; column: number } {
  // Clamp offset to valid range
  const clampedOffset = Math.max(0, Math.min(offset, text.length));

  // Find the line number by counting newlines before the offset
  let lineNumber = 1;
  let lastNewlineIndex = -1;

  for (let i = 0; i < clampedOffset; i++) {
    if (text[i] === '\n') {
      lineNumber++;
      lastNewlineIndex = i;
    }
  }

  // Column is the distance from the last newline (or start of string) to the offset
  // Monaco columns are 1-indexed
  const column = clampedOffset - lastNewlineIndex;

  return { lineNumber, column };
}
