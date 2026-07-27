import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { nanoid } from 'nanoid';
import { environment } from '../config/environment.js';
import { getCloudinaryClient } from '../config/cloudinary.js';
import { ApiError } from '../utils/ApiError.js';

const FILE_SIGNATURES = Object.freeze({
  pdf: (buffer) => buffer.subarray(0, 5).toString() === '%PDF-',
  jpg: (buffer) =>
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff,
  jpeg: (buffer) =>
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff,
  png: (buffer) =>
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ),
  webp: (buffer) =>
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString() === 'RIFF' &&
    buffer.subarray(8, 12).toString() === 'WEBP',
  doc: (buffer) =>
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
    ),
  docx: (buffer) => {
    const signature = buffer.subarray(0, 4);
    const isZip = [
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      Buffer.from([0x50, 0x4b, 0x05, 0x06]),
      Buffer.from([0x50, 0x4b, 0x07, 0x08]),
    ].some((candidate) => signature.equals(candidate));

    return (
      buffer.length >= 4 &&
      isZip &&
      buffer.includes(Buffer.from('[Content_Types].xml')) &&
      buffer.includes(Buffer.from('word/'))
    );
  },
});

function cleanFilename(value) {
  const basename = path.basename(value || 'document');
  // eslint-disable-next-line no-control-regex
  return basename.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 255);
}

function extensionFromFilename(filename) {
  return path.extname(filename).replace('.', '').toLowerCase();
}

function validateFileSignature(file) {
  const extension = extensionFromFilename(file.originalname);
  const validator = FILE_SIGNATURES[extension];

  if (!validator || !validator(file.buffer)) {
    throw new ApiError(
      415,
      'The file content does not match its extension. Select the original PDF, image, DOC, or DOCX file.',
    );
  }

  return extension;
}

function checksum(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function uploadLocal({ file, ownerId, applicationId, extension }) {
  const directory = path.join(
    environment.documentStorage.localDirectory,
    String(ownerId),
    String(applicationId),
  );
  await mkdir(directory, { recursive: true, mode: 0o700 });

  const storageKey = [String(ownerId), String(applicationId), `${nanoid(32)}.${extension}`].join('/');
  const absolutePath = path.join(
    environment.documentStorage.localDirectory,
    ...storageKey.split('/'),
  );
  await writeFile(absolutePath, file.buffer, { mode: 0o600, flag: 'wx' });

  return {
    storageProvider: 'local',
    storageKey,
    providerAssetId: '',
    providerSecureUrl: '',
    resourceType: 'raw',
    deliveryType: 'private',
    format: extension,
  };
}

async function uploadCloudinary({ file, ownerId, applicationId, extension }) {
  const cloudinary = getCloudinaryClient();
  const folder = `irap/private-documents/${ownerId}/${applicationId}`;

  const result = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        type: 'authenticated',
        folder,
        public_id: nanoid(32),
        filename_override: cleanFilename(file.originalname),
        use_filename: false,
        unique_filename: false,
        overwrite: false,
      },
      (error, uploadResult) => {
        if (error) reject(error);
        else resolve(uploadResult);
      },
    );

    uploadStream.end(file.buffer);
  });

  return {
    storageProvider: 'cloudinary',
    storageKey: result.public_id,
    providerAssetId: result.asset_id || '',
    providerSecureUrl: result.secure_url || '',
    resourceType: result.resource_type || 'raw',
    deliveryType: result.type || 'authenticated',
    format: result.format || extension,
  };
}

export async function storeDocumentAsset({ file, ownerId, applicationId }) {
  if (!file?.buffer?.length) {
    throw new ApiError(422, 'Select one document to upload.');
  }

  const originalFilename = cleanFilename(file.originalname);
  const extension = validateFileSignature(file);
  const providerResult =
    environment.documentStorage.provider === 'cloudinary'
      ? await uploadCloudinary({ file, ownerId, applicationId, extension })
      : await uploadLocal({ file, ownerId, applicationId, extension });

  return {
    ...providerResult,
    originalFilename,
    extension,
    mimeType: file.mimetype,
    sizeBytes: file.size,
    checksumSha256: checksum(file.buffer),
  };
}

async function localAssetStream(document) {
  const absolutePath = path.resolve(
    environment.documentStorage.localDirectory,
    ...document.storageKey.split('/'),
  );
  const allowedRoot = `${path.resolve(environment.documentStorage.localDirectory)}${path.sep}`;

  if (!absolutePath.startsWith(allowedRoot)) {
    throw new ApiError(403, 'The document storage path is invalid.');
  }

  try {
    const fileStat = await stat(absolutePath);
    return {
      stream: createReadStream(absolutePath),
      contentLength: fileStat.size,
    };
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new ApiError(404, 'The private document asset was not found.');
    }
    throw error;
  }
}

async function cloudinaryAssetStream(document) {
  const cloudinary = getCloudinaryClient();
  const signedUrl = cloudinary.utils.private_download_url(
    document.storageKey,
    document.format,
    {
      resource_type: document.resourceType || 'raw',
      type: document.deliveryType || 'authenticated',
      expires_at:
        Math.floor(Date.now() / 1000) +
        environment.documentStorage.signedUrlMinutes * 60,
    },
  );

  let remoteResponse;
  try {
    remoteResponse = await fetch(signedUrl, {
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    throw new ApiError(
      502,
      'The document could not be retrieved from private storage.',
      [],
      { cause: error },
    );
  }

  if (!remoteResponse.ok || !remoteResponse.body) {
    throw new ApiError(502, 'The document could not be retrieved from private storage.');
  }

  return {
    stream: Readable.fromWeb(remoteResponse.body),
    contentLength: Number(remoteResponse.headers.get('content-length')) || null,
  };
}

export function openDocumentAsset(document) {
  return document.storageProvider === 'cloudinary'
    ? cloudinaryAssetStream(document)
    : localAssetStream(document);
}

export async function deleteDocumentAsset(document) {
  if (!document?.storageKey) return;

  if (document.storageProvider === 'cloudinary') {
    const cloudinary = getCloudinaryClient();
    await cloudinary.uploader.destroy(document.storageKey, {
      resource_type: document.resourceType || 'raw',
      type: document.deliveryType || 'authenticated',
      invalidate: true,
    });
    return;
  }

  const absolutePath = path.resolve(
    environment.documentStorage.localDirectory,
    ...document.storageKey.split('/'),
  );
  const allowedRoot = `${path.resolve(environment.documentStorage.localDirectory)}${path.sep}`;

  if (absolutePath.startsWith(allowedRoot)) {
    await unlink(absolutePath).catch((error) => {
      if (error?.code !== 'ENOENT') throw error;
    });
  }
}
