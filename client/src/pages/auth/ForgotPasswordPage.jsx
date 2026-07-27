import { zodResolver } from '@hookform/resolvers/zod';
import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../../api/authApi.js';
import AuthPageShell from '../../components/auth/AuthPageShell/AuthPageShell.jsx';
import Alert from '../../components/common/Alert/Alert.jsx';
import Button from '../../components/common/Button/Button.jsx';
import FormField from '../../components/common/FormField/FormField.jsx';
import Input from '../../components/common/Input/Input.jsx';
import { emailSchema } from '../../schemas/authSchemas.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './AuthForms.module.css';

function ForgotPasswordPage() {
  const [result, setResult] = useState(null); const [requestError, setRequestError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(emailSchema), defaultValues: { email: '' } });
  const submit = async ({ email }) => { setRequestError(''); try { setResult(await requestPasswordReset(email)); } catch (error) { setRequestError(getApiErrorMessage(error)); } };
  return <><Helmet><title>Forgot password | iRAP</title><meta name="robots" content="noindex,nofollow" /></Helmet><AuthPageShell title="Reset your password" description="Enter your email address. The response remains generic so private account existence is not exposed.">
    {requestError ? <Alert tone="error">{requestError}</Alert> : null}
    {result ? <Alert tone="success" title="Request received">{result.message}{result.data?.developmentUrl ? <p className={styles.developmentLink}>Development link: <a href={result.data.developmentUrl}>{result.data.developmentUrl}</a></p> : null}</Alert> : null}
    <form className={styles.form} onSubmit={handleSubmit(submit)} noValidate><FormField label="Email address" error={errors.email?.message} required><Input type="email" autoComplete="email" {...register('email')} /></FormField><div className={styles.actions}><Button type="submit" fullWidth isLoading={isSubmitting}>Send reset instructions</Button><p className={styles.supportText}><Link to="/login">Return to login</Link></p></div></form>
  </AuthPageShell></>;
}
export default ForgotPasswordPage;
