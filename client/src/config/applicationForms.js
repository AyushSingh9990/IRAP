export const applicationTypeLabels = Object.freeze({
  member: 'Professional Member',
  training_provider: 'Training Provider',
  organization: 'Accredited Organization',
});

const text = (name, label, options = {}) => ({ type: 'text', name, label, ...options });
const textarea = (name, label, options = {}) => ({ type: 'textarea', name, label, rows: 5, ...options });
const checkbox = (name, label, options = {}) => ({ type: 'checkbox', name, label, ...options });
const select = (name, label, options, settings = {}) => ({ type: 'select', name, label, options, ...settings });

export const applicationFormDefinitions = Object.freeze({
  member: {
    label: 'Professional Member',
    description: 'Provide your legal identity, professional background, qualifications, services, and declarations.',
    steps: [
      {
        key: 'identity',
        label: 'Identity and contact',
        fields: [
          text('legalFirstName', 'Legal first name', { required: true, maxLength: 80 }),
          text('legalMiddleName', 'Legal middle name', { maxLength: 80 }),
          text('legalLastName', 'Legal surname', { required: true, maxLength: 80 }),
          text('displayName', 'Public display name', { required: true, maxLength: 160 }),
          text('telephone', 'Telephone number', { required: true, maxLength: 40 }),
          text('dateOfBirth', 'Date of birth', { inputType: 'date' }),
          text('country', 'Country', { required: true, maxLength: 100 }),
          text('region', 'State or region', { maxLength: 100 }),
          text('city', 'City', { required: true, maxLength: 100 }),
          text('postalCode', 'Postal code', { maxLength: 20 }),
        ],
      },
      {
        key: 'professional',
        label: 'Professional profile',
        fields: [
          text('professionalTitle', 'Professional title', { required: true, maxLength: 160 }),
          textarea('biography', 'Professional biography', { required: true, minLength: 80, maxLength: 3000, rows: 8 }),
          text('yearsExperience', 'Years of experience', { required: true, inputType: 'number', min: 0, max: 80 }),
          text('languages', 'Languages', { required: true, hint: 'Separate multiple languages with commas.', maxLength: 500 }),
          text('website', 'Website', { inputType: 'url' }),
          text('businessName', 'Business or practice name', { maxLength: 200 }),
          textarea('practiceAddress', 'Practice address', { maxLength: 500, rows: 4 }),
          checkbox('remoteServiceAvailable', 'I offer remote or online services.'),
        ],
      },
      {
        key: 'practice',
        label: 'Qualifications and services',
        fields: [
          textarea('qualificationSummary', 'Qualifications', { required: true, minLength: 20, maxLength: 3000, rows: 7 }),
          textarea('professionalMemberships', 'Professional memberships', { maxLength: 2000 }),
          textarea('servicesOffered', 'Services offered', { required: true, minLength: 10, maxLength: 2000 }),
          textarea('businessHours', 'Business hours', { maxLength: 1000 }),
          textarea('pricingInformation', 'Pricing information', { maxLength: 1000 }),
          select('contactPreference', 'Preferred public contact method', [
            ['email', 'Email'],
            ['telephone', 'Telephone'],
            ['website', 'Website'],
            ['private_enquiry', 'Private enquiry form'],
          ], { required: true }),
        ],
      },
      {
        key: 'declarations',
        label: 'Declarations',
        fields: [
          checkbox('identityDeclaration', 'I confirm that the information supplied is complete and accurate.', { required: true }),
          checkbox('ethicsAgreement', 'I agree to follow the iRAP Code of Ethics.', { required: true }),
          checkbox('dataConsent', 'I consent to processing of my application data.', { required: true }),
          checkbox('directoryConsent', 'I consent to publication of approved profile information in the public directory.'),
        ],
      },
    ],
  },
  training_provider: {
    label: 'Training Provider',
    description: 'Provide business information, training standards, policies, quality controls, and declarations.',
    steps: [
      {
        key: 'business',
        label: 'Business details',
        fields: [
          text('legalBusinessName', 'Legal business name', { required: true, maxLength: 200 }),
          text('tradingName', 'Trading name', { maxLength: 200 }),
          text('registrationNumber', 'Registration number', { maxLength: 100 }),
          text('organizationType', 'Organization type', { required: true, maxLength: 120 }),
          text('contactPerson', 'Contact person', { required: true, maxLength: 160 }),
          text('businessEmail', 'Business email', { required: true, inputType: 'email' }),
          text('telephone', 'Telephone number', { required: true, maxLength: 40 }),
          text('country', 'Country', { required: true, maxLength: 100 }),
          textarea('registeredAddress', 'Registered address', { required: true, minLength: 10, maxLength: 600 }),
          textarea('operatingAddress', 'Operating address', { maxLength: 600 }),
          text('website', 'Website', { inputType: 'url' }),
        ],
      },
      {
        key: 'training',
        label: 'Training delivery',
        fields: [
          textarea('description', 'Provider description', { required: true, minLength: 80, maxLength: 3000, rows: 8 }),
          text('deliveryFormats', 'Delivery formats', { required: true, hint: 'For example: online, live virtual, in person.', maxLength: 500 }),
          textarea('onlineTrainingDetails', 'Online-training details', { maxLength: 2000 }),
          textarea('inPersonLocations', 'In-person training locations', { maxLength: 1500 }),
          textarea('trainerQualifications', 'Trainer qualifications', { required: true, minLength: 20, maxLength: 3000 }),
          textarea('courseSummary', 'Current course summary', { required: true, minLength: 20, maxLength: 3000 }),
        ],
      },
      {
        key: 'policies',
        label: 'Policies and quality',
        fields: [
          textarea('assessmentPolicy', 'Assessment policy summary', { required: true, minLength: 20, maxLength: 3000 }),
          textarea('complaintsPolicy', 'Complaints policy summary', { required: true, minLength: 20, maxLength: 3000 }),
          textarea('refundPolicy', 'Refund policy summary', { required: true, minLength: 20, maxLength: 3000 }),
          textarea('codeOfConduct', 'Code of conduct summary', { required: true, minLength: 20, maxLength: 3000 }),
          textarea('qualityAssurance', 'Quality-assurance process', { required: true, minLength: 20, maxLength: 3000 }),
          textarea('studentSupport', 'Student-support process', { required: true, minLength: 20, maxLength: 3000 }),
        ],
      },
      {
        key: 'declarations',
        label: 'Declarations',
        fields: [
          checkbox('accreditationDeclaration', 'I confirm that the submitted business and training information is accurate.', { required: true }),
          checkbox('dataConsent', 'I consent to processing of the application data.', { required: true }),
          checkbox('directoryConsent', 'I consent to publication of approved provider information in the public directory.'),
        ],
      },
    ],
  },
  organization: {
    label: 'Accredited Organization',
    description: 'Provide organization information, mission, services, policies, and accreditation declarations.',
    steps: [
      {
        key: 'identity',
        label: 'Organization details',
        fields: [
          text('legalOrganizationName', 'Legal organization name', { required: true, maxLength: 200 }),
          text('tradingName', 'Trading name', { maxLength: 200 }),
          text('organizationType', 'Organization type', { required: true, maxLength: 120 }),
          text('registrationNumber', 'Company or charity registration number', { maxLength: 100 }),
          text('contactPerson', 'Contact person', { required: true, maxLength: 160 }),
          text('email', 'Contact email', { required: true, inputType: 'email' }),
          text('telephone', 'Telephone number', { required: true, maxLength: 40 }),
          text('website', 'Website', { inputType: 'url' }),
          textarea('registeredAddress', 'Registered address', { required: true, minLength: 10, maxLength: 600 }),
          textarea('operatingCountries', 'Operating countries', { required: true, minLength: 2, maxLength: 1000 }),
        ],
      },
      {
        key: 'profile',
        label: 'Mission and services',
        fields: [
          textarea('description', 'Organization description', { required: true, minLength: 80, maxLength: 3000, rows: 8 }),
          textarea('mission', 'Mission', { required: true, minLength: 20, maxLength: 2000 }),
          textarea('services', 'Services', { required: true, minLength: 20, maxLength: 2500 }),
          textarea('ethicalPracticeStatement', 'Ethical-practice statement', { required: true, minLength: 20, maxLength: 2500 }),
          textarea('environmentalSocialImpact', 'Environmental or social-impact information', { maxLength: 2000 }),
        ],
      },
      {
        key: 'policies',
        label: 'Policies',
        fields: [
          textarea('staffCodeOfConduct', 'Staff code of conduct', { required: true, minLength: 20, maxLength: 3000 }),
          textarea('qualityAssurancePolicy', 'Quality-assurance policy', { required: true, minLength: 20, maxLength: 3000 }),
          textarea('complaintsPolicy', 'Complaints policy', { required: true, minLength: 20, maxLength: 3000 }),
          textarea('safeguardingPolicy', 'Safeguarding policy, where applicable', { maxLength: 3000 }),
        ],
      },
      {
        key: 'declarations',
        label: 'Declarations',
        fields: [
          checkbox('accreditationDeclaration', 'I confirm that the submitted organization information is accurate.', { required: true }),
          checkbox('dataConsent', 'I consent to processing of the application data.', { required: true }),
          checkbox('directoryConsent', 'I consent to publication of approved organization information in the public directory.'),
        ],
      },
    ],
  },
});

export const applicationStatusLabels = Object.freeze({
  draft: 'Draft',
  submitted: 'Submitted',
  payment_pending: 'Payment pending',
  payment_confirmed: 'Payment confirmed',
  under_review: 'Under review',
  additional_information_required: 'Additional information required',
  resubmitted: 'Resubmitted',
  approved: 'Approved',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  suspended: 'Suspended',
  expired: 'Expired',
  renewal_due: 'Renewal due',
  renewal_submitted: 'Renewal submitted',
});

export const applicationStatusTones = Object.freeze({
  draft: 'neutral',
  submitted: 'info',
  payment_pending: 'warning',
  payment_confirmed: 'success',
  under_review: 'info',
  additional_information_required: 'warning',
  resubmitted: 'info',
  approved: 'success',
  rejected: 'error',
  withdrawn: 'neutral',
  suspended: 'error',
  expired: 'warning',
  renewal_due: 'warning',
  renewal_submitted: 'info',
});
