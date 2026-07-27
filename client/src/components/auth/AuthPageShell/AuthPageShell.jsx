import Card from '../../common/Card/Card.jsx';
import styles from './AuthPageShell.module.css';

function AuthPageShell({ eyebrow = 'Secure account access', title, description, children }) {
  return (
    <section className={styles.section}>
      <div className={`container ${styles.container}`}>
        <div className={styles.introduction}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1>{title}</h1>
          {description ? <p>{description}</p> : null}
          <ul className={styles.assurances}>
            <li>HTTP-only authentication cookies</li>
            <li>No authentication tokens in local storage</li>
            <li>Role and permission checks on the server</li>
          </ul>
        </div>
        <Card className={styles.card} padding="large">{children}</Card>
      </div>
    </section>
  );
}

export default AuthPageShell;
