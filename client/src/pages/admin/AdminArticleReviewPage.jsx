import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  approveArticle,
  archiveArticle,
  assignArticleModerator,
  getAdminArticle,
  listArticleModerators,
  publishArticle,
  rejectArticle,
  requestArticleChanges,
  restoreArticle,
} from '../../api/articleApi.js';
import ArticleContent from '../../components/article/ArticleContent/ArticleContent.jsx';
import Alert from '../../components/common/Alert/Alert.jsx';
import Button from '../../components/common/Button/Button.jsx';
import Card from '../../components/common/Card/Card.jsx';
import FormField from '../../components/common/FormField/FormField.jsx';
import Input from '../../components/common/Input/Input.jsx';
import Loader from '../../components/common/Loader/Loader.jsx';
import Select from '../../components/common/Select/Select.jsx';
import StatusBadge from '../../components/common/StatusBadge/StatusBadge.jsx';
import Textarea from '../../components/common/Textarea/Textarea.jsx';
import Seo from '../../components/seo/Seo.jsx';
import {
  articleStatusLabels,
  articleStatusTones,
  formatArticleDate,
} from '../../config/articleConfig.js';
import useAuth from '../../hooks/useAuth.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './AdminArticleReviewPage.module.css';

const emptyDecision = Object.freeze({
  authorVisibleNote: '',
  internalNote: '',
  reason: '',
  publishAt: '',
});

function AdminArticleReviewPage() {
  const { articleId } = useParams();
  const auth = useAuth();
  const canPublish = auth.hasPermission('article:publish');
  const [article, setArticle] = useState(null);
  const [history, setHistory] = useState([]);
  const [moderators, setModerators] = useState([]);
  const [moderatorId, setModeratorId] = useState('');
  const [decision, setDecision] = useState(emptyDecision);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const actions = useMemo(() => {
    if (!article) return [];
    if (['submitted', 'under_review'].includes(article.status)) {
      return [
        { key: 'requestChanges', label: 'Request changes', tone: 'secondary' },
        { key: 'approve', label: 'Approve', tone: 'primary' },
        { key: 'reject', label: 'Reject', tone: 'danger' },
      ];
    }
    if (article.status === 'approved' && canPublish) {
      return [
        { key: 'publish', label: 'Publish', tone: 'primary' },
        { key: 'archive', label: 'Archive', tone: 'danger' },
      ];
    }
    if (article.status === 'published' && canPublish) {
      return [{ key: 'archive', label: 'Archive', tone: 'danger' }];
    }
    if (article.status === 'rejected' && canPublish) {
      return [{ key: 'archive', label: 'Archive', tone: 'danger' }];
    }
    if (article.status === 'archived' && canPublish) {
      return [{ key: 'restore', label: 'Restore to approved', tone: 'secondary' }];
    }
    return [];
  }, [article, canPublish]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [articleResult, moderatorResult] = await Promise.all([
        getAdminArticle(articleId),
        listArticleModerators(),
      ]);
      const nextArticle = articleResult.data.article;
      setArticle(nextArticle);
      setHistory(articleResult.data.history || []);
      setModerators(moderatorResult.data.moderators || []);
      setModeratorId(nextArticle.assignedModerator?.id || '');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // articleId defines the moderation workspace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);

  async function saveAssignment() {
    setWorking('assignment');
    setError('');
    setMessage('');
    try {
      const result = await assignArticleModerator(articleId, moderatorId || null);
      setArticle(result.data.article);
      setMessage(result.message);
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setWorking('');
    }
  }

  async function runAction(key) {
    const labels = {
      requestChanges: 'request changes for',
      approve: 'approve',
      publish: 'publish',
      reject: 'reject',
      archive: 'archive',
      restore: 'restore',
    };
    if (!window.confirm(`Confirm that you want to ${labels[key]} “${article.title}”.`)) return;
    const services = {
      requestChanges: requestArticleChanges,
      approve: approveArticle,
      publish: publishArticle,
      reject: rejectArticle,
      archive: archiveArticle,
      restore: restoreArticle,
    };
    setWorking(key);
    setError('');
    setMessage('');
    try {
      const result = await services[key](articleId, decision);
      setArticle(result.data.article);
      setDecision(emptyDecision);
      setMessage(result.message);
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setWorking('');
    }
  }

  if (loading) return <div className={styles.loading}><Loader label="Loading moderation workspace" size="large" /></div>;
  if (!article) return <div className={styles.container}>{error ? <Alert tone="error">{error}</Alert> : null}</div>;

  return (
    <>
      <Seo title={`Review ${article.title}`} description="Moderate an article submission." noIndex />
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Article moderation workspace</p>
            <h1>{article.title}</h1>
            <p>{article.authorName} · {article.authorMembership?.registrationNumber}</p>
          </div>
          <div className={styles.headerActions}>
            <StatusBadge tone={articleStatusTones[article.status] || 'neutral'}>
              {articleStatusLabels[article.status] || article.status}
            </StatusBadge>
            <Button to="/admin/articles" variant="secondary">Back to queue</Button>
          </div>
        </header>

        {message ? <Alert tone="success">{message}</Alert> : null}
        {error ? <Alert tone="error">{error}</Alert> : null}

        <div className={styles.workspace}>
          <main className={styles.mainColumn}>
            <Card className={styles.articleCard}>
              {article.hasFeaturedImage ? (
                <img alt={article.featuredImageAltText || article.title} className={styles.image} src={article.featuredImageUrl} />
              ) : null}
              <div className={styles.meta}>
                <span>{article.categoryName || 'Uncategorised'}</span>
                <span>{article.wordCount || 0} words</span>
                <span>{article.readingMinutes || 0} min read</span>
              </div>
              <p className={styles.summary}>{article.summary}</p>
              <ArticleContent content={article.content} />
              {article.tagNames?.length ? (
                <div className={styles.tags}>{article.tagNames.map((tag) => <span key={tag}>{tag}</span>)}</div>
              ) : null}
            </Card>

            <Card className={styles.historyCard}>
              <h2>Moderation history</h2>
              {history.length ? (
                <ol className={styles.history}>
                  {history.map((entry) => (
                    <li key={entry.id}>
                      <strong>{articleStatusLabels[entry.newStatus] || entry.newStatus}</strong>
                      <span>{formatArticleDate(entry.createdAt)} · {entry.actor?.displayName || 'System'}</span>
                      {entry.authorVisibleNote ? <p><b>Author note:</b> {entry.authorVisibleNote}</p> : null}
                      {entry.internalNote ? <p><b>Internal note:</b> {entry.internalNote}</p> : null}
                    </li>
                  ))}
                </ol>
              ) : <p>No moderation activity has been recorded.</p>}
            </Card>
          </main>

          <aside className={styles.sideColumn}>
            <Card className={styles.panel}>
              <h2>Assignment</h2>
              <FormField label="Moderator">
                <Select value={moderatorId} onChange={(event) => setModeratorId(event.target.value)}>
                  <option value="">Unassigned</option>
                  {moderators.map((moderator) => (
                    <option key={moderator.id} value={moderator.id}>{moderator.displayName} · {moderator.email}</option>
                  ))}
                </Select>
              </FormField>
              <Button isLoading={working === 'assignment'} onClick={() => void saveAssignment()}>Save assignment</Button>
            </Card>

            <Card className={styles.panel}>
              <h2>Decision notes</h2>
              <FormField label="Author-visible note" hint="Required when requesting changes or rejecting.">
                <Textarea rows="5" maxLength="3000" value={decision.authorVisibleNote} onChange={(event) => setDecision((current) => ({ ...current, authorVisibleNote: event.target.value }))} />
              </FormField>
              <FormField label="Internal note">
                <Textarea rows="4" maxLength="3000" value={decision.internalNote} onChange={(event) => setDecision((current) => ({ ...current, internalNote: event.target.value }))} />
              </FormField>
              <FormField label="Reason">
                <Input maxLength="1000" value={decision.reason} onChange={(event) => setDecision((current) => ({ ...current, reason: event.target.value }))} />
              </FormField>
              {article.status === 'approved' && canPublish ? (
                <FormField label="Publish date and time" hint="Leave blank to publish immediately.">
                  <Input type="datetime-local" value={decision.publishAt} onChange={(event) => setDecision((current) => ({ ...current, publishAt: event.target.value }))} />
                </FormField>
              ) : null}
              <div className={styles.actions}>
                {actions.map((action) => (
                  <Button
                    isLoading={working === action.key}
                    key={action.key}
                    onClick={() => void runAction(action.key)}
                    variant={action.tone}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </>
  );
}

export default AdminArticleReviewPage;
