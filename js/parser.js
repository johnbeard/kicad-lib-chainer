// S-expression tokenizer and parser for KiCad library tables.
//
// Produces an AST where each node is either:
//   - A string (bare word or quoted string)
//   - An array of nodes   (a parenthesized list)

/**
 * Tokenize an s-expression string into an array of tokens.
 * Tokens: '(', ')', or string literals (quoted or bare words).
 */
function tokenize(input) {
  const tokens = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    // Skip whitespace
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++;
      continue;
    }

    if (ch === '(') {
      tokens.push('(');
      i++;
      continue;
    }

    if (ch === ')') {
      tokens.push(')');
      i++;
      continue;
    }

    // Quoted string
    if (ch === '"') {
      let str = '';
      i++; // skip opening quote
      while (i < input.length && input[i] !== '"') {
        if (input[i] === '\\' && i + 1 < input.length) {
          str += input[i] + input[i + 1];
          i += 2;
        } else {
          str += input[i];
          i++;
        }
      }
      if (i < input.length) {
        i++; // skip closing quote
      }
      tokens.push({ type: 'quoted', value: str });
      continue;
    }

    // Bare word (unquoted token)
    let word = '';
    while (i < input.length && !/[\s()"]/.test(input[i])) {
      word += input[i];
      i++;
    }
    if (word.length > 0) {
      tokens.push(word);
    }
  }

  return tokens;
}

/**
 * Parse a token stream into a nested array AST.
 * Returns { node, pos } where pos is the next index to consume.
 */
function parseTokens(tokens, pos) {
  const list = [];

  while (pos < tokens.length) {
    const tok = tokens[pos];

    if (tok === '(') {
      const result = parseTokens(tokens, pos + 1);
      list.push(result.node);
      pos = result.pos;
    } else if (tok === ')') {
      return { node: list, pos: pos + 1 };
    } else if (typeof tok === 'object' && tok.type === 'quoted') {
      list.push({ quoted: true, value: tok.value });
      pos++;
    } else {
      // bare word
      list.push(tok);
      pos++;
    }
  }

  return { node: list, pos };
}

/**
 * Parse an s-expression string into an AST.
 */
export function parse(input) {
  const tokens = tokenize(input);
  const result = parseTokens(tokens, 0);
  // Top-level should contain one element: the root list
  if (result.node.length === 1) {
    return result.node[0];
  }
  return result.node;
}

/**
 * Serialize an AST node back into an s-expression string.
 * Preserves quoted vs bare distinction.
 */
export function serialize(node, indent = 0) {
  if (typeof node === 'string') {
    return node;
  }

  if (node && typeof node === 'object' && 'quoted' in node) {
    return `"${node.value}"`;
  }

  if (!Array.isArray(node)) {
    return String(node);
  }

  // Determine the tag (first element, if it's a bare string)
  const tag = typeof node[0] === 'string' ? node[0] : null;

  // Check deepest nesting: if no child array itself contains arrays,
  // the whole expression fits on one line (e.g. lib entries).
  const hasDeeplyNested = node.some(
    (child) => Array.isArray(child) && child.some((gc) => Array.isArray(gc)),
  );

  if (!hasDeeplyNested) {
    const parts = node.map((child) => serialize(child, 0));
    return '(' + parts.join(' ') + ')';
  }

  // Multi-line rendering for deeply nested structures (root table)
  const tabs = '\t'.repeat(indent);
  const childTabs = '\t'.repeat(indent + 1);

  let out = '(' + (tag ?? '');

  for (let i = tag ? 1 : 0; i < node.length; i++) {
    const child = node[i];
    if (Array.isArray(child)) {
      out += '\n' + childTabs + serialize(child, indent + 1);
    } else {
      out += ' ' + serialize(child, indent + 1);
    }
  }

  out += '\n' + tabs + ')';
  return out;
}
