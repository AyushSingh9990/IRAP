export const DIRECTORY_TYPES = Object.freeze({
  MEMBERS: 'members',
  TRAINING_PROVIDERS: 'training-providers',
  ORGANIZATIONS: 'organizations',
  COURSES: 'courses',
});

export const DIRECTORY_TYPE_VALUES = Object.freeze(Object.values(DIRECTORY_TYPES));

export const PROFILE_TYPES = Object.freeze({
  MEMBER: 'member',
  TRAINING_PROVIDER: 'training_provider',
  ORGANIZATION: 'organization',
  COURSE: 'course',
});

export const PROFILE_TYPE_VALUES = Object.freeze(Object.values(PROFILE_TYPES));

export const DIRECTORY_TO_PROFILE_TYPE = Object.freeze({
  members: 'member',
  'training-providers': 'training_provider',
  organizations: 'organization',
  courses: 'course',
});

export const PROFILE_TYPE_TO_DIRECTORY = Object.freeze({
  member: 'members',
  training_provider: 'training-providers',
  organization: 'organizations',
  course: 'courses',
});

export const DIRECTORY_SORT_VALUES = Object.freeze([
  'name_asc',
  'name_desc',
  'newest',
  'expiry_soonest',
  'distance',
]);

export const DELIVERY_METHOD_VALUES = Object.freeze([
  'online',
  'in_person',
  'hybrid',
]);
