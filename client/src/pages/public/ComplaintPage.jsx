import { useState } from 'react';
import { submitComplaint } from '../../api/siteApi.js';
import Alert from '../../components/common/Alert/Alert.jsx';
import Button from '../../components/common/Button/Button.jsx';
import Card from '../../components/common/Card/Card.jsx';
import FormField from '../../components/common/FormField/FormField.jsx';
import Input from '../../components/common/Input/Input.jsx';
import PageHero from '../../components/public/PageHero/PageHero.jsx';
import Textarea from '../../components/common/Textarea/Textarea.jsx';
import Seo from '../../components/seo/Seo.jsx';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './ContactPage.module.css';

const initialForm = { name: '', email: '', telephone: '', subject: '', message: '', relatedReference: '', website: '' };

function ComplaintPage() {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reference, setReference] = useState('');

  async function submit(event) {
    event.preventDefault(); setSaving(true); setError(''); setMessage(''); setReference('');
    try {
      const result = await submitComplaint(form);
      setMessage(result.message); setReference(result.data.complaint.reference); setForm(initialForm);
    } catch (requestError) { setError(getApiErrorMessage(requestError)); }
    finally { setSaving(false); }
  }

  return <><Seo title="Complaints" description="Submit a private formal complaint to iRAP." path="/complaints" /><PageHero breadcrumbItems={[{ label: 'Home', to: '/' }, { label: 'Complaints' }]} eyebrow="Formal complaints" title="Submit a private complaint" description="Provide enough detail for the support team to review the matter. Your complaint receives a unique reference and is never published." /><section className="section"><div className="container container--narrow"><Card padding="large"><form className={styles.form} onSubmit={submit}><h2>Complaint details</h2>{message ? <Alert tone="success">{message} Reference: <strong>{reference}</strong>.</Alert> : null}{error ? <Alert tone="error">{error}</Alert> : null}<div className={styles.formGrid}><FormField label="Name"><Input required value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} /></FormField><FormField label="Email"><Input required type="email" value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} /></FormField><FormField label="Telephone"><Input value={form.telephone} onChange={(e) => setForm((c) => ({ ...c, telephone: e.target.value }))} /></FormField><FormField label="Related application, payment or certificate reference"><Input value={form.relatedReference} onChange={(e) => setForm((c) => ({ ...c, relatedReference: e.target.value }))} /></FormField></div><FormField label="Subject"><Input required value={form.subject} onChange={(e) => setForm((c) => ({ ...c, subject: e.target.value }))} /></FormField><FormField label="Complaint"><Textarea required minLength={30} rows={10} value={form.message} onChange={(e) => setForm((c) => ({ ...c, message: e.target.value }))} /></FormField><div className={styles.honeypot} aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm((c) => ({ ...c, website: e.target.value }))} /></label></div><div className={styles.formGrid}><Button type="submit" disabled={saving}>{saving ? 'Submitting…' : 'Submit complaint'}</Button><Button to="/contact" variant="secondary">General enquiry</Button></div></form></Card></div></section></>;
}
export default ComplaintPage;
