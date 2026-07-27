import { forwardRef } from 'react';
import styles from './Select.module.css';

const Select = forwardRef(function Select(
  { children, className = '', ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      className={`${styles.select} ${className}`.trim()}
      {...props}
    >
      {children}
    </select>
  );
});

export default Select;
