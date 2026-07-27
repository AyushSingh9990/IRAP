import { forwardRef } from 'react';
import styles from './Textarea.module.css';

const Textarea = forwardRef(function Textarea(
  { className = '', rows = 6, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={`${styles.textarea} ${className}`.trim()}
      rows={rows}
      {...props}
    />
  );
});

export default Textarea;
