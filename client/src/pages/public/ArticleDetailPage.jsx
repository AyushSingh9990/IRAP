import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPublishedArticle } from '../../api/articleApi.js';
import ArticleCard from '../../components/article/ArticleCard/ArticleCard.jsx';
import ArticleContent from '../../components/article/ArticleContent/ArticleContent.jsx';
import Alert from '../../components/common/Alert/Alert.jsx';
import Button from '../../components/common/Button/Button.jsx';
import Loader from '../../components/common/Loader/Loader.jsx';
import Seo from '../../components/seo/Seo.jsx';
import { formatArticleDate } from '../../config/articleConfig.js';
import { siteConfig } from '../../config/siteConfig.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './ArticleDetailPage.module.css';

function ArticleDetailPage() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const result = await getPublishedArticle(slug);
        if (active) {
          setArticle(result.data.article);
          setRelatedArticles(result.data.relatedArticles || []);
        }
      } catch (requestError) {
        if (active) setError(getApiErrorMessage(requestError));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className={styles.loading}>
        <Loader label="Loading article" size="large" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <section className="section">
        <div className="container">
          <Alert tone="error">{error || 'Published article not found.'}</Alert>
          <Button to="/articles" variant="secondary">Back to articles</Button>
        </div>
      </section>
    );
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.seoDescription || article.summary,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    mainEntityOfPage: new URL(article.canonicalPath, siteConfig.siteUrl).toString(),
    author: {
      '@type': 'Organization',
      name: article.authorName,
      url: new URL(article.authorPath, siteConfig.siteUrl).toString(),
    },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.siteUrl,
    },
    ...(article.hasFeaturedImage ? { image: [article.featuredImageUrl] } : {}),
  };

  return (
    <>
      <Seo
        author={article.authorName}
        description={article.seoDescription || article.summary}
        image={article.featuredImageUrl}
        modifiedTime={article.updatedAt}
        path={article.canonicalPath}
        publishedTime={article.publishedAt}
        structuredData={structuredData}
        title={article.seoTitle || article.title}
        type="article"
      />

      <article>
        <header className={styles.hero}>
          <div className={`container ${styles.heroInner}`}>
            <Link className={styles.backLink} to="/articles">Articles</Link>
            <p className={styles.category}>{article.categoryName}</p>
            <h1>{article.title}</h1>
            <p className={styles.summary}>{article.summary}</p>
            <div className={styles.meta}>
              <Link to={article.authorPath}>{article.authorName}</Link>
              <span>{formatArticleDate(article.publishedAt)}</span>
              <span>{article.readingMinutes || 1} min read</span>
            </div>
          </div>
        </header>

        <section className="section">
          <div className={`container ${styles.articleLayout}`}>
            {article.hasFeaturedImage ? (
              <img
                alt={article.featuredImageAltText || article.title}
                className={styles.image}
                height="720"
                src={article.featuredImageUrl}
                width="1280"
              />
            ) : null}

            <div className={styles.contentColumn}>
              <ArticleContent content={article.content} />

              {article.tagNames?.length ? (
                <div className={styles.tags} aria-label="Article tags">
                  {article.tagNames.map((tag, index) => (
                    <Link
                      key={article.tagSlugs[index] || tag}
                      to={`/articles?tag=${encodeURIComponent(article.tagSlugs[index] || '')}`}
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              ) : null}

              <aside className={styles.authorCard}>
                <p className={styles.category}>Published by</p>
                <h2>{article.authorName}</h2>
                <p>
                  This author holds an approved iRAP training-provider or
                  organization accreditation.
                </p>
                <Button to={article.authorPath} variant="secondary">
                  View author articles
                </Button>
              </aside>
            </div>
          </div>
        </section>

        {relatedArticles.length ? (
          <section className={`${styles.relatedSection} section`} aria-labelledby="related-articles-title">
            <div className={`container ${styles.relatedContainer}`}>
              <div>
                <p className={styles.category}>Continue reading</p>
                <h2 id="related-articles-title">Related articles</h2>
              </div>
              <div className={styles.relatedGrid}>
                {relatedArticles.map((relatedArticle) => (
                  <ArticleCard article={relatedArticle} key={relatedArticle.id} />
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </article>
    </>
  );
}

export default ArticleDetailPage;
