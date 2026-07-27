import styles from './ApplicationProgress.module.css';

function ApplicationProgress({ activeStepKey, completionPercentage = 0, steps = [] }) {
  return (
    <section className={styles.progress} aria-labelledby="application-progress-title">
      <div className={styles.summary}>
        <div>
          <p className={styles.eyebrow}>Application progress</p>
          <h2 id="application-progress-title">{completionPercentage}% complete</h2>
        </div>
        <span className={styles.percentage} aria-hidden="true">
          {completionPercentage}%
        </span>
      </div>
      <div
        className={styles.track}
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={completionPercentage}
        aria-label="Application completion"
      >
        <span style={{ width: `${completionPercentage}%` }} />
      </div>
      <ol className={styles.steps}>
        {steps.map((step, index) => {
          const active = step.key === activeStepKey;
          return (
            <li key={step.key} className={active ? styles.active : ''}>
              <span>{index + 1}</span>
              <strong>{step.label}</strong>
            </li>
          );
        })}
        <li className={activeStepKey === 'review' ? styles.active : ''}>
          <span>{steps.length + 1}</span>
          <strong>Review and submit</strong>
        </li>
      </ol>
    </section>
  );
}

export default ApplicationProgress;
