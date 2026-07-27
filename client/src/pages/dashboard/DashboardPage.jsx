import { useEffect, useState } from 'react';
import { getDashboardOverview } from '../../api/dashboardApi.js';
import Alert from '../../components/common/Alert/Alert.jsx';
import Button from '../../components/common/Button/Button.jsx';
import Card from '../../components/common/Card/Card.jsx';
import EmptyState from '../../components/common/EmptyState/EmptyState.jsx';
import Loader from '../../components/common/Loader/Loader.jsx';
import StatusBadge from '../../components/common/StatusBadge/StatusBadge.jsx';
import Seo from '../../components/seo/Seo.jsx';
import {
  applicationStatusLabels,
  applicationStatusTones,
} from '../../config/applicationForms.js';
import {
  notificationCategoryLabels,
  notificationCategoryTones,
  roleDashboardDefinitions,
} from '../../config/dashboardConfig.js';
import { formatMinorAmount } from '../../config/paymentConfig.js';
import useAuth from '../../hooks/useAuth.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './DashboardPage.module.css';

function DashboardPage() {
  const auth = useAuth();
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
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <div className={styles.loading}><Loader label="Loading dashboard" size="large" /></div>;
  }

  return (
    <>
      <Seo title="Account dashboard" description="Manage your iRAP account and applications." noIndex />
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Shared dashboard</p>
            <h1>Welcome, {auth.user.displayName}</h1>
            <p>Track every requested role, application, document, payment, notification, and account setting from one secure workspace.</p>
          </div>
          <StatusBadge tone="success">{auth.user.accountStatus}</StatusBadge>
        </header>

        {error ? <Alert tone="error" title="Dashboard could not load">{error}</Alert> : null}

        {overview ? (
          <>
            <section className={styles.metrics} aria-label="Account summary">
              <Card>
                <span className={styles.metricLabel}>Account completion</span>
                <strong className={styles.metricValue}>{overview.account.completionPercentage}%</strong>
                <div className={styles.progressTrack}><span style={{ width: `${overview.account.completionPercentage}%` }} /></div>
              </Card>
              <Card>
                <span className={styles.metricLabel}>Current applications</span>
                <strong className={styles.metricValue}>{overview.applications.length}</strong>
                <Button to="/dashboard/applications" variant="secondary" size="small">View applications</Button>
              </Card>
              <Card>
                <span className={styles.metricLabel}>Current documents</span>
                <strong className={styles.metricValue}>{overview.documents.total || 0}</strong>
                <Button to="/dashboard/documents" variant="secondary" size="small">View documents</Button>
              </Card>
              <Card>
                <span className={styles.metricLabel}>Unread notifications</span>
                <strong className={styles.metricValue}>{overview.notifications.unreadCount}</strong>
                <Button to="/dashboard/notifications" variant="secondary" size="small">Open notifications</Button>
              </Card>
            </section>

            <section className={styles.sectionBlock} aria-labelledby="role-workspaces-title">
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.eyebrow}>Role workspaces</p>
                  <h2 id="role-workspaces-title">Your membership and accreditation journeys</h2>
                </div>
              </div>
              {overview.roleJourneys.length === 0 ? (
                <EmptyState title="No role journey selected" description="Start a membership, training-provider, or organization application." />
              ) : (
                <div className={styles.roleGrid}>
                  {overview.roleJourneys.map((journey) => {
                    const definition = roleDashboardDefinitions[journey.type];
                    return (
                      <Card className={styles.roleCard} key={journey.type}>
                        <div className={styles.cardHeading}>
                          <div>
                            <p className={styles.eyebrow}>{definition.eyebrow}</p>
                            <h3>{definition.label}</h3>
                          </div>
                          <StatusBadge tone={journey.approvedRole ? 'success' : 'info'}>
                            {journey.approvedRole ? 'Approved role' : 'Applicant journey'}
                          </StatusBadge>
                        </div>
                        <p>{definition.description}</p>
                        <div className={styles.progressRow}>
                          <div className={styles.progressTrack}><span style={{ width: `${journey.profileCompletionPercentage}%` }} /></div>
                          <strong>{journey.profileCompletionPercentage}%</strong>
                        </div>
                        {journey.application ? (
                          <p className={styles.reference}>
                            {journey.application.reference} · {applicationStatusLabels[journey.application.status] || journey.application.status}
                          </p>
                        ) : (
                          <p className={styles.reference}>No current application exists.</p>
                        )}
                        <Button to={definition.path}>Open role dashboard</Button>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>

            <div className={styles.twoColumn}>
              <section className={styles.sectionBlock} aria-labelledby="application-progress-title">
                <div className={styles.sectionHeading}>
                  <h2 id="application-progress-title">Application progress</h2>
                  <Button to="/dashboard/applications" variant="secondary" size="small">All applications</Button>
                </div>
                {overview.applications.length === 0 ? (
                  <EmptyState title="No current applications" description="Create an application to begin a role journey." />
                ) : (
                  <div className={styles.list}>
                    {overview.applications.map((application) => (
                      <Card className={styles.compactCard} key={application.id}>
                        <div className={styles.cardHeading}>
                          <div><strong>{application.typeLabel}</strong><small>{application.reference}</small></div>
                          <StatusBadge tone={applicationStatusTones[application.status] || 'neutral'}>
                            {applicationStatusLabels[application.status] || application.status}
                          </StatusBadge>
                        </div>
                        <div className={styles.progressRow}>
                          <div className={styles.progressTrack}><span style={{ width: `${application.completionPercentage}%` }} /></div>
                          <strong>{application.completionPercentage}%</strong>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </section>

              <section className={styles.sectionBlock} aria-labelledby="payment-summary-title">
                <div className={styles.sectionHeading}>
                  <h2 id="payment-summary-title">Payment summary</h2>
                  {auth.hasPermission('payment:read:self') ? <Button to="/dashboard/payments" variant="secondary" size="small">Payment history</Button> : null}
                </div>
                <Card className={styles.paymentSummary}>
                  <div><span>Successful payments</span><strong>{overview.payments.successfulCount}</strong></div>
                  {overview.payments.totalsByCurrency.length === 0 ? (
                    <div><span>Net paid total</span><strong>No confirmed payments</strong></div>
                  ) : overview.payments.totalsByCurrency.map((total) => (
                    <div key={total.currency}>
                      <span>Net paid total ({total.currency})</span>
                      <strong>{formatMinorAmount(total.paidTotalMinor, total.currency)}</strong>
                    </div>
                  ))}
                </Card>
              </section>
            </div>

            <section className={styles.sectionBlock} aria-labelledby="latest-notifications-title">
              <div className={styles.sectionHeading}>
                <h2 id="latest-notifications-title">Latest notifications</h2>
                <Button to="/dashboard/notifications" variant="secondary" size="small">View all</Button>
              </div>
              {overview.notifications.latest.length === 0 ? (
                <EmptyState title="No notifications" description="Application, payment, document, and security updates will appear here." />
              ) : (
                <div className={styles.list}>
                  {overview.notifications.latest.map((notification) => (
                    <Card className={styles.notificationCard} key={notification.id}>
                      <div>
                        <StatusBadge tone={notificationCategoryTones[notification.category] || 'neutral'}>
                          {notificationCategoryLabels[notification.category] || notification.category}
                        </StatusBadge>
                        <h3>{notification.title}</h3>
                        <p>{notification.message}</p>
                      </div>
                      {notification.actionUrl ? <Button to={notification.actionUrl} variant="secondary" size="small">Open</Button> : null}
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </>
  );
}

export default DashboardPage;
