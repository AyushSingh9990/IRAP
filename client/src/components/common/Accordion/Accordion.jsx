import { useId, useState } from 'react';
import Icon from '../Icon/Icon.jsx';
import styles from './Accordion.module.css';

function AccordionItem({ answer, defaultOpen = false, question }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const id = useId();
  const buttonId = `${id}-button`;
  const panelId = `${id}-panel`;

  return (
    <article className={styles.item}>
      <h3>
        <button
          id={buttonId}
          className={styles.trigger}
          type="button"
          aria-controls={panelId}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((current) => !current)}
        >
          <span>{question}</span>
          <Icon
            className={isOpen ? styles.rotated : ''}
            name="chevronDown"
            size={20}
          />
        </button>
      </h3>
      <div
        id={panelId}
        className={`${styles.panel} ${isOpen ? styles.panelOpen : ''}`}
        role="region"
        aria-labelledby={buttonId}
        hidden={!isOpen}
      >
        <p>{answer}</p>
      </div>
    </article>
  );
}

function Accordion({ items }) {
  return (
    <div className={styles.accordion}>
      {items.map((item, index) => (
        <AccordionItem
          key={item.question}
          {...item}
          defaultOpen={item.defaultOpen ?? index === 0}
        />
      ))}
    </div>
  );
}

export default Accordion;
