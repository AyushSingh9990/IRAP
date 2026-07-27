import { describe, expect, it } from 'vitest';
import {
  articleDecisionSchema,
  createArticleCategorySchema,
  createArticleSchema,
  submitArticleSchema,
  updateArticleSchema,
} from '../src/schemas/article.schema.js';

const articleId = '507f1f77bcf86cd799439011';
const membershipId = '507f191e810c19729de860ea';
const categoryId = '507f1f77bcf86cd799439012';
const tagId = '507f1f77bcf86cd799439013';

function validArticleBody() {
  return {
    title: 'Safe Clinical Education Content',
    summary:
      'A concise summary that clearly explains the article purpose and intended professional audience.',
    content: 'A'.repeat(500),
    categoryId,
    tagIds: [tagId],
    seoTitle: 'Safe Clinical Education Content',
    seoDescription:
      'An approved description for a moderated professional education article.',
    imageAltText: 'Professional education article illustration',
    declarationAccepted: true,
  };
}

describe('article validation', () => {
  it('accepts a controlled article draft request', () => {
    const result = createArticleSchema.safeParse({
      body: {
        authorMembershipId: membershipId,
        title: 'Working Article Title',
      },
      params: {},
      query: {},
    });

    expect(result.success).toBe(true);
  });

  it('accepts complete article content and unique tags', () => {
    const result = updateArticleSchema.safeParse({
      body: validArticleBody(),
      params: { articleId },
      query: {},
    });

    expect(result.success).toBe(true);
  });

  it('rejects duplicate article tags', () => {
    const body = validArticleBody();
    body.tagIds = [tagId, tagId];
    const result = updateArticleSchema.safeParse({
      body,
      params: { articleId },
      query: {},
    });

    expect(result.success).toBe(false);
  });

  it('requires explicit submission confirmation', () => {
    const result = submitArticleSchema.safeParse({
      body: { confirmation: 'submit' },
      params: { articleId },
      query: {},
    });

    expect(result.success).toBe(false);
  });

  it('accepts an administrator-controlled article category', () => {
    const result = createArticleCategorySchema.safeParse({
      body: {
        name: 'Clinical Education',
        description: 'Moderated professional learning content.',
        status: 'active',
        seoTitle: 'Clinical Education Articles',
        seoDescription: 'Approved clinical education articles.',
      },
      params: {},
      query: {},
    });

    expect(result.success).toBe(true);
  });

  it('rejects unsupported moderation confirmation text', () => {
    const result = articleDecisionSchema.safeParse({
      body: {
        confirmation: 'DELETE',
        authorVisibleNote: '',
        internalNote: '',
        reason: '',
        publishAt: '',
      },
      params: { articleId },
      query: {},
    });

    expect(result.success).toBe(false);
  });
});
