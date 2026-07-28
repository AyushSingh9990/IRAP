import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { accountNavigation, publicNavigation } from '../../../config/navigation.js';
import Button from '../../common/Button/Button.jsx';
import Icon from '../../common/Icon/Icon.jsx';
import useAuth from '../../../hooks/useAuth.js';
import MobileNavigation from '../MobileNavigation/MobileNavigation.jsx';
import { getPrimaryWorkspaceDestination } from '../../../utils/dashboardAccess.js';
import styles from './Header.module.css';

function NavigationDropdown({ item }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  const buttonRef = useRef(null);
  const location = useLocation();
  const hasActiveChild = item.children.some(
    (child) => child.available && location.pathname.startsWith(child.to),
  );

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (
        event.key === 'Escape' &&
        wrapperRef.current?.contains(document.activeElement)
      ) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <li ref={wrapperRef} className={styles.dropdownItem}>
      <button
        ref={buttonRef}
        className={`${styles.navButton} ${hasActiveChild ? styles.active : ''}`}
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>{item.label}</span>
        <Icon
          className={isOpen ? styles.rotated : ''}
          name="chevronDown"
          size={16}
        />
      </button>
      {isOpen ? (
        <ul className={styles.dropdownMenu}>
          {item.children.map((child) => (
            <li key={child.to}>
              {child.available ? (
                <NavLink
                  className={({ isActive }) =>
                    `${styles.dropdownLink} ${isActive ? styles.dropdownActive : ''}`
                  }
                  to={child.to}
                  onClick={() => setIsOpen(false)}
                >
                  {child.label}
                </NavLink>
              ) : (
                <span
                  className={styles.dropdownUnavailable}
                  aria-disabled="true"
                  title="Not available yet"
                >
                  {child.label}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function Header() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const closeMobileNavigation = useCallback(() => setIsMobileOpen(false), []);
  const auth = useAuth();
  const navigate = useNavigate();

  const handleLogout = useCallback(async () => {
    await auth.logout();
    setIsMobileOpen(false);
    navigate('/', { replace: true });
  }, [auth, navigate]);

  const navigationItems = useMemo(() => {
    if (!auth.isAuthenticated) return publicNavigation;

    return publicNavigation.map((item) => {
      if (!item.children) return item;

      return {
        ...item,
        children: item.children.filter(
          (child) => !child.to.startsWith('/register'),
        ),
      };
    });
  }, [auth.isAuthenticated]);

  const workspaceDestination = getPrimaryWorkspaceDestination(auth.user);
  const accountItems = auth.isAuthenticated
    ? [
        {
          label: workspaceDestination.startsWith('/admin') ? 'Admin dashboard' : 'Dashboard',
          to: workspaceDestination,
          available: true,
          variant: 'ghost',
        },
        { label: 'Log out', available: true, variant: 'primary', onClick: handleLogout },
      ]
    : accountNavigation;

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link className={styles.brand} to="/" aria-label="iRAP home">
          <img
            aria-hidden="true"
            className={styles.brandLogo}
            src="/irap-logo-header.webp"
            alt=""
          />
        </Link>

        <nav className={styles.desktopNavigation} aria-label="Primary navigation">
          <ul className={styles.navigationList}>
            {navigationItems.map((item) =>
              item.children ? (
                <NavigationDropdown key={item.label} item={item} />
              ) : (
                <li key={item.to}>
                  {item.available ? (
                    <NavLink
                      className={({ isActive }) =>
                        `${styles.navLink} ${isActive ? styles.active : ''}`
                      }
                      to={item.to}
                      end={item.to === '/'}
                    >
                      {item.label}
                    </NavLink>
                  ) : (
                    <span
                      className={styles.navUnavailable}
                      aria-disabled="true"
                      title="Not available yet"
                    >
                      {item.label}
                    </span>
                  )}
                </li>
              ),
            )}
          </ul>
        </nav>

        <div className={styles.desktopActions}>
          {accountItems.map((item) => (
            <Button
              key={item.to || item.label}
              disabled={!item.available || auth.isLoading}
              onClick={item.onClick}
              size="small"
              to={item.to}
              variant={item.variant}
            >
              {item.label}
            </Button>
          ))}
        </div>

        <button
          className={styles.menuButton}
          type="button"
          aria-label="Open navigation"
          aria-expanded={isMobileOpen}
          onClick={() => setIsMobileOpen(true)}
        >
          <Icon name="menu" size={24} />
        </button>
      </div>

      <MobileNavigation
        accountItems={accountItems}
        isOpen={isMobileOpen}
        items={navigationItems}
        onClose={closeMobileNavigation}
      />
    </header>
  );
}
export default Header;
