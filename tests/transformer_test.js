// Transformer smoke tests.

import { transform, transformSplit } from '../js/transformer.js';

const input = `(fp_lib_table
\t(lib (name "Audio_Module") (type "KiCad") (uri "\${KICAD10_FOOTPRINT_DIR}/Audio_Module.pretty") (options "") (descr "Audio Module footprints"))
\t(lib (name "Battery") (type "KiCad") (uri "\${KICAD10_FOOTPRINT_DIR}/Battery.pretty") (options "") (descr "Battery and battery holder footprints"))
\t(lib (name "Capacitor_SMD") (type "KiCad") (uri "\${KICAD10_FOOTPRINT_DIR}/Capacitor_SMD.pretty") (options "") (descr "SMD capacitor footprints"))
\t(lib (name "My Lib") (type "KiCad") (uri "/home/user/kicad-stuff/MyLib.pretty") (options "") (descr "My Library"))
\t(lib (name "Work Parts") (type "KiCad") (uri "/home/user/work/WorkParts.pretty") (options "") (descr "Work footprints"))
)`;

let passed = true;
function check(condition, msg) {
  if (!condition) {
    console.error('FAIL:', msg);
    passed = false;
  }
}

// --- Inline mode ---
console.log('=== Inline mode ===');
const result = transform(input, '/usr/share/kicad/footprints/fp-lib-table');
console.log('Stats:', JSON.stringify(result.stats));
console.log(result.output);

check(result.stats.stock === 3, 'expected 3 stock libs');
check(result.stats.user === 2, 'expected 2 user libs');
check(result.output.includes('(version 7)'), 'output missing (version 7)');
check(result.output.includes('(type "Table")'), 'output missing chained Table entry');
check(result.output.includes('My Lib'), 'output missing user lib "My Lib"');
check(result.output.includes('Work Parts'), 'output missing user lib "Work Parts"');
check(!result.output.includes('Audio_Module'), 'output still contains stock lib "Audio_Module"');

// --- Split mode ---
console.log('=== Split mode ===');
const split = transformSplit(
  input,
  '/usr/share/kicad/footprints/fp-lib-table',
  '/home/user/kicad-libs/user-fp-lib-table',
);
console.log('Stats:', JSON.stringify(split.stats));
console.log('Main:\n' + split.mainOutput);
console.log('User:\n' + split.userOutput);

check(split.stats.stock === 3, 'split: expected 3 stock libs');
check(split.stats.user === 2, 'split: expected 2 user libs');

// Main table should have two Table entries and no inline libs
check(split.mainOutput.includes('(name "KiCad")'), 'main missing KiCad chain entry');
check(split.mainOutput.includes('(name "User")'), 'main missing User chain entry');
check(
  split.mainOutput.includes('/home/user/kicad-libs/user-fp-lib-table'),
  'main missing user chain path',
);
check(!split.mainOutput.includes('My Lib'), 'main should not contain inline user libs');

// User table should have the user libs and no stock libs
check(split.userOutput.includes('My Lib'), 'user table missing "My Lib"');
check(split.userOutput.includes('Work Parts'), 'user table missing "Work Parts"');
check(!split.userOutput.includes('Audio_Module'), 'user table contains stock lib');
check(split.userOutput.includes('(version 7)'), 'user table missing (version 7)');

console.log(passed ? '\nAll checks passed.' : '\nSome checks FAILED.');
process.exit(passed ? 0 : 1);
