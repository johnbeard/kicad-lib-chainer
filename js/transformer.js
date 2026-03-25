// Transformer: converts an unchained KiCad library table into a chained one.
//
// Stock libraries are detected by URI patterns like:
//   ${KICAD*_FOOTPRINT_DIR}/...
//   ${KICAD*_SYMBOL_DIR}/...
//   ${KICAD*_3DMODEL_DIR}/...
//
// These are removed and replaced with a single chained Table entry.
// User libraries (anything not matching stock patterns) are preserved.

import { parse, serialize } from './parser.js';

const STOCK_URI_PATTERN = /^\$\{KICAD\d*_(?:FOOTPRINT|SYMBOL|3DMODEL|3RD_PARTY)_DIR\}/;

/**
 * Detect whether the table is a footprint table or symbol table.
 * Returns 'fp_lib_table' or 'sym_lib_table' or null.
 */
function detectTableType(ast) {
  if (Array.isArray(ast) && typeof ast[0] === 'string') {
    return ast[0];
  }
  return null;
}

/**
 * Check whether a lib entry is a stock KiCad library.
 */
function isStockLib(libNode) {
  if (!Array.isArray(libNode) || libNode[0] !== 'lib') return false;

  for (const child of libNode) {
    if (Array.isArray(child) && child[0] === 'uri') {
      const uri = child[1];
      const uriStr = typeof uri === 'object' && 'quoted' in uri ? uri.value : String(uri);
      return STOCK_URI_PATTERN.test(uriStr);
    }
  }
  return false;
}

/**
 * Build a chained table entry.
 */
function buildChainedEntry(name, chainPath, descr) {
  return [
    'lib',
    ['name', { quoted: true, value: name }],
    ['type', { quoted: true, value: 'Table' }],
    ['uri', { quoted: true, value: chainPath }],
    ['options', { quoted: true, value: '' }],
    ['descr', { quoted: true, value: descr }],
  ];
}

/**
 * Shared parsing step: parse input, separate stock and user libs.
 */
function parseTable(input) {
  const ast = parse(input);
  const tableType = detectTableType(ast);

  if (!tableType || !['fp_lib_table', 'sym_lib_table'].includes(tableType)) {
    throw new Error(
      'Could not detect table type. Expected fp_lib_table or sym_lib_table as the root element.',
    );
  }

  const userLibs = [];
  let stockCount = 0;

  for (let i = 1; i < ast.length; i++) {
    const child = ast[i];
    if (!Array.isArray(child)) continue;

    if (child[0] === 'lib') {
      if (isStockLib(child)) {
        stockCount++;
      } else {
        userLibs.push(child);
      }
    }
  }

  return { tableType, userLibs, stockCount };
}

/**
 * Transform an unchained library table into a chained one (inline mode).
 * User libs are placed directly in the main table alongside the stock chain entry.
 *
 * @param {string} input - The unchained library table s-expression text.
 * @param {string} chainPath - Path to the system library table to chain to.
 * @returns {{ output: string, stats: { total: number, stock: number, user: number } }}
 */
export function transform(input, chainPath) {
  const { tableType, userLibs, stockCount } = parseTable(input);
  const isFootprint = tableType === 'fp_lib_table';

  const newAst = [tableType];
  newAst.push(['version', '7']);
  newAst.push(
    buildChainedEntry(
      'KiCad',
      chainPath,
      isFootprint ? 'KiCad Default Footprint Libraries' : 'KiCad Default Symbol Libraries',
    ),
  );

  for (const lib of userLibs) {
    newAst.push(lib);
  }

  return {
    output: serialize(newAst) + '\n',
    stats: {
      total: stockCount + userLibs.length,
      stock: stockCount,
      user: userLibs.length,
    },
  };
}

/**
 * Transform an unchained library table into two chained tables (split mode).
 * The main table has two Table entries: one for stock libs, one for user libs.
 * The user table contains the actual user library entries.
 *
 * @param {string} input - The unchained library table s-expression text.
 * @param {string} stockChainPath - Path to the system library table.
 * @param {string} userChainPath - Path where the user library table will be saved.
 * @returns {{ mainOutput: string, userOutput: string, stats: { total: number, stock: number, user: number } }}
 */
export function transformSplit(input, stockChainPath, userChainPath) {
  const { tableType, userLibs, stockCount } = parseTable(input);
  const isFootprint = tableType === 'fp_lib_table';

  // Main table: two chained Table entries
  const mainAst = [tableType];
  mainAst.push(['version', '7']);
  mainAst.push(
    buildChainedEntry(
      'KiCad',
      stockChainPath,
      isFootprint ? 'KiCad Default Footprint Libraries' : 'KiCad Default Symbol Libraries',
    ),
  );
  mainAst.push(buildChainedEntry('User', userChainPath, 'User Libraries'));

  // User table: the actual user lib entries
  const userAst = [tableType];
  userAst.push(['version', '7']);
  for (const lib of userLibs) {
    userAst.push(lib);
  }

  return {
    mainOutput: serialize(mainAst) + '\n',
    userOutput: serialize(userAst) + '\n',
    stats: {
      total: stockCount + userLibs.length,
      stock: stockCount,
      user: userLibs.length,
    },
  };
}
