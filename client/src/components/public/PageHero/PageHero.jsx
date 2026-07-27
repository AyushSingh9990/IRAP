import Breadcrumb from '../../common/Breadcrumb/Breadcrumb.jsx';
import styles from './PageHero.module.css';

function PageHero({ actions, aside, breadcrumbItems, description, eyebrow, title }) {
  return (
    <section className={styles.hero}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.content}>
          {breadcrumbItems ? <Breadcrumb items={breadcrumbItems} /> : null}
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1>{title}</h1>
          <p className={styles.description}>{description}</p>
          {actions ? <div className="cluster">{actions}</div> : null}
        </div>
        {aside ? <div className={styles.aside}>{aside}</div> : null}
      </div>
    </section>
  );
}

export default PageHero;
