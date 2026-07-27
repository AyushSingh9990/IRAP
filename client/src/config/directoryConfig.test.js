import { describe, expect, it } from 'vitest';
import { directoryDefinitions, splitList } from './directoryConfig.js';

describe('directory configuration', () => {
  it('defines all four public directories', () => {
    expect(Object.keys(directoryDefinitions)).toEqual([
      'members',
      'training-providers',
      'organizations',
      'courses',
    ]);
  });

  it('normalizes comma and line separated lists', () => {
    expect(splitList('English, Hindi\nFrench')).toEqual([
      'English',
      'Hindi',
      'French',
    ]);
  });
});
