import { zodResolver } from '@hookform/resolvers/zod';
import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import { completePasswordReset } from '../../api/authApi.js';
import AuthPageShell from '../../components/auth/AuthPageShell/AuthPageShell.jsx';
import Alert from '../../components/common/Alert/Alert.jsx';
import Button from '../../components/common/Button/Button.jsx';
import FormField from '../../components/common/FormField/FormField.jsx';
import Input from '../../components/common/Input/Input.jsx';
import { resetPasswordSchema } from '../../schemas/authSchemas.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './AuthForms.module.css';

function ResetPasswordPage() {
  const { token } = useParams(); const [success, setSuccess] = useState(''); const [requestError, setRequestError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(resetPasswordSchema), defaultValues: { password: '', confirmPassword: '' } });
  const submit = async ({ password }) => { setRequestError(''); try { const result = await completePasswordReset({ token, password }); setSuccess(result.message); } catch (error) { setRequestError(getApiErrorMessage(error)); } };
  return <><Helmet><title>Reset password | iRAP</title><meta name="robots" content="noindex,nofollow" /></Helmet><AuthPageShell title="Choose a new password" description="A successful reset revokes all existing refresh sessions for the account.">
    {requestError ? <Alert tone="error">{requestError}</Alert> : null}{success ? <Alert tone="success">{success} <Link to="/login">Log in</Link></Alert> : null}
    {!success ? <form className={styles.form} onSubmit={handleSubmit(submit)} noValidate><FormField label="New password" error={errors.password?.message} hint="Use 12+ characters with upper- and lowercase letters, a number, and a special character." required><Input type="password" autoComplete="new-password" {...register('password')} /></FormField><FormField label="Confirm new password" error={errors.confirmPassword?.message} required><Input type="password" autoComplete="new-password" {...register('confirmPassword')} /></FormField><Button type="submit" fullWidth isLoading={isSubmitting}>Reset password</Button></form> : null}
  </AuthPageShell></>;
}
export default ResetPasswordPage;
