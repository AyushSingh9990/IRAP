import { zodResolver } from '@hookform/resolvers/zod';
import { Helmet } from 'react-helmet-async';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router-dom';
import { registerAccount } from '../../api/authApi.js';
import Alert from '../../components/common/Alert/Alert.jsx';
import Button from '../../components/common/Button/Button.jsx';
import FormField from '../../components/common/FormField/FormField.jsx';
import Input from '../../components/common/Input/Input.jsx';
import Select from '../../components/common/Select/Select.jsx';
import AuthPageShell from '../../components/auth/AuthPageShell/AuthPageShell.jsx';
import { registrationSchema } from '../../schemas/authSchemas.js';
import { getApiErrorMessage, getApiFieldErrors } from '../../utils/apiErrors.js';
import styles from './AuthForms.module.css';

const supportedJourneys = new Set(['member', 'training_provider', 'organization']);

function createRegistrationDefaults(requestedJourney) {
  return {
    firstName: '',
    lastName: '',
    email: '',
    journey: supportedJourneys.has(requestedJourney) ? requestedJourney : 'member',
    password: '',
    confirmPassword: '',
  };
}

function RegisterPage() {
  const [searchParams] = useSearchParams();
  const requestedJourney = searchParams.get('journey');
  const registrationDefaults = useMemo(
    () => createRegistrationDefaults(requestedJourney),
    [requestedJourney],
  );
  const [result, setResult] = useState(null);
  const [requestError, setRequestError] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registrationSchema),
    defaultValues: registrationDefaults,
  });

  useEffect(() => {
    reset(registrationDefaults);
  }, [registrationDefaults, reset]);

  const submit = async (values) => {
    setRequestError('');
    setResult(null);

    try {
      const response = await registerAccount({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
        journey: values.journey,
      });

      reset(registrationDefaults);
      setResult(response);
    } catch (error) {
      for (const [field, message] of Object.entries(getApiFieldErrors(error))) {
        setError(field, { message });
      }

      setRequestError(getApiErrorMessage(error));
    }
  };

  const developmentUrl = result?.data?.developmentUrl;

  return (
    <>
      <Helmet>
        <title>Register | iRAP</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <AuthPageShell
        title="Create your iRAP account"
        description="Choose the professional journey you want to apply for. Registration creates an applicant account only; approval happens later through formal review."
      >
        <div className={styles.heading}>
          <h2>{result ? 'Registration received' : 'Account details'}</h2>
          <p>
            {result
              ? 'Verify your email address before signing in.'
              : 'Fields marked with * are required.'}
          </p>
        </div>

        {result ? (
          <div className={styles.successState}>
            <Alert tone="success" title="Check your email">
              <p>{result.message}</p>
              {developmentUrl ? (
                <p>
                  Local email delivery is in development mode. Use the button
                  below to verify this account.
                </p>
              ) : null}
            </Alert>

            <div className={styles.actions}>
              {developmentUrl ? (
                <Button href={developmentUrl} fullWidth>
                  Verify email address
                </Button>
              ) : null}
              <Button to="/login" variant="secondary" fullWidth>
                Go to login
              </Button>
            </div>
          </div>
        ) : (
          <>
            {requestError ? (
              <Alert tone="error" title="Registration could not be completed">
                {requestError}
              </Alert>
            ) : null}

            <form
              className={styles.form}
              onSubmit={handleSubmit(submit)}
              noValidate
            >
              <div className={`${styles.fieldGrid} ${styles.fieldGridTwo}`}>
                <FormField
                  label="First name"
                  error={errors.firstName?.message}
                  required
                >
                  <Input autoComplete="given-name" {...register('firstName')} />
                </FormField>

                <FormField
                  label="Last name"
                  error={errors.lastName?.message}
                  required
                >
                  <Input autoComplete="family-name" {...register('lastName')} />
                </FormField>
              </div>

              <FormField
                label="Email address"
                error={errors.email?.message}
                required
              >
                <Input
                  type="email"
                  autoComplete="email"
                  {...register('email')}
                />
              </FormField>

              <FormField
                label="Application journey"
                error={errors.journey?.message}
                hint="This records your intended application. It does not grant an approved role."
                required
              >
                <Select {...register('journey')}>
                  <option value="member">Professional Member</option>
                  <option value="training_provider">Training Provider</option>
                  <option value="organization">Accredited Organization</option>
                </Select>
              </FormField>

              <FormField
                label="Password"
                error={errors.password?.message}
                hint="Use 12+ characters with upper- and lowercase letters, a number, and a special character."
                required
              >
                <Input
                  type="password"
                  autoComplete="new-password"
                  {...register('password')}
                />
              </FormField>

              <FormField
                label="Confirm password"
                error={errors.confirmPassword?.message}
                required
              >
                <Input
                  type="password"
                  autoComplete="new-password"
                  {...register('confirmPassword')}
                />
              </FormField>

              <div className={styles.actions}>
                <Button type="submit" fullWidth isLoading={isSubmitting}>
                  Create applicant account
                </Button>
                <p className={styles.supportText}>
                  Already registered? <Link to="/login">Log in</Link>
                </p>
              </div>
            </form>
          </>
        )}
      </AuthPageShell>
    </>
  );
}

export default RegisterPage;
