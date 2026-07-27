import { describe, expect, it } from 'vitest';
import { ApiError } from '../src/utils/ApiError.js';
import {
  assertUploadedFileSignature,
  fileSignatureMatches,
} from '../src/utils/fileSignature.js';

function file(mimetype, bytes) {
  return { mimetype, buffer: Buffer.from(bytes) };
}

describe('uploaded-file signature validation', () => {
  it('accepts a valid PDF signature', () => {
    expect(fileSignatureMatches(file('application/pdf', '%PDF-1.7'))).toBe(true);
  });

  it('accepts a valid PNG signature', () => {
    expect(
      fileSignatureMatches(
        file('image/png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBe(true);
  });

  it('rejects executable content renamed as a PDF', () => {
    expect(() =>
      assertUploadedFileSignature(file('application/pdf', 'MZ executable')),
    ).toThrow(ApiError);
  });

  it('rejects a missing or empty upload buffer', () => {
    expect(fileSignatureMatches({ mimetype: 'image/jpeg', buffer: Buffer.alloc(0) })).toBe(false);
  });
});
