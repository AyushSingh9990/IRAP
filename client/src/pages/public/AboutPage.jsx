import Alert from '../../components/common/Alert/Alert.jsx';
import Card from '../../components/common/Card/Card.jsx';
import PageHero from '../../components/public/PageHero/PageHero.jsx';
import SectionHeading from '../../components/public/SectionHeading/SectionHeading.jsx';
import Seo from '../../components/seo/Seo.jsx';
import styles from './AboutPage.module.css';

const principles = [
  {
    title: 'Evidence before approval',
    description:
      'Professional status is created only after the configured application, evidence, payment status, and review decision have been completed.',
  },
  {
    title: 'Privacy by separation',
    description:
      'User identity, applications, documents, public profiles, memberships, payments, and certificates remain distinct records with different access rules.',
  },
  {
    title: 'Honest public information',
    description:
      'The public website starts without invented members, providers, organizations, courses, testimonials, statistics, or transactions.',
  },
  {
    title: 'One secure identity',
    description:
      'A person can later hold multiple approved roles without maintaining separate passwords or duplicated accounts.',
  },
];

function AboutPage() {
  return (
    <>
      <Seo
        title="About"
        description="Learn about the principles, platform boundaries, and controlled approval model behind iRAP membership, accreditation, registry, and verification services."
        path="/about"
      />
      <PageHero
        breadcrumbItems={[{ label: 'Home', to: '/' }, { label: 'About' }]}
        eyebrow="About iRAP"
        title="A registry platform designed around accountable decisions"
        description="iRAP is being built as an original membership, accreditation, directory, certificate, and public-verification platform with clear boundaries between identity, payment, review, approval, and public status."
      />

      <section className="section">
        <div className={`container ${styles.storyGrid}`}>
          <SectionHeading
            eyebrow="Platform purpose"
            title="Professional workflows without misleading shortcuts"
            description="The platform is designed to support real commercial operations while preventing common registry problems such as duplicate authentication systems, hardcoded certificate names, public exposure of private evidence, and automatic approval after payment."
          />
          <Alert title="Brand information remains configurable" tone="info">
            iRAP is used as the project and website name. No expansion of the
            acronym, fake company history, address, registration detail, or
            contact information is invented on this page.
          </Alert>
        </div>
      </section>

      <section className={`${styles.mutedSection} section`}>
        <div className="container stack stack--large">
          <SectionHeading
            align="center"
            eyebrow="Core principles"
            title="The rules that shape the architecture"
          />
          <div className={styles.principleGrid}>
            {principles.map((principle, index) => (
              <Card key={principle.title} className={styles.principleCard}>
                <span>0{index + 1}</span>
                <h3>{principle.title}</h3>
                <p>{principle.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className={`container ${styles.boundaryGrid}`}>
          <div className="stack">
            <p className="eyebrow">Architectural boundary</p>
            <h2>Account, application, credential, and public profile are not the same record</h2>
            <p>
              Keeping these records separate allows iRAP to preserve review
              history, payment reconciliation, certificate status, directory
              consent, renewal dates, suspensions, and revocations without
              rewriting the authenticated user account.
            </p>
          </div>
          <Card className={styles.boundaryCard} padding="large">
            <dl>
              <div><dt>User</dt><dd>Identity, authentication, sessions, roles, and security.</dd></div>
              <div><dt>Application</dt><dd>Answers, evidence, review notes, and status history.</dd></div>
              <div><dt>Membership or accreditation</dt><dd>Approval, validity, renewal, and active status.</dd></div>
              <div><dt>Certificate</dt><dd>Issued credential, QR verification, and revocation history.</dd></div>
              <div><dt>Public profile</dt><dd>Approved, consented information eligible for directory display.</dd></div>
            </dl>
          </Card>
        </div>
      </section>
    </>
  );
}

export default AboutPage;
