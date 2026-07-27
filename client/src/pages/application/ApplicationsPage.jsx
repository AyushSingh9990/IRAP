import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '../../components/common/Alert/Alert.jsx';
import Button from '../../components/common/Button/Button.jsx';
import Card from '../../components/common/Card/Card.jsx';
import EmptyState from '../../components/common/EmptyState/EmptyState.jsx';
import Loader from '../../components/common/Loader/Loader.jsx';
import StatusBadge from '../../components/common/StatusBadge/StatusBadge.jsx';
import Seo from '../../components/seo/Seo.jsx';
import {
  createApplication,
  listApplications,
  withdrawApplication,
} from '../../api/applicationApi.js';
import {
  applicationFormDefinitions,
  applicationStatusLabels,
  applicationStatusTones,
} from '../../config/applicationForms.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './ApplicationsPage.module.css';

const applicationTypes = ['member', 'training_provider', 'organization'];

function ApplicationsPage() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingType, setCreatingType] = useState('');
  const [error, setError] = useState('');

  const currentTypes = useMemo(
    () => new Set(applications.filter((item) => item.isCurrent).map((item) => item.type)),
    [applications],
  );

  useEffect(() => {
    let active = true;
    listApplications()
      .then((result) => {
        if (active) setApplications(result.data.applications);
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
  }, []);

  async function handleCreate(type) {
    setCreatingType(type);
    setError('');
    try {
      const result = await createApplication(type);
      navigate(`/dashboard/applications/${result.data.application.id}`);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setCreatingType('');
    }
  }

  async function handleWithdraw(application) {
    const confirmed = window.confirm(
      `Withdraw application ${application.reference}? This action cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      const result = await withdrawApplication(
        application.id,
        'Withdrawn by the applicant from the applications dashboard.',
      );
      setApplications((current) =>
        current.map((item) =>
          item.id === application.id ? result.data.application : item,
        ),
      );
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }

  return (
    <>
      <Seo title="My Applications" description="Create and manage iRAP membership and accreditation applications." noIndex />
      <section className="section">
        <div className={`container ${styles.container}`}>
          <header className={styles.header}>
            <div>
              <p className={styles.eyebrow}>Application centre</p>
              <h1>Membership and accreditation applications</h1>
              <p>Create a draft, save progress, review your answers, and submit when complete.</p>
            </div>
            <div className={styles.headerActions}>
              <Button to="/dashboard/documents" variant="secondary">Documents</Button>
              <Button to="/dashboard/payments" variant="secondary">Payments</Button>
              <Button to="/dashboard" variant="secondary">Back to dashboard</Button>
            </div>
          </header>

          {error ? <Alert tone="error" title="Application request failed">{error}</Alert> : null}

          <section className={styles.journeys} aria-labelledby="start-application-title">
            <div>
              <h2 id="start-application-title">Start an application</h2>
              <p>You may hold more than one approved role under the same account.</p>
            </div>
            <div className={styles.journeyGrid}>
              {applicationTypes.map((type) => {
                const definition = applicationFormDefinitions[type];
                const alreadyCurrent = currentTypes.has(type);
                return (
                  <Card key={type}>
                    <h3>{definition.label}</h3>
                    <p>{definition.description}</p>
                    <Button
                      fullWidth
                      disabled={alreadyCurrent}
                      isLoading={creatingType === type}
                      onClick={() => handleCreate(type)}
                    >
                      {alreadyCurrent ? 'Current application exists' : 'Start application'}
                    </Button>
                  </Card>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="existing-applications-title">
            <div className={styles.sectionHeading}>
              <div>
                <h2 id="existing-applications-title">Your applications</h2>
                <p>Track drafts, submissions, and applicant-visible status updates.</p>
              </div>
            </div>

            {loading ? (
              <div className={styles.loading}><Loader label="Loading applications" /></div>
            ) : applications.length === 0 ? (
              <EmptyState
                title="No applications yet"
                description="Choose an application type above to create your first draft."
              />
            ) : (
              <div className={styles.applicationList}>
                {applications.map((application) => (
                  <Card key={application.id} className={styles.applicationCard}>
                    <div className={styles.applicationHeading}>
                      <div>
                        <p className={styles.reference}>{application.reference}</p>
                        <h3>{application.typeLabel}</h3>
                        {application.purpose === 'renewal' ? <small>Renewal application</small> : null}
                      </div>
                      <StatusBadge tone={applicationStatusTones[application.status] || 'neutral'}>
                        {applicationStatusLabels[application.status] || application.status}
                      </StatusBadge>
                    </div>
                    <div className={styles.progressRow}>
                      <div className={styles.progressTrack}>
                        <span style={{ width: `${application.completionPercentage}%` }} />
                      </div>
                      <strong>{application.completionPercentage}%</strong>
                    </div>
                    <div className={styles.actions}>
                      {application.status === 'payment_pending' ? (
                        <Button to="/dashboard/payments">Pay now</Button>
                      ) : null}
                      <Button to={`/dashboard/applications/${application.id}`}>
                        {application.status === 'draft' || application.status === 'additional_information_required'
                          ? 'Continue application'
                          : 'View status'}
                      </Button>
                      {['draft', 'submitted', 'payment_pending', 'additional_information_required', 'resubmitted'].includes(application.status) ? (
                        <Button variant="danger" onClick={() => handleWithdraw(application)}>
                          Withdraw
                        </Button>
                      ) : null}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </>
  );
}

export default ApplicationsPage;
