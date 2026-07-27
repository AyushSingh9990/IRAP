import { describe, expect, it } from 'vitest';
import { dashboardNavigation, roleDashboardDefinitions } from './dashboardConfig.js';

describe('dashboard configuration', () => {
  it('defines all three role dashboards', () => {
    expect(Object.keys(roleDashboardDefinitions)).toEqual([
      'member',
      'training_provider',
      'organization',
    ]);
  });

  it('keeps private account modules inside dashboard routes', () => {
    expect(dashboardNavigation.every((item) => item.to.startsWith('/dashboard'))).toBe(true);
  });
});
