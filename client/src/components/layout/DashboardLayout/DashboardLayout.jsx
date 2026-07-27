import { Outlet } from 'react-router-dom';
import DashboardSidebar from '../DashboardSidebar/DashboardSidebar.jsx';
import styles from './DashboardLayout.module.css';

function DashboardLayout() {
  return (
    <section className={styles.section}>
      <div className={`container ${styles.layout}`}>
        <DashboardSidebar />
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </section>
  );
}

export default DashboardLayout;
