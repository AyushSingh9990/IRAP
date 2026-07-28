import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import useBodyScrollLock from '../../../hooks/useBodyScrollLock.js';
import useFocusTrap from '../../../hooks/useFocusTrap.js';
import Button from '../../common/Button/Button.jsx';
import Icon from '../../common/Icon/Icon.jsx';
import styles from './MobileNavigation.module.css';

function MobileItem({ item, onNavigate }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (item.children) {
    return (
      <li className={styles.item}>
        <button
          className={styles.expandButton}
          type="button"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((current) => !current)}
        >
          <span>{item.label}</span>
          <Icon
            className={isExpanded ? styles.rotated : ''}
            name="chevronDown"
            size={18}
          />
        </button>
        {isExpanded ? (
          <ul className={styles.submenu}>
            {item.children.map((child) => (
              <li key={child.to}>
                {child.available ? (
                  <Link to={child.to} onClick={onNavigate}>
                    {child.label}
                  </Link>
                ) : (
                  <span aria-disabled="true" title="Not available yet">
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

  return (
    <li className={styles.item}>
      {item.available ? (
        <Link className={styles.directLink} to={item.to} onClick={onNavigate}>
          {item.label}
        </Link>
      ) : (
        <span
          className={styles.unavailable}
          aria-disabled="true"
          title="Not available yet"
        >
          {item.label}
        </span>
      )}
    </li>
  );
}

function MobileNavigation({ accountItems, isOpen, items, onClose }) {
  const panelRef = useRef(null);
  useBodyScrollLock(isOpen);
  useFocusTrap(panelRef, isOpen, onClose);

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.backdrop} onMouseDown={onClose}>
      <aside
        ref={panelRef}
        className={styles.panel}
        aria-label="Mobile navigation"
        aria-modal="true"
        role="dialog"
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <Link
            className={styles.brand}
            to="/"
            aria-label="iRAP home"
            onClick={onClose}
          >
            <img
              aria-hidden="true"
              className={styles.brandLogo}
              src="/irap-logo-header.webp"
              alt=""
            />
          </Link>
          <button
            className={styles.closeButton}
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
          >
            <Icon name="close" size={24} />
          </button>
        </header>

        <nav className={styles.navigation}>
          <ul className={styles.list}>
            {items.map((item) => (
              <MobileItem
                key={item.to || item.label}
                item={item}
                onNavigate={onClose}
              />
            ))}
          </ul>
        </nav>

        <div className={styles.accountActions}>
          {accountItems.map((item) => (
            <Button
              key={item.to || item.label}
              disabled={!item.available}
              fullWidth
              onClick={async () => {
                if (item.onClick) await item.onClick();
                onClose();
              }}
              to={item.to}
              variant={item.variant}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </aside>
    </div>
  );
}

export default MobileNavigation;
