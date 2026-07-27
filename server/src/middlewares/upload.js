import path from 'node:path';
import multer from 'multer';
import { environment } from '../config/environment.js';
import { ApiError } from '../utils/ApiError.js';

const MIME_EXTENSIONS = Object.freeze({
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    '.docx',
  ],
});

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function extensionMatches(file) {
  const extension = path.extname(file.originalname || '').toLowerCase();
  const allowedExtensions = MIME_EXTENSIONS[file.mimetype];
  return Boolean(allowedExtensions?.includes(extension));
}

function documentFileFilter(_request, file, callback) {
  if (!extensionMatches(file)) {
    callback(
      new ApiError(
        415,
        'Unsupported file type. Upload PDF, JPG, JPEG, PNG, WEBP, DOC, or DOCX files only.',
      ),
    );
    return;
  }
  callback(null, true);
}

function imageFileFilter(_request, file, callback) {
  if (!IMAGE_MIME_TYPES.has(file.mimetype) || !extensionMatches(file)) {
    callback(
      new ApiError(
        415,
        'Unsupported image type. Upload JPG, JPEG, PNG, or WEBP files only.',
      ),
    );
    return;
  }
  callback(null, true);
}

const sharedLimits = Object.freeze({
  fileSize: environment.documentStorage.maxFileSizeBytes,
  files: 1,
  fields: 12,
  parts: 16,
});

export const documentUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: documentFileFilter,
  limits: sharedLimits,
});

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFileFilter,
  limits: sharedLimits,
});
