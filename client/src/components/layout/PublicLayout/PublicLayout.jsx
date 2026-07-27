import { Outlet } from 'react-router-dom';
import RouteAnnouncer from '../../accessibility/RouteAnnouncer/RouteAnnouncer.jsx';
import AnnouncementBar from '../AnnouncementBar/AnnouncementBar.jsx';
import Footer from '../Footer/Footer.jsx';
import Header from '../Header/Header.jsx';
import ScrollToTop from '../ScrollToTop/ScrollToTop.jsx';
import styles from './PublicLayout.module.css';

function PublicLayout() {
  return (
    <div className={styles.pageShell}>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <AnnouncementBar />
      <Header />
      <main id="main-content" className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
      <RouteAnnouncer />
      <ScrollToTop />
    </div>
  );
}

export default PublicLayout;
