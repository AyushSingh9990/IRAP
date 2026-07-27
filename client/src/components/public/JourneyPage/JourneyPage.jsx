import Alert from '../../common/Alert/Alert.jsx';
import Button from '../../common/Button/Button.jsx';
import Card from '../../common/Card/Card.jsx';
import StatusBadge from '../../common/StatusBadge/StatusBadge.jsx';
import Seo from '../../seo/Seo.jsx';
import PageHero from '../PageHero/PageHero.jsx';
import SectionHeading from '../SectionHeading/SectionHeading.jsx';
import styles from './JourneyPage.module.css';

function JourneyPage({ config }) {
  const breadcrumbItems = [
    { label: 'Home', to: '/' },
    { label: config.title },
  ];

  return (
    <>
      <Seo
        title={config.seoTitle}
        description={config.seoDescription}
        path={config.path}
      />

      <PageHero
        eyebrow={config.eyebrow}
        title={config.title}
        description={config.introduction}
        breadcrumbItems={breadcrumbItems}
        actions={
          <>
            <Button to={config.applyTo} icon="arrowRight" size="large">
              {config.applyLabel}
            </Button>
            <Button to="/faq" size="large" variant="secondary">
              Read common questions
            </Button>
          </>
        }
        aside={
          <Card className={styles.summaryCard} padding="large" variant="elevated">
            <StatusBadge tone="info">Evidence-led review</StatusBadge>
            <h2>{config.summaryTitle}</h2>
            <p>{config.summaryText}</p>
          </Card>
        }
      />

      <section className="section">
        <div className="container stack stack--large">
          <SectionHeading
            eyebrow="What this route provides"
            title={config.benefitsTitle}
            description={config.benefitsDescription}
          />
          <div className={styles.cardGrid}>
            {config.benefits.map((benefit) => (
              <Card key={benefit.title} className={styles.featureCard}>
                <span className={styles.number}>{benefit.number}</span>
                <h3>{benefit.title}</h3>
                <p>{benefit.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.mutedSection} section`}>
        <div className={`container ${styles.twoColumn}`}>
          <div className="stack">
            <SectionHeading
              eyebrow="Application preparation"
              title="Information and evidence"
              description={config.evidenceIntroduction}
            />
            <ul className={styles.checkList}>
              {config.evidence.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <Card className="stack" padding="large">
            <StatusBadge tone="warning">Important separation</StatusBadge>
            <h2>Payment is not professional approval</h2>
            <p>
              Payment confirmation and professional review are separate. An
              account becomes approved only after the required evidence has
              been reviewed and an authorized decision has been recorded.
            </p>
            <Alert tone="info" title="Configurable requirements">
              Required fields, documents, prices, taxes, and renewal periods
              will be controlled through administrator settings rather than
              hardcoded into the public page.
            </Alert>
          </Card>
        </div>
      </section>

      <section className="section">
        <div className="container stack stack--large">
          <SectionHeading
            align="center"
            eyebrow="Application pathway"
            title="A controlled process from account to approval"
            description="The public guidance and secure applicant account are available now. The complete evidence workflow is enabled separately when application services are ready."
          />
          <ol className={styles.steps}>
            {config.steps.map((step, index) => (
              <li key={step.title}>
                <span>{index + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className={styles.ctaPanel}>
            <div>
              <p className="eyebrow">Begin securely</p>
              <h2>{config.ctaTitle}</h2>
              <p>{config.ctaDescription}</p>
            </div>
            <Button to={config.applyTo} icon="arrowRight" size="large">
              {config.applyLabel}
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

export default JourneyPage;
