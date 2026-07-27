import { zodResolver } from '@hookform/resolvers/zod';
import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { resendVerification } from '../../api/authApi.js';
import AuthPageShell from '../../components/auth/AuthPageShell/AuthPageShell.jsx';
import Alert from '../../components/common/Alert/Alert.jsx';
import Button from '../../components/common/Button/Button.jsx';
import FormField from '../../components/common/FormField/FormField.jsx';
import Input from '../../components/common/Input/Input.jsx';
import { emailSchema } from '../../schemas/authSchemas.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './AuthForms.module.css';

function ResendVerificationPage() {
  const [result, setResult] = useState(null);
  const [requestError, setRequestError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  const submit = async ({ email }) => {
    setRequestError('');
    setResult(null);
    try {
      setResult(await resendVerification(email));
    } catch (error) {
      setRequestError(getApiErrorMessage(error));
    }
  };

  return (
    <>
      <Helmet>
        <title>Resend verification | iRAP</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <AuthPageShell
        title="Resend email verification"
        description="A new single-use link will be created only when the account still requires verification."
      >
        {requestError ? <Alert tone="error">{requestError}</Alert> : null}
        {result ? (
          <Alert tone="success" title="Request received">
            {result.message}
            {result.data?.developmentUrl ? (
              <p className={styles.developmentLink}>
                Development link:{' '}
                <a href={result.data.developmentUrl}>{result.data.developmentUrl}</a>
              </p>
            ) : null}
          </Alert>
        ) : null}
        <form className={styles.form} onSubmit={handleSubmit(submit)} noValidate>
          <FormField label="Email address" error={errors.email?.message} required>
            <Input type="email" autoComplete="email" {...register('email')} />
          </FormField>
          <div className={styles.actions}>
            <Button type="submit" fullWidth isLoading={isSubmitting}>
              Resend verification
            </Button>
            <p className={styles.supportText}><Link to="/login">Return to login</Link></p>
          </div>
        </form>
      </AuthPageShell>
    </>
  );
}

export default ResendVerificationPage;
