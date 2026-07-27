import { describe, expect, it } from 'vitest';
import { PERMISSIONS, ROLE_PERMISSIONS } from '../src/constants/permissions.js';
import { ROLES } from '../src/constants/roles.js';

describe('article permissions', () => {
  it('allows training providers to manage their own article submissions', () => {
    const permissions = ROLE_PERMISSIONS[ROLES.TRAINING_PROVIDER];

    expect(permissions).toContain(PERMISSIONS.ARTICLE_CREATE_SELF);
    expect(permissions).toContain(PERMISSIONS.ARTICLE_READ_SELF);
    expect(permissions).toContain(PERMISSIONS.ARTICLE_UPDATE_SELF);
    expect(permissions).toContain(PERMISSIONS.ARTICLE_SUBMIT_SELF);
    expect(permissions).not.toContain(PERMISSIONS.ARTICLE_PUBLISH);
  });

  it('allows accredited organizations to submit articles', () => {
    const permissions = ROLE_PERMISSIONS[ROLES.ORGANIZATION];

    expect(permissions).toContain(PERMISSIONS.ARTICLE_CREATE_SELF);
    expect(permissions).toContain(PERMISSIONS.ARTICLE_SUBMIT_SELF);
  });

  it('allows content managers to moderate, publish, and manage taxonomy', () => {
    const permissions = ROLE_PERMISSIONS[ROLES.CONTENT_MANAGER];

    expect(permissions).toContain(PERMISSIONS.ARTICLE_MODERATE);
    expect(permissions).toContain(PERMISSIONS.ARTICLE_PUBLISH);
    expect(permissions).toContain(PERMISSIONS.ARTICLE_TAXONOMY_MANAGE);
  });

  it('keeps general reviewers outside article publishing permissions', () => {
    const permissions = ROLE_PERMISSIONS[ROLES.REVIEWER];

    expect(permissions).not.toContain(PERMISSIONS.ARTICLE_PUBLISH);
  });
});
