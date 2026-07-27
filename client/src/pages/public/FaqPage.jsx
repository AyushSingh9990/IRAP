import Accordion from '../../components/common/Accordion/Accordion.jsx';
import Button from '../../components/common/Button/Button.jsx';
import PageHero from '../../components/public/PageHero/PageHero.jsx';
import Seo from '../../components/seo/Seo.jsx';
import { faqItems } from '../../config/publicContent.js';
import styles from './FaqPage.module.css';

function FaqPage() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <Seo
        title="Frequently Asked Questions"
        description="Read clear answers about iRAP registration, professional approval, payments, documents, directories, certificates, roles, renewals, and credential status."
        path="/faq"
        structuredData={faqSchema}
      />
      <PageHero
        breadcrumbItems={[{ label: 'Home', to: '/' }, { label: 'Frequently asked questions' }]}
        eyebrow="Frequently asked questions"
        title="Clear answers before you create an applicant account"
        description="These answers describe the intended iRAP workflow and make the separation between registration, payment, review, approval, credentials, and public status explicit."
      />
      <section className="section">
        <div className={`container ${styles.content}`}>
          <Accordion items={faqItems} />
          <div className={styles.cta}>
            <h2>Ready to choose a journey?</h2>
            <p>Registration creates an applicant account only. Professional status follows the later evidence and review workflow.</p>
            <Button to="/register" icon="arrowRight">Create applicant account</Button>
          </div>
        </div>
      </section>
    </>
  );
}

export default FaqPage;
