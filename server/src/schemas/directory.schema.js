import { z } from 'zod';
import {
  DELIVERY_METHOD_VALUES,
  DIRECTORY_SORT_VALUES,
  DIRECTORY_TYPE_VALUES,
} from '../constants/directoryConstants.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'A valid identifier is required.');
const emptyToUndefined = (value) =>
  value === '' || value === null || value === undefined ? undefined : value;

const optionalBoolean = z.preprocess(
  emptyToUndefined,
  z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
);

const optionalCoordinate = (minimum, maximum) =>
  z.preprocess(
    emptyToUndefined,
    z.coerce.number().min(minimum).max(maximum).optional(),
  );

const publicUrl = z.union([z.literal(''), z.string().trim().url().max(1000)]);

const locationSchema = z.object({
  label: z.string().trim().max(160).default(''),
  countryCode: z
    .union([z.literal(''), z.string().trim().length(2)])
    .transform((value) => value.toUpperCase()),
  state: z.string().trim().max(120).default(''),
  city: z.string().trim().max(120).default(''),
  address: z.string().trim().max(500).default(''),
  latitude: z.union([z.number().min(-90).max(90), z.null()]).default(null),
  longitude: z.union([z.number().min(-180).max(180), z.null()]).default(null),
});

export const directoryListSchema = z
  .object({
    body: z.unknown().optional(),
    params: z.object({ directoryType: z.enum([...DIRECTORY_TYPE_VALUES]) }),
    query: z.object({
      search: z.string().trim().max(160).optional().default(''),
      modality: z.string().trim().max(120).optional().default(''),
      category: z.string().trim().max(160).optional().default(''),
      country: z
        .union([z.literal(''), z.string().trim().length(2)])
        .optional()
        .default(''),
      state: z.string().trim().max(120).optional().default(''),
      city: z.string().trim().max(120).optional().default(''),
      deliveryMethod: z.preprocess(
        emptyToUndefined,
        z.enum([...DELIVERY_METHOD_VALUES]).optional(),
      ),
      online: optionalBoolean,
      registrationNumber: z.string().trim().max(120).optional().default(''),
      minimumPriceMinor: z.preprocess(
        emptyToUndefined,
        z.coerce.number().int().min(0).optional(),
      ),
      maximumPriceMinor: z.preprocess(
        emptyToUndefined,
        z.coerce.number().int().min(0).optional(),
      ),
      latitude: optionalCoordinate(-90, 90),
      longitude: optionalCoordinate(-180, 180),
      radiusKm: z.preprocess(
        emptyToUndefined,
        z.coerce.number().min(1).max(500).optional(),
      ),
      sort: z.enum([...DIRECTORY_SORT_VALUES]).default('name_asc'),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(12),
    }),
  })
  .superRefine((value, context) => {
    const supplied = [
      value.query.latitude,
      value.query.longitude,
      value.query.radiusKm,
    ].filter((item) => item !== undefined).length;

    if (supplied !== 0 && supplied !== 3) {
      context.addIssue({
        code: 'custom',
        path: ['query', 'latitude'],
        message: 'Latitude, longitude and radiusKm must be supplied together.',
      });
    }

    if (
      value.query.minimumPriceMinor !== undefined &&
      value.query.maximumPriceMinor !== undefined &&
      value.query.minimumPriceMinor > value.query.maximumPriceMinor
    ) {
      context.addIssue({
        code: 'custom',
        path: ['query', 'maximumPriceMinor'],
        message: 'Maximum price must be greater than or equal to minimum price.',
      });
    }
  });

export const directoryProfileSchema = z.object({
  body: z.unknown().optional(),
  params: z.object({
    directoryType: z.enum([...DIRECTORY_TYPE_VALUES]),
    slug: z.string().trim().min(3).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  }),
  query: z.object({}),
});

export const selfDirectoryProfilesSchema = z.object({
  body: z.unknown().optional(),
  params: z.object({}),
  query: z.object({}),
});

export const updateDirectoryProfileSchema = z.object({
  body: z.object({
    slug: z
      .string()
      .trim()
      .min(3)
      .max(180)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    headline: z.string().trim().max(240).default(''),
    biography: z.string().trim().max(5000).default(''),
    modalities: z.array(z.string().trim().min(1).max(120)).max(40).default([]),
    qualifications: z.array(z.string().trim().min(1).max(240)).max(40).default([]),
    services: z.array(z.string().trim().min(1).max(160)).max(40).default([]),
    languages: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
    deliveryMethods: z.array(z.enum([...DELIVERY_METHOD_VALUES])).max(3).default([]),
    onlineAvailable: z.boolean().default(false),
    locations: z.array(locationSchema).max(25).default([]),
    contact: z.object({
      email: z.union([z.literal(''), z.string().trim().email().max(254)]).default(''),
      telephone: z.string().trim().max(40).default(''),
      website: publicUrl.default(''),
      showEmail: z.boolean().default(false),
      showTelephone: z.boolean().default(false),
      socialLinks: z.object({
        linkedin: publicUrl.default(''),
        facebook: publicUrl.default(''),
        instagram: publicUrl.default(''),
        youtube: publicUrl.default(''),
        x: publicUrl.default(''),
      }),
    }),
    businessHours: z.string().trim().max(1500).default(''),
    pricingText: z.string().trim().max(1000).default(''),
    photoUrl: publicUrl.default(''),
    logoUrl: publicUrl.default(''),
    galleryUrls: z.array(publicUrl).max(20).default([]),
    videoUrls: z.array(publicUrl).max(10).default([]),
    mission: z.string().trim().max(3000).default(''),
    trainerInformation: z.string().trim().max(3000).default(''),
    seoTitle: z.string().trim().max(180).default(''),
    seoDescription: z.string().trim().max(320).default(''),
    directoryVisible: z.boolean().default(false),
    published: z.boolean().default(false),
  }),
  params: z.object({ membershipId: objectId }),
  query: z.object({}),
});
