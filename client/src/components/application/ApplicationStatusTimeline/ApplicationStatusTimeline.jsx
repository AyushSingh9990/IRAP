import { applicationStatusLabels } from '../../../config/applicationForms.js';
import styles from './ApplicationStatusTimeline.module.css';

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function ApplicationStatusTimeline({ history = [] }) {
  if (history.length === 0) return null;

  return (
    <section className={styles.timeline} aria-labelledby="status-history-title">
      <h2 id="status-history-title">Status history</h2>
      <ol>
        {[...history].reverse().map((entry) => (
          <li key={entry._id || `${entry.newStatus}-${entry.changedAt}`}>
            <span className={styles.marker} aria-hidden="true" />
            <div>
              <div className={styles.heading}>
                <strong>{applicationStatusLabels[entry.newStatus] || entry.newStatus}</strong>
                <time dateTime={entry.changedAt}>{formatDate(entry.changedAt)}</time>
              </div>
              {entry.applicantVisibleNote ? <p>{entry.applicantVisibleNote}</p> : null}
              {entry.reason ? <p className={styles.reason}>Reason: {entry.reason}</p> : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default ApplicationStatusTimeline;
