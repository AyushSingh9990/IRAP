export const siteConfig = Object.freeze({
  name: import.meta.env.VITE_APP_NAME || 'iRAP',
  siteUrl: import.meta.env.VITE_SITE_URL || 'http://localhost:5173',
  apiBaseUrl:
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  defaultTitle: 'iRAP | Membership, Accreditation and Public Verification',
  defaultDescription:
    'iRAP provides professional membership, accreditation, public registry, and certificate-verification services through controlled application and review workflows.',
});
