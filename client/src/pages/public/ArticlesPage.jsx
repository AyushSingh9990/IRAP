import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getArticleTaxonomy,
  listPublishedArticles,
} from '../../api/articleApi.js';
import ArticleCard from '../../components/article/ArticleCard/ArticleCard.jsx';
import Alert from '../../components/common/Alert/Alert.jsx';
import Button from '../../components/common/Button/Button.jsx';
import EmptyState from '../../components/common/EmptyState/EmptyState.jsx';
import FormField from '../../components/common/FormField/FormField.jsx';
import Input from '../../components/common/Input/Input.jsx';
import Loader from '../../components/common/Loader/Loader.jsx';
import Select from '../../components/common/Select/Select.jsx';
import Seo from '../../components/seo/Seo.jsx';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './ArticlesPage.module.css';

function ArticlesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [articles, setArticles] = useState([]);
  const [taxonomy, setTaxonomy] = useState({ categories: [], tags: [] });
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    tag: searchParams.get('tag') || '',
    sort: searchParams.get('sort') || 'latest',
  });

  async function load(nextFilters = filters, page = Number(searchParams.get('page') || 1)) {
    setLoading(true);
    setError('');
    try {
      const [articleResult, taxonomyResult] = await Promise.all([
        listPublishedArticles({ ...nextFilters, page, limit: 12 }),
        getArticleTaxonomy(),
      ]);
      setArticles(articleResult.data.articles || []);
      setMeta(articleResult.meta || { page: 1, pages: 1, total: 0 });
      setTaxonomy(taxonomyResult.data || { categories: [], tags: [] });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const nextFilters = {
      search: searchParams.get('search') || '',
      category: searchParams.get('category') || '',
      tag: searchParams.get('tag') || '',
      sort: searchParams.get('sort') || 'latest',
    };
    setFilters(nextFilters);
    void load(nextFilters, Number(searchParams.get('page') || 1));
    // The URL is the source of truth for shareable article filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function applyFilters(event) {
    event.preventDefault();
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value) next.set(key, value);
    }
    next.set('page', '1');
    setSearchParams(next);
  }

  function changePage(page) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(page));
    setSearchParams(next);
  }

  return (
    <>
      <Seo
        title="Articles"
        description="Read approved articles published by accredited iRAP training providers and organizations."
        path="/articles"
      />

      <section className={styles.hero}>
        <div className="container">
          <p className={styles.eyebrow}>Approved knowledge library</p>
          <h1>Articles</h1>
          <p>
            Evidence-led articles submitted by approved training providers and
            accredited organizations, reviewed before publication.
          </p>
        </div>
      </section>

      <section className="section">
        <div className={`container ${styles.container}`}>
          <form aria-label="Article filters" className={styles.filters} onSubmit={applyFilters}>
            <FormField label="Search articles">
              <Input
                placeholder="Title, author, category, or keyword"
                value={filters.search}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, search: event.target.value }))
                }
              />
            </FormField>

            <FormField label="Category">
              <Select
                value={filters.category}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, category: event.target.value }))
                }
              >
                <option value="">All categories</option>
                {taxonomy.categories.map((category) => (
                  <option key={category.id} value={category.slug}>
                    {category.name} ({category.articleCount || 0})
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Tag">
              <Select
                value={filters.tag}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, tag: event.target.value }))
                }
              >
                <option value="">All tags</option>
                {taxonomy.tags.map((tag) => (
                  <option key={tag.id} value={tag.slug}>
                    {tag.name} ({tag.articleCount || 0})
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Sort">
              <Select
                value={filters.sort}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, sort: event.target.value }))
                }
              >
                <option value="latest">Latest first</option>
                <option value="oldest">Oldest first</option>
                <option value="title">Title A–Z</option>
              </Select>
            </FormField>

            <Button type="submit">Apply filters</Button>
          </form>

          {error ? <Alert tone="error">{error}</Alert> : null}

          <div className={styles.heading}>
            <div>
              <p className={styles.eyebrow}>Published records</p>
              <h2>{meta.total} article{meta.total === 1 ? '' : 's'}</h2>
            </div>
          </div>

          {loading ? (
            <div className={styles.loading}>
              <Loader label="Loading articles" size="large" />
            </div>
          ) : articles.length === 0 ? (
            <EmptyState
              title="No published articles found"
              description="No approved articles currently match the selected filters."
            />
          ) : (
            <div className={styles.grid}>
              {articles.map((article) => (
                <ArticleCard article={article} key={article.id} />
              ))}
            </div>
          )}

          {meta.pages > 1 ? (
            <nav aria-label="Article pagination" className={styles.pagination}>
              <Button
                disabled={meta.page <= 1}
                onClick={() => changePage(meta.page - 1)}
                variant="secondary"
              >
                Previous
              </Button>
              <span>
                Page {meta.page} of {meta.pages}
              </span>
              <Button
                disabled={meta.page >= meta.pages}
                onClick={() => changePage(meta.page + 1)}
                variant="secondary"
              >
                Next
              </Button>
            </nav>
          ) : null}
        </div>
      </section>
    </>
  );
}

export default ArticlesPage;
