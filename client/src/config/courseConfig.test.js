import { describe, expect, it } from 'vitest';
import {
  courseChecklistLabels,
  courseDocumentCategories,
  splitCourseList,
} from './courseConfig.js';

describe('course configuration', () => {
  it('defines the required curriculum document category', () => {
    expect(
      courseDocumentCategories.some(
        (category) => category.value === 'curriculum',
      ),
    ).toBe(true);
  });

  it('defines every controlled review checklist label', () => {
    expect(Object.keys(courseChecklistLabels)).toHaveLength(7);
  });

  it('normalizes one-value-per-line fields', () => {
    expect(splitCourseList('First\nSecond\n\nThird')).toEqual([
      'First',
      'Second',
      'Third',
    ]);
  });
});
