import { ApiError } from './ApiError.js';

const SIGNATURES = Object.freeze({
  'application/pdf': [Buffer.from('%PDF-')],
  'image/jpeg': [Buffer.from([0xff, 0xd8, 0xff])],
  'image/png': [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
  'application/msword': [Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    Buffer.from([0x50, 0x4b, 0x03, 0x04]),
    Buffer.from([0x50, 0x4b, 0x05, 0x06]),
    Buffer.from([0x50, 0x4b, 0x07, 0x08]),
  ],
});

function startsWith(buffer, signature) {
  return buffer.length >= signature.length && buffer.subarray(0, signature.length).equals(signature);
}

function isWebp(buffer) {
  return (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  );
}

export function fileSignatureMatches(file) {
  if (!file?.buffer || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    return false;
  }

  if (file.mimetype === 'image/webp') {
    return isWebp(file.buffer);
  }

  const acceptedSignatures = SIGNATURES[file.mimetype] ?? [];
  return acceptedSignatures.some((signature) => startsWith(file.buffer, signature));
}

export function assertUploadedFileSignature(file) {
  if (!file) {
    return;
  }

  if (!fileSignatureMatches(file)) {
    throw new ApiError(
      415,
      'The uploaded file content does not match its declared file type.',
    );
  }
}
