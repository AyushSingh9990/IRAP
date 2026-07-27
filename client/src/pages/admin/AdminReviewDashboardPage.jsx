import { useEffect, useState } from 'react';
import { getAdminReviewDashboard } from '../../api/reviewApi.js';
import Alert from '../../components/common/Alert/Alert.jsx';
import Button from '../../components/common/Button/Button.jsx';
import Card from '../../components/common/Card/Card.jsx';
import EmptyState from '../../components/common/EmptyState/EmptyState.jsx';
import Loader from '../../components/common/Loader/Loader.jsx';
import StatusBadge from '../../components/common/StatusBadge/StatusBadge.jsx';
import Seo from '../../components/seo/Seo.jsx';
import { applicationStatusLabels, applicationStatusTones } from '../../config/applicationForms.js';
import { auditActionLabels, auditOutcomeTones } from '../../config/reviewConfig.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './AdminReviewDashboardPage.module.css';

const priorityStatuses = [
  'submitted',
  'payment_confirmed',
  'under_review',
  'additional_information_required',
  'resubmitted',
  'approved',
  'rejected',
  'suspended',
];

function AdminReviewDashboardPage() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getAdminReviewDashboard()
      .then((result) => { if (active) setOverview(result.data.overview); })
      .catch((requestError) => { if (active) setError(getApiErrorMessage(requestError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) return <div className={styles.loading}><Loader label="Loading review dashboard" size="large" /></div>;

  return (
    <>
      <Seo title="Admin review dashboard" description="Manage private iRAP application reviews." noIndex />
      <div className={styles.container}>
        <header className={styles.header}>
          <div><p className={styles.eyebrow}>Administrative review</p><h1>Review dashboard</h1><p>Monitor application queues, assignments, due dates, decisions, and audited workflow activity.</p></div>
          <Button to="/admin/applications">Open application queue</Button>
        </header>
        {error ? <Alert tone="error" title="Review dashboard could not load">{error}</Alert> : null}
        {overview ? (
          <>
            <section className={styles.metrics} aria-label="Review workload summary">
              <Card><span>Unassigned</span><strong>{overview.unassigned}</strong><small>Awaiting assignment</small></Card>
              <Card><span>Assigned to me</span><strong>{overview.assignedToMe}</strong><small>Open review cases</small></Card>
              <Card><span>Overdue</span><strong>{overview.overdue}</strong><small>Past the review due date</small></Card>
              <Card><span>Due in 3 days</span><strong>{overview.dueSoon}</strong><small>Upcoming review deadlines</small></Card>
            </section>

            <div className={styles.grid}>
              <Card className={styles.panel}>
                <div className={styles.panelHeading}><h2>Application statuses</h2><Button to="/admin/applications" size="small" variant="secondary">View queue</Button></div>
                <div className={styles.statusList}>
                  {priorityStatuses.map((status) => (
                    <div key={status}><StatusBadge tone={applicationStatusTones[status] || 'neutral'}>{applicationStatusLabels[status] || status}</StatusBadge><strong>{overview.counts[status] || 0}</strong></div>
                  ))}
                </div>
              </Card>

              <Card className={styles.panel}>
                <div className={styles.panelHeading}><h2>Reviewer workload</h2></div>
                {overview.reviewerWorkloads.length === 0 ? (
                  <EmptyState title="No assigned reviewer workload" description="Reviewer workload appears after applications are assigned." />
                ) : (
                  <div className={styles.workloadList}>
                    {overview.reviewerWorkloads.map((item, index) => (
                      <article key={item.reviewer?.id || `reviewer-${index}`}>
                        <div><strong>{item.reviewer?.displayName || 'Unknown reviewer'}</strong><small>{item.reviewer?.email}</small></div>
                        <div><span>{item.assigned} assigned</span><span>{item.overdue} overdue</span></div>
                      </article>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <Card className={styles.panel}>
              <div className={styles.panelHeading}><h2>Recent audited activity</h2>{overview.permissions.canReadAudit ? <Button to="/admin/audit" size="small" variant="secondary">Full audit history</Button> : null}</div>
              {overview.recentAudit.length === 0 ? (
                <EmptyState title="No audit activity" description="Critical review actions will appear here." />
              ) : (
                <div className={styles.auditList}>
                  {overview.recentAudit.map((entry) => (
                    <article key={entry.id}>
                      <div><strong>{auditActionLabels[entry.action] || entry.action}</strong><p>{entry.application?.reference || entry.entityId}</p><small>{entry.actor?.displayName || 'System'} · {new Date(entry.createdAt).toLocaleString()}</small></div>
                      <StatusBadge tone={auditOutcomeTones[entry.outcome] || 'neutral'}>{entry.outcome}</StatusBadge>
                    </article>
                  ))}
                </div>
              )}
            </Card>
          </>
        ) : null}
      </div>
    </>
  );
}

export default AdminReviewDashboardPage;
