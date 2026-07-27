import { useCallback, useEffect, useMemo, useState } from 'react';
import { listSiteSettings, saveSiteSetting } from '../../api/adminApi.js';
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

const groups = ['general', 'contact', 'social', 'seo', 'homepage', 'footer', 'renewal', 'payment'];
const valueTypes = ['string', 'number', 'boolean', 'string_array', 'json'];

const emptyForm = {
  key: '', group: 'general', label: '', description: '', valueType: 'string', valueText: '', public: false,
};

function formatValue(item) {
  if (item.valueType === 'string_array') return (item.value || []).join('\n');
  if (item.valueType === 'json') return JSON.stringify(item.value ?? {}, null, 2);
  return String(item.value ?? '');
}

function parseValue(form) {
  if (form.valueType === 'number') {
    const value = Number(form.valueText);
    if (!Number.isFinite(value)) throw new Error('Enter a valid numeric value.');
    return value;
  }
  if (form.valueType === 'boolean') return form.valueText === 'true';
  if (form.valueType === 'string_array') return form.valueText.split('\n').map((item) => item.trim()).filter(Boolean);
  if (form.valueType === 'json') return JSON.parse(form.valueText || '{}');
  return form.valueText;
}

function AdminSiteSettingsPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [selectedKey, setSelectedKey] = useState('');
  const [filters, setFilters] = useState({ search: '', group: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const filtered = useMemo(() => items, [items]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await listSiteSettings(filters);
      setItems(result.data.items || []);
    } catch (requestError) { setError(getApiErrorMessage(requestError)); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { void load(); }, [load]);

  function choose(item) {
    setSelectedKey(item.key);
    setForm({ ...item, valueText: formatValue(item) });
    setMessage('');
  }

  function startNew() { setSelectedKey(''); setForm(emptyForm); setMessage(''); }

  async function save(event) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      const key = form.key.trim().toLowerCase();
      const result = await saveSiteSetting(key, {
        key, group: form.group, label: form.label, description: form.description,
        value: parseValue(form), valueType: form.valueType, public: form.public,
      });
      setMessage(result.message); await load();
      choose(result.data.setting);
    } catch (requestError) { setError(getApiErrorMessage(requestError)); }
    finally { setSaving(false); }
  }

  return <>
    <Seo title="Site Settings" description="Manage iRAP public and operational settings." noIndex />
    <section className="section"><div className={`container ${styles.container}`}>
      <header className={styles.header}><div><p className={styles.eyebrow}>Site administration</p><h1>General site settings</h1><p>Manage real contact details, social links, SEO defaults, homepage controls, renewal reminders and other editable values without hardcoding them.</p></div><Button onClick={startNew}>New setting</Button></header>
      {message ? <Alert tone="success">{message}</Alert> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      <form className={styles.toolbar} onSubmit={(event) => { event.preventDefault(); void load(); }}>
        <FormField label="Search"><Input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} /></FormField>
        <FormField label="Group"><Select value={filters.group} onChange={(event) => setFilters((current) => ({ ...current, group: event.target.value }))}><option value="">All groups</option>{groups.map((group) => <option key={group} value={group}>{group}</option>)}</Select></FormField>
        <Button type="submit" variant="secondary">Refresh</Button>
      </form>
      {loading ? <div className={styles.loading}><Loader label="Loading settings" size="large" /></div> : <div className={styles.workspace}>
        <div className={styles.list}>{filtered.length ? filtered.map((item) => <button type="button" key={item.key} onClick={() => choose(item)} className={`${styles.listButton} ${selectedKey === item.key ? styles.listButtonActive : ''}`}><strong>{item.label}</strong><span>{item.key}</span><small>{item.group} · {item.public ? 'public' : 'private'}</small></button>) : <EmptyState title="No settings match" description="Create a setting or change the current filters." />}</div>
        <Card><form className={styles.form} onSubmit={save}>
          <h2 className={styles.sectionTitle}>{selectedKey ? 'Edit setting' : 'Create setting'}</h2>
          <div className={styles.formGrid}>
            <FormField label="Setting key"><Input required disabled={Boolean(selectedKey)} value={form.key} onChange={(event) => setForm((current) => ({ ...current, key: event.target.value }))} placeholder="contact.email" /></FormField>
            <FormField label="Group"><Select value={form.group} onChange={(event) => setForm((current) => ({ ...current, group: event.target.value }))}>{groups.map((group) => <option key={group}>{group}</option>)}</Select></FormField>
            <FormField label="Label"><Input required value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} /></FormField>
            <FormField label="Value type"><Select value={form.valueType} onChange={(event) => setForm((current) => ({ ...current, valueType: event.target.value, valueText: event.target.value === 'boolean' ? 'false' : '' }))}>{valueTypes.map((type) => <option key={type}>{type}</option>)}</Select></FormField>
          </div>
          <FormField label="Description"><Textarea rows={3} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></FormField>
          {form.valueType === 'boolean' ? <FormField label="Value"><Select value={form.valueText} onChange={(event) => setForm((current) => ({ ...current, valueText: event.target.value }))}><option value="false">False</option><option value="true">True</option></Select></FormField> : <FormField label={form.valueType === 'string_array' ? 'Value — one item per line' : form.valueType === 'json' ? 'Value — valid JSON' : 'Value'}><Textarea rows={form.valueType === 'json' ? 10 : 5} value={form.valueText} onChange={(event) => setForm((current) => ({ ...current, valueText: event.target.value }))} /></FormField>}
          <label className={styles.checkbox}><input type="checkbox" checked={form.public} onChange={(event) => setForm((current) => ({ ...current, public: event.target.checked }))} /><span><strong>Expose through the public site configuration API</strong>Do not enable this for secrets, private notes, API keys or credentials.</span></label>
          <div className={styles.formActions}><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save setting'}</Button><Button type="button" variant="secondary" onClick={startNew}>Clear</Button></div>
        </form></Card>
      </div>}
    </div></section>
  </>;
}
export default AdminSiteSettingsPage;
