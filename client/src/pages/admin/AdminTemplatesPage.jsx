import { useCallback, useEffect, useState } from 'react';
import { createTemplate, listTemplates, updateTemplate } from '../../api/adminApi.js';
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

const emailEmpty = { key: '', name: '', subject: '', textBody: '', htmlBody: '', variablesText: '', status: 'active' };
const certificateEmpty = { key: '', name: '', certificateType: 'member', heading: '', confirmationText: '', footerText: '', accentHex: '#195267', signatoryName: '', signatoryTitle: '', status: 'active' };

function AdminTemplatesPage() {
  const [type, setType] = useState('email');
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState(emailEmpty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const result = await listTemplates({ type }); setItems(result.data.items || []); }
    catch (e) { setError(getApiErrorMessage(e)); }
    finally { setLoading(false); }
  }, [type]);
  useEffect(() => { setSelectedId(''); setForm(type === 'email' ? emailEmpty : certificateEmpty); void load(); }, [load, type]);

  function choose(item) {
    setSelectedId(item.id);
    setForm(type === 'email' ? { ...item, variablesText: (item.variables || []).join('\n') } : { ...item });
  }
  function startNew() { setSelectedId(''); setForm(type === 'email' ? emailEmpty : certificateEmpty); setMessage(''); }
  async function save(event) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      const payload = { ...form };
      if (type === 'email') { payload.variables = form.variablesText.split('\n').map((value) => value.trim()).filter(Boolean); delete payload.variablesText; }
      const result = selectedId ? await updateTemplate(type, selectedId, payload) : await createTemplate(type, payload);
      setMessage(result.message); await load(); choose(result.data.template);
    } catch (e) { setError(getApiErrorMessage(e)); }
    finally { setSaving(false); }
  }

  return <><Seo title="Templates" description="Manage email and certificate templates." noIndex /><section className="section"><div className={`container ${styles.container}`}>
    <header className={styles.header}><div><p className={styles.eyebrow}>Template administration</p><h1>Email and certificate templates</h1><p>Manage reusable communication copy and certificate presentation fields. Template keys remain unique and no fake signatory information is preloaded.</p></div><Button onClick={startNew}>New template</Button></header>
    {message ? <Alert tone="success">{message}</Alert> : null}{error ? <Alert tone="error">{error}</Alert> : null}
    <div className={styles.inlineActions}><Button variant={type === 'email' ? 'primary' : 'secondary'} onClick={() => setType('email')}>Email templates</Button><Button variant={type === 'certificate' ? 'primary' : 'secondary'} onClick={() => setType('certificate')}>Certificate templates</Button></div>
    {loading ? <div className={styles.loading}><Loader label="Loading templates" size="large" /></div> : <div className={styles.workspace}><div className={styles.list}>{items.length ? items.map((item) => <button type="button" key={item.id} onClick={() => choose(item)} className={`${styles.listButton} ${selectedId === item.id ? styles.listButtonActive : ''}`}><strong>{item.name}</strong><span>{item.key}</span><small>{item.status}</small></button>) : <EmptyState title="No templates configured" description={`Create the first ${type} template.`} />}</div>
      <Card><form className={styles.form} onSubmit={save}><h2 className={styles.sectionTitle}>{selectedId ? 'Edit template' : 'Create template'}</h2><div className={styles.formGrid}><FormField label="Template key"><Input required value={form.key} onChange={(e) => setForm((c) => ({ ...c, key: e.target.value.toLowerCase() }))} /></FormField><FormField label="Status"><Select value={form.status} onChange={(e) => setForm((c) => ({ ...c, status: e.target.value }))}><option>active</option><option>inactive</option></Select></FormField><FormField label="Name"><Input required value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} /></FormField>{type === 'certificate' ? <FormField label="Certificate type"><Select value={form.certificateType} onChange={(e) => setForm((c) => ({ ...c, certificateType: e.target.value }))}><option value="member">Member</option><option value="training_provider">Training provider</option><option value="organization">Organization</option><option value="course">Course</option></Select></FormField> : <FormField label="Subject"><Input required value={form.subject} onChange={(e) => setForm((c) => ({ ...c, subject: e.target.value }))} /></FormField>}</div>
      {type === 'email' ? <><FormField label="Plain-text body"><Textarea required rows={10} value={form.textBody} onChange={(e) => setForm((c) => ({ ...c, textBody: e.target.value }))} /></FormField><FormField label="HTML body"><Textarea rows={10} value={form.htmlBody} onChange={(e) => setForm((c) => ({ ...c, htmlBody: e.target.value }))} /></FormField><FormField label="Supported variables — one per line"><Textarea rows={5} value={form.variablesText} onChange={(e) => setForm((c) => ({ ...c, variablesText: e.target.value }))} /></FormField></> : <><FormField label="Certificate heading"><Input required value={form.heading} onChange={(e) => setForm((c) => ({ ...c, heading: e.target.value }))} /></FormField><FormField label="Confirmation text"><Textarea rows={4} value={form.confirmationText} onChange={(e) => setForm((c) => ({ ...c, confirmationText: e.target.value }))} /></FormField><FormField label="Footer text"><Textarea rows={3} value={form.footerText} onChange={(e) => setForm((c) => ({ ...c, footerText: e.target.value }))} /></FormField><div className={styles.formGrid}><FormField label="Accent colour"><Input type="color" value={form.accentHex} onChange={(e) => setForm((c) => ({ ...c, accentHex: e.target.value }))} /></FormField><FormField label="Signatory name"><Input value={form.signatoryName} onChange={(e) => setForm((c) => ({ ...c, signatoryName: e.target.value }))} /></FormField><FormField label="Signatory title"><Input value={form.signatoryTitle} onChange={(e) => setForm((c) => ({ ...c, signatoryTitle: e.target.value }))} /></FormField></div></>}
      <div className={styles.formActions}><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save template'}</Button><Button type="button" variant="secondary" onClick={startNew}>Clear</Button></div></form></Card></div>}
  </div></section></>;
}
export default AdminTemplatesPage;
