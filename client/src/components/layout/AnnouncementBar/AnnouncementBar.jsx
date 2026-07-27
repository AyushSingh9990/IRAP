import { Link } from 'react-router-dom';
import Icon from '../../common/Icon/Icon.jsx';
import styles from './AnnouncementBar.module.css';

function AnnouncementBar() {
  return (
    <div className={styles.bar}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.message}>
          <Icon name="shield" size={17} />
          <span>Professional membership, accreditation, and public verification</span>
        </div>
        <nav aria-label="Utility navigation">
          <Link to="/faq">FAQ</Link>
          <Link to="/contact">Contact</Link>
        </nav>
      </div>
    </div>
  );
}

export default AnnouncementBar;
