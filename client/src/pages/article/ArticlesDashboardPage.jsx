import { useEffect, useState } from 'react';
import {
  createArticle,
  deleteMyArticle,
  listArticleAuthorMemberships,
  listMyArticles,
} from '../../api/articleApi.js';
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
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './ArticlesDashboardPage.module.css';

function ArticlesDashboardPage() {
  const [memberships, setMemberships] = useState([]);
  const [articles, setArticles] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1 });
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [form, setForm] = useState({ authorMembershipId: '', title: '' });
  const [loading, setLoading] = useState(true);
  const [membershipRequestFailed, setMembershipRequestFailed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load(nextFilters = filters, page = 1) {
    setLoading(true);
    setError('');
    try {
      const [membershipResult, articleResult] = await Promise.allSettled([
        listArticleAuthorMemberships(),
        listMyArticles({ ...nextFilters, page, limit: 20 }),
      ]);

      const requestErrors = [];

      if (membershipResult.status === 'fulfilled') {
        const nextMemberships = membershipResult.value.data.memberships || [];
        setMembershipRequestFailed(false);
        setMemberships(nextMemberships);
        setForm((current) => ({
          ...current,
          authorMembershipId:
            current.authorMembershipId || nextMemberships[0]?.id || '',
        }));
      } else {
        setMembershipRequestFailed(true);
        requestErrors.push(getApiErrorMessage(membershipResult.reason));
      }

      if (articleResult.status === 'fulfilled') {
        setArticles(articleResult.value.data.articles || []);
        setMeta(
          articleResult.value.meta || { total: 0, page: 1, pages: 1 },
        );
      } else {
        requestErrors.push(getApiErrorMessage(articleResult.reason));
      }

      if (requestErrors.length) {
        setError([...new Set(requestErrors)].join(' '));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // Initial load only; filters are submitted explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createDraft(event) {
    event.preventDefault();
    setCreating(true);
    setError('');
    setMessage('');
    try {
      const result = await createArticle({
        authorMembershipId: form.authorMembershipId,
        title: form.title.trim(),
      });
      await load(filters, 1);
      setForm((current) => ({ ...current, title: '' }));
      setMessage(result.message);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setCreating(false);
    }
  }

  async function removeDraft(article) {
    if (!window.confirm(`Delete the draft “${article.title}”? This cannot be undone.`)) return;
    setError('');
    setMessage('');
    try {
      const result = await deleteMyArticle(article.id);
      await load(filters, meta.page);
      setMessage(result.message);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }

  return (
    <>
      <Seo title="Article Workspace" description="Create and manage article submissions." noIndex />
      <section className="section">
        <div className={`container ${styles.container}`}>
          <header className={styles.header}>
            <div>
              <p className={styles.eyebrow}>Content workspace</p>
              <h1>Articles</h1>
              <p>Create drafts, submit articles for moderation, and track publication status.</p>
            </div>
            <Button to="/articles" variant="secondary">Published articles</Button>
          </header>

          {message ? <Alert tone="success">{message}</Alert> : null}
          {error ? <Alert tone="error">{error}</Alert> : null}

          {memberships.length ? (
            <Card className={styles.createCard}>
              <h2>Start an article draft</h2>
              <form className={styles.createForm} onSubmit={createDraft}>
                <FormField label="Approved author record" required>
                  <Select
                    value={form.authorMembershipId}
                    onChange={(event) => setForm((current) => ({ ...current, authorMembershipId: event.target.value }))}
                  >
                    {memberships.map((membership) => (
                      <option key={membership.id} value={membership.id}>
                        {membership.approvedName} · {membership.registrationNumber}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Working title" required>
                  <Input
                    minLength="3"
                    maxLength="240"
                    value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  />
                </FormField>
                <Button type="submit" isLoading={creating}>Create draft</Button>
              </form>
            </Card>
          ) : membershipRequestFailed ? null : (
            <Alert tone="warning">
              An active training-provider or organization accreditation is required before submitting articles.
            </Alert>
          )}

          <Card>
            <form className={styles.filters} onSubmit={(event) => { event.preventDefault(); void load(filters, 1); }}>
              <FormField label="Search">
                <Input
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
              <Button type="submit" variant="secondary">Apply</Button>
            </form>
          </Card>

          <div className={styles.listHeading}>
            <div>
              <p className={styles.eyebrow}>Submission records</p>
              <h2>Your articles ({meta.total})</h2>
            </div>
          </div>

          {loading ? (
            <div className={styles.loading}><Loader label="Loading articles" size="large" /></div>
          ) : articles.length === 0 ? (
            <EmptyState title="No article records found" description="Create a draft or change the selected filters." />
          ) : (
            <div className={styles.grid}>
              {articles.map((article) => (
                <Card className={styles.articleCard} key={article.id}>
                  <div className={styles.cardHeading}>
                    <div>
                      <p className={styles.reference}>{article.categoryName || 'Uncategorised draft'}</p>
                      <h3>{article.title}</h3>
                    </div>
                    <StatusBadge tone={articleStatusTones[article.status] || 'neutral'}>
                      {articleStatusLabels[article.status] || article.status}
                    </StatusBadge>
                  </div>
                  <p>{article.summary || 'No summary has been added yet.'}</p>
                  <dl>
                    <div><dt>Updated</dt><dd>{formatArticleDate(article.updatedAt)}</dd></div>
                    <div><dt>Reading time</dt><dd>{article.readingMinutes || 0} minutes</dd></div>
                  </dl>
                  {article.latestAuthorVisibleNote ? (
                    <Alert tone="warning">{article.latestAuthorVisibleNote}</Alert>
                  ) : null}
                  {article.isScheduled ? (
                    <Alert tone="info">
                      Scheduled for publication on {formatArticleDate(article.publishedAt)}.
                    </Alert>
                  ) : null}
                  <div className={styles.actions}>
                    <Button to={`/dashboard/articles/${article.id}`}>Open article</Button>
                    {article.status === 'draft' ? (
                      <Button onClick={() => void removeDraft(article)} variant="danger">Delete draft</Button>
                    ) : null}
                    {article.isPubliclyAvailable && article.canonicalPath ? (
                      <Button to={article.canonicalPath} variant="secondary">View published</Button>
                    ) : null}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {meta.pages > 1 ? (
            <nav aria-label="Article workspace pagination" className={styles.pagination}>
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
      </section>
    </>
  );
}

export default ArticlesDashboardPage;
