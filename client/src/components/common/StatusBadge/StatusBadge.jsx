import styles from './StatusBadge.module.css';

function StatusBadge({ children, showDot = true, tone = 'neutral' }) {
  return (
    <span className={`${styles.badge} ${styles[tone]}`}>
      {showDot ? <span className={styles.dot} aria-hidden="true" /> : null}
      <span>{children}</span>
    </span>
  );
}

export default StatusBadge;
