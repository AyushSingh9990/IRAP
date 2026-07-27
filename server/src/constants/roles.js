export const ROLES = Object.freeze({
  VISITOR: 'visitor',
  APPLICANT: 'applicant',
  MEMBER: 'member',
  TRAINING_PROVIDER: 'training_provider',
  ORGANIZATION: 'organization',
  REVIEWER: 'reviewer',
  CONTENT_MANAGER: 'content_manager',
  FINANCE_MANAGER: 'finance_manager',
  SUPPORT_AGENT: 'support_agent',
  SUPER_ADMIN: 'super_admin',
});

export const ROLE_VALUES = Object.freeze(Object.values(ROLES));

export const REGISTRATION_JOURNEYS = Object.freeze({
  MEMBER: 'member',
  TRAINING_PROVIDER: 'training_provider',
  ORGANIZATION: 'organization',
});

export const REGISTRATION_JOURNEY_VALUES = Object.freeze(
  Object.values(REGISTRATION_JOURNEYS),
);
