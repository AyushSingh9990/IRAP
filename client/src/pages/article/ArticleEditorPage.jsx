import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getArticleTaxonomy,
  getMyArticle,
  getMyArticleImage,
  removeMyArticleImage,
  saveMyArticle,
  submitMyArticle,
  uploadMyArticleImage,
} from '../../api/articleApi.js';
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
  editableArticleStatuses,
  formatArticleDate,
} from '../../config/articleConfig.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './ArticleEditorPage.module.css';

const emptyForm = Object.freeze({
  title: '',
  summary: '',
  content: '',
  categoryId: '',
  tagIds: [],
  seoTitle: '',
  seoDescription: '',
  imageAltText: '',
  declarationAccepted: false,
});

function formFromArticle(article) {
  return {
    title: article.title || '',
    summary: article.summary || '',
    content: article.content || '',
    categoryId: article.category || '',
    tagIds: article.tags || [],
    seoTitle: article.seoTitle || '',
    seoDescription: article.seoDescription || '',
    imageAltText: article.featuredImage?.altText || '',
    declarationAccepted: Boolean(article.declarationAccepted),
  };
}

function ArticleEditorPage() {
  const { articleId } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [history, setHistory] = useState([]);
  const [taxonomy, setTaxonomy] = useState({ categories: [], tags: [] });
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const editable = useMemo(
    () => editableArticleStatuses.includes(article?.status),
    [article?.status],
  );

  async function refresh() {
    const [articleResult, taxonomyResult] = await Promise.all([
      getMyArticle(articleId),
      getArticleTaxonomy(),
    ]);
    const nextArticle = articleResult.data.article;
    setArticle(nextArticle);
    setHistory(articleResult.data.history || []);
    setTaxonomy(taxonomyResult.data || { categories: [], tags: [] });
    setForm(formFromArticle(nextArticle));
    return nextArticle;
  }

  useEffect(() => {
    let active = true;
    let objectUrl = '';
    async function load() {
      setLoading(true);
      setError('');
      try {
        const nextArticle = await refresh();
        if (active && nextArticle.hasFeaturedImage) {
          const blob = await getMyArticleImage(articleId);
          objectUrl = URL.createObjectURL(blob);
          setImagePreview(objectUrl);
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
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // articleId identifies the complete workspace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);

  function toggleTag(tagId) {
    setForm((current) => ({
      ...current,
      tagIds: current.tagIds.includes(tagId)
        ? current.tagIds.filter((value) => value !== tagId)
        : [...current.tagIds, tagId],
    }));
  }

  function payload() {
    return {
      title: form.title.trim(),
      summary: form.summary.trim(),
      content: form.content.trim(),
      categoryId: form.categoryId || null,
      tagIds: form.tagIds,
      seoTitle: form.seoTitle.trim(),
      seoDescription: form.seoDescription.trim(),
      imageAltText: form.imageAltText.trim(),
      declarationAccepted: form.declarationAccepted,
    };
  }

  async function save(event) {
    event?.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const result = await saveMyArticle(articleId, payload());
      setArticle(result.data.article);
      setForm(formFromArticle(result.data.article));
      setMessage(result.message);
      return true;
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function uploadImage(event) {
    event.preventDefault();
    if (!imageFile) {
      setError('Select a JPG, JPEG, PNG, or WEBP image.');
      return;
    }
    setUploading(true);
    setError('');
    setMessage('');
    try {
      const result = await uploadMyArticleImage(
        articleId,
        imageFile,
        form.imageAltText.trim(),
      );
      setArticle(result.data.article);
      setImageFile(null);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      const blob = await getMyArticleImage(articleId);
      setImagePreview(URL.createObjectURL(blob));
      setMessage(result.message);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setUploading(false);
    }
  }

  async function removeImage() {
    if (!window.confirm('Remove the featured image from this article?')) return;
    setError('');
    setMessage('');
    try {
      const result = await removeMyArticleImage(articleId);
      setArticle(result.data.article);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview('');
      setMessage(result.message);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }

  async function submit() {
    if (!window.confirm('Submit this article for moderation? Editing will be locked until changes are requested.')) return;
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      const saved = await save();
      if (!saved) return;
      const result = await submitMyArticle(articleId);
      setArticle(result.data.article);
      setMessage(result.message);
      await refresh();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className={styles.loading}><Loader label="Loading article editor" size="large" /></div>;
  }

  if (error && !article) {
    return (
      <section className="section">
        <div className="container"><Alert tone="error">{error}</Alert></div>
      </section>
    );
  }

  return (
    <>
      <Seo title={article?.title || 'Article Editor'} description="Edit an article submission." noIndex />
      <section className="section">
        <div className={`container ${styles.container}`}>
          <header className={styles.header}>
            <div>
              <p className={styles.eyebrow}>Article submission</p>
              <h1>{article.title}</h1>
              <p>{article.authorName}</p>
            </div>
            <div className={styles.headerActions}>
              <StatusBadge tone={articleStatusTones[article.status] || 'neutral'}>
                {articleStatusLabels[article.status] || article.status}
              </StatusBadge>
              <Button onClick={() => navigate('/dashboard/articles')} variant="secondary">Back</Button>
            </div>
          </header>

          {message ? <Alert tone="success">{message}</Alert> : null}
          {error ? <Alert tone="error">{error}</Alert> : null}
          {article.latestAuthorVisibleNote ? (
            <Alert tone="warning">{article.latestAuthorVisibleNote}</Alert>
          ) : null}

          <div className={styles.editorGrid}>
            <div className={styles.mainColumn}>
              <Card className={styles.formCard}>
                <h2>Article content</h2>
                <FormField label="Title" required>
                  <Input
                    disabled={!editable}
                    maxLength="240"
                    minLength="3"
                    value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  />
                </FormField>
                <FormField label="Summary" hint="At least 40 characters are required for submission." required>
                  <Textarea
                    disabled={!editable}
                    maxLength="600"
                    rows="4"
                    value={form.summary}
                    onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
                  />
                </FormField>
                <FormField label="Article content" hint="Plain text is stored and rendered safely. Separate paragraphs with a blank line." required>
                  <Textarea
                    disabled={!editable}
                    maxLength="120000"
                    rows="22"
                    value={form.content}
                    onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                  />
                </FormField>
              </Card>

              <Card className={styles.formCard}>
                <h2>Search metadata</h2>
                <FormField label="SEO title" hint="Leave blank to use the article title.">
                  <Input
                    disabled={!editable}
                    maxLength="180"
                    value={form.seoTitle}
                    onChange={(event) => setForm((current) => ({ ...current, seoTitle: event.target.value }))}
                  />
                </FormField>
                <FormField label="SEO description" hint="Leave blank to use the article summary.">
                  <Textarea
                    disabled={!editable}
                    maxLength="320"
                    rows="4"
                    value={form.seoDescription}
                    onChange={(event) => setForm((current) => ({ ...current, seoDescription: event.target.value }))}
                  />
                </FormField>
              </Card>
            </div>

            <aside className={styles.sideColumn}>
              <Card className={styles.formCard}>
                <h2>Classification</h2>
                <FormField label="Category" required>
                  <Select
                    disabled={!editable}
                    value={form.categoryId}
                    onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
                  >
                    <option value="">Select category</option>
                    {taxonomy.categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </Select>
                </FormField>
                <fieldset className={styles.tagFieldset} disabled={!editable}>
                  <legend>Tags</legend>
                  {taxonomy.tags.length ? taxonomy.tags.map((tag) => (
                    <label key={tag.id}>
                      <input
                        checked={form.tagIds.includes(tag.id)}
                        onChange={() => toggleTag(tag.id)}
                        type="checkbox"
                      />
                      <span>{tag.name}</span>
                    </label>
                  )) : <p>No active tags are configured.</p>}
                </fieldset>
              </Card>

              <Card className={styles.formCard}>
                <h2>Featured image</h2>
                {imagePreview ? (
                  <img alt={form.imageAltText || article.title} className={styles.preview} src={imagePreview} />
                ) : <p className={styles.muted}>No featured image uploaded.</p>}
                <FormField label="Image alternative text">
                  <Input
                    disabled={!editable}
                    maxLength="240"
                    value={form.imageAltText}
                    onChange={(event) => setForm((current) => ({ ...current, imageAltText: event.target.value }))}
                  />
                </FormField>
                {editable ? (
                  <form className={styles.imageForm} onSubmit={uploadImage}>
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) => setImageFile(event.target.files?.[0] || null)}
                      type="file"
                    />
                    <Button type="submit" isLoading={uploading}>Upload image</Button>
                    {article.hasFeaturedImage ? (
                      <Button onClick={() => void removeImage()} variant="danger">Remove image</Button>
                    ) : null}
                  </form>
                ) : null}
              </Card>

              <Card className={styles.formCard}>
                <h2>Declaration</h2>
                <label className={styles.declaration}>
                  <input
                    checked={form.declarationAccepted}
                    disabled={!editable}
                    onChange={(event) => setForm((current) => ({ ...current, declarationAccepted: event.target.checked }))}
                    type="checkbox"
                  />
                  <span>I confirm that this content is accurate, original or lawfully used, and suitable for moderation and publication.</span>
                </label>
                {editable ? (
                  <div className={styles.actions}>
                    <Button isLoading={saving} onClick={() => void save()}>Save article</Button>
                    <Button disabled={saving} isLoading={submitting} onClick={() => void submit()} variant="secondary">Submit for moderation</Button>
                  </div>
                ) : null}
              </Card>
            </aside>
          </div>

          <Card className={styles.historyCard}>
            <h2>Moderation history</h2>
            {history.length ? (
              <ol className={styles.history}>
                {history.map((entry) => (
                  <li key={entry.id}>
                    <div>
                      <strong>{articleStatusLabels[entry.newStatus] || entry.newStatus}</strong>
                      <span>{formatArticleDate(entry.createdAt)} · {entry.actor?.displayName || 'System'}</span>
                    </div>
                    {entry.authorVisibleNote ? <p>{entry.authorVisibleNote}</p> : null}
                  </li>
                ))}
              </ol>
            ) : <p className={styles.muted}>No moderation activity has been recorded.</p>}
          </Card>
        </div>
      </section>
    </>
  );
}

export default ArticleEditorPage;
