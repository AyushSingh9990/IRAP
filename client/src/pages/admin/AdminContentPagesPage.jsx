import { useCallback, useEffect, useState } from 'react';
import { createContentPage, listContentPages, updateContentPage } from '../../api/adminApi.js';
import Alert from '../../components/common/Alert/Alert.jsx';
import Button from '../../components/common/Button/Button.jsx';
import Card from '../../components/common/Card/Card.jsx';
import EmptyState from '../../components/common/EmptyState/EmptyState.jsx';
import FormField from '../../components/common/FormField/FormField.jsx';
import Input from '../../components/common/Input/Input.jsx';
import Loader from '../../components/common/Loader/Loader.jsx';
import Select from '../../components/common/Select/Select.jsx';
import Textarea from '../../components/common/Textarea/Textarea.jsx';
import Seo from '../../components/seo/Seo.jsx';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './AdminAdministration.module.css';

const emptyForm = { slug: '', title: '', eyebrow: '', summary: '', body: '', sectionsText: '[]', seoTitle: '', seoDescription: '', status: 'draft' };

function fromPage(page) { return { ...page, sectionsText: JSON.stringify(page.sections || [], null, 2) }; }

function AdminContentPagesPage() {
  const [items, setItems] = useState([]); const [selectedId, setSelectedId] = useState(''); const [form, setForm] = useState(emptyForm);
  const [filters, setFilters] = useState({ search: '', status: '' }); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { const result = await listContentPages(filters); setItems(result.data.items || []); } catch (e) { setError(getApiErrorMessage(e)); } finally { setLoading(false); } }, [filters]);
  useEffect(() => { void load(); }, [load]);
  function choose(item) { setSelectedId(item.id); setForm(fromPage(item)); setMessage(''); }
  function startNew() { setSelectedId(''); setForm(emptyForm); setMessage(''); }
  async function save(event) { event.preventDefault(); setSaving(true); setError(''); setMessage(''); try { const payload = { ...form, sections: JSON.parse(form.sectionsText || '[]') }; delete payload.sectionsText; const result = selectedId ? await updateContentPage(selectedId, payload) : await createContentPage(payload); setMessage(result.message); await load(); choose(result.data.page); } catch (e) { setError(getApiErrorMessage(e)); } finally { setSaving(false); } }
  return <><Seo title="Content Pages" description="Manage homepage, footer and legal page content." noIndex /><section className="section"><div className={`container ${styles.container}`}>
    <header className={styles.header}><div><p className={styles.eyebrow}>Content administration</p><h1>Homepage and legal content</h1><p>Publish editable page records without replacing source code. Public routes use published records when available and retain safe built-in fallbacks otherwise.</p></div><Button onClick={startNew}>New page</Button></header>
    {message ? <Alert tone="success">{message}</Alert> : null}{error ? <Alert tone="error">{error}</Alert> : null}
    <div className={styles.toolbar}><FormField label="Search"><Input value={filters.search} onChange={(e) => setFilters((c) => ({ ...c, search: e.target.value }))} /></FormField><FormField label="Status"><Select value={filters.status} onChange={(e) => setFilters((c) => ({ ...c, status: e.target.value }))}><option value="">All statuses</option><option>draft</option><option>published</option><option>archived</option></Select></FormField><Button variant="secondary" onClick={() => void load()}>Refresh</Button></div>
    {loading ? <div className={styles.loading}><Loader label="Loading content pages" size="large" /></div> : <div className={styles.workspace}><div className={styles.list}>{items.length ? items.map((item) => <button type="button" key={item.id} onClick={() => choose(item)} className={`${styles.listButton} ${selectedId === item.id ? styles.listButtonActive : ''}`}><strong>{item.title}</strong><span>/{item.slug}</span><small>{item.status}</small></button>) : <EmptyState title="No content pages" description="Create the first administrator-managed page record." />}</div>
      <Card><form className={styles.form} onSubmit={save}><h2 className={styles.sectionTitle}>{selectedId ? 'Edit content page' : 'Create content page'}</h2><div className={styles.formGrid}><FormField label="Slug"><Input required value={form.slug} onChange={(e) => setForm((c) => ({ ...c, slug: e.target.value.toLowerCase() }))} placeholder="privacy-policy" /></FormField><FormField label="Status"><Select value={form.status} onChange={(e) => setForm((c) => ({ ...c, status: e.target.value }))}><option>draft</option><option>published</option><option>archived</option></Select></FormField><FormField label="Title"><Input required value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} /></FormField><FormField label="Eyebrow"><Input value={form.eyebrow} onChange={(e) => setForm((c) => ({ ...c, eyebrow: e.target.value }))} /></FormField></div><FormField label="Summary"><Textarea rows={3} value={form.summary} onChange={(e) => setForm((c) => ({ ...c, summary: e.target.value }))} /></FormField><FormField label="Page body — plain text"><Textarea rows={10} value={form.body} onChange={(e) => setForm((c) => ({ ...c, body: e.target.value }))} /></FormField><FormField label="Structured sections — JSON array"><Textarea rows={10} value={form.sectionsText} onChange={(e) => setForm((c) => ({ ...c, sectionsText: e.target.value }))} /></FormField><div className={styles.formGrid}><FormField label="SEO title"><Input value={form.seoTitle} maxLength={70} onChange={(e) => setForm((c) => ({ ...c, seoTitle: e.target.value }))} /></FormField><FormField label="SEO description"><Textarea rows={3} value={form.seoDescription} maxLength={180} onChange={(e) => setForm((c) => ({ ...c, seoDescription: e.target.value }))} /></FormField></div><div className={styles.formActions}><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save page'}</Button><Button type="button" variant="secondary" onClick={startNew}>Clear</Button></div></form></Card>
    </div>}
  </div></section></>;
}
export default AdminContentPagesPage;
