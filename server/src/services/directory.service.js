import mongoose from 'mongoose';
import {
  DIRECTORY_TO_PROFILE_TYPE,
  PROFILE_TYPES,
  PROFILE_TYPE_TO_DIRECTORY,
} from '../constants/directoryConstants.js';
import { COURSE_STATUSES } from '../constants/courseConstants.js';
import { MEMBERSHIP_STATUSES } from '../constants/membershipConstants.js';
import Membership from '../models/Membership.js';
import PublicProfile from '../models/PublicProfile.js';
import { ApiError } from '../utils/ApiError.js';

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeList(values = []) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 150);
}

async function createUniqueSlug({
  requestedSlug,
  displayName,
  registrationNumber,
  profileId,
}) {
  const base =
    slugify(requestedSlug) ||
    slugify(`${displayName}-${registrationNumber}`) ||
    `profile-${String(registrationNumber).slice(-12).toLowerCase()}`;

  let candidate = base;
  let suffix = 2;

  while (
    await PublicProfile.exists({
      slug: candidate,
      ...(profileId ? { _id: { $ne: profileId } } : {}),
    })
  ) {
    candidate = `${base.slice(0, 165)}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function eligibilityStages(profileType) {
  const membershipType =
    profileType === PROFILE_TYPES.COURSE
      ? PROFILE_TYPES.TRAINING_PROVIDER
      : profileType;

  const membershipEligibility = {
    'membershipRecord.type': membershipType,
    'membershipRecord.status': {
      $in: [
        MEMBERSHIP_STATUSES.ACTIVE,
        MEMBERSHIP_STATUSES.RENEWAL_DUE,
      ],
    },
    'membershipRecord.validUntil': { $gte: new Date() },
  };

  const stages = [
    {
      $lookup: {
        from: 'memberships',
        localField: 'membership',
        foreignField: '_id',
        as: 'membershipRecord',
      },
    },
    { $unwind: '$membershipRecord' },
  ];

  if (profileType === PROFILE_TYPES.COURSE) {
    stages.push(
      {
        $lookup: {
          from: 'courses',
          let: {
            providerMembershipId: '$membership',
            accreditationNumber: '$course.accreditationNumber',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: [
                        '$providerMembership',
                        '$$providerMembershipId',
                      ],
                    },
                    {
                      $eq: [
                        '$accreditationNumber',
                        '$$accreditationNumber',
                      ],
                    },
                  ],
                },
              },
            },
            { $sort: { approvedAt: -1, createdAt: -1 } },
            { $limit: 1 },
          ],
          as: 'courseRecord',
        },
      },
      { $unwind: '$courseRecord' },
      {
        $match: {
          ...membershipEligibility,
          'courseRecord.status': COURSE_STATUSES.APPROVED,
          'courseRecord.validUntil': { $gte: new Date() },
          'courseRecord.currentCertificate': { $ne: null },
          'course.validUntil': { $gte: new Date() },
          'course.accreditationNumber': { $ne: '' },
        },
      },
    );

    return stages;
  }

  stages.push({
    $match: {
      ...membershipEligibility,
      'membershipRecord.directoryVisible': true,
    },
  });

  return stages;
}

function publicContact(profile) {
  return {
    email: profile.contact?.showEmail ? profile.contact.email || '' : '',
    telephone: profile.contact?.showTelephone
      ? profile.contact.telephone || ''
      : '',
    website: profile.contact?.website || '',
    socialLinks: profile.contact?.socialLinks || {},
  };
}

function serializePublicProfile(profile, summary = false) {
  const membership = profile.membershipRecord || {};
  return {
    id: String(profile._id),
    directoryType: PROFILE_TYPE_TO_DIRECTORY[profile.profileType],
    profileType: profile.profileType,
    slug: profile.slug,
    displayName: profile.displayName,
    headline: profile.headline || '',
    biography: summary
      ? String(profile.biography || '').slice(0, 280)
      : profile.biography || '',
    modalities: profile.modalities || [],
    qualifications: summary ? [] : profile.qualifications || [],
    services: profile.services || [],
    languages: profile.languages || [],
    deliveryMethods: profile.deliveryMethods || [],
    onlineAvailable: Boolean(profile.onlineAvailable),
    locations: profile.locations || [],
    contact: publicContact(profile),
    businessHours: summary ? '' : profile.businessHours || '',
    pricingText: profile.pricingText || '',
    photoUrl: profile.photoUrl || '',
    logoUrl: profile.logoUrl || '',
    galleryUrls: summary ? [] : profile.galleryUrls || [],
    videoUrls: summary ? [] : profile.videoUrls || [],
    mission: summary ? '' : profile.mission || '',
    trainerInformation: summary ? '' : profile.trainerInformation || '',
    course: profile.course || {},
    registrationNumber:
      profile.profileType === PROFILE_TYPES.COURSE
        ? profile.course?.accreditationNumber || ''
        : membership.registrationNumber || '',
    validFrom:
      profile.profileType === PROFILE_TYPES.COURSE
        ? profile.course?.validFrom || null
        : membership.validFrom || null,
    validUntil:
      profile.profileType === PROFILE_TYPES.COURSE
        ? profile.course?.validUntil || null
        : membership.validUntil || null,
    verified: true,
    distanceKm:
      profile.distanceMeters === undefined
        ? null
        : Math.round((profile.distanceMeters / 1000) * 10) / 10,
    seoTitle: profile.seoTitle || '',
    seoDescription: profile.seoDescription || '',
  };
}

function profileMatch(profileType, filters) {
  const match = { profileType };

  if (profileType !== PROFILE_TYPES.COURSE) {
    match.published = true;
  }

  if (filters.modality) {
    match.modalities = new RegExp(escapeRegex(filters.modality), 'i');
  }
  if (filters.category) {
    match['course.category'] = new RegExp(escapeRegex(filters.category), 'i');
  }
  if (filters.country) {
    match['locations.countryCode'] = filters.country.toUpperCase();
  }
  if (filters.state) {
    match['locations.state'] = new RegExp(escapeRegex(filters.state), 'i');
  }
  if (filters.city) {
    match['locations.city'] = new RegExp(escapeRegex(filters.city), 'i');
  }
  if (filters.deliveryMethod) {
    match.deliveryMethods = filters.deliveryMethod;
  }
  if (filters.online !== undefined) {
    match.onlineAvailable = filters.online;
  }
  if (
    filters.minimumPriceMinor !== undefined ||
    filters.maximumPriceMinor !== undefined
  ) {
    match['course.priceMinor'] = {};
    if (filters.minimumPriceMinor !== undefined) {
      match['course.priceMinor'].$gte = filters.minimumPriceMinor;
    }
    if (filters.maximumPriceMinor !== undefined) {
      match['course.priceMinor'].$lte = filters.maximumPriceMinor;
    }
  }

  return match;
}

function keywordMatch(filters) {
  const conditions = [];

  if (filters.search) {
    const matcher = new RegExp(escapeRegex(filters.search), 'i');
    conditions.push({
      $or: [
        { displayName: matcher },
        { headline: matcher },
        { biography: matcher },
        { modalities: matcher },
        { services: matcher },
        { 'course.category': matcher },
        { 'course.providerName': matcher },
        { 'membershipRecord.registrationNumber': matcher },
        { 'course.accreditationNumber': matcher },
        { 'course.certificateNumber': matcher },
      ],
    });
  }

  if (filters.registrationNumber) {
    const registrationMatcher = new RegExp(
      escapeRegex(filters.registrationNumber),
      'i',
    );

    conditions.push(
      filters.profileType === PROFILE_TYPES.COURSE
        ? { 'course.accreditationNumber': registrationMatcher }
        : { 'membershipRecord.registrationNumber': registrationMatcher },
    );
  }

  if (conditions.length === 0) return null;
  return { $match: conditions.length === 1 ? conditions[0] : { $and: conditions } };
}

function directorySort(sort, hasDistance) {
  if (sort === 'distance' && hasDistance) {
    return { distanceMeters: 1, displayName: 1 };
  }

  const options = {
    name_asc: { displayName: 1, _id: 1 },
    name_desc: { displayName: -1, _id: 1 },
    newest: { lastPublishedAt: -1, createdAt: -1 },
    expiry_soonest: {
      'course.validUntil': 1,
      'membershipRecord.validUntil': 1,
      displayName: 1,
    },
  };

  return options[sort] || options.name_asc;
}

export async function listDirectoryProfiles({ directoryType, filters }) {
  const profileType = DIRECTORY_TO_PROFILE_TYPE[directoryType];
  if (!profileType) throw new ApiError(404, 'Directory type not found.');

  const hasDistance =
    filters.latitude !== undefined &&
    filters.longitude !== undefined &&
    filters.radiusKm !== undefined;

  const pipeline = [];

  if (hasDistance) {
    pipeline.push({
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [filters.longitude, filters.latitude],
        },
        key: 'primaryLocation',
        distanceField: 'distanceMeters',
        maxDistance: filters.radiusKm * 1000,
        spherical: true,
      },
    });
  }

  pipeline.push({ $match: profileMatch(profileType, filters) });
  pipeline.push(...eligibilityStages(profileType));

  const search = keywordMatch({ ...filters, profileType });
  if (search) pipeline.push(search);

  pipeline.push({
    $facet: {
      records: [
        { $sort: directorySort(filters.sort, hasDistance) },
        { $skip: (filters.page - 1) * filters.limit },
        { $limit: filters.limit },
      ],
      count: [{ $count: 'total' }],
    },
  });

  const [result] = await PublicProfile.aggregate(pipeline);
  const records = result?.records || [];
  const total = result?.count?.[0]?.total || 0;

  return {
    profiles: records.map((profile) => serializePublicProfile(profile, true)),
    meta: {
      page: filters.page,
      limit: filters.limit,
      total,
      pages: Math.max(1, Math.ceil(total / filters.limit)),
      geospatial: hasDistance,
    },
  };
}

export async function getDirectoryProfile({ directoryType, slug }) {
  const profileType = DIRECTORY_TO_PROFILE_TYPE[directoryType];
  if (!profileType) throw new ApiError(404, 'Directory type not found.');

  const [profile] = await PublicProfile.aggregate([
    {
      $match: {
        profileType,
        slug,
        ...(profileType === PROFILE_TYPES.COURSE
          ? {}
          : { published: true }),
      },
    },
    ...eligibilityStages(profileType),
    { $limit: 1 },
  ]);

  if (!profile) throw new ApiError(404, 'Public profile not found.');
  return serializePublicProfile(profile);
}

function selfProfile(profile, membership) {
  return {
    id: profile?.id || profile?._id?.toString() || null,
    membershipId: membership.id,
    profileType: membership.type,
    displayName: membership.approvedName,
    registrationNumber: membership.registrationNumber,
    membershipStatus: membership.status,
    validUntil: membership.validUntil,
    directoryVisible: membership.directoryVisible,
    slug: profile?.slug || '',
    headline: profile?.headline || '',
    biography: profile?.biography || '',
    modalities: profile?.modalities || [],
    qualifications: profile?.qualifications || [],
    services: profile?.services || [],
    languages: profile?.languages || [],
    deliveryMethods: profile?.deliveryMethods || [],
    onlineAvailable: Boolean(profile?.onlineAvailable),
    locations: profile?.locations || [],
    contact: profile?.contact || {
      email: '',
      telephone: '',
      website: '',
      showEmail: false,
      showTelephone: false,
      socialLinks: {},
    },
    businessHours: profile?.businessHours || '',
    pricingText: profile?.pricingText || '',
    photoUrl: profile?.photoUrl || '',
    logoUrl: profile?.logoUrl || '',
    galleryUrls: profile?.galleryUrls || [],
    videoUrls: profile?.videoUrls || [],
    mission: profile?.mission || '',
    trainerInformation: profile?.trainerInformation || '',
    seoTitle: profile?.seoTitle || '',
    seoDescription: profile?.seoDescription || '',
    published: Boolean(profile?.published),
    publicUrl:
      profile?.published && membership.directoryVisible
        ? `/directory/${PROFILE_TYPE_TO_DIRECTORY[membership.type]}/${profile.slug}`
        : '',
  };
}

export async function listSelfDirectoryProfiles(ownerId) {
  const memberships = await Membership.find({ owner: ownerId }).sort({
    createdAt: 1,
  });
  const profiles = await PublicProfile.find({
    owner: ownerId,
    profileType: { $ne: PROFILE_TYPES.COURSE },
  });
  const byMembership = new Map(
    profiles.map((profile) => [String(profile.membership), profile]),
  );

  return memberships.map((membership) =>
    selfProfile(byMembership.get(String(membership._id)), membership),
  );
}

function primaryPoint(locations) {
  const location = locations.find(
    (item) =>
      Number.isFinite(item.latitude) && Number.isFinite(item.longitude),
  );

  return location
    ? {
        type: 'Point',
        coordinates: [location.longitude, location.latitude],
      }
    : undefined;
}

export async function updateSelfDirectoryProfile({
  ownerId,
  membershipId,
  input,
}) {
  if (!mongoose.isValidObjectId(membershipId)) {
    throw new ApiError(400, 'A valid membership identifier is required.');
  }

  const membership = await Membership.findOne({
    _id: membershipId,
    owner: ownerId,
  });

  if (!membership) throw new ApiError(404, 'Membership record not found.');

  if (
    input.published &&
    (![
        MEMBERSHIP_STATUSES.ACTIVE,
        MEMBERSHIP_STATUSES.RENEWAL_DUE,
      ].includes(membership.status) ||
      membership.validUntil < new Date() ||
      !input.directoryVisible)
  ) {
    throw new ApiError(
      422,
      'A profile can be published only for an active, directory-visible membership.',
    );
  }

  let profile = await PublicProfile.findOne({
    membership: membership._id,
    profileType: membership.type,
  });

  const slug = await createUniqueSlug({
    requestedSlug: input.slug,
    displayName: membership.approvedName,
    registrationNumber: membership.registrationNumber,
    profileId: profile?._id,
  });

  if (!profile) {
    profile = new PublicProfile({
      membership: membership._id,
      owner: ownerId,
      profileType: membership.type,
      displayName: membership.approvedName,
      slug,
    });
  }

  const wasPublished = profile.published;

  profile.set({
    slug,
    displayName: membership.approvedName,
    headline: input.headline,
    biography: input.biography,
    modalities: normalizeList(input.modalities),
    qualifications: normalizeList(input.qualifications),
    services: normalizeList(input.services),
    languages: normalizeList(input.languages),
    deliveryMethods: [...new Set(input.deliveryMethods)],
    onlineAvailable: input.onlineAvailable,
    locations: input.locations,
    primaryLocation: primaryPoint(input.locations),
    contact: input.contact,
    businessHours: input.businessHours,
    pricingText: input.pricingText,
    photoUrl: input.photoUrl,
    logoUrl: input.logoUrl,
    galleryUrls: normalizeList(input.galleryUrls),
    videoUrls: normalizeList(input.videoUrls),
    mission: input.mission,
    trainerInformation: input.trainerInformation,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    published: input.published,
  });

  if (input.published && !wasPublished) profile.lastPublishedAt = new Date();

  membership.directoryVisible = input.directoryVisible;
  await Promise.all([profile.save(), membership.save()]);

  return selfProfile(profile, membership);
}
