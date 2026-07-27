export const directoryDefinitions = Object.freeze({
  members: {
    singular: 'Professional member',
    plural: 'Professional members',
    eyebrow: 'Public professional registry',
    description:
      'Search active, approved and directory-visible professional members.',
  },
  'training-providers': {
    singular: 'Training provider',
    plural: 'Training providers',
    eyebrow: 'Accredited provider registry',
    description:
      'Search active accredited training providers with controlled public information.',
  },
  organizations: {
    singular: 'Accredited organization',
    plural: 'Accredited organizations',
    eyebrow: 'Organization registry',
    description:
      'Search active accredited organizations with consent-controlled public profiles.',
  },
  courses: {
    singular: 'Accredited course',
    plural: 'Accredited courses',
    eyebrow: 'Approved course registry',
    description:
      'Search active course accreditations published from approved provider records.',
  },
});

export const directorySortOptions = Object.freeze([
  { value: 'name_asc', label: 'Name A–Z' },
  { value: 'name_desc', label: 'Name Z–A' },
  { value: 'newest', label: 'Recently published' },
  { value: 'expiry_soonest', label: 'Validity ending soonest' },
  { value: 'distance', label: 'Nearest first' },
]);

export function splitList(value) {
  return String(value || '')
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function joinList(value) {
  return Array.isArray(value) ? value.join('\n') : '';
}

export function formatDirectoryDate(value) {
  if (!value) return 'Not available';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));
}
