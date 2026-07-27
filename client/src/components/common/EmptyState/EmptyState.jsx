import Button from '../Button/Button.jsx';
import Icon from '../Icon/Icon.jsx';
import styles from './EmptyState.module.css';

function EmptyState({
  actionLabel,
  actionTo,
  description,
  icon = 'search',
  title,
}) {
  return (
    <div className={styles.emptyState}>
      <span className={styles.icon}>
        <Icon name={icon} size={28} />
      </span>
      <div className={styles.content}>
        <h2 className={styles.title}>{title}</h2>
        <p>{description}</p>
      </div>
      {actionLabel && actionTo ? (
        <Button to={actionTo} variant="secondary">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export default EmptyState;
