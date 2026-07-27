import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import Alert from '../../components/common/Alert/Alert.jsx';
import Button from '../../components/common/Button/Button.jsx';
import Card from '../../components/common/Card/Card.jsx';
import FormField from '../../components/common/FormField/FormField.jsx';
import Input from '../../components/common/Input/Input.jsx';
import Loader from '../../components/common/Loader/Loader.jsx';
import Select from '../../components/common/Select/Select.jsx';
import StatusBadge from '../../components/common/StatusBadge/StatusBadge.jsx';
import Textarea from '../../components/common/Textarea/Textarea.jsx';
import ApplicationProgress from '../../components/application/ApplicationProgress/ApplicationProgress.jsx';
import ApplicationStatusTimeline from '../../components/application/ApplicationStatusTimeline/ApplicationStatusTimeline.jsx';
import Seo from '../../components/seo/Seo.jsx';
import {
  getApplication,
  saveApplicationStep,
  submitApplication,
  withdrawApplication,
} from '../../api/applicationApi.js';
import {
  applicationFormDefinitions,
  applicationStatusLabels,
  applicationStatusTones,
} from '../../config/applicationForms.js';
import { createApplicationStepSchema } from '../../schemas/applicationSchemas.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './ApplicationWizardPage.module.css';

const editableStatuses = ['draft', 'additional_information_required'];

function fieldDefault(field, storedData) {
  if (Object.prototype.hasOwnProperty.call(storedData, field.name)) {
    return storedData[field.name];
  }
  if (field.type === 'checkbox') return false;
  if (field.inputType === 'number') return '';
  return '';
}

function FieldControl({ field, register, error }) {
  const registration = register(field.name);

  if (field.type === 'textarea') {
    return (
      <FormField
        label={field.label}
        hint={field.hint}
        error={error?.message}
        required={field.required}
      >
        <Textarea rows={field.rows || 5} {...registration} />
      </FormField>
    );
  }

  if (field.type === 'select') {
    return (
      <FormField
        label={field.label}
        hint={field.hint}
        error={error?.message}
        required={field.required}
      >
        <Select {...registration}>
          <option value="">Select an option</option>
          {field.options.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
      </FormField>
    );
  }

  if (field.type === 'checkbox') {
    return (
      <div className={styles.checkboxField}>
        <label>
          <input type="checkbox" {...registration} />
          <span>{field.label}{field.required ? <strong aria-hidden="true"> *</strong> : null}</span>
        </label>
        {error?.message ? <p role="alert">{error.message}</p> : null}
      </div>
    );
  }

  return (
    <FormField
      label={field.label}
      hint={field.hint}
      error={error?.message}
      required={field.required}
    >
      <Input
        type={field.inputType || 'text'}
        min={field.min}
        max={field.max}
        {...registration}
      />
    </FormField>
  );
}

function StepForm({
  applicationId,
  initialData,
  onApplicationChange,
  onBack,
  onNext,
  nextStepKey,
  step,
}) {
  const schema = useMemo(() => createApplicationStepSchema(step), [step]);
  const defaultValues = useMemo(
    () => Object.fromEntries(step.fields.map((field) => [field.name, fieldDefault(field, initialData)])),
    [initialData, step],
  );
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
  } = useForm({
    defaultValues,
    mode: 'onBlur',
    resolver: zodResolver(schema),
  });
  const values = useWatch({ control });
  const [saveState, setSaveState] = useState('saved');
  const initialRender = useRef(true);
  const lastSavedValue = useRef(JSON.stringify(defaultValues));

  const persist = useCallback(
    async (data, showErrors = false, requestedNextStepKey) => {
      setSaveState('saving');
      try {
        const result = await saveApplicationStep(
          applicationId,
          step.key,
          data,
          requestedNextStepKey,
        );
        lastSavedValue.current = JSON.stringify(data);
        onApplicationChange(result.data.application);
        if (showErrors && result.data.validationErrors?.length) {
          result.data.validationErrors.forEach((item) => {
            setError(item.field, { type: 'server', message: item.message });
          });
        }
        setSaveState('saved');
        return result;
      } catch (error) {
        setSaveState('error');
        throw error;
      }
    },
    [applicationId, onApplicationChange, setError, step.key],
  );

  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return undefined;
    }

    const serialized = JSON.stringify(values);
    if (serialized === lastSavedValue.current) return undefined;

    setSaveState('unsaved');
    const timer = window.setTimeout(() => {
      void persist(values).catch(() => {});
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [persist, values]);

  const submitStep = handleSubmit(async (data) => {
    await persist(data, true, nextStepKey);
    onNext();
  });

  return (
    <Card as="section" className={styles.stepCard}>
      <div className={styles.stepHeading}>
        <div>
          <p className={styles.eyebrow}>Current step</p>
          <h2>{step.label}</h2>
        </div>
        <span className={`${styles.saveState} ${styles[saveState]}`} role="status">
          {saveState === 'saving' ? 'Saving…' : null}
          {saveState === 'unsaved' ? 'Unsaved changes' : null}
          {saveState === 'saved' ? 'Progress saved' : null}
          {saveState === 'error' ? 'Autosave failed' : null}
        </span>
      </div>
      <form className={styles.form} onSubmit={submitStep} noValidate>
        <div className={styles.fields}>
          {step.fields.map((field) => (
            <FieldControl
              key={field.name}
              field={field}
              register={register}
              error={errors[field.name]}
            />
          ))}
        </div>
        <div className={styles.formActions}>
          {onBack ? <Button variant="secondary" onClick={onBack}>Back</Button> : null}
          <Button type="submit" isLoading={isSubmitting}>Save and continue</Button>
        </div>
      </form>
    </Card>
  );
}

function formatValue(value) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value === null || value === undefined || value === '') return 'Not supplied';
  return String(value);
}

function ReviewApplication({ application, definition, onBack, onSubmitted }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      const result = await submitApplication(application.id);
      onSubmitted(result.data.application);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card as="section" className={styles.reviewCard}>
      <div>
        <p className={styles.eyebrow}>Final review</p>
        <h2>Review your application</h2>
        <p>Check every section before submission. Submitted applications cannot be edited unless a reviewer requests more information.</p>
      </div>
      {error ? <Alert tone="error" title="Application could not be submitted">{error}</Alert> : null}
      <div className={styles.reviewSections}>
        {definition.steps.map((step) => {
          const stored = application.steps?.[step.key]?.data || {};
          return (
            <section key={step.key}>
              <h3>{step.label}</h3>
              <dl>
                {step.fields.map((field) => (
                  <div key={field.name}>
                    <dt>{field.label}</dt>
                    <dd>{formatValue(stored[field.name])}</dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        })}
      </div>
      {application.paymentRequired ? (
        <Alert tone="info" title="Payment follows submission">
          This application will move to payment pending. the current release will connect the configured payment provider.
        </Alert>
      ) : (
        <Alert tone="info" title="Submission workflow">
          Payment enforcement is currently disabled in site configuration. The application will enter the submitted queue.
        </Alert>
      )}
      <div className={styles.formActions}>
        <Button variant="secondary" onClick={onBack}>Back to declarations</Button>
        <Button isLoading={submitting} onClick={handleSubmit}>Submit application</Button>
      </div>
    </Card>
  );
}

function SubmittedApplication({ application, onWithdraw }) {
  return (
    <div className={styles.statusGrid}>
      <Card>
        <div className={styles.statusHeader}>
          <div>
            <p className={styles.eyebrow}>Application status</p>
            <h2>{application.typeLabel}</h2>
            <p className={styles.reference}>{application.reference}</p>
          </div>
          <StatusBadge tone={applicationStatusTones[application.status] || 'neutral'}>
            {applicationStatusLabels[application.status] || application.status}
          </StatusBadge>
        </div>
        <p>
          Your answers are securely stored. Applicant-visible review updates will appear in the status history below.
        </p>
        {['submitted', 'payment_pending', 'additional_information_required', 'resubmitted'].includes(application.status) ? (
          <Button variant="danger" onClick={onWithdraw}>Withdraw application</Button>
        ) : null}
      </Card>
      <Card>
        <ApplicationStatusTimeline history={application.statusHistory} />
      </Card>
    </div>
  );
}

function ApplicationWizardPage() {
  const { applicationId } = useParams();
  const [application, setApplication] = useState(null);
  const [activeStepKey, setActiveStepKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getApplication(applicationId)
      .then((result) => {
        if (!active) return;
        const loaded = result.data.application;
        setApplication(loaded);
        setActiveStepKey(loaded.currentStep || loaded.stepDefinitions?.[0]?.key || '');
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applicationId]);

  const definition = application ? applicationFormDefinitions[application.type] : null;
  const stepIndex = definition?.steps.findIndex((step) => step.key === activeStepKey) ?? -1;
  const currentStep = stepIndex >= 0 ? definition.steps[stepIndex] : null;
  const editable = application && editableStatuses.includes(application.status);

  function goNext() {
    if (stepIndex === definition.steps.length - 1) {
      setActiveStepKey('review');
      return;
    }
    setActiveStepKey(definition.steps[stepIndex + 1].key);
  }

  function goBack() {
    if (activeStepKey === 'review') {
      setActiveStepKey(definition.steps[definition.steps.length - 1].key);
      return;
    }
    if (stepIndex > 0) setActiveStepKey(definition.steps[stepIndex - 1].key);
  }

  async function handleWithdraw() {
    const confirmed = window.confirm(`Withdraw application ${application.reference}?`);
    if (!confirmed) return;
    try {
      const result = await withdrawApplication(
        application.id,
        'Withdrawn by the applicant from the application status page.',
      );
      setApplication(result.data.application);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }

  if (loading) {
    return <div className={styles.loading}><Loader label="Loading application" size="large" /></div>;
  }

  if (!application || !definition) {
    return (
      <section className="section">
        <div className="container">
          <Alert tone="error" title="Application unavailable">{error || 'The requested application could not be loaded.'}</Alert>
          <Button to="/dashboard/applications">Return to applications</Button>
        </div>
      </section>
    );
  }

  return (
    <>
      <Seo title={`${application.typeLabel} Application`} description="Manage and submit your iRAP application." noIndex />
      <section className="section">
        <div className={`container ${styles.container}`}>
          <header className={styles.header}>
            <div>
              <p className={styles.eyebrow}>{application.reference}</p>
              <h1>{application.typeLabel} application</h1>
              <p>{definition.description}</p>
            </div>
            <Button to="/dashboard/applications" variant="secondary">All applications</Button>
          </header>

          {error ? <Alert tone="error" title="Application error">{error}</Alert> : null}

          {editable ? (
            <>
              <ApplicationProgress
                activeStepKey={activeStepKey}
                completionPercentage={application.completionPercentage}
                steps={definition.steps}
              />
              {activeStepKey === 'review' ? (
                <ReviewApplication
                  application={application}
                  definition={definition}
                  onBack={goBack}
                  onSubmitted={(updated) => {
                    setApplication(updated);
                    setActiveStepKey('review');
                  }}
                />
              ) : currentStep ? (
                <StepForm
                  key={currentStep.key}
                  applicationId={application.id}
                  initialData={application.steps?.[currentStep.key]?.data || {}}
                  onApplicationChange={setApplication}
                  onBack={stepIndex > 0 ? goBack : null}
                  onNext={goNext}
                  nextStepKey={
                    stepIndex === definition.steps.length - 1
                      ? 'review'
                      : definition.steps[stepIndex + 1].key
                  }
                  step={currentStep}
                />
              ) : null}
            </>
          ) : (
            <SubmittedApplication application={application} onWithdraw={handleWithdraw} />
          )}
        </div>
      </section>
    </>
  );
}

export default ApplicationWizardPage;
