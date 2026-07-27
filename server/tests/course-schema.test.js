import { describe, expect, it } from 'vitest';
import {
  approveCourseSchema,
  coursePolicySchema,
  createCourseSchema,
  requestCourseInformationSchema,
} from '../src/schemas/course.schema.js';

const objectId = '507f1f77bcf86cd799439011';

function validCourseBody() {
  return {
    providerMembershipId: objectId,
    title: 'Clinical Rehabilitation Course',
    category: 'Rehabilitation',
    summary:
      'A structured course for clinically applicable rehabilitation practice.',
    description:
      'This course provides a structured curriculum, supervised learning, assessment, quality assurance, and measurable learning outcomes for rehabilitation professionals.',
    learningObjectives: ['Apply a structured clinical assessment.'],
    targetAudience: ['Qualified rehabilitation professionals'],
    prerequisites: [],
    deliveryMethods: ['online'],
    language: 'English',
    totalLearningHours: 20,
    creditHours: 20,
    creditUnit: 'CPD',
    assessmentMethod:
      'Learners complete case-based quizzes and a final structured assessment.',
    qualityAssurance:
      'Content is reviewed annually with learner feedback and faculty oversight.',
    instructors: [
      {
        name: 'Faculty Member',
        qualifications: 'Relevant professional qualification',
        biography: '',
      },
    ],
    scheduleText: '',
    priceMinor: null,
    currency: 'INR',
    contactEmail: '',
    websiteUrl: '',
    publicVisible: true,
    declarationAccepted: true,
  };
}

describe('provider-course validation', () => {
  it('accepts a complete course draft', () => {
    const result = createCourseSchema.safeParse({
      body: validCourseBody(),
      params: {},
      query: {},
    });

    expect(result.success).toBe(true);
  });

  it('requires controlled course approval confirmation', () => {
    const result = approveCourseSchema.safeParse({
      body: {
        confirmation: 'approve',
        reason: '',
        providerVisibleNote: '',
        internalNote: '',
      },
      params: { courseId: objectId },
      query: {},
    });

    expect(result.success).toBe(false);
  });

  it('requires requested fields and a provider-visible explanation', () => {
    const result = requestCourseInformationSchema.safeParse({
      body: {
        requestedFields: ['learningObjectives'],
        reason: 'Learning outcomes require clarification.',
        providerVisibleNote:
          'Please revise the learning outcomes so each one is measurable.',
        internalNote: '',
      },
      params: { courseId: objectId },
      query: {},
    });

    expect(result.success).toBe(true);
  });

  it('accepts an administrator-controlled course policy', () => {
    const result = coursePolicySchema.safeParse({
      body: {
        validityMonths: 12,
        accreditationPrefix: 'CRS',
        certificatePrefix: 'CRSCERT',
        authorizedSignatory: {
          name: 'Authorized Signatory',
          title: 'Registry Officer',
        },
      },
      params: {},
      query: {},
    });

    expect(result.success).toBe(true);
  });
});
