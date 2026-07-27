import { useEffect, useState } from 'react';
import { listPublishedArticles } from '../../api/articleApi.js';
import { getPublicContentPage } from '../../api/siteApi.js';
import ArticleCard from '../../components/article/ArticleCard/ArticleCard.jsx';
import Accordion from '../../components/common/Accordion/Accordion.jsx';
import Button from '../../components/common/Button/Button.jsx';
import Card from '../../components/common/Card/Card.jsx';
import EmptyState from '../../components/common/EmptyState/EmptyState.jsx';
import StatusBadge from '../../components/common/StatusBadge/StatusBadge.jsx';
import PageHero from '../../components/public/PageHero/PageHero.jsx';
import RegistrySearch from '../../components/public/RegistrySearch/RegistrySearch.jsx';
import SectionHeading from '../../components/public/SectionHeading/SectionHeading.jsx';
import Seo from '../../components/seo/Seo.jsx';
import {
  faqItems,
  homeBenefits,
  journeyContent,
  pricingCategories,
  processSteps,
} from '../../config/publicContent.js';
import { siteConfig } from '../../config/siteConfig.js';
import styles from './HomePage.module.css';

const roleCards = [
  {
    key: 'member',
    title: 'Professional members',
    description:
      'Apply through a staged evidence workflow and, after approval, manage membership, validity, certificate, renewal, and public profile visibility.',
    to: '/membership',
  },
  {
    key: 'training_provider',
    title: 'Training providers',
    description:
      'Separate provider accreditation from course approval so every course retains its own evidence, review history, validity, and public status.',
    to: '/training-providers',
  },
  {
    key: 'organization',
    title: 'Accredited organizations',
    description:
      'Submit legal, ethical, operational, and policy evidence, then manage accreditation, staff access, certificate, renewal, and directory consent.',
    to: '/organizations',
  },
];

const journeyBands = [
  journeyContent.member,
  journeyContent.trainingProvider,
  journeyContent.organization,
];

function HomePage() {
  const [latestArticles, setLatestArticles] = useState([]);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [articlesError, setArticlesError] = useState('');
  const [managedHome, setManagedHome] = useState(null);

  useEffect(() => {
    let active = true;
    async function loadLatestArticles() {
      try {
        const result = await listPublishedArticles({ page: 1, limit: 3, sort: 'latest' });
        if (active) setLatestArticles(result.data.articles || []);
      } catch {
        if (active) setArticlesError('Published articles could not be loaded right now.');
      } finally {
        if (active) setArticlesLoading(false);
      }
    }
    void loadLatestArticles();
    return () => {
      active = false;
    };
  }, []);


  useEffect(() => {
    let active = true;
    getPublicContentPage('home')
      .then((result) => {
        if (active) setManagedHome(result.data.page || null);
      })
      .catch(() => {
        if (active) setManagedHome(null);
      });
    return () => {
      active = false;
    };
  }, []);

  const managedSections = Object.fromEntries(
    (managedHome?.sections || [])
      .filter((section) => section.enabled)
      .map((section) => [section.key, section]),
  );
  const introduction = managedSections.introduction;
  const contactCta = managedSections.contact_cta;

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.name,
    url: siteConfig.siteUrl,
  };

  return (
    <>
      <Seo
        description={siteConfig.defaultDescription}
        path="/"
        structuredData={organizationSchema}
      />

      <PageHero
        eyebrow={managedHome?.eyebrow || "Membership, accreditation and public verification"}
        title={managedHome?.title || "Professional recognition with transparent public status"}
        description={managedHome?.summary || "iRAP brings applicant accounts, evidence review, payment status, approval decisions, renewable credentials, certificates, and public verification into one controlled platform."}
        actions={
          <>
            <Button icon="arrowRight" size="large" to="/register">
              Create applicant account
            </Button>
            <Button size="large" to="/about" variant="secondary">
              Learn about iRAP
            </Button>
          </>
        }
        aside={<RegistrySearch />}
      />

      <section className="section" aria-labelledby="introduction-title">
        <div className={`container ${styles.introductionGrid}`}>
          <SectionHeading
            eyebrow="A controlled registry platform"
            title={introduction?.heading || "One identity, multiple professional journeys"}
            description={introduction?.body || "A user can later hold more than one approved role without creating separate login systems. Each role still retains its own application, evidence, decision, validity, certificate, renewal, and public-directory conditions."}
          />
          <Card className={styles.principlesCard} padding="large">
            <StatusBadge tone="success">Approval-controlled</StatusBadge>
            <h2 id="introduction-title">Built around clear boundaries</h2>
            <ul className={styles.checkList}>
              <li>Account creation is not professional approval.</li>
              <li>Payment confirmation is not professional approval.</li>
              <li>Private evidence is not public profile content.</li>
              <li>Expired or suspended records are not active credentials.</li>
            </ul>
          </Card>
        </div>
      </section>

      <section className={`${styles.mutedSection} section`}>
        <div className="container stack stack--large">
          <SectionHeading
            align="center"
            eyebrow="Choose your route"
            title="Three journeys, one secure account system"
            description="Every journey begins with an applicant account and continues through the evidence and review workflow configured for that role."
          />
          <div className={styles.roleGrid}>
            {roleCards.map((role, index) => (
              <Card key={role.key} className={styles.roleCard} padding="large">
                <span className={styles.roleNumber}>0{index + 1}</span>
                <h3>{role.title}</h3>
                <p>{role.description}</p>
                <Button to={role.to} variant="secondary" icon="arrowRight">
                  Explore this journey
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {journeyBands.map((journey, index) => (
        <section
          key={journey.path}
          className={`${styles.journeyBand} ${index % 2 ? styles.journeyBandReverse : ''}`}
        >
          <div className={`container ${styles.journeyInner}`}>
            <div className={styles.journeyMarker} aria-hidden="true">
              {index + 1}
            </div>
            <div className="stack">
              <p className="eyebrow">{journey.eyebrow}</p>
              <h2>{journey.summaryTitle}</h2>
              <p>{journey.summaryText}</p>
              <div className="cluster">
                <Button to={journey.path} variant="secondary">
                  View requirements
                </Button>
                <Button to={journey.applyTo} icon="arrowRight">
                  Start registration
                </Button>
              </div>
            </div>
          </div>
        </section>
      ))}

      <section className="section">
        <div className="container stack stack--large">
          <SectionHeading
            align="center"
            eyebrow="Platform benefits"
            title="Designed for trust, control, and honest public information"
          />
          <div className={styles.benefitGrid}>
            {homeBenefits.map((benefit) => (
              <Card key={benefit.title} className={styles.benefitCard}>
                <span className={styles.benefitIcon} aria-hidden="true">✓</span>
                <h3>{benefit.title}</h3>
                <p>{benefit.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.darkSection} section`}>
        <div className="container stack stack--large">
          <SectionHeading
            eyebrow="How the process works"
            title="From applicant account to verifiable status"
            description="The same controlled state model supports professional members, training providers, organizations, and later course-accreditation applications."
          />
          <ol className={styles.processGrid}>
            {processSteps.map((step, index) => (
              <li key={step.title}>
                <span>{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section">
        <div className="container stack stack--large">
          <SectionHeading
            align="center"
            eyebrow="Pricing"
            title="Transparent configuration without hardcoded amounts"
            description="The production amounts will be controlled by authorized administrators and calculated by the server. No unverified prices are displayed."
          />
          <div className={styles.pricingGrid}>
            {pricingCategories.map((category) => (
              <Card key={category.title} className={styles.pricingCard} padding="large">
                <StatusBadge tone="warning">Price not configured</StatusBadge>
                <h3>{category.title}</h3>
                <p>{category.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.mutedSection} section`}>
        <div className="container stack stack--large">
          <SectionHeading
            eyebrow="Approved profiles"
            title="Public records will reflect real approval status"
            description="Featured records are never invented. Only active, approved, consented records will be eligible for display."
          />
          <EmptyState
            title="No approved profiles are currently available"
            description="Approved professional members, training providers, and organizations will appear here after real applications have completed review."
            actionLabel="Open directory"
            actionTo="/directory"
          />
        </div>
      </section>

      <section className="section">
        <div className="container stack stack--large">
          <div className={styles.splitEmptyStates}>
            <div className="stack">
              <SectionHeading
                eyebrow="Approved modalities and courses"
                title="Administrator-managed public eligibility"
              />
              <EmptyState
                icon="search"
                title="No approved modalities or courses are available"
                description="The modalities collection starts empty and will be populated only by authorized administrators."
                actionLabel="Browse modality page"
                actionTo="/approved-modalities"
              />
            </div>
            <div className="stack">
              <SectionHeading
                eyebrow="Latest articles"
                title="Moderated content from approved publishers"
              />
              {articlesLoading ? (
                <Card className={styles.articleLoading} aria-live="polite">
                  Loading published articles…
                </Card>
              ) : latestArticles.length ? (
                <div className={styles.homeArticleGrid}>
                  {latestArticles.map((article) => (
                    <ArticleCard article={article} key={article.id} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon="info"
                  title="No articles have been published"
                  description={articlesError || 'Approved training providers and organizations can submit content for moderation and publication.'}
                  actionLabel="Browse articles"
                  actionTo="/articles"
                />
              )}
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.verifySection} section`}>
        <div className={`container ${styles.verifyGrid}`}>
          <div className="stack">
            <p className="eyebrow">Trust and verification</p>
            <h2>Public status without exposing private information</h2>
            <p>
              Verification pages show whether a credential is valid,
              expired, suspended, revoked, or not found while limiting the
              personal information displayed publicly.
            </p>
          </div>
          <Card className={styles.verifyCard} padding="large">
            <StatusBadge tone="success">Certificate verification enabled</StatusBadge>
            <h3>Live registry verification</h3>
            <p>
              Registration numbers, certificate numbers, QR codes, validity
              dates, and status history are generated from approved records—not
              from hardcoded names or static PDF content.
            </p>
          </Card>
        </div>
      </section>

      <section className="section">
        <div className="container stack stack--large">
          <SectionHeading
            align="center"
            eyebrow="Frequently asked questions"
            title="Clear answers before you apply"
          />
          <div className={styles.faqWrap}>
            <Accordion items={faqItems.slice(0, 5)} />
          </div>
          <div className={styles.centerAction}>
            <Button to="/faq" variant="secondary">
              View all questions
            </Button>
          </div>
        </div>
      </section>

      <section className={styles.contactCta}>
        <div className={`container ${styles.contactCtaInner}`}>
          <div>
            <p className="eyebrow">Need more information?</p>
            <h2>{contactCta?.heading || "Review the public guidance or create an applicant account"}</h2>
            <p>{contactCta?.body || "Contact details and online enquiry handling remain administrator-controlled and are never filled with invented company information."}</p>
          </div>
          <div className="cluster">
            <Button to="/contact" size="large" variant="secondary">
              Contact information
            </Button>
            <Button to="/register" icon="arrowRight" size="large">
              Register
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

export default HomePage;
