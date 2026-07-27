import styles from './Loader.module.css';

function Loader({ label = 'Loading', size = 'medium' }) {
  return (
    <div className={styles.wrapper} role="status" aria-live="polite">
      <span className={`${styles.spinner} ${styles[size]}`} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export default Loader;
