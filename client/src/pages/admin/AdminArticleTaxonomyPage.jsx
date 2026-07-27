import { useEffect, useState } from 'react';
import {
  createArticleCategory,
  createArticleTag,
  getAdminArticleTaxonomy,
  updateArticleCategory,
  updateArticleTag,
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
import Textarea from '../../components/common/Textarea/Textarea.jsx';
import Seo from '../../components/seo/Seo.jsx';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './AdminArticleTaxonomyPage.module.css';

const emptyCategory = Object.freeze({
  id: '',
  name: '',
  description: '',
  status: 'active',
  seoTitle: '',
  seoDescription: '',
});

const emptyTag = Object.freeze({ id: '', name: '', status: 'active' });

function AdminArticleTaxonomyPage() {
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [tagForm, setTagForm] = useState(emptyTag);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const result = await getAdminArticleTaxonomy(true);
      setCategories(result.data.categories || []);
      setTags(result.data.tags || []);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveCategory(event) {
    event.preventDefault();
    setWorking('category');
    setError('');
    setMessage('');
    try {
      const payload = {
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim(),
        status: categoryForm.status,
        seoTitle: categoryForm.seoTitle.trim(),
        seoDescription: categoryForm.seoDescription.trim(),
      };
      const result = categoryForm.id
        ? await updateArticleCategory(categoryForm.id, payload)
        : await createArticleCategory(payload);
      setMessage(result.message);
      setCategoryForm(emptyCategory);
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setWorking('');
    }
  }

  async function saveTag(event) {
    event.preventDefault();
    setWorking('tag');
    setError('');
    setMessage('');
    try {
      const payload = {
        name: tagForm.name.trim(),
        status: tagForm.status,
      };
      const result = tagForm.id
        ? await updateArticleTag(tagForm.id, payload)
        : await createArticleTag(payload);
      setMessage(result.message);
      setTagForm(emptyTag);
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setWorking('');
    }
  }

  if (loading) {
    return <div className={styles.loading}><Loader label="Loading article taxonomy" size="large" /></div>;
  }

  return (
    <>
      <Seo title="Article Categories and Tags" description="Manage article taxonomy." noIndex />
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Content administration</p>
            <h1>Categories and tags</h1>
            <p>Control the approved classification options available to article authors.</p>
          </div>
          <Button to="/admin/articles" variant="secondary">Back to moderation</Button>
        </header>

        {message ? <Alert tone="success">{message}</Alert> : null}
        {error ? <Alert tone="error">{error}</Alert> : null}

        <div className={styles.columns}>
          <section className={styles.column}>
            <Card className={styles.formCard}>
              <h2>{categoryForm.id ? 'Edit category' : 'Create category'}</h2>
              <form className={styles.form} onSubmit={saveCategory}>
                <FormField label="Name" required>
                  <Input
                    minLength="2"
                    maxLength="120"
                    value={categoryForm.name}
                    onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))}
                  />
                </FormField>
                <FormField label="Description">
                  <Textarea
                    maxLength="1000"
                    rows="4"
                    value={categoryForm.description}
                    onChange={(event) => setCategoryForm((current) => ({ ...current, description: event.target.value }))}
                  />
                </FormField>
                <FormField label="SEO title">
                  <Input
                    maxLength="180"
                    value={categoryForm.seoTitle}
                    onChange={(event) => setCategoryForm((current) => ({ ...current, seoTitle: event.target.value }))}
                  />
                </FormField>
                <FormField label="SEO description">
                  <Textarea
                    maxLength="320"
                    rows="3"
                    value={categoryForm.seoDescription}
                    onChange={(event) => setCategoryForm((current) => ({ ...current, seoDescription: event.target.value }))}
                  />
                </FormField>
                <FormField label="Status">
                  <Select
                    value={categoryForm.status}
                    onChange={(event) => setCategoryForm((current) => ({ ...current, status: event.target.value }))}
                  >
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </Select>
                </FormField>
                <div className={styles.actions}>
                  <Button type="submit" isLoading={working === 'category'}>
                    {categoryForm.id ? 'Save category' : 'Create category'}
                  </Button>
                  {categoryForm.id ? (
                    <Button onClick={() => setCategoryForm(emptyCategory)} variant="secondary">Cancel</Button>
                  ) : null}
                </div>
              </form>
            </Card>

            <div className={styles.list}>
              {categories.length ? categories.map((category) => (
                <Card className={styles.item} key={category.id}>
                  <div className={styles.itemHeading}>
                    <div>
                      <h3>{category.name}</h3>
                      <code>{category.slug}</code>
                    </div>
                    <StatusBadge tone={category.status === 'active' ? 'success' : 'neutral'}>{category.status}</StatusBadge>
                  </div>
                  <p>{category.description || 'No description.'}</p>
                  <Button
                    onClick={() => setCategoryForm({
                      id: category.id,
                      name: category.name,
                      description: category.description || '',
                      status: category.status,
                      seoTitle: category.seoTitle || '',
                      seoDescription: category.seoDescription || '',
                    })}
                    variant="secondary"
                  >
                    Edit category
                  </Button>
                </Card>
              )) : (
                <EmptyState
                  title="No article categories configured"
                  description="Create the first category before authors submit articles for moderation."
                />
              )}
            </div>
          </section>

          <section className={styles.column}>
            <Card className={styles.formCard}>
              <h2>{tagForm.id ? 'Edit tag' : 'Create tag'}</h2>
              <form className={styles.form} onSubmit={saveTag}>
                <FormField label="Name" required>
                  <Input
                    minLength="2"
                    maxLength="80"
                    value={tagForm.name}
                    onChange={(event) => setTagForm((current) => ({ ...current, name: event.target.value }))}
                  />
                </FormField>
                <FormField label="Status">
                  <Select
                    value={tagForm.status}
                    onChange={(event) => setTagForm((current) => ({ ...current, status: event.target.value }))}
                  >
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </Select>
                </FormField>
                <div className={styles.actions}>
                  <Button type="submit" isLoading={working === 'tag'}>{tagForm.id ? 'Save tag' : 'Create tag'}</Button>
                  {tagForm.id ? <Button onClick={() => setTagForm(emptyTag)} variant="secondary">Cancel</Button> : null}
                </div>
              </form>
            </Card>

            <div className={styles.list}>
              {tags.length ? tags.map((tag) => (
                <Card className={styles.item} key={tag.id}>
                  <div className={styles.itemHeading}>
                    <div>
                      <h3>{tag.name}</h3>
                      <code>{tag.slug}</code>
                    </div>
                    <StatusBadge tone={tag.status === 'active' ? 'success' : 'neutral'}>{tag.status}</StatusBadge>
                  </div>
                  <Button
                    onClick={() => setTagForm({ id: tag.id, name: tag.name, status: tag.status })}
                    variant="secondary"
                  >
                    Edit tag
                  </Button>
                </Card>
              )) : (
                <EmptyState
                  title="No article tags configured"
                  description="Tags are optional. Create them when reusable article topics are needed."
                />
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

export default AdminArticleTaxonomyPage;
