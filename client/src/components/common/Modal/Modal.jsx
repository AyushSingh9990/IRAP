import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import useBodyScrollLock from '../../../hooks/useBodyScrollLock.js';
import useFocusTrap from '../../../hooks/useFocusTrap.js';
import Icon from '../Icon/Icon.jsx';
import styles from './Modal.module.css';

function Modal({
  children,
  footer,
  isOpen,
  onClose,
  size = 'medium',
  title,
}) {
  const dialogRef = useRef(null);
  const titleId = useId();

  useBodyScrollLock(isOpen);
  useFocusTrap(dialogRef, isOpen, onClose);

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div className={styles.backdrop} onMouseDown={onClose}>
      <section
        ref={dialogRef}
        className={`${styles.dialog} ${styles[size]}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <button
            className={styles.closeButton}
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <Icon name="close" size={22} />
          </button>
        </header>
        <div className={styles.body}>{children}</div>
        {footer ? <footer className={styles.footer}>{footer}</footer> : null}
      </section>
    </div>,
    document.body,
  );
}

export default Modal;
