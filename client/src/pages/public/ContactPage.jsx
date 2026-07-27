import { useEffect, useState } from 'react';
import { getPublicSiteConfiguration, submitContactEnquiry } from '../../api/siteApi.js';
import Alert from '../../components/common/Alert/Alert.jsx';
import Button from '../../components/common/Button/Button.jsx';
import Card from '../../components/common/Card/Card.jsx';
import EmptyState from '../../components/common/EmptyState/EmptyState.jsx';
import FormField from '../../components/common/FormField/FormField.jsx';
import Input from '../../components/common/Input/Input.jsx';
import PageHero from '../../components/public/PageHero/PageHero.jsx';
import Select from '../../components/common/Select/Select.jsx';
import Textarea from '../../components/common/Textarea/Textarea.jsx';
import Seo from '../../components/seo/Seo.jsx';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './ContactPage.module.css';

const initialForm = {
  name: '', email: '', telephone: '', subject: '', category: 'general', message: '', website: '',
};

function configuredValue(configuration, key) {
  for (const group of Object.values(configuration?.groups || {})) {
    if (Object.prototype.hasOwnProperty.call(group, key)) return group[key];
  }
  return '';
}

function ContactPage() {
  const [configuration, setConfiguration] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reference, setReference] = useState('');

  useEffect(() => {
    let active = true;
    getPublicSiteConfiguration()
      .then((result) => { if (active) setConfiguration(result.data.configuration); })
      .catch(() => { if (active) setConfiguration(null); });
    return () => { active = false; };
  }, []);

  async function submit(event) {
    event.preventDefault();
    setSaving(true); setError(''); setMessage(''); setReference('');
    try {
      const result = await submitContactEnquiry(form);
      setMessage(result.message);
      setReference(result.data.submission.reference);
      setForm(initialForm);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  const email = configuredValue(configuration, 'contact.email');
  const telephone = configuredValue(configuration, 'contact.telephone');
  const address = configuredValue(configuration, 'contact.registered_address');

  return (
    <>
      <Seo title="Contact" description="Submit a private iRAP enquiry and receive a unique reference number." path="/contact" />
      <PageHero
        breadcrumbItems={[{ label: 'Home', to: '/' }, { label: 'Contact' }]}
        eyebrow="Contact and enquiries"
        title="Send a secure enquiry"
        description="Choose the correct enquiry category. Your submission is stored privately and receives a unique reference for support follow-up."
      />
      <section className="section">
        <div className={`container ${styles.layout}`}>
          <div className={styles.contactColumn}>
            <Card className={styles.card} padding="large">
              <h2>Configured contact details</h2>
              {email || telephone || address ? (
                <dl className={styles.details}>
                  {email ? <div><dt>Email</dt><dd><a href={`mailto:${email}`}>{email}</a></dd></div> : null}
                  {telephone ? <div><dt>Telephone</dt><dd><a href={`tel:${telephone}`}>{telephone}</a></dd></div> : null}
                  {address ? <div><dt>Registered address</dt><dd>{address}</dd></div> : null}
                </dl>
              ) : (
                <EmptyState title="Contact details are not configured" description="An administrator can add verified contact details from Site settings. The enquiry form remains available." />
              )}
            </Card>
            <Alert tone="info" title="Formal complaint">
              Use the dedicated complaints route when you need a formally tracked complaint rather than a general enquiry.
            </Alert>
            <Button to="/complaints" variant="secondary">Submit a complaint</Button>
          </div>

          <Card padding="large">
            <form className={styles.form} onSubmit={submit}>
              <div><p className={styles.eyebrow}>Private submission</p><h2>Contact iRAP</h2></div>
              {message ? <Alert tone="success">{message}{reference ? <> Reference: <strong>{reference}</strong>.</> : null}</Alert> : null}
              {error ? <Alert tone="error">{error}</Alert> : null}
              <div className={styles.formGrid}>
                <FormField label="Name"><Input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></FormField>
                <FormField label="Email"><Input required type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></FormField>
                <FormField label="Telephone"><Input value={form.telephone} onChange={(event) => setForm((current) => ({ ...current, telephone: event.target.value }))} /></FormField>
                <FormField label="Category"><Select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}><option value="general">General</option><option value="membership">Membership</option><option value="training_provider">Training provider</option><option value="organization">Organization</option><option value="technical_support">Technical support</option><option value="accessibility">Accessibility</option></Select></FormField>
              </div>
              <FormField label="Subject"><Input required value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} /></FormField>
              <FormField label="Message"><Textarea required minLength={20} rows={8} value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} /></FormField>
              <div className={styles.honeypot} aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))} /></label></div>
              <Button type="submit" disabled={saving}>{saving ? 'Submitting…' : 'Submit enquiry'}</Button>
            </form>
          </Card>
        </div>
      </section>
    </>
  );
}

export default ContactPage;
