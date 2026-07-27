export const publicNavigation = Object.freeze([
  {
    label: 'Home',
    to: '/',
    available: true,
  },
  {
    label: 'Approved modalities',
    to: '/approved-modalities',
    available: true,
  },
  {
    label: 'Membership',
    children: [
      {
        label: 'Membership overview',
        to: '/membership',
        available: true,
      },
      {
        label: 'Apply for membership',
        to: '/register?journey=member',
        available: true,
      },
    ],
  },
  {
    label: 'Accreditation',
    children: [
      {
        label: 'Training providers',
        to: '/training-providers',
        available: true,
      },
      {
        label: 'Provider registration',
        to: '/register?journey=training_provider',
        available: true,
      },
      {
        label: 'Organizations',
        to: '/organizations',
        available: true,
      },
      {
        label: 'Organization registration',
        to: '/register?journey=organization',
        available: true,
      },
    ],
  },
  {
    label: 'Directory',
    children: [
      {
        label: 'Directory overview',
        to: '/directory',
        available: true,
      },
      {
        label: 'Professional members',
        to: '/directory/members',
        available: true,
      },
      {
        label: 'Training providers',
        to: '/directory/training-providers',
        available: true,
      },
      {
        label: 'Organizations',
        to: '/directory/organizations',
        available: true,
      },
      {
        label: 'Accredited courses',
        to: '/directory/courses',
        available: true,
      },
    ],
  },
  {
    label: 'Articles',
    to: '/articles',
    available: true,
  },
  {
    label: 'Verify certificate',
    to: '/verify-certificate',
    available: true,
  },
  {
    label: 'About',
    to: '/about',
    available: true,
  },
  {
    label: 'Contact',
    to: '/contact',
    available: true,
  },
]);

export const accountNavigation = Object.freeze([
  {
    label: 'Log in',
    to: '/login',
    available: true,
    variant: 'ghost',
  },
  {
    label: 'Register',
    to: '/register',
    available: true,
    variant: 'primary',
  },
]);

export const footerNavigation = Object.freeze({
  platform: [
    { label: 'Membership', to: '/membership', available: true },
    { label: 'Training providers', to: '/training-providers', available: true },
    { label: 'Organizations', to: '/organizations', available: true },
    { label: 'Directory', to: '/directory', available: true },
  ],
  resources: [
    { label: 'Approved modalities', to: '/approved-modalities', available: true },
    { label: 'Verify certificate', to: '/verify-certificate', available: true },
    { label: 'Articles', to: '/articles', available: true },
    { label: 'Frequently asked questions', to: '/faq', available: true },
    { label: 'Contact', to: '/contact', available: true },
    { label: 'Complaints', to: '/complaints', available: true },
  ],
  legal: [
    { label: 'Code of ethics', to: '/code-of-ethics', available: true },
    { label: 'Privacy policy', to: '/privacy-policy', available: true },
    { label: 'Cookie policy', to: '/cookie-policy', available: true },
    { label: 'Terms and conditions', to: '/terms-and-conditions', available: true },
    { label: 'Accessibility', to: '/accessibility', available: true },
    { label: 'Legal disclaimer', to: '/legal-disclaimer', available: true },
  ],
});
