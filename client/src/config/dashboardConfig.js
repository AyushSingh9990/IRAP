export const roleDashboardDefinitions = Object.freeze({
  member: {
    label: 'Professional member',
    shortLabel: 'Member',
    path: '/dashboard/member',
    eyebrow: 'Professional membership',
    description:
      'Manage your professional membership application, evidence, payments, notifications, and account profile.',
  },
  training_provider: {
    label: 'Training provider',
    shortLabel: 'Provider',
    path: '/dashboard/training-provider',
    eyebrow: 'Training-provider accreditation',
    description:
      'Manage provider accreditation progress, supporting evidence, payments, notifications, and account details.',
  },
  organization: {
    label: 'Accredited organization',
    shortLabel: 'Organization',
    path: '/dashboard/organization',
    eyebrow: 'Organization accreditation',
    description:
      'Manage organization accreditation progress, supporting evidence, payments, notifications, and account details.',
  },
});

export const dashboardNavigation = Object.freeze([
  { label: 'Overview', to: '/dashboard', end: true, requiresJourney: true },
  { label: 'Applications', to: '/dashboard/applications', requiresJourney: true },
  { label: 'Documents', to: '/dashboard/documents', requiresJourney: true },
  { label: 'Payments', to: '/dashboard/payments', permission: 'payment:read:self', requiresJourney: true },
  { label: 'Memberships', to: '/dashboard/memberships', permission: 'membership:read:self', requiresJourney: true },
  { label: 'Public profile', to: '/dashboard/public-profile', permission: 'membership:read:self', requiresJourney: true },
  { label: 'Provider courses', to: '/dashboard/courses', permission: 'course:read:self', requiresJourney: true },
  { label: 'Articles', to: '/dashboard/articles', permission: 'article:read:self', requiresJourney: true },
  { label: 'Notifications', to: '/dashboard/notifications' },
  { label: 'Account settings', to: '/dashboard/account' },
]);

export const notificationCategoryLabels = Object.freeze({
  application: 'Application',
  payment: 'Payment',
  document: 'Document',
  membership: 'Membership',
  course: 'Course',
  article: 'Article',
  security: 'Security',
  announcement: 'Announcement',
  general: 'General',
});

export const notificationCategoryTones = Object.freeze({
  application: 'info',
  payment: 'success',
  document: 'warning',
  membership: 'success',
  course: 'info',
  article: 'info',
  security: 'error',
  announcement: 'info',
  general: 'neutral',
});
