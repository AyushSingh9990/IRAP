import Icon from '../Icon/Icon.jsx';
import styles from './Alert.module.css';

const iconByTone = {
  error: 'error',
  info: 'info',
  success: 'success',
  warning: 'warning',
};

function Alert({ children, className = '', title, tone = 'info' }) {
  const classes = [styles.alert, styles[tone], className]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
    >
      <span className={styles.icon}>
        <Icon name={iconByTone[tone]} size={22} />
      </span>
      <div>
        {title ? <p className={styles.title}>{title}</p> : null}
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}

export default Alert;
