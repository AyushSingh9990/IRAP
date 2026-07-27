import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import dotenv from 'dotenv';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(currentDirectory, '../.env') });

const { environment } = await import('../src/config/environment.js');
const { getCloudinaryClient } = await import('../src/config/cloudinary.js');

async function main() {
  console.log(`Storage provider: ${environment.documentStorage.provider}`);
  console.log(`Maximum file size: ${environment.documentStorage.maxFileSizeMb} MB`);

  if (environment.documentStorage.provider === 'cloudinary') {
    const cloudinary = getCloudinaryClient();
    await cloudinary.api.ping();
    console.log('✓ Cloudinary credentials are valid and the API is reachable.');
    return;
  }

  const testDirectory = path.join(
    environment.documentStorage.localDirectory,
    '.diagnostic',
  );
  const testFile = path.join(testDirectory, 'write-test.txt');
  await mkdir(testDirectory, { recursive: true });
  await writeFile(testFile, 'iRAP document storage diagnostic', { flag: 'w' });
  await rm(testDirectory, { recursive: true, force: true });
  console.log(
    `✓ Local private storage is writable: ${environment.documentStorage.localDirectory}`,
  );
}

main().catch((error) => {
  console.error('Document storage diagnostic failed.');
  console.error(error?.stack || error);
  process.exitCode = 1;
});
