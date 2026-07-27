import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getPublishedAuthor } from '../../api/articleApi.js';
import ArticleCard from '../../components/article/ArticleCard/ArticleCard.jsx';
import Alert from '../../components/common/Alert/Alert.jsx';
import Button from '../../components/common/Button/Button.jsx';
import Loader from '../../components/common/Loader/Loader.jsx';
import Seo from '../../components/seo/Seo.jsx';
import { articleAuthorTypeLabels } from '../../config/articleConfig.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './ArticleAuthorPage.module.css';

function ArticleAuthorPage() {
  const { authorSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [author, setAuthor] = useState(null);
  const [articles, setArticles] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const result = await getPublishedAuthor(authorSlug, {
          page: Number(searchParams.get('page') || 1),
          limit: 12,
        });
        if (active) {
          setAuthor(result.data.author);
          setArticles(result.data.articles || []);
          setMeta(result.meta || { page: 1, pages: 1, total: 0 });
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
  }, [authorSlug, searchParams]);

  function changePage(page) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(page));
    setSearchParams(next);
  }

  if (loading) {
    return <div className={styles.loading}><Loader label="Loading author articles" size="large" /></div>;
  }

  if (error || !author) {
    return (
      <section className="section">
        <div className="container">
          <Alert tone="error">{error || 'Published author not found.'}</Alert>
          <Button to="/articles" variant="secondary">Back to articles</Button>
        </div>
      </section>
    );
  }

  return (
    <>
      <Seo
        title={`${author.name} Articles`}
        description={`Published iRAP articles by ${author.name}.`}
        path={`/articles/author/${author.slug}`}
      />
      <section className={styles.hero}>
        <div className="container">
          <p className={styles.eyebrow}>{articleAuthorTypeLabels[author.type] || 'Approved author'}</p>
          <h1>{author.name}</h1>
          <p>{meta.total} published article{meta.total === 1 ? '' : 's'}.</p>
        </div>
      </section>
      <section className="section">
        <div className={`container ${styles.container}`}>
          <Button to="/articles" variant="secondary">All articles</Button>
          <div className={styles.grid}>
            {articles.map((article) => <ArticleCard article={article} key={article.id} />)}
          </div>
          {meta.pages > 1 ? (
            <nav aria-label="Author article pagination" className={styles.pagination}>
              <Button disabled={meta.page <= 1} onClick={() => changePage(meta.page - 1)} variant="secondary">Previous</Button>
              <span>Page {meta.page} of {meta.pages}</span>
              <Button disabled={meta.page >= meta.pages} onClick={() => changePage(meta.page + 1)} variant="secondary">Next</Button>
            </nav>
          ) : null}
        </div>
      </section>
    </>
  );
}

export default ArticleAuthorPage;
