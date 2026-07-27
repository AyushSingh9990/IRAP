import { zodResolver } from '@hookform/resolvers/zod';
import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Alert from '../../components/common/Alert/Alert.jsx';
import Button from '../../components/common/Button/Button.jsx';
import FormField from '../../components/common/FormField/FormField.jsx';
import Input from '../../components/common/Input/Input.jsx';
import AuthPageShell from '../../components/auth/AuthPageShell/AuthPageShell.jsx';
import useAuth from '../../hooks/useAuth.js';
import { loginSchema } from '../../schemas/authSchemas.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './AuthForms.module.css';

function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [requestError, setRequestError] = useState('');
  const [challenge, setChallenge] = useState('');
  const [developmentCode, setDevelopmentCode] = useState('');
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const destination = location.state?.from?.pathname || '/dashboard';

  const submit = async (values) => {
    setRequestError('');
    try {
      const result = await auth.login(values);
      if (result.data?.requiresTwoFactor) {
        setChallenge(result.data.challenge);
        setDevelopmentCode(result.data.developmentCode || '');
        return;
      }
      navigate(destination, { replace: true });
    } catch (error) {
      setRequestError(getApiErrorMessage(error));
    }
  };

  const submitCode = async (event) => {
    event.preventDefault();
    setRequestError('');
    setIsVerifying(true);
    try {
      await auth.completeTwoFactor({ challenge, code });
      navigate(destination, { replace: true });
    } catch (error) {
      setRequestError(getApiErrorMessage(error));
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Log in | iRAP</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <AuthPageShell
        title="Log in to iRAP"
        description="Access your applicant account and security settings using secure HTTP-only cookie authentication."
      >
        {!auth.serviceAvailable ? (
          <Alert tone="warning" title="Authentication setup required">
            The site is running, but MongoDB and JWT secrets must be configured
            before login can be used.
          </Alert>
        ) : null}
        {requestError ? (
          <Alert tone="error" title="Login unsuccessful">{requestError}</Alert>
        ) : null}

        {challenge ? (
          <form className={styles.form} onSubmit={submitCode} noValidate>
            <Alert tone="info" title="Two-factor verification required">
              Enter the six-digit code sent to your verified email address.
              {developmentCode ? (
                <p>Local development code: <strong>{developmentCode}</strong></p>
              ) : null}
            </Alert>
            <FormField label="Verification code" required>
              <Input
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
              />
            </FormField>
            <Button
              type="submit"
              fullWidth
              isLoading={isVerifying}
              disabled={code.length !== 6}
            >
              Verify and log in
            </Button>
            <Button
              type="button"
              fullWidth
              variant="secondary"
              onClick={() => {
                setChallenge('');
                setCode('');
                setDevelopmentCode('');
              }}
            >
              Start again
            </Button>
          </form>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit(submit)} noValidate>
            <FormField label="Email address" error={errors.email?.message} required>
              <Input type="email" autoComplete="email" {...register('email')} />
            </FormField>
            <FormField label="Password" error={errors.password?.message} required>
              <Input type="password" autoComplete="current-password" {...register('password')} />
            </FormField>
            <div className={styles.actions}>
              <Button type="submit" fullWidth isLoading={isSubmitting}>Log in</Button>
              <p className={styles.supportText}>
                <Link to="/forgot-password">Forgot password?</Link> ·{' '}
                <Link to="/resend-verification">Resend verification</Link>
              </p>
              <p className={styles.supportText}>
                Need an account? <Link to="/register">Register</Link>
              </p>
            </div>
          </form>
        )}
      </AuthPageShell>
    </>
  );
}

export default LoginPage;
