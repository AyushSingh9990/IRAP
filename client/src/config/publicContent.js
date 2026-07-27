export const journeyContent = Object.freeze({
  member: {
    path: '/membership',
    eyebrow: 'Professional membership',
    title: 'Professional membership built on evidence and accountable review',
    introduction:
      'The iRAP membership journey is designed for professionals seeking a structured application, documented review, renewable status, a verifiable certificate, and controlled public-directory visibility.',
    seoTitle: 'Professional Membership',
    seoDescription:
      'Learn how professional membership applications, evidence review, approval, renewal, certificates, and directory visibility will work through iRAP.',
    summaryTitle: 'One applicant account, one controlled review trail',
    summaryText:
      'Registering records your intended journey. Membership is granted only after the application, documents, payment status, and professional standards are reviewed.',
    benefitsTitle: 'A clear professional membership framework',
    benefitsDescription:
      'Membership services are structured around verifiable records, controlled visibility, and transparent status management.',
    benefits: [
      {
        number: '01',
        title: 'Structured application',
        description:
          'Complete a staged application instead of one large form, with draft saving and clear completion status.',
      },
      {
        number: '02',
        title: 'Verifiable credential',
        description:
          'Approved members receive a dynamically generated certificate with a registration number and public verification route.',
      },
      {
        number: '03',
        title: 'Controlled directory profile',
        description:
          'Only approved, active, consented public information can appear in the professional directory.',
      },
    ],
    evidenceIntroduction:
      'Exact requirements will be configurable, but applicants should expect to provide identity, professional, qualification, service, consent, and supporting-document information.',
    evidence: [
      'Legal and display-name information',
      'Professional title, biography, experience, and languages',
      'Qualifications and awarding institutions',
      'Selected approved modalities and services',
      'Supporting evidence and declarations',
      'Code-of-ethics and public-directory consent',
    ],
    steps: [
      {
        title: 'Create and verify an account',
        description:
          'Select the professional-member journey and verify your email address.',
      },
      {
        title: 'Complete the application wizard',
        description:
          'Add structured profile, qualification, service, consent, and document information.',
      },
      {
        title: 'Complete payment and submit',
        description:
          'The server calculates the configured amount; payment does not create automatic approval.',
      },
      {
        title: 'Receive a review decision',
        description:
          'Respond to information requests and receive approval or rejection with a recorded history.',
      },
    ],
    applyTo: '/register?journey=member',
    applyLabel: 'Create member applicant account',
    ctaTitle: 'Start with a secure applicant account',
    ctaDescription:
      'Registration is available now. The complete evidence and application workflow is not yet enabled in this environment.',
  },
  trainingProvider: {
    path: '/training-providers',
    eyebrow: 'Training-provider accreditation',
    title: 'Accreditation for training providers and their approved courses',
    introduction:
      'The iRAP provider journey separates organization-level accreditation from individual course approval, allowing every course to retain its own evidence, review history, decision, and validity.',
    seoTitle: 'Training-Provider Accreditation',
    seoDescription:
      'Explore iRAP training-provider accreditation, course review, evidence requirements, certificates, renewals, and public-directory controls.',
    summaryTitle: 'Provider approval does not automatically approve every course',
    summaryText:
      'A provider may hold an active accreditation while each submitted course follows its own curriculum, evidence, payment, review, and approval workflow.',
    benefitsTitle: 'A quality-focused accreditation structure',
    benefitsDescription:
      'Provider and course records remain separate so public claims can be traced to the correct approval decision.',
    benefits: [
      {
        number: '01',
        title: 'Provider-level review',
        description:
          'Business identity, policies, trainer standards, learner support, assessment, and quality assurance are reviewed.',
      },
      {
        number: '02',
        title: 'Course-level decisions',
        description:
          'Curriculum, learning outcomes, delivery, assessment, materials, and CPD or CEU requests are reviewed per course.',
      },
      {
        number: '03',
        title: 'Public approved-course listing',
        description:
          'Only active approved courses associated with an active accredited provider can appear publicly.',
      },
    ],
    evidenceIntroduction:
      'Provider applications will collect structured business, trainer, delivery, assessment, policy, quality-assurance, and supporting-document evidence.',
    evidence: [
      'Legal business and trading information',
      'Trainer qualifications and delivery arrangements',
      'Assessment, complaints, refund, and conduct policies',
      'Quality-assurance and learner-support processes',
      'Course list and supporting evidence',
      'Accreditation declarations and directory consent',
    ],
    steps: [
      {
        title: 'Create and verify a provider applicant account',
        description:
          'Use one secure identity even when the account later holds more than one approved role.',
      },
      {
        title: 'Submit provider evidence',
        description:
          'Complete structured business, trainer, delivery, policy, and quality-assurance sections.',
      },
      {
        title: 'Receive provider accreditation',
        description:
          'Approval creates the provider accreditation record, validity period, registration number, and certificate.',
      },
      {
        title: 'Submit courses separately',
        description:
          'Each course follows its own evidence, review, CPD or CEU, and approval workflow.',
      },
    ],
    applyTo: '/register?journey=training_provider',
    applyLabel: 'Create provider applicant account',
    ctaTitle: 'Prepare your provider evidence in one controlled workspace',
    ctaDescription:
      'Create the applicant account now. The multi-step provider evidence workflow is not yet enabled in this environment.',
  },
  organization: {
    path: '/organizations',
    eyebrow: 'Organization accreditation',
    title: 'Organization accreditation with ethical and operational evidence',
    introduction:
      'The iRAP organization journey is designed for organizations that need an accountable accreditation record, controlled staff access, documented policies, renewable status, and public verification.',
    seoTitle: 'Organization Accreditation',
    seoDescription:
      'Learn about iRAP organization accreditation, ethical-practice evidence, authorized staff access, certificates, renewals, and public verification.',
    summaryTitle: 'Accreditation belongs to the approved organization record',
    summaryText:
      'Account creation and payment are not accreditation. The organization becomes accredited only after evidence review and an authorized approval decision.',
    benefitsTitle: 'A transparent organization-accreditation framework',
    benefitsDescription:
      'The workflow records evidence, decision history, validity, staff access, certificate status, and public visibility independently.',
    benefits: [
      {
        number: '01',
        title: 'Structured ethical evidence',
        description:
          'Record mission, services, ethical practice, conduct, quality assurance, complaints, and safeguarding information.',
      },
      {
        number: '02',
        title: 'Authorized staff access',
        description:
          'Approved organizations can later invite staff without sharing one account or one password.',
      },
      {
        number: '03',
        title: 'Public verification',
        description:
          'Active accreditation and certificate status can be verified without revealing private application documents.',
      },
    ],
    evidenceIntroduction:
      'Organization applications will collect legal, operational, ethical, policy, consent, and supporting-document information through configurable sections.',
    evidence: [
      'Legal identity and registration information',
      'Mission, services, locations, and operating countries',
      'Ethical practice and staff code of conduct',
      'Quality-assurance and complaints policies',
      'Safeguarding information where applicable',
      'Supporting documents, declarations, and directory consent',
    ],
    steps: [
      {
        title: 'Create and verify an applicant account',
        description:
          'Select the accredited-organization journey and confirm the account email.',
      },
      {
        title: 'Complete organization evidence',
        description:
          'Add legal, operational, ethical, policy, consent, and supporting-document information.',
      },
      {
        title: 'Complete payment and professional review',
        description:
          'Payment status and accreditation approval remain separate controlled decisions.',
      },
      {
        title: 'Manage accreditation and staff',
        description:
          'Approved organizations receive validity, certificate, directory, renewal, and authorized-staff modules.',
      },
    ],
    applyTo: '/register?journey=organization',
    applyLabel: 'Create organization applicant account',
    ctaTitle: 'Create a secure organization applicant account',
    ctaDescription:
      'Registration is available now. The complete organization evidence workflow is not yet enabled in this environment.',
  },
});

export const homeBenefits = Object.freeze([
  {
    title: 'Controlled professional approval',
    description:
      'Approval decisions are recorded separately from account creation and payment confirmation.',
  },
  {
    title: 'Verifiable public status',
    description:
      'Directory and certificate visibility depend on active, approved, non-suspended records.',
  },
  {
    title: 'Secure supporting evidence',
    description:
      'Private application documents remain access-controlled and are never automatically published.',
  },
  {
    title: 'Renewable credentials',
    description:
      'Memberships and accreditations carry validity, renewal, suspension, and revocation states.',
  },
]);

export const processSteps = Object.freeze([
  {
    title: 'Choose a journey',
    description:
      'Select professional membership, training-provider accreditation, or organization accreditation.',
  },
  {
    title: 'Verify and complete',
    description:
      'Verify your email, complete structured sections, and upload configured supporting evidence.',
  },
  {
    title: 'Pay and submit',
    description:
      'Complete the server-calculated payment and submit the application for professional review.',
  },
  {
    title: 'Review and decision',
    description:
      'Respond to information requests and receive a controlled approval or rejection decision.',
  },
  {
    title: 'Credential and directory',
    description:
      'Approved active records can receive certificates and consent-controlled public visibility.',
  },
]);

export const pricingCategories = Object.freeze([
  {
    title: 'Professional membership',
    description: 'Application, membership, and renewal prices are administrator-controlled.',
  },
  {
    title: 'Training-provider accreditation',
    description: 'Provider and course fees are configured independently by authorized administrators.',
  },
  {
    title: 'Organization accreditation',
    description: 'Accreditation, tax, coupon, and renewal settings are not hardcoded into this page.',
  },
]);

export const faqItems = Object.freeze([
  {
    question: 'Does creating an account make me an approved member or accredited provider?',
    answer:
      'No. Registration creates an applicant account and records the journey you intend to apply for. Approval is granted only after the relevant application, evidence, payment status, and professional review are complete.',
  },
  {
    question: 'Does successful payment automatically approve an application?',
    answer:
      'No. Payment confirmation and professional approval are separate processes. Payment may be required before review, but an authorized reviewer or administrator must still record the approval decision.',
  },
  {
    question: 'Can one person hold more than one role?',
    answer:
      'Yes. One secure user identity may later hold multiple approved roles, such as professional member and training provider. Each role follows its own application and approval requirements.',
  },
  {
    question: 'When does a profile appear in the public directory?',
    answer:
      'A profile can appear only when the related membership or accreditation is approved, active, within its validity period, not suspended or revoked, and public-directory consent is enabled.',
  },
  {
    question: 'Are application documents publicly visible?',
    answer:
      'No. Supporting evidence remains private and access-controlled. Public profiles use an approved public projection and do not expose private application documents.',
  },
  {
    question: 'How are certificates verified?',
    answer:
      'Approved certificates will contain a unique certificate number, registration number, QR code, verification URL, validity dates, and current status. Certificate verification is not yet enabled in this environment.',
  },
  {
    question: 'Can a reviewer ask for more information?',
    answer:
      'Yes. Reviewers can request additional information or replacement documents with applicant-visible notes. The applicant can update permitted sections and resubmit the application.',
  },
  {
    question: 'How do renewals work?',
    answer:
      'Renewal rules and reminder periods are administrator-controlled. Approved accounts can be reminded before expiry and may need to confirm information, replace expiring evidence, pay, and submit a renewal review.',
  },
  {
    question: 'Are membership and accreditation prices fixed in the website code?',
    answer:
      'No. Prices, taxes, coupons, currencies, payment providers, and renewal charges are controlled through settings and calculated by the server.',
  },
  {
    question: 'What happens when a credential is suspended or revoked?',
    answer:
      'The public directory entry is removed according to policy, certificate verification displays the current status, the account holder is notified, and the action is recorded in the audit history.',
  },
]);

export const legalPages = Object.freeze({
  codeOfEthics: {
    path: '/code-of-ethics',
    eyebrow: 'Professional standards',
    title: 'Code of ethics',
    description:
      'The final iRAP code of ethics must be approved and maintained by the organization responsible for the platform.',
    notice:
      'This page is an editable policy shell. It must not be treated as the final code of ethics until authorized content has been published through site administration.',
    sections: [
      {
        title: 'Intended scope',
        body: 'The final policy should define professional conduct, honesty, competence, respect, confidentiality, conflicts of interest, public claims, and cooperation with complaints or review procedures.',
      },
      {
        title: 'Acceptance and enforcement',
        body: 'The final policy should explain who must accept it, how amendments are communicated, how concerns are assessed, and how suspension or revocation decisions may be recorded.',
      },
    ],
  },
  complaints: {
    path: '/complaints',
    eyebrow: 'Complaints and concerns',
    title: 'Complaints',
    description:
      'A controlled complaints workflow will protect private submissions while allowing authorized staff to assign, investigate, respond, and record outcomes.',
    notice:
      'Online complaint submission is not enabled in this environment. The final form, attachment handling, reference numbers, and staff workflow will be activated with the support and administration services.',
    sections: [
      {
        title: 'Information to prepare',
        body: 'A complainant should be prepared to provide contact details, the subject of the complaint, relevant dates, a clear description, and supporting evidence where permitted.',
      },
      {
        title: 'Privacy and status',
        body: 'Complaint records will remain private. Status, assignment, internal notes, applicant-visible communication, and last-response dates will be controlled through authorized staff permissions.',
      },
    ],
  },
  privacy: {
    path: '/privacy-policy',
    eyebrow: 'Legal information',
    title: 'Privacy policy',
    description:
      'The production privacy policy must explain how iRAP collects, uses, stores, shares, retains, and protects personal information.',
    notice:
      'This is a content placeholder, not legal advice and not a launch-ready privacy policy. Authorized legal and data-protection representatives must publish the final policy before production use.',
    sections: [
      {
        title: 'Required policy topics',
        body: 'The final policy should address data controllers, lawful bases, account data, application evidence, payments, communications, public-directory consent, cookies, retention, security, international transfers, and individual rights.',
      },
      {
        title: 'Private and public information',
        body: 'The final policy should clearly distinguish private account and application data from approved public profile information and certificate-verification results.',
      },
    ],
  },
  cookies: {
    path: '/cookie-policy',
    eyebrow: 'Legal information',
    title: 'Cookie policy',
    description:
      'The final cookie policy must describe necessary cookies and any optional analytics or marketing technologies actually used by the production platform.',
    notice:
      'This editable shell does not claim that optional cookies are currently active. The final policy and consent controls must reflect the technologies configured at launch.',
    sections: [
      {
        title: 'Necessary authentication cookies',
        body: 'iRAP authentication uses secure HTTP-only cookies for short-lived access and rotating refresh sessions. The final policy should explain their purpose and duration without exposing secret values.',
      },
      {
        title: 'Optional technologies',
        body: 'Analytics, marketing, embedded media, or third-party cookies must not be described as active unless they are actually configured and covered by the required consent controls.',
      },
    ],
  },
  terms: {
    path: '/terms-and-conditions',
    eyebrow: 'Legal information',
    title: 'Terms and conditions',
    description:
      'The final terms must define platform use, applications, fees, review decisions, renewals, public listings, complaints, suspension, liability, and governing terms.',
    notice:
      'This is an editable shell only. The final terms must be drafted and approved by an authorized legal representative before the platform accepts production applications or payments.',
    sections: [
      {
        title: 'Application and approval terms',
        body: 'The final terms should make clear that payment does not guarantee approval, evidence may be requested, decisions may be reviewed, and inaccurate information may affect status.',
      },
      {
        title: 'Fees, renewal, and status',
        body: 'The final terms should explain configured fees, taxes, refunds, renewals, grace periods, expiry, suspension, revocation, and public-directory consequences.',
      },
    ],
  },
  accessibility: {
    path: '/accessibility',
    eyebrow: 'Inclusive access',
    title: 'Accessibility statement',
    description:
      'iRAP is being developed with WCAG 2.2 AA practices, keyboard access, visible focus, semantic controls, accessible dialogs, reduced motion, and responsive layouts.',
    notice:
      'The final statement must be updated after production accessibility testing and must include the real contact route for reporting barriers.',
    sections: [
      {
        title: 'Current implementation approach',
        body: 'The interface uses semantic elements, labelled controls, status announcements, focus management, responsive content, sufficient touch targets, and reduced-motion support.',
      },
      {
        title: 'Known limitations and feedback',
        body: 'Any production limitations identified through audit or user feedback should be documented with an action plan and an accessible method for requesting assistance.',
      },
    ],
  },
  disclaimer: {
    path: '/legal-disclaimer',
    eyebrow: 'Legal information',
    title: 'Legal disclaimer',
    description:
      'The final disclaimer must accurately describe the scope of iRAP registration, accreditation, public verification, content, and third-party information.',
    notice:
      'This page is not a launch-ready disclaimer. Authorized legal representatives must publish final language appropriate to the organization, services, countries, and professional context.',
    sections: [
      {
        title: 'Registry and verification scope',
        body: 'The final disclaimer should explain what an active registry or certificate result confirms and what it does not independently guarantee about services, outcomes, or third-party claims.',
      },
      {
        title: 'Articles and external information',
        body: 'The final disclaimer should address submitted articles, external links, author responsibility, moderation, and the limits of informational content.',
      },
    ],
  },
});
