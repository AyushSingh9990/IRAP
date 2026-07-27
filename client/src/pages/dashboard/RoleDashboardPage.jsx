import { useEffect, useMemo, useState } from 'react';
import { getDashboardOverview } from '../../api/dashboardApi.js';
import Alert from '../../components/common/Alert/Alert.jsx';
import Button from '../../components/common/Button/Button.jsx';
import Card from '../../components/common/Card/Card.jsx';
import EmptyState from '../../components/common/EmptyState/EmptyState.jsx';
import Loader from '../../components/common/Loader/Loader.jsx';
import StatusBadge from '../../components/common/StatusBadge/StatusBadge.jsx';
import Seo from '../../components/seo/Seo.jsx';
import { applicationStatusLabels, applicationStatusTones } from '../../config/applicationForms.js';
import { roleDashboardDefinitions } from '../../config/dashboardConfig.js';
import { paymentStatusLabels, paymentStatusTones } from '../../config/paymentConfig.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './RoleDashboardPage.module.css';

function safePaymentTone(status) {
  const tone = paymentStatusTones[status];
  return tone === 'danger' ? 'error' : tone || 'neutral';
}

function RoleDashboardPage({ type }) {
  const definition = roleDashboardDefinitions[type];
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getDashboardOverview()
      .then((result) => {
        if (active) setOverview(result.data.overview);
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const journey = useMemo(
    () => overview?.roleJourneys.find((item) => item.type === type) || null,
    [overview, type],
  );
  const rolePayments = useMemo(() => {
    const applicationId = journey?.application?.id;
    return applicationId
      ? overview?.payments.latest.filter((payment) => payment.application === applicationId) || []
      : [];
  }, [journey, overview]);

  if (loading) return <div className={styles.loading}><Loader label={`Loading ${definition.shortLabel} dashboard`} /></div>;

  return (
    <>
      <Seo title={`${definition.label} dashboard`} description={definition.description} noIndex />
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>{definition.eyebrow}</p>
            <h1>{definition.label} dashboard</h1>
            <p>{definition.description}</p>
          </div>
          {journey ? (
            <StatusBadge tone={journey.approvedRole ? 'success' : 'info'}>
              {journey.approvedRole ? 'Approved role' : 'Application journey'}
            </StatusBadge>
          ) : null}
        </header>

        {error ? <Alert tone="error">{error}</Alert> : null}

        {!journey ? (
          <EmptyState
            title={`No ${definition.shortLabel.toLowerCase()} journey found`}
            description="Start the matching application from the application centre."
            actionLabel="Open application centre"
            actionTo="/dashboard/applications"
          />
        ) : (
          <>
            <section className={styles.heroGrid}>
              <Card className={styles.progressCard}>
                <span>Profile and application completion</span>
                <strong>{journey.profileCompletionPercentage}%</strong>
                <div className={styles.progressTrack}><span style={{ width: `${journey.profileCompletionPercentage}%` }} /></div>
                <p>The percentage is calculated from server-validated application fields. It does not represent approval.</p>
              </Card>

              <Card className={styles.statusCard}>
                <span>Current status</span>
                {journey.application ? (
                  <>
                    <StatusBadge tone={applicationStatusTones[journey.application.status] || 'neutral'}>
                      {applicationStatusLabels[journey.application.status] || journey.application.status}
                    </StatusBadge>
                    <strong>{journey.application.reference}</strong>
                    <Button to={`/dashboard/applications/${journey.application.id}`}>Open application</Button>
                  </>
                ) : (
                  <>
                    <strong>No application created</strong>
                    <Button to="/dashboard/applications">Start application</Button>
                  </>
                )}
              </Card>
            </section>

            <section className={styles.moduleGrid} aria-label={`${definition.label} modules`}>
              <Card><h2>Application</h2><p>Review answers, continue an editable draft, and track applicant-visible status history.</p><Button to="/dashboard/applications" variant="secondary">Applications</Button></Card>
              <Card><h2>Documents</h2><p>Upload private supporting evidence and respond to document review requests.</p><Button to="/dashboard/documents" variant="secondary">Documents</Button></Card>
              <Card><h2>Payments</h2><p>Review payment requirements, transaction history, and available receipts.</p><Button to="/dashboard/payments" variant="secondary">Payments</Button></Card>
              <Card><h2>Notifications</h2><p>Read application, document, payment, and account-security updates.</p><Button to="/dashboard/notifications" variant="secondary">Notifications</Button></Card>
              <Card><h2>Account settings</h2><p>Maintain display, contact, language, time-zone, password, and active-session settings.</p><Button to="/dashboard/account" variant="secondary">Account settings</Button></Card>
            </section>

            <section className={styles.sectionBlock} aria-labelledby="role-payment-history-title">
              <div className={styles.sectionHeading}><h2 id="role-payment-history-title">Related payment history</h2><Button to="/dashboard/payments" variant="secondary" size="small">All payments</Button></div>
              {rolePayments.length === 0 ? (
                <EmptyState title="No related payments" description="Transactions for this role application will appear here." />
              ) : (
                <div className={styles.list}>
                  {rolePayments.map((payment) => (
                    <Card className={styles.paymentCard} key={payment.id}>
                      <div><strong>{payment.reference}</strong><small>{payment.planName || 'Application payment'}</small></div>
                      <StatusBadge tone={safePaymentTone(payment.status)}>{paymentStatusLabels[payment.status] || payment.status}</StatusBadge>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}

export default RoleDashboardPage;
