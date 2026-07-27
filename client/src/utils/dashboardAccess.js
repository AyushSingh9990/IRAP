export const PERSONAL_JOURNEY_TYPES = Object.freeze([
  'member',
  'training_provider',
  'organization',
]);

const ADMIN_DESTINATIONS = Object.freeze([
  ['application:review', '/admin'],
  ['document:review', '/admin/documents'],
  ['payment:manage', '/admin/payments'],
  ['membership:manage', '/admin/memberships'],
  ['course:review', '/admin/courses'],
  ['article:moderate', '/admin/articles'],
  ['article:taxonomy:manage', '/admin/article-taxonomy'],
  ['audit:read', '/admin/audit'],
  ['site:settings:manage', '/admin/site-settings'],
  ['content:manage', '/admin/content-pages'],
  ['template:manage', '/admin/templates'],
  ['support:manage', '/admin/support'],
  ['user:manage', '/admin/users'],
  ['role:manage', '/admin/roles'],
  ['system:manage', '/admin/system-health'],
]);

export function getPersonalJourneys(user) {
  const journeyValues = new Set([
    ...(Array.isArray(user?.requestedJourneys) ? user.requestedJourneys : []),
    ...(Array.isArray(user?.roles) ? user.roles : []),
  ]);

  return new Set(
    PERSONAL_JOURNEY_TYPES.filter((journey) => journeyValues.has(journey)),
  );
}

export function hasPersonalJourney(user) {
  return getPersonalJourneys(user).size > 0;
}

export function getAdministrativeDestination(user) {
  const permissions = new Set(
    Array.isArray(user?.permissions) ? user.permissions : [],
  );

  return (
    ADMIN_DESTINATIONS.find(([permission]) => permissions.has(permission))?.[1]
    || ''
  );
}

export function getPrimaryWorkspaceDestination(user) {
  return getAdministrativeDestination(user) || '/dashboard';
}
