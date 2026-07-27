import { z } from 'zod';
import {
  ARTICLE_STATUS_VALUES,
  ARTICLE_TAXONOMY_STATUS_VALUES,
} from '../constants/articleConstants.js';

const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'A valid identifier is required.');

const optionalDate = z
  .union([z.literal(''), z.string().trim()])
  .refine(
    (value) => !value || !Number.isNaN(Date.parse(value)),
    'A valid date is required.',
  );

const optionalQueryEnum = (values) =>
  z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.enum(values).optional(),
  );

const taxonomyBody = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).default(''),
  status: z
    .enum([...ARTICLE_TAXONOMY_STATUS_VALUES])
    .default('active'),
  seoTitle: z.string().trim().max(180).default(''),
  seoDescription: z.string().trim().max(320).default(''),
});

export const listPublicArticlesSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    search: z.string().trim().max(160).optional().default(''),
    category: z.string().trim().max(140).optional().default(''),
    tag: z.string().trim().max(100).optional().default(''),
    author: z.string().trim().max(180).optional().default(''),
    sort: z.enum(['latest', 'oldest', 'title']).default('latest'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12),
  }),
});

export const publicArticleSlugSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    slug: z
      .string()
      .trim()
      .min(3)
      .max(260)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  }),
  query: z.object({}).default({}),
});

export const publicArticleAuthorSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    authorSlug: z
      .string()
      .trim()
      .min(3)
      .max(180)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12),
  }),
});

export const articleMediaSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({ articleId: objectId }),
  query: z.object({}).default({}),
});

export const listSelfArticlesSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    search: z.string().trim().max(160).optional().default(''),
    status: optionalQueryEnum([...ARTICLE_STATUS_VALUES]),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
});

export const createArticleSchema = z.object({
  body: z.object({
    authorMembershipId: objectId,
    title: z.string().trim().min(3).max(240),
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const articleIdSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({ articleId: objectId }),
  query: z.object({}).default({}),
});

export const updateArticleSchema = z.object({
  body: z.object({
    title: z.string().trim().min(3).max(240),
    summary: z.string().trim().max(600).default(''),
    content: z.string().trim().max(120000).default(''),
    categoryId: z.union([objectId, z.null()]).default(null),
    tagIds: z
      .array(objectId)
      .max(12)
      .refine(
        (values) => new Set(values).size === values.length,
        'Tags must be unique.',
      )
      .default([]),
    seoTitle: z.string().trim().max(180).default(''),
    seoDescription: z.string().trim().max(320).default(''),
    imageAltText: z.string().trim().max(240).default(''),
    declarationAccepted: z.boolean().default(false),
  }),
  params: z.object({ articleId: objectId }),
  query: z.object({}).default({}),
});

export const submitArticleSchema = z.object({
  body: z.object({ confirmation: z.literal('SUBMIT') }),
  params: z.object({ articleId: objectId }),
  query: z.object({}).default({}),
});

export const uploadArticleImageSchema = z.object({
  body: z.object({
    altText: z.string().trim().max(240).default(''),
  }),
  params: z.object({ articleId: objectId }),
  query: z.object({}).default({}),
});

export const listAdminArticlesSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    search: z.string().trim().max(160).optional().default(''),
    status: optionalQueryEnum([...ARTICLE_STATUS_VALUES]),
    category: z.string().trim().max(140).optional().default(''),
    assignment: z.enum(['all', 'mine', 'unassigned']).default('all'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
});

export const assignArticleModeratorSchema = z.object({
  body: z.object({
    moderatorId: z.union([objectId, z.null()]),
  }),
  params: z.object({ articleId: objectId }),
  query: z.object({}).default({}),
});

export const articleDecisionSchema = z.object({
  body: z.object({
    confirmation: z.enum([
      'REQUEST CHANGES',
      'APPROVE',
      'PUBLISH',
      'REJECT',
      'ARCHIVE',
      'RESTORE',
    ]),
    authorVisibleNote: z.string().trim().max(3000).default(''),
    internalNote: z.string().trim().max(3000).default(''),
    reason: z.string().trim().max(1000).default(''),
    publishAt: optionalDate.default(''),
  }),
  params: z.object({ articleId: objectId }),
  query: z.object({}).default({}),
});

export const listTaxonomySchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    includeArchived: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .default('false'),
  }),
});

export const createArticleCategorySchema = z.object({
  body: taxonomyBody,
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const updateArticleCategorySchema = z.object({
  body: taxonomyBody,
  params: z.object({ categoryId: objectId }),
  query: z.object({}).default({}),
});

export const createArticleTagSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80),
    status: z
      .enum([...ARTICLE_TAXONOMY_STATUS_VALUES])
      .default('active'),
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const updateArticleTagSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80),
    status: z
      .enum([...ARTICLE_TAXONOMY_STATUS_VALUES])
      .default('active'),
  }),
  params: z.object({ tagId: objectId }),
  query: z.object({}).default({}),
});
