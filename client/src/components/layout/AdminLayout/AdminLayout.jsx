import { Outlet } from 'react-router-dom';
import RouteAnnouncer from '../../accessibility/RouteAnnouncer/RouteAnnouncer.jsx';
import AdminSidebar from '../AdminSidebar/AdminSidebar.jsx';
import styles from './AdminLayout.module.css';

function AdminLayout() {
  return (
    <section className={styles.section}>
      <div className={`container ${styles.layout}`}>
        <AdminSidebar />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
      <RouteAnnouncer />
    </section>
  );
}

export default AdminLayout;
