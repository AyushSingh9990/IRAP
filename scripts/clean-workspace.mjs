import { readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const apply = process.argv.includes('--apply');
const removablePatterns = [
  /^\.patch-backups$/i,
  /^patch-backups$/i,
  /^\.phase\d+/i,
  /^\.receipt-hotfix/i,
  /^irap-phase\d+/i,
  /^irap-(verification|receipt)-hotfix/i,
  /^APPLY_PHASE_/i,
  /^START_HERE_PHASE_/i,
  /^PHASE_\d+_/i,
];

const entries = await readdir(root, { withFileTypes: true });
const matches = entries.filter((entry) => removablePatterns.some((pattern) => pattern.test(entry.name)));

if (!matches.length) {
  console.log('Workspace is already clean.');
  process.exit(0);
}

console.log(`${apply ? 'Removing' : 'Found'} temporary project artifacts:`);
for (const entry of matches) {
  console.log(`- ${entry.name}`);
  if (apply) await rm(path.join(root, entry.name), { recursive: true, force: true });
}

if (!apply) {
  console.log('Run `npm run clean:workspace -- --apply` to remove these entries.');
}
