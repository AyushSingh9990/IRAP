import { NavLink } from 'react-router-dom';
import useAuth from '../../../hooks/useAuth.js';
import { hasPersonalJourney } from '../../../utils/dashboardAccess.js';
import ResponsiveSidebar from '../ResponsiveSidebar/ResponsiveSidebar.jsx';
import styles from './AdminSidebar.module.css';

const navigation = Object.freeze([
  { label: 'Review dashboard', to: '/admin', end: true, permission: 'application:review' },
  { label: 'Application queue', to: '/admin/applications', permission: 'application:review' },
  { label: 'Document review', to: '/admin/documents', permission: 'document:review' },
  { label: 'Payments', to: '/admin/payments', permission: 'payment:manage' },
  { label: 'Billing', to: '/admin/billing', permission: 'payment:manage' },
  { label: 'Memberships', to: '/admin/memberships', permission: 'membership:manage' },
  { label: 'Course accreditation', to: '/admin/courses', permission: 'course:review' },
  { label: 'Article moderation', to: '/admin/articles', permission: 'article:moderate' },
  { label: 'Article categories', to: '/admin/article-taxonomy', permission: 'article:taxonomy:manage' },
  { label: 'Audit history', to: '/admin/audit', permission: 'audit:read' },
  { label: 'Site settings', to: '/admin/site-settings', permission: 'site:settings:manage' },
  { label: 'Content pages', to: '/admin/content-pages', permission: 'content:manage' },
  { label: 'Templates', to: '/admin/templates', permission: 'template:manage' },
  { label: 'Support & complaints', to: '/admin/support', permission: 'support:manage' },
  { label: 'Users', to: '/admin/users', permission: 'user:manage' },
  { label: 'Roles & permissions', to: '/admin/roles', permission: 'role:manage' },
  { label: 'System health', to: '/admin/system-health', permission: 'system:manage' },
]);

function navClassName({ isActive }) {
  return `${styles.link} ${isActive ? styles.active : ''}`.trim();
}

function AdminSidebarContent({ auth, onNavigate }) {
  const showPersonalDashboard = hasPersonalJourney(auth.user);

  return (
    <div className={styles.sidebar}>
      <div className={styles.heading}>
        <span className={styles.mark} aria-hidden="true">A</span>
        <div>
          <strong>iRAP administration</strong>
          <small>{auth.user?.displayName}</small>
        </div>
      </div>
      <nav className={styles.navigation}>
        {navigation
          .filter((item) => auth.hasPermission(item.permission))
          .map((item) => (
            <NavLink
              className={navClassName}
              end={item.end}
              key={item.to}
              to={item.to}
              onClick={onNavigate}
            >
              {item.label}
            </NavLink>
          ))}

        <div className={styles.accountLinks}>
          <NavLink
            className={navClassName}
            to="/dashboard/account"
            onClick={onNavigate}
          >
            Account settings
          </NavLink>
          {showPersonalDashboard ? (
            <NavLink
              className={navClassName}
              to="/dashboard"
              onClick={onNavigate}
            >
              Personal account dashboard
            </NavLink>
          ) : null}
        </div>
      </nav>
    </div>
  );
}

function AdminSidebar() {
  const auth = useAuth();

  return (
    <ResponsiveSidebar
      ariaLabel="Administration navigation"
      buttonLabel="Open administration menu"
      buttonText="Administration menu"
    >
      {({ onNavigate }) => (
        <AdminSidebarContent auth={auth} onNavigate={onNavigate} />
      )}
    </ResponsiveSidebar>
  );
}

export default AdminSidebar;
