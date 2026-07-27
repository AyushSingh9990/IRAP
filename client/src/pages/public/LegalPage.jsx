import { useEffect, useMemo, useState } from 'react';
import { getPublicContentPage } from '../../api/siteApi.js';
import Alert from '../../components/common/Alert/Alert.jsx';
import Card from '../../components/common/Card/Card.jsx';
import PageHero from '../../components/public/PageHero/PageHero.jsx';
import Seo from '../../components/seo/Seo.jsx';
import styles from './LegalPage.module.css';

function LegalPage({ content }) {
  const [managedPage, setManagedPage] = useState(null);
  const slug = content.path.replace(/^\//, '');

  useEffect(() => {
    let active = true;
    getPublicContentPage(slug)
      .then((result) => { if (active) setManagedPage(result.data.page || null); })
      .catch(() => { if (active) setManagedPage(null); });
    return () => { active = false; };
  }, [slug]);

  const page = useMemo(() => {
    if (!managedPage) return null;
    return {
      title: managedPage.title,
      eyebrow: managedPage.eyebrow || content.eyebrow,
      description: managedPage.summary || managedPage.seoDescription || content.description,
      body: managedPage.body,
      sections: (managedPage.sections || [])
        .filter((section) => section.enabled)
        .sort((a, b) => a.order - b.order),
      seoTitle: managedPage.seoTitle || managedPage.title,
      seoDescription: managedPage.seoDescription || managedPage.summary || content.description,
    };
  }, [content, managedPage]);

  const title = page?.title || content.title;
  const description = page?.description || content.description;

  return (
    <>
      <Seo title={page?.seoTitle || title} description={page?.seoDescription || description} path={content.path} />
      <PageHero breadcrumbItems={[{ label: 'Home', to: '/' }, { label: title }]} eyebrow={page?.eyebrow || content.eyebrow} title={title} description={description} />
      <section className="section">
        <div className={`container ${styles.content}`}>
          {page ? (
            <>
              {page.body ? <Card className={styles.sectionCard} padding="large"><p className={styles.preserve}>{page.body}</p></Card> : null}
              {page.sections.map((section) => (
                <Card key={section.key} className={styles.sectionCard} padding="large">
                  {section.heading ? <h2>{section.heading}</h2> : null}
                  <p className={styles.preserve}>{section.body}</p>
                </Card>
              ))}
            </>
          ) : (
            <>
              <Alert title="Content status" tone="warning">{content.notice}</Alert>
              {content.sections.map((section) => (
                <Card key={section.title} className={styles.sectionCard} padding="large"><h2>{section.title}</h2><p>{section.body}</p></Card>
              ))}
            </>
          )}
        </div>
      </section>
    </>
  );
}

export default LegalPage;
