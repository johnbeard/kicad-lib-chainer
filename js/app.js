// App wiring: connects the UI to the transformer logic.

import { transform, transformSplit } from './transformer.js';

// Per-platform "maybe-ish right" base paths for KiCad system libraries.
// These are all
const PLATFORM_BASES = {
  linux: '/usr/share/kicad',
  macos: '/Applications/KiCad/KiCad.app/Contents/SharedSupport',
  macports: '/opt/local/share/kicad',
  windows: 'C:/Program Files/KiCad/10.0/share/kicad',
};

const TABLE_SUFFIXES = {
  fp_lib_table: '/footprints/fp-lib-table',
  sym_lib_table: '/symbols/sym-lib-table',
};

// Per-platform default base paths for user library tables.
const USER_LIB_BASES = {
  linux: '${HOME}/kicad-libs',
  macos: '${HOME}/kicad-libs',
  macports: '${HOME}/kicad-libs',
  windows: '${USERPROFILE}/Documents/KiCad/libs',
};

const USER_TABLE_SUFFIXES = {
  fp_lib_table: '/user-fp-lib-table',
  sym_lib_table: '/user-sym-lib-table',
};

function getElements() {
  return {
    inputArea: document.getElementById('input-area'),
    fileInput: document.getElementById('file-input'),
    platformSelect: document.getElementById('platform-select'),
    chainPath: document.getElementById('chain-path'),
    splitCheckbox: document.getElementById('split-user-libs'),
    userLibPathField: document.getElementById('user-lib-path-field'),
    userLibPath: document.getElementById('user-lib-path'),
    convertBtn: document.getElementById('convert-btn'),
    copyBtn: document.getElementById('copy-btn'),
    downloadBtn: document.getElementById('download-btn'),
    outputArea: document.getElementById('output-area'),
    userOutputSection: document.getElementById('user-output-section'),
    userOutputArea: document.getElementById('user-output-area'),
    copyUserBtn: document.getElementById('copy-user-btn'),
    downloadUserBtn: document.getElementById('download-user-btn'),
    statsArea: document.getElementById('stats-area'),
    errorArea: document.getElementById('error-area'),
  };
}

function showError(el, message) {
  el.textContent = message;
  el.hidden = false;
}

function clearError(el) {
  el.textContent = '';
  el.hidden = true;
}

function showStats(el, stats) {
  el.textContent = `${stats.total} libraries found: ${stats.stock} stock (removed), ${stats.user} user (kept)`;
  el.hidden = false;
}

/**
 * Detect the table type from input text.
 * Returns 'fp_lib_table', 'sym_lib_table', or null.
 */
function detectTableType(inputText) {
  if (inputText.includes('fp_lib_table')) return 'fp_lib_table';
  if (inputText.includes('sym_lib_table')) return 'sym_lib_table';
  return null;
}

/**
 * Build the full chain path from the selected platform and detected table type.
 */
function buildChainPath(platform, tableType) {
  const base = PLATFORM_BASES[platform];
  const suffix = TABLE_SUFFIXES[tableType];
  if (!base || !suffix) return '';
  return base + suffix;
}

function buildUserLibPath(platform, tableType) {
  const base = USER_LIB_BASES[platform];
  const suffix = USER_TABLE_SUFFIXES[tableType];
  if (!base || !suffix) return '';
  return base + suffix;
}

/**
 * Update the chain path field based on platform selection and input content.
 * Called when platform changes or new input is provided.
 * Only overwrites the path if it is empty or still matches a known default
 * (i.e. the user has not manually edited it).
 */
function updateChainPath(els) {
  const current = els.chainPath.value.trim();
  const isKnownDefault =
    current === '' ||
    Object.keys(PLATFORM_BASES).some((p) => {
      return Object.values(TABLE_SUFFIXES).some((s) => current === PLATFORM_BASES[p] + s);
    });

  if (!isKnownDefault) return; // user has customised -- don't overwrite

  const tableType = detectTableType(els.inputArea.value);
  if (!tableType) return;

  els.chainPath.value = buildChainPath(els.platformSelect.value, tableType);
}

/**
 * Update the user library path field based on platform and table type.
 * Same logic as updateChainPath: only overwrite if still a known default.
 */
function updateUserLibPath(els) {
  const current = els.userLibPath.value.trim();
  const isKnownDefault =
    current === '' ||
    Object.keys(USER_LIB_BASES).some((p) => {
      return Object.values(USER_TABLE_SUFFIXES).some((s) => current === USER_LIB_BASES[p] + s);
    });

  if (!isKnownDefault) return;

  const tableType = detectTableType(els.inputArea.value);
  if (!tableType) return;

  els.userLibPath.value = buildUserLibPath(els.platformSelect.value, tableType);
}

function resetOutputs(els) {
  els.outputArea.value = '';
  els.copyBtn.disabled = true;
  els.downloadBtn.disabled = true;
  els.userOutputSection.hidden = true;
  els.userOutputArea.value = '';
  els.copyUserBtn.disabled = true;
  els.downloadUserBtn.disabled = true;
}

function handleConvert(els) {
  clearError(els.errorArea);
  els.statsArea.hidden = true;
  resetOutputs(els);

  const input = els.inputArea.value.trim();
  if (!input) {
    showError(els.errorArea, 'Please paste or upload a library table first.');
    return;
  }

  const chainPath = els.chainPath.value.trim();
  if (!chainPath) {
    showError(els.errorArea, 'Please provide the path to the system library table.');
    return;
  }

  const splitMode = els.splitCheckbox.checked;

  if (splitMode) {
    const userLibPath = els.userLibPath.value.trim();
    if (!userLibPath) {
      showError(els.errorArea, 'Please provide the path for the user library table.');
      return;
    }

    try {
      const result = transformSplit(input, chainPath, userLibPath);
      els.outputArea.value = result.mainOutput;
      els.userOutputArea.value = result.userOutput;
      els.userOutputSection.hidden = false;
      showStats(els.statsArea, result.stats);
      els.copyBtn.disabled = false;
      els.downloadBtn.disabled = false;
      els.copyUserBtn.disabled = false;
      els.downloadUserBtn.disabled = false;
    } catch (err) {
      showError(els.errorArea, err.message);
    }
  } else {
    try {
      const result = transform(input, chainPath);
      els.outputArea.value = result.output;
      showStats(els.statsArea, result.stats);
      els.copyBtn.disabled = false;
      els.downloadBtn.disabled = false;
    } catch (err) {
      showError(els.errorArea, err.message);
    }
  }
}

function handleFileUpload(els) {
  const file = els.fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    els.inputArea.value = reader.result;
    updateChainPath(els);
    updateUserLibPath(els);
  };
  reader.onerror = () => {
    showError(els.errorArea, 'Failed to read file.');
  };
  reader.readAsText(file);
}

async function handleCopy(textArea, button) {
  try {
    await navigator.clipboard.writeText(textArea.value);
    const original = button.textContent;
    button.textContent = 'Copied!';
    setTimeout(() => {
      button.textContent = original;
    }, 1500);
  } catch {
    textArea.select();
  }
}

function handleDownload(content, filename) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function mainFilename(inputText) {
  if (inputText.includes('fp_lib_table')) return 'fp-lib-table';
  if (inputText.includes('sym_lib_table')) return 'sym-lib-table';
  return 'lib-table';
}

function userFilename(inputText) {
  if (inputText.includes('fp_lib_table')) return 'user-fp-lib-table';
  if (inputText.includes('sym_lib_table')) return 'user-sym-lib-table';
  return 'user-lib-table';
}

function toggleSplitUI(els) {
  const show = els.splitCheckbox.checked;
  els.userLibPathField.hidden = !show;
  if (!show) {
    els.userOutputSection.hidden = true;
  }
}

function init() {
  const els = getElements();

  els.convertBtn.addEventListener('click', () => handleConvert(els));
  els.fileInput.addEventListener('change', () => handleFileUpload(els));
  els.copyBtn.addEventListener('click', () => handleCopy(els.outputArea, els.copyBtn));
  els.downloadBtn.addEventListener('click', () =>
    handleDownload(els.outputArea.value, mainFilename(els.inputArea.value)),
  );
  els.copyUserBtn.addEventListener('click', () => handleCopy(els.userOutputArea, els.copyUserBtn));
  els.downloadUserBtn.addEventListener('click', () =>
    handleDownload(els.userOutputArea.value, userFilename(els.inputArea.value)),
  );
  els.platformSelect.addEventListener('change', () => {
    updateChainPath(els);
    updateUserLibPath(els);
  });
  els.splitCheckbox.addEventListener('change', () => toggleSplitUI(els));

  // Auto-detect paths when user pastes into the textarea
  els.inputArea.addEventListener('input', () => {
    updateChainPath(els);
    updateUserLibPath(els);
  });

  // Set initial visibility
  toggleSplitUI(els);
}

init();
