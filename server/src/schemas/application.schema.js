import { z } from 'zod';
import { APPLICATION_TYPE_VALUES } from '../constants/applicationTypes.js';

const trimmed = (minimum, maximum, label) =>
  z
    .string()
    .trim()
    .min(minimum, `${label} is required.`)
    .max(maximum, `${label} must contain ${maximum} characters or fewer.`);

const optionalText = (maximum = 500) =>
  z
    .string()
    .trim()
    .max(maximum, `This field must contain ${maximum} characters or fewer.`)
    .optional()
    .default('');

const optionalUrl = z
  .union([z.literal(''), z.string().trim().url('Enter a valid URL.')])
  .optional()
  .default('');

const declaration = (message) => z.boolean().refine((value) => value === true, { message });

const memberIdentitySchema = z.object({
  legalFirstName: trimmed(1, 80, 'Legal first name'),
  legalMiddleName: optionalText(80),
  legalLastName: trimmed(1, 80, 'Legal surname'),
  displayName: trimmed(2, 160, 'Display name'),
  telephone: trimmed(5, 40, 'Telephone number'),
  dateOfBirth: optionalText(20),
  country: trimmed(2, 100, 'Country'),
  region: optionalText(100),
  city: trimmed(2, 100, 'City'),
  postalCode: optionalText(20),
});

const memberProfessionalSchema = z.object({
  professionalTitle: trimmed(2, 160, 'Professional title'),
  biography: trimmed(80, 3000, 'Biography'),
  yearsExperience: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.coerce.number().int().min(0).max(80),
  ),
  languages: trimmed(2, 500, 'Languages'),
  website: optionalUrl,
  businessName: optionalText(200),
  practiceAddress: optionalText(500),
  remoteServiceAvailable: z.boolean(),
});

const memberPracticeSchema = z.object({
  qualificationSummary: trimmed(20, 3000, 'Qualification summary'),
  professionalMemberships: optionalText(2000),
  servicesOffered: trimmed(10, 2000, 'Services offered'),
  businessHours: optionalText(1000),
  pricingInformation: optionalText(1000),
  contactPreference: z.enum(['email', 'telephone', 'website', 'private_enquiry']),
});

const memberDeclarationsSchema = z.object({
  identityDeclaration: declaration('Confirm that the information is accurate.'),
  ethicsAgreement: declaration('Accept the iRAP Code of Ethics.'),
  dataConsent: declaration('Consent to application data processing.'),
  directoryConsent: z.boolean(),
});

const providerBusinessSchema = z.object({
  legalBusinessName: trimmed(2, 200, 'Legal business name'),
  tradingName: optionalText(200),
  registrationNumber: optionalText(100),
  organizationType: trimmed(2, 120, 'Organization type'),
  contactPerson: trimmed(2, 160, 'Contact person'),
  businessEmail: z.string().trim().email('Enter a valid business email address.'),
  telephone: trimmed(5, 40, 'Telephone number'),
  country: trimmed(2, 100, 'Country'),
  registeredAddress: trimmed(10, 600, 'Registered address'),
  operatingAddress: optionalText(600),
  website: optionalUrl,
});

const providerTrainingSchema = z.object({
  description: trimmed(80, 3000, 'Provider description'),
  deliveryFormats: trimmed(2, 500, 'Delivery formats'),
  onlineTrainingDetails: optionalText(2000),
  inPersonLocations: optionalText(1500),
  trainerQualifications: trimmed(20, 3000, 'Trainer qualification summary'),
  courseSummary: trimmed(20, 3000, 'Course summary'),
});

const providerPoliciesSchema = z.object({
  assessmentPolicy: trimmed(20, 3000, 'Assessment policy summary'),
  complaintsPolicy: trimmed(20, 3000, 'Complaints policy summary'),
  refundPolicy: trimmed(20, 3000, 'Refund policy summary'),
  codeOfConduct: trimmed(20, 3000, 'Code of conduct summary'),
  qualityAssurance: trimmed(20, 3000, 'Quality-assurance summary'),
  studentSupport: trimmed(20, 3000, 'Student-support summary'),
});

const providerDeclarationsSchema = z.object({
  accreditationDeclaration: declaration('Confirm that the submitted evidence is accurate.'),
  dataConsent: declaration('Consent to application data processing.'),
  directoryConsent: z.boolean(),
});

const organizationIdentitySchema = z.object({
  legalOrganizationName: trimmed(2, 200, 'Legal organization name'),
  tradingName: optionalText(200),
  organizationType: trimmed(2, 120, 'Organization type'),
  registrationNumber: optionalText(100),
  contactPerson: trimmed(2, 160, 'Contact person'),
  email: z.string().trim().email('Enter a valid contact email address.'),
  telephone: trimmed(5, 40, 'Telephone number'),
  website: optionalUrl,
  registeredAddress: trimmed(10, 600, 'Registered address'),
  operatingCountries: trimmed(2, 1000, 'Operating countries'),
});

const organizationProfileSchema = z.object({
  description: trimmed(80, 3000, 'Organization description'),
  mission: trimmed(20, 2000, 'Mission'),
  services: trimmed(20, 2500, 'Services'),
  ethicalPracticeStatement: trimmed(20, 2500, 'Ethical-practice statement'),
  environmentalSocialImpact: optionalText(2000),
});

const organizationPoliciesSchema = z.object({
  staffCodeOfConduct: trimmed(20, 3000, 'Staff code of conduct'),
  qualityAssurancePolicy: trimmed(20, 3000, 'Quality-assurance policy'),
  complaintsPolicy: trimmed(20, 3000, 'Complaints policy'),
  safeguardingPolicy: optionalText(3000),
});

const organizationDeclarationsSchema = z.object({
  accreditationDeclaration: declaration('Confirm that the submitted evidence is accurate.'),
  dataConsent: declaration('Consent to application data processing.'),
  directoryConsent: z.boolean(),
});

export const APPLICATION_STEP_DEFINITIONS = Object.freeze({
  member: [
    {
      key: 'identity',
      label: 'Identity and contact',
      schema: memberIdentitySchema,
      requiredFields: ['legalFirstName', 'legalLastName', 'displayName', 'telephone', 'country', 'city'],
    },
    {
      key: 'professional',
      label: 'Professional profile',
      schema: memberProfessionalSchema,
      requiredFields: ['professionalTitle', 'biography', 'yearsExperience', 'languages', 'remoteServiceAvailable'],
    },
    {
      key: 'practice',
      label: 'Qualifications and services',
      schema: memberPracticeSchema,
      requiredFields: ['qualificationSummary', 'servicesOffered', 'contactPreference'],
    },
    {
      key: 'declarations',
      label: 'Declarations',
      schema: memberDeclarationsSchema,
      requiredFields: ['identityDeclaration', 'ethicsAgreement', 'dataConsent', 'directoryConsent'],
      mustBeTrueFields: ['identityDeclaration', 'ethicsAgreement', 'dataConsent'],
    },
  ],
  training_provider: [
    {
      key: 'business',
      label: 'Business details',
      schema: providerBusinessSchema,
      requiredFields: ['legalBusinessName', 'organizationType', 'contactPerson', 'businessEmail', 'telephone', 'country', 'registeredAddress'],
    },
    {
      key: 'training',
      label: 'Training delivery',
      schema: providerTrainingSchema,
      requiredFields: ['description', 'deliveryFormats', 'trainerQualifications', 'courseSummary'],
    },
    {
      key: 'policies',
      label: 'Policies and quality',
      schema: providerPoliciesSchema,
      requiredFields: ['assessmentPolicy', 'complaintsPolicy', 'refundPolicy', 'codeOfConduct', 'qualityAssurance', 'studentSupport'],
    },
    {
      key: 'declarations',
      label: 'Declarations',
      schema: providerDeclarationsSchema,
      requiredFields: ['accreditationDeclaration', 'dataConsent', 'directoryConsent'],
      mustBeTrueFields: ['accreditationDeclaration', 'dataConsent'],
    },
  ],
  organization: [
    {
      key: 'identity',
      label: 'Organization details',
      schema: organizationIdentitySchema,
      requiredFields: ['legalOrganizationName', 'organizationType', 'contactPerson', 'email', 'telephone', 'registeredAddress', 'operatingCountries'],
    },
    {
      key: 'profile',
      label: 'Mission and services',
      schema: organizationProfileSchema,
      requiredFields: ['description', 'mission', 'services', 'ethicalPracticeStatement'],
    },
    {
      key: 'policies',
      label: 'Policies',
      schema: organizationPoliciesSchema,
      requiredFields: ['staffCodeOfConduct', 'qualityAssurancePolicy', 'complaintsPolicy'],
    },
    {
      key: 'declarations',
      label: 'Declarations',
      schema: organizationDeclarationsSchema,
      requiredFields: ['accreditationDeclaration', 'dataConsent', 'directoryConsent'],
      mustBeTrueFields: ['accreditationDeclaration', 'dataConsent'],
    },
  ],
});

export const createApplicationSchema = z.object({
  body: z.object({ type: z.enum(APPLICATION_TYPE_VALUES) }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

export const applicationIdSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({ applicationId: z.string().trim().regex(/^[a-f\d]{24}$/i, 'Invalid application identifier.') }),
  query: z.object({}).passthrough(),
});

export const saveApplicationStepSchema = z.object({
  body: z.object({
    data: z.record(z.string(), z.unknown()),
    nextStepKey: z.string().trim().min(1).max(80).optional(),
  }),
  params: z.object({
    applicationId: z.string().trim().regex(/^[a-f\d]{24}$/i, 'Invalid application identifier.'),
    stepKey: z.string().trim().min(1).max(80),
  }),
  query: z.object({}).passthrough(),
});

export const withdrawApplicationSchema = z.object({
  body: z.object({ reason: optionalText(1000) }),
  params: z.object({ applicationId: z.string().trim().regex(/^[a-f\d]{24}$/i, 'Invalid application identifier.') }),
  query: z.object({}).passthrough(),
});
