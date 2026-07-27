import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import useBodyScrollLock from '../../../hooks/useBodyScrollLock.js';
import useFocusTrap from '../../../hooks/useFocusTrap.js';
import Icon from '../../common/Icon/Icon.jsx';
import styles from './ResponsiveSidebar.module.css';

function ResponsiveSidebar({
  ariaLabel,
  buttonLabel,
  buttonText,
  children,
  belowSiteHeader = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);
  const location = useLocation();

  const close = useCallback(() => setIsOpen(false), []);

  useBodyScrollLock(isOpen);
  useFocusTrap(panelRef, isOpen, close);

  useEffect(() => {
    close();
  }, [close, location.pathname, location.search]);

  return (
    <>
      <div className={`${styles.mobileToolbar} ${belowSiteHeader ? styles.belowSiteHeader : ''}`.trim()}>
        <button
          className={styles.openButton}
          type="button"
          aria-label={buttonLabel}
          aria-expanded={isOpen}
          onClick={() => setIsOpen(true)}
        >
          <Icon name="menu" size={22} />
          <span>{buttonText}</span>
          <Icon name="chevronDown" size={18} />
        </button>
      </div>

      <aside className={styles.desktopSidebar} aria-label={ariaLabel}>
        {children({ onNavigate: undefined })}
      </aside>

      {isOpen ? (
        <div className={styles.backdrop} onMouseDown={close}>
          <aside
            ref={panelRef}
            className={styles.drawer}
            aria-label={ariaLabel}
            aria-modal="true"
            role="dialog"
            tabIndex={-1}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className={styles.drawerHeader}>
              <strong>{buttonText}</strong>
              <button
                className={styles.closeButton}
                type="button"
                aria-label={`Close ${buttonText.toLowerCase()}`}
                onClick={close}
              >
                <Icon name="close" size={24} />
              </button>
            </header>
            <div className={styles.drawerBody}>
              {children({ onNavigate: close })}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

export default ResponsiveSidebar;
