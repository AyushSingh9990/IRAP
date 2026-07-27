import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  changeAccountPassword,
  getActiveSessions,
  logoutAllAccounts,
  requestEmailChange,
  revokeActiveSession,
} from '../../api/authApi.js';
import { updateDashboardAccount } from '../../api/dashboardApi.js';
import Alert from '../../components/common/Alert/Alert.jsx';
import Button from '../../components/common/Button/Button.jsx';
import Card from '../../components/common/Card/Card.jsx';
import FormField from '../../components/common/FormField/FormField.jsx';
import Input from '../../components/common/Input/Input.jsx';
import Loader from '../../components/common/Loader/Loader.jsx';
import Seo from '../../components/seo/Seo.jsx';
import useAuth from '../../hooks/useAuth.js';
import { changePasswordSchema, emailChangeSchema } from '../../schemas/authSchemas.js';
import { accountSettingsSchema } from '../../schemas/dashboardSchemas.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './AccountSettingsPage.module.css';

function AccountSettingsPage() {
  const auth = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [emailChangeUrl, setEmailChangeUrl] = useState('');

  const accountForm = useForm({
    resolver: zodResolver(accountSettingsSchema),
    defaultValues: {
      displayName: auth.user.displayName || '',
      telephone: auth.user.telephone || '',
      preferredLanguage: auth.user.preferredLanguage || 'en',
      timeZone: auth.user.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    },
  });
  const passwordForm = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });
  const emailForm = useForm({
    resolver: zodResolver(emailChangeSchema),
    defaultValues: { newEmail: '', currentPassword: '' },
  });

  useEffect(() => {
    let active = true;
    getActiveSessions()
      .then((result) => { if (active) setSessions(result.data.sessions); })
      .catch((requestError) => { if (active) setError(getApiErrorMessage(requestError)); })
      .finally(() => { if (active) setLoadingSessions(false); });
    return () => { active = false; };
  }, []);

  async function updateAccount(values) {
    setError(''); setMessage('');
    try {
      const result = await updateDashboardAccount(values);
      setMessage(result.message);
      await auth.refreshAccount();
    } catch (requestError) { setError(getApiErrorMessage(requestError)); }
  }

  async function updatePassword(values) {
    setError(''); setMessage('');
    try {
      const result = await changeAccountPassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      passwordForm.reset();
      setMessage(result.message);
      await auth.logout();
    } catch (requestError) { setError(getApiErrorMessage(requestError)); }
  }

  async function updateEmail(values) {
    setError(''); setMessage(''); setEmailChangeUrl('');
    try {
      const result = await requestEmailChange(values);
      emailForm.reset();
      setMessage(result.message);
      setEmailChangeUrl(result.data?.developmentUrl || '');
    } catch (requestError) { setError(getApiErrorMessage(requestError)); }
  }

  async function revoke(id) {
    setError(''); setMessage('');
    try {
      await revokeActiveSession(id);
      setSessions((items) => items.filter((item) => item.id !== id));
      setMessage('Session revoked.');
    } catch (requestError) { setError(getApiErrorMessage(requestError)); }
  }

  async function logoutAll() {
    setError('');
    try { await logoutAllAccounts(); await auth.logout(); }
    catch (requestError) { setError(getApiErrorMessage(requestError)); }
  }

  return (
    <>
      <Seo title="Account settings" description="Manage private iRAP account and security settings." noIndex />
      <div className={styles.container}>
        <header className={styles.header}>
          <div><p className={styles.eyebrow}>Private account</p><h1>Account settings</h1><p>Maintain your display, contact, language, time-zone, email, password, and active sessions.</p></div>
        </header>
        {message ? <Alert tone="success">{message}{emailChangeUrl ? <p className={styles.developmentLink}>Development link: <a href={emailChangeUrl}>{emailChangeUrl}</a></p> : null}</Alert> : null}
        {error ? <Alert tone="error">{error}</Alert> : null}

        <Card>
          <h2>Profile and preferences</h2>
          <form className={styles.form} onSubmit={accountForm.handleSubmit(updateAccount)}>
            <FormField label="Display name" required error={accountForm.formState.errors.displayName?.message}><Input {...accountForm.register('displayName')} /></FormField>
            <FormField label="Telephone" error={accountForm.formState.errors.telephone?.message}><Input autoComplete="tel" {...accountForm.register('telephone')} /></FormField>
            <FormField label="Preferred language" required error={accountForm.formState.errors.preferredLanguage?.message}><Input placeholder="en" {...accountForm.register('preferredLanguage')} /></FormField>
            <FormField label="Time zone" required hint="Use an IANA time zone such as Asia/Kolkata." error={accountForm.formState.errors.timeZone?.message}><Input placeholder="Asia/Kolkata" {...accountForm.register('timeZone')} /></FormField>
            <Button type="submit" isLoading={accountForm.formState.isSubmitting}>Save account settings</Button>
          </form>
        </Card>

        <div className={styles.grid}>
          <Card>
            <h2>Change password</h2>
            <form className={styles.form} onSubmit={passwordForm.handleSubmit(updatePassword)}>
              <FormField label="Current password" required error={passwordForm.formState.errors.currentPassword?.message}><Input type="password" autoComplete="current-password" {...passwordForm.register('currentPassword')} /></FormField>
              <FormField label="New password" required error={passwordForm.formState.errors.newPassword?.message}><Input type="password" autoComplete="new-password" {...passwordForm.register('newPassword')} /></FormField>
              <FormField label="Confirm new password" required error={passwordForm.formState.errors.confirmPassword?.message}><Input type="password" autoComplete="new-password" {...passwordForm.register('confirmPassword')} /></FormField>
              <Button type="submit" isLoading={passwordForm.formState.isSubmitting}>Change password</Button>
            </form>
          </Card>

          <Card>
            <h2>Change email address</h2>
            <form className={styles.form} onSubmit={emailForm.handleSubmit(updateEmail)}>
              <FormField label="New email" required error={emailForm.formState.errors.newEmail?.message}><Input type="email" autoComplete="email" {...emailForm.register('newEmail')} /></FormField>
              <FormField label="Current password" required error={emailForm.formState.errors.currentPassword?.message}><Input type="password" autoComplete="current-password" {...emailForm.register('currentPassword')} /></FormField>
              <Button type="submit" isLoading={emailForm.formState.isSubmitting}>Send verification link</Button>
            </form>
          </Card>
        </div>

        <Card>
          <div className={styles.sessionHeading}><div><h2>Active sessions</h2><p>Revoke any browser or device you do not recognize.</p></div><Button variant="danger" onClick={logoutAll}>Log out all devices</Button></div>
          {loadingSessions ? <Loader label="Loading sessions" /> : (
            <div className={styles.sessions}>
              {sessions.length === 0 ? <p>No active sessions were returned.</p> : sessions.map((session) => (
                <article className={styles.session} key={session.id}>
                  <div><strong>{session.current ? 'Current session' : 'Signed-in session'}</strong><p>{session.userAgent || 'Unknown browser'}</p><small>Created {new Date(session.createdAt).toLocaleString()}</small></div>
                  {!session.current ? <Button size="small" variant="secondary" onClick={() => revoke(session.id)}>Revoke</Button> : null}
                </article>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

export default AccountSettingsPage;
