import { NavLink } from 'react-router-dom';
import { dashboardNavigation, roleDashboardDefinitions } from '../../../config/dashboardConfig.js';
import useAuth from '../../../hooks/useAuth.js';
import {
  getAdministrativeDestination,
  getPersonalJourneys,
} from '../../../utils/dashboardAccess.js';
import ResponsiveSidebar from '../ResponsiveSidebar/ResponsiveSidebar.jsx';
import styles from './DashboardSidebar.module.css';

function navClassName({ isActive }) {
  return `${styles.link} ${isActive ? styles.active : ''}`.trim();
}

function DashboardSidebarContent({ auth, onNavigate }) {
  const adminDestination = getAdministrativeDestination(auth.user);
  const journeys = getPersonalJourneys(auth.user);
  const hasJourney = journeys.size > 0;

  return (
    <div className={styles.sidebar}>
      <div className={styles.account}>
        <span className={styles.avatar} aria-hidden="true">
          {(auth.user?.displayName || 'I').slice(0, 1).toUpperCase()}
        </span>
        <div>
          <strong>{auth.user?.displayName}</strong>
          <small>{auth.user?.email}</small>
        </div>
      </div>

      <nav className={styles.navigation}>
        <p className={styles.groupLabel}>Workspace</p>
        {dashboardNavigation
          .filter((item) => !item.requiresJourney || hasJourney)
          .filter((item) => !item.permission || auth.hasPermission(item.permission))
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

        {hasJourney ? <p className={styles.groupLabel}>Role dashboards</p> : null}
        {Object.entries(roleDashboardDefinitions).map(([type, definition]) =>
          journeys.has(type) ? (
            <NavLink
              className={navClassName}
              key={type}
              to={definition.path}
              onClick={onNavigate}
            >
              {definition.shortLabel}
            </NavLink>
          ) : null,
        )}

        {adminDestination ? (
          <>
            <p className={styles.groupLabel}>Administration</p>
            <NavLink
              className={navClassName}
              to={adminDestination}
              onClick={onNavigate}
            >
              Admin workspace
            </NavLink>
          </>
        ) : null}
      </nav>
    </div>
  );
}

function DashboardSidebar() {
  const auth = useAuth();

  return (
    <ResponsiveSidebar
      ariaLabel="Account dashboard navigation"
      buttonLabel="Open account dashboard menu"
      buttonText="Account menu"
      belowSiteHeader
    >
      {({ onNavigate }) => (
        <DashboardSidebarContent auth={auth} onNavigate={onNavigate} />
      )}
    </ResponsiveSidebar>
  );
}

export default DashboardSidebar;
