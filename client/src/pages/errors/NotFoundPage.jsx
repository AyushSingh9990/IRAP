import Button from '../../components/common/Button/Button.jsx';
import Card from '../../components/common/Card/Card.jsx';
import styles from './NotFoundPage.module.css';

function NotFoundPage() {
  return (
    <div className={styles.page}>
      <div className="container">
        <Card className={styles.panel} padding="large" variant="elevated">
          <p className={styles.code}>404</p>
          <p className="eyebrow">Page not found</p>
          <h1>The requested page is unavailable.</h1>
          <p>
            The address may be incorrect, or the route may belong to a later
            current release.
          </p>
          <div className="cluster">
            <Button to="/">Return home</Button>
            <Button to="/about" variant="secondary">
              View current foundation
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default NotFoundPage;
