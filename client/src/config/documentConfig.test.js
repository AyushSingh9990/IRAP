import { describe, expect, it } from 'vitest';
import {
  acceptedDocumentTypes,
  documentCategories,
  formatFileSize,
} from './documentConfig.js';

describe('document configuration', () => {
  it('exposes the required supported file types', () => {
    expect(Object.keys(acceptedDocumentTypes)).toEqual(
      expect.arrayContaining([
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ]),
    );
  });

  it('provides controlled document categories and readable file sizes', () => {
    expect(documentCategories.length).toBeGreaterThan(10);
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
  });
});
