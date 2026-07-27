import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const failures = [];
const notices = [];

const allowedRootEntries = new Set([
  '.editorconfig',
  '.gitignore',
  '.npmrc',
  '.nvmrc',
  'LICENSE',
  'README.md',
  'client',
  'docs',
  'node_modules',
  'package-lock.json',
  'package.json',
  'scripts',
  'server',
]);

function relative(filePath) {
  return path.relative(root, filePath).replaceAll('\\', '/');
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function walk(directory, output = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['node_modules', 'dist', 'coverage', '.git', 'private-uploads'].includes(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(fullPath, output);
    else output.push(fullPath);
  }
  return output;
}

function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  return [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16));
}

function luminance(hex) {
  const values = hexToRgb(hex).map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
}

function contrastRatio(foreground, background) {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

const rootEntries = await readdir(root);
for (const entry of rootEntries) {
  if (!allowedRootEntries.has(entry)) failures.push(`Unexpected project-root entry: ${entry}`);
}

if (await exists(path.join(root, 'irap'))) {
  failures.push('Nested irap/ project detected. The project root must itself be named irap.');
}

const sourceFiles = await walk(root);
for (const filePath of sourceFiles) {
  const rel = relative(filePath);
  const isEnvironmentFile = /(^|\/)\.env(?:\.[^/]+)?$/i.test(rel);
  const isExampleEnvironmentFile = rel.endsWith('.env.example');
  const isSupportedLocalEnvironmentFile = /^(client|server)\/\.env(?:\.[^/]+)?$/i.test(rel);

  if (isEnvironmentFile && !isExampleEnvironmentFile) {
    if (isSupportedLocalEnvironmentFile) {
      notices.push(`Local environment configuration detected: ${rel} (kept outside source control).`);
    } else {
      failures.push(`Private configuration file is outside an approved local location: ${rel}`);
    }
  }

  if (/\.(pem|key)$/i.test(rel)) {
    failures.push(`Private key file included: ${rel}`);
  }

  if (/phase[-_ ]?\d+|hotfix|patch-backup/i.test(rel)) {
    failures.push(`Temporary phase/patch artifact included: ${rel}`);
  }
}

const routes = await readFile(path.join(root, 'client/src/routes/AppRoutes.jsx'), 'utf8');
const lazyPageCount = (routes.match(/lazy\(\(\) => import\(/g) ?? []).length;
if (lazyPageCount < 20) failures.push('Route-level lazy loading is not sufficiently configured.');
else notices.push(`${lazyPageCount} route modules are lazy-loaded.`);

const tokens = await readFile(path.join(root, 'client/src/styles/tokens.css'), 'utf8');
const token = (name) => tokens.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1];
const white = token('color-white');
const navy = token('color-primary-950');
if (!white || !navy) failures.push('Unable to read core contrast tokens.');
else {
  const ratio = contrastRatio(white, navy);
  if (ratio < 7) failures.push(`Dark hero contrast is ${ratio.toFixed(2)}:1; expected at least 7:1.`);
  else notices.push(`Dark hero text contrast is ${ratio.toFixed(2)}:1.`);
}

if (failures.length) {
  console.error('Quality gate failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log('Quality gate passed.');
  notices.forEach((notice) => console.log(`- ${notice}`));
}
