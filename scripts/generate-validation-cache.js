#!/usr/bin/env node
// scripts/generate-validation-cache.js
// ─────────────────────────────────────────────────────────────────────────────
// Runs automatically as part of the build:
//   "build": "node scripts/generate-validation-cache.js && next build"
//
// Output: public/validation-cache-YYYY-MM-DD_HH-MM-SS.json
//         public/validation-cache.json  (pointer file — always points to latest)
// ─────────────────────────────────────────────────────────────────────────────

const fs   = require('fs');
const path = require('path');

// ── Must mirror public/js/config.js ──────────────────────────────────────────
// Set VALIDATION_CACHE_PATH to null to skip cache generation entirely.
const VALIDATION_CACHE_PATH  = '/validation-cache.json';
const QUIZ_DIRECTORY_NAME    = 'list quizzes';
const QUIZ_DIRECTORY_IN_ROOT = false;
const MAX_CONSECUTIVE_LINES  = 5;
const MIN_CONSECUTIVE_LINES  = 3;
// ─────────────────────────────────────────────────────────────────────────────

// Exit early if validation is disabled in config
if (!VALIDATION_CACHE_PATH) {
  console.log('⏭️  VALIDATION_CACHE_PATH is null in config — skipping cache generation.');
  process.exit(0);
}

const QUIZ_ROOT    = QUIZ_DIRECTORY_IN_ROOT
  ? path.resolve(__dirname, '..', QUIZ_DIRECTORY_NAME)
  : path.resolve(__dirname, '..', 'public', QUIZ_DIRECTORY_NAME);

const PUBLIC_DIR   = path.resolve(__dirname, '..', 'public');

// Build timestamped filename: validation-cache-2025-03-19_14-32-07.json
const now          = new Date();
const pad          = n => String(n).padStart(2, '0');
const timestamp    = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
                   + `_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
const STAMPED_NAME = `validation-cache-${timestamp}.json`;
const STAMPED_PATH = path.join(PUBLIC_DIR, STAMPED_NAME);
const LATEST_PATH  = path.join(PUBLIC_DIR, 'validation-cache.json');  // fixed pointer

const files   = {};
const folders = {};

// ── Validate a single .txt file ───────────────────────────────────────────────
function validateFile(absPath) {
  let text;
  try { text = fs.readFileSync(absPath, 'utf8'); }
  catch (e) { return { valid: true, violationType: null, min: 0, max: 0, reason: 'Could not read file' }; }

  const lines  = text.split('\n');
  const blocks = [];
  let current  = [];

  for (const line of lines) {
    if (line.trim() !== '') { current.push(line); }
    else if (current.length > 0) { blocks.push(current); current = []; }
  }
  if (current.length > 0) blocks.push(current);

  let maxC = 0, minC = Infinity;
  for (const b of blocks) { maxC = Math.max(maxC, b.length); minC = Math.min(minC, b.length); }
  if (blocks.length === 0) minC = 0;

  // STEP 1 — line count (red)
  if (maxC > MAX_CONSECUTIVE_LINES) {
    return { valid: false, violationType: 'line_count',
      min: minC === Infinity ? 0 : minC, max: maxC,
      reason: `Too many consecutive lines (${maxC} > ${MAX_CONSECUTIVE_LINES})` };
  }
  if (minC < MIN_CONSECUTIVE_LINES && minC > 0) {
    return { valid: false, violationType: 'line_count',
      min: minC, max: maxC,
      reason: `Too few consecutive lines (${minC} < ${MIN_CONSECUTIVE_LINES})` };
  }

  // STEP 2 — correct-answer count (violet)
  for (let i = 0; i < blocks.length; i++) {
    const cc = blocks[i].slice(1).filter(l => l.trimStart().startsWith('@@')).length;
    if (cc !== 1) {
      return { valid: false, violationType: 'answer_count',
        min: minC === Infinity ? 0 : minC, max: maxC,
        reason: cc === 0
          ? `Question ${i + 1}: no correct answer marked (@@)`
          : `Question ${i + 1}: ${cc} correct answers marked (@@) — must be exactly 1` };
    }
  }

  return { valid: true, violationType: null,
    min: minC === Infinity ? 0 : minC, max: maxC, reason: '' };
}

// ── Recursively crawl a folder ────────────────────────────────────────────────
function crawlFolder(absFolder, relFolder) {
  let entries;
  try { entries = fs.readdirSync(absFolder, { withFileTypes: true }); }
  catch (e) { console.error(`  ✗ Cannot read: ${absFolder}`); return { hasInvalid: false, violationType: null }; }

  const subFolders = entries.filter(e => e.isDirectory()).map(e => e.name).sort();
  const txtFiles   = entries.filter(e => e.isFile() && e.name.endsWith('.txt')).map(e => e.name).sort();

  const violationTypes = [];

  for (const file of txtFiles) {
    const relPath = relFolder ? `${relFolder}/${file}` : file;
    const result  = validateFile(path.join(absFolder, file));
    files[relPath] = result;

    if (result.valid) {
      console.log(`  ✅ ${relPath}`);
    } else {
      const emoji = result.violationType === 'answer_count' ? '🟣' : '🔴';
      console.log(`  ${emoji} ${relPath}: ${result.reason}`);
      // Opt-out files (ending in ' (-).txt') are never shown to users,
      // so they must not influence the parent folder's flag colour.
      if (!file.endsWith(' (-).txt')) {
        violationTypes.push(result.violationType);
      }
    }
  }

  for (const sub of subFolders) {
    const relPath   = relFolder ? `${relFolder}/${sub}` : sub;
    const subResult = crawlFolder(path.join(absFolder, sub), relPath);
    if (subResult.hasInvalid) violationTypes.push(subResult.violationType);
  }

  const hasInvalid    = violationTypes.length > 0;
  const violationType = hasInvalid
    ? (violationTypes.includes('line_count') ? 'line_count' : 'answer_count')
    : null;

  const result = { hasInvalid, violationType };
  if (relFolder) folders[relFolder] = result;
  return result;
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('');
console.log('🔍  Aviation Quiz — Validation Cache Generator');
console.log('━'.repeat(52));
console.log(`📂  Quiz root : ${QUIZ_ROOT}`);
console.log(`📄  Output   : ${STAMPED_NAME}`);
console.log('');

if (!fs.existsSync(QUIZ_ROOT)) {
  console.error(`❌  Quiz directory not found: ${QUIZ_ROOT}`);
  console.error('    Check QUIZ_DIRECTORY_NAME / QUIZ_DIRECTORY_IN_ROOT at the top of this script.');
  process.exit(1);
}

crawlFolder(QUIZ_ROOT, '');

const cache = {
  generated:  now.toISOString(),
  filename:   STAMPED_NAME,           // stored inside the JSON so the browser can log it
  config: { MAX_CONSECUTIVE_LINES, MIN_CONSECUTIVE_LINES, QUIZ_DIRECTORY_NAME },
  files,
  folders,
};

const json = JSON.stringify(cache, null, 2);

fs.mkdirSync(PUBLIC_DIR, { recursive: true });

// Write the timestamped file
fs.writeFileSync(STAMPED_PATH, json, 'utf8');

// Overwrite the fixed pointer (this is what the browser always fetches)
fs.writeFileSync(LATEST_PATH, json, 'utf8');

// ── Summary ───────────────────────────────────────────────────────────────────
const allFiles     = Object.values(files);
const total        = allFiles.length;
const lineErrors   = allFiles.filter(r => !r.valid && r.violationType === 'line_count').length;
const answerErrors = allFiles.filter(r => !r.valid && r.violationType === 'answer_count').length;

console.log('');
console.log('━'.repeat(52));
console.log('📊  Summary:');
console.log(`    Total files      : ${total}`);
console.log(`    ✅  Valid         : ${total - lineErrors - answerErrors}`);
console.log(`    🔴  Line errors   : ${lineErrors}`);
console.log(`    🟣  Answer errors : ${answerErrors}`);
console.log('');
console.log(`✅  Timestamped file : public/${STAMPED_NAME}`);
console.log(`✅  Latest pointer   : public/validation-cache.json`);
console.log('');