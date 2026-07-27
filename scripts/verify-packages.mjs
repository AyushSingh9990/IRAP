import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');

async function loadJson(relativePath) {
  const source = await readFile(path.join(projectRoot, relativePath), 'utf8');
  return JSON.parse(source);
}

const rootPackage = await loadJson('package.json');
const clientPackage = await loadJson('client/package.json');
const serverPackage = await loadJson('server/package.json');

const expected = {
  rootDev: {
    concurrently: '9.2.4',
  },
  client: {
    '@hookform/resolvers': '5.2.2',
    axios: '1.18.1',
    clsx: '2.1.1',
    'country-state-city': '3.2.1',
    'date-fns': '4.1.0',
    'jwt-decode': '4.0.0',
    leaflet: '1.9.4',
    'lucide-react': '0.468.0',
    'qrcode.react': '4.2.0',
    react: '18.3.1',
    'react-dom': '18.3.1',
    'react-dropzone': '14.3.8',
    'react-google-recaptcha': '3.1.0',
    'react-helmet-async': '3.0.0',
    'react-hook-form': '7.62.0',
    'react-hot-toast': '2.6.0',
    'react-leaflet': '4.2.1',
    'react-router-dom': '7.18.1',
    zustand: '5.0.8',
    zod: '4.1.12',
  },
  clientDev: {
    '@eslint/js': '9.39.2',
    '@testing-library/jest-dom': '6.9.1',
    '@testing-library/react': '16.3.0',
    '@testing-library/user-event': '14.6.1',
    '@vitejs/plugin-react': '6.0.3',
    eslint: '9.39.2',
    'eslint-plugin-react-hooks': '7.0.1',
    'eslint-plugin-react-refresh': '0.4.24',
    globals: '16.5.0',
    jsdom: '27.2.0',
    prettier: '3.7.4',
    vite: '8.1.1',
    vitest: '4.1.10',
  },
  server: {
    bcryptjs: '3.0.3',
    cloudinary: '2.10.0',
    compression: '1.8.1',
    'cookie-parser': '1.4.7',
    cors: '2.8.5',
    'country-state-city': '3.2.1',
    dotenv: '17.2.3',
    express: '4.22.2',
    'express-mongo-sanitize': '2.2.0',
    'express-rate-limit': '8.6.0',
    helmet: '8.1.0',
    hpp: '0.2.3',
    jsonwebtoken: '9.0.3',
    mongoose: '8.24.1',
    multer: '2.2.0',
    nanoid: '5.1.6',
    nodemailer: '9.0.3',
    'pdf-lib': '1.17.1',
    pino: '10.1.0',
    'pino-http': '11.0.0',
    qrcode: '1.5.4',
    razorpay: '2.9.6',
    slugify: '1.6.6',
    stripe: '18.0.0',
    zod: '4.1.12',
  },
  serverDev: {
    '@eslint/js': '9.39.2',
    eslint: '9.39.2',
    globals: '16.5.0',
    'mongodb-memory-server': '10.3.0',
    nodemon: '3.1.11',
    prettier: '3.7.4',
    supertest: '7.1.4',
    vitest: '4.1.10',
  },
};

const checks = [
  ['root devDependencies', rootPackage.devDependencies, expected.rootDev],
  ['client dependencies', clientPackage.dependencies, expected.client],
  ['client devDependencies', clientPackage.devDependencies, expected.clientDev],
  ['server dependencies', serverPackage.dependencies, expected.server],
  ['server devDependencies', serverPackage.devDependencies, expected.serverDev],
];

let failed = false;

for (const [label, actualObject = {}, expectedObject] of checks) {
  const actualNames = Object.keys(actualObject).sort();
  const expectedNames = Object.keys(expectedObject).sort();
  const missing = expectedNames.filter((name) => !actualNames.includes(name));
  const unexpected = actualNames.filter((name) => !expectedNames.includes(name));
  const wrongVersions = expectedNames.filter(
    (name) =>
      actualNames.includes(name) && actualObject[name] !== expectedObject[name],
  );

  if (missing.length || unexpected.length || wrongVersions.length) {
    failed = true;
    console.error(`\n${label} mismatch:`);
    if (missing.length) console.error(`  Missing: ${missing.join(', ')}`);
    if (unexpected.length) console.error(`  Unexpected: ${unexpected.join(', ')}`);
    for (const name of wrongVersions) {
      console.error(
        `  ${name}: expected ${expectedObject[name]}, received ${actualObject[name]}`,
      );
    }
  } else {
    console.log(`✓ ${label}: ${actualNames.length} exact package entries`);
  }
}

const compatibilityChecks = [
  [
    clientPackage.dependencies.react === '18.3.1' &&
      clientPackage.dependencies['react-dom'] === '18.3.1',
    'React and React DOM use the compatible 18.3.1 baseline.',
  ],
  [
    clientPackage.dependencies['react-dropzone'] === '14.3.8' &&
      clientPackage.dependencies['react-leaflet'] === '4.2.1' &&
      clientPackage.dependencies.leaflet === '1.9.4',
    'Upload and mapping packages share a compatible React 18 dependency tree.',
  ],
  [
    clientPackage.dependencies['react-helmet-async'] === '3.0.0',
    'react-helmet-async uses the React 18/19 compatible 3.x line.',
  ],
  [
    serverPackage.dependencies.express === '4.22.2',
    'Express uses major version 4 while express-mongo-sanitize is installed.',
  ],
  [
    serverPackage.dependencies.cloudinary === '2.10.0',
    'Cloudinary uses the supported 2.x SDK line.',
  ],
  [
    serverPackage.dependencies.multer === '2.2.0' &&
      !serverPackage.dependencies['multer-storage-cloudinary'],
    'Multer uses the secure 2.x line without an incompatible storage adapter.',
  ],
  [
    serverPackage.dependencies['express-rate-limit'] === '8.6.0' &&
      serverPackage.dependencies.mongoose === '8.24.1' &&
      serverPackage.dependencies.nodemailer === '9.0.3',
    'Server security-sensitive packages use the audited patched versions.',
  ],
  [
    clientPackage.dependencies.axios === '1.18.1' &&
      clientPackage.devDependencies.vitest === '4.1.10' &&
      serverPackage.devDependencies.vitest === '4.1.10' &&
      rootPackage.devDependencies.concurrently === '9.2.4',
    'Root, client, and test tooling use the audited patched versions.',
  ],
];

for (const [condition, message] of compatibilityChecks) {
  if (!condition) {
    failed = true;
    console.error(`✗ ${message}`);
  } else {
    console.log(`✓ ${message}`);
  }
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log('\nPackage manifests match the approved iRAP dependency matrix.');
}
