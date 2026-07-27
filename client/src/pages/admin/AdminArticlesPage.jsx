import { useEffect, useState } from 'react';
import { getArticleTaxonomy, listAdminArticles } from '../../api/articleApi.js';
import Alert from '../../components/common/Alert/Alert.jsx';
import Button from '../../components/common/Button/Button.jsx';
import Card from '../../components/common/Card/Card.jsx';
import EmptyState from '../../components/common/EmptyState/EmptyState.jsx';
import FormField from '../../components/common/FormField/FormField.jsx';
import Input from '../../components/common/Input/Input.jsx';
import Loader from '../../components/common/Loader/Loader.jsx';
import Select from '../../components/common/Select/Select.jsx';
import StatusBadge from '../../components/common/StatusBadge/StatusBadge.jsx';
import Seo from '../../components/seo/Seo.jsx';
import {
  articleStatusLabels,
  articleStatusTones,
  formatArticleDate,
} from '../../config/articleConfig.js';
import useAuth from '../../hooks/useAuth.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './AdminArticlesPage.module.css';

function AdminArticlesPage() {
  const auth = useAuth();
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1 });
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    category: '',
    assignment: 'all',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(nextFilters = filters, page = 1) {
    setLoading(true);
    setError('');
    try {
      const [queueResult, taxonomyResult] = await Promise.all([
        listAdminArticles({ ...nextFilters, page, limit: 20 }),
        getArticleTaxonomy(),
      ]);
      setArticles(queueResult.data.articles || []);
      setMeta(queueResult.meta || { total: 0, page: 1, pages: 1 });
      setCategories(taxonomyResult.data.categories || []);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // Initial load only; queue filters are applied explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Seo title="Article Moderation" description="Manage article submissions and publication." noIndex />
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Content administration</p>
            <h1>Article moderation</h1>
            <p>Review provider and organization submissions, request changes, approve, publish, reject, or archive articles.</p>
          </div>
          <div className={styles.headerActions}>
            {auth.hasPermission('article:taxonomy:manage') ? (
              <Button to="/admin/article-taxonomy" variant="secondary">Categories and tags</Button>
            ) : null}
            <Button to="/articles" variant="secondary">Public articles</Button>
          </div>
        </header>

        {error ? <Alert tone="error">{error}</Alert> : null}

        <Card>
          <form className={styles.filters} onSubmit={(event) => { event.preventDefault(); void load(filters, 1); }}>
            <FormField label="Search">
              <Input
                placeholder="Title, author, category, or tag"
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              />
            </FormField>
            <FormField label="Status">
              <Select
                value={filters.status}
                onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
              >
                <option value="">All statuses</option>
                {Object.entries(articleStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Category">
              <Select
                value={filters.category}
                onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.slug}>{category.name}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Assignment">
              <Select
                value={filters.assignment}
                onChange={(event) => setFilters((current) => ({ ...current, assignment: event.target.value }))}
              >
                <option value="all">All records</option>
                <option value="mine">Assigned to me</option>
                <option value="unassigned">Unassigned</option>
              </Select>
            </FormField>
            <Button type="submit">Apply filters</Button>
          </form>
        </Card>

        <div className={styles.listHeading}>
          <p className={styles.eyebrow}>Moderation records</p>
          <h2>{meta.total} article{meta.total === 1 ? '' : 's'}</h2>
        </div>

        {loading ? (
          <div className={styles.loading}><Loader label="Loading article queue" size="large" /></div>
        ) : articles.length === 0 ? (
          <EmptyState title="No article submissions found" description="No records currently match the selected moderation filters." />
        ) : (
          <div className={styles.grid}>
            {articles.map((article) => (
              <Card className={styles.articleCard} key={article.id}>
                <div className={styles.cardHeading}>
                  <div>
                    <p className={styles.reference}>{article.authorName}</p>
                    <h3>{article.title}</h3>
                  </div>
                  <StatusBadge tone={articleStatusTones[article.status] || 'neutral'}>
                    {articleStatusLabels[article.status] || article.status}
                  </StatusBadge>
                </div>
                <p>{article.summary || 'No summary added.'}</p>
                <dl>
                  <div><dt>Category</dt><dd>{article.categoryName || 'Not selected'}</dd></div>
                  <div><dt>Submitted</dt><dd>{formatArticleDate(article.submittedAt)}</dd></div>
                  <div><dt>Moderator</dt><dd>{article.assignedModerator?.displayName || 'Unassigned'}</dd></div>
                  <div><dt>Words</dt><dd>{article.wordCount || 0}</dd></div>
                  {article.isScheduled ? (
                    <div><dt>Scheduled</dt><dd>{formatArticleDate(article.publishedAt)}</dd></div>
                  ) : null}
                </dl>
                <Button to={`/admin/articles/${article.id}`}>Open moderation workspace</Button>
              </Card>
            ))}
          </div>
        )}

        {meta.pages > 1 ? (
          <nav aria-label="Article moderation pagination" className={styles.pagination}>
            <Button
              disabled={meta.page <= 1 || loading}
              onClick={() => void load(filters, meta.page - 1)}
              variant="secondary"
            >
              Previous
            </Button>
            <span>Page {meta.page} of {meta.pages}</span>
            <Button
              disabled={meta.page >= meta.pages || loading}
              onClick={() => void load(filters, meta.page + 1)}
              variant="secondary"
            >
              Next
            </Button>
          </nav>
        ) : null}
      </div>
    </>
  );
}

export default AdminArticlesPage;
