export const documentCategories = [
  ['identity', 'Identity document'],
  ['profile_photo', 'Profile photograph'],
  ['qualification_certificate', 'Qualification certificate'],
  ['professional_membership', 'Professional membership evidence'],
  ['insurance', 'Insurance evidence'],
  ['business_registration', 'Business registration'],
  ['trainer_qualification', 'Trainer qualification'],
  ['training_policy', 'Training policy'],
  ['assessment_policy', 'Assessment policy'],
  ['complaints_policy', 'Complaints policy'],
  ['refund_policy', 'Refund policy'],
  ['payment_proof', 'Payment proof'],
  ['quality_assurance', 'Quality-assurance evidence'],
  ['course_curriculum', 'Course curriculum'],
  ['sample_certificate', 'Sample certificate'],
  ['safeguarding_policy', 'Safeguarding policy'],
  ['code_of_conduct', 'Code of conduct'],
  ['other', 'Other supporting document'],
];

export const documentStatusLabels = Object.freeze({
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
  replacement_requested: 'Replacement requested',
  superseded: 'Superseded',
});

export const documentStatusTones = Object.freeze({
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  replacement_requested: 'warning',
  superseded: 'neutral',
});

export const acceptedDocumentTypes = Object.freeze({
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    '.docx',
  ],
});

const configuredMaxFileSizeMb = Number(
  import.meta.env.VITE_DOCUMENT_MAX_FILE_SIZE_MB || 10,
);

export const documentMaxFileSize = configuredMaxFileSizeMb * 1024 * 1024;

export function formatFileSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
