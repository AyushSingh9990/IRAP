import styles from './SectionHeading.module.css';

function SectionHeading({ align = 'left', description, eyebrow, title }) {
  return (
    <div className={`${styles.heading} ${styles[align]}`}>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2>{title}</h2>
      {description ? <p className={styles.description}>{description}</p> : null}
    </div>
  );
}

export default SectionHeading;
