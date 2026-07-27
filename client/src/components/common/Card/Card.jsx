import styles from './Card.module.css';

function Card({
  as: Component = 'article',
  children,
  className = '',
  padding = 'medium',
  variant = 'bordered',
  ...props
}) {
  const classes = [
    styles.card,
    styles[variant],
    styles[`padding-${padding}`],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Component className={classes} {...props}>
      {children}
    </Component>
  );
}

export default Card;
