import { forwardRef } from 'react';
import styles from './Input.module.css';

const Input = forwardRef(function Input(
  { className = '', type = 'text', ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={`${styles.input} ${className}`.trim()}
      type={type}
      {...props}
    />
  );
});

export default Input;
