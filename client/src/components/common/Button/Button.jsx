import { Link } from 'react-router-dom';
import Icon from '../Icon/Icon.jsx';
import styles from './Button.module.css';

function joinClassNames(...classNames) {
  return classNames.filter(Boolean).join(' ');
}

function Button({
  children,
  className = '',
  disabled = false,
  fullWidth = false,
  href,
  icon,
  iconPosition = 'end',
  isLoading = false,
  size = 'medium',
  to,
  type = 'button',
  variant = 'primary',
  ...props
}) {
  const classes = joinClassNames(
    styles.button,
    styles[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    className,
  );

  const content = (
    <>
      {isLoading ? <span className={styles.spinner} aria-hidden="true" /> : null}
      {!isLoading && icon && iconPosition === 'start' ? (
        <Icon name={icon} size={18} />
      ) : null}
      <span>{children}</span>
      {!isLoading && icon && iconPosition === 'end' ? (
        <Icon name={icon} size={18} />
      ) : null}
    </>
  );

  if (to && !disabled) {
    return (
      <Link className={classes} to={to} {...props}>
        {content}
      </Link>
    );
  }

  if (href && !disabled) {
    return (
      <a className={classes} href={href} {...props}>
        {content}
      </a>
    );
  }

  return (
    <button
      className={classes}
      disabled={disabled || isLoading}
      type={type}
      {...props}
    >
      {content}
    </button>
  );
}

export default Button;
