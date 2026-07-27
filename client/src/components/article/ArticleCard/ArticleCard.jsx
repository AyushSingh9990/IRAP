import { Link } from 'react-router-dom';
import Card from '../../common/Card/Card.jsx';
import { formatArticleDate } from '../../../config/articleConfig.js';
import styles from './ArticleCard.module.css';

function ArticleCard({ article }) {
  return (
    <Card className={styles.card} padding="none">
      {article.hasFeaturedImage ? (
        <Link className={styles.imageLink} to={article.canonicalPath}>
          <img
            alt={article.featuredImageAltText || article.title}
            className={styles.image}
            height="360"
            loading="lazy"
            src={article.featuredImageUrl}
            width="640"
          />
        </Link>
      ) : (
        <div className={styles.placeholder} aria-hidden="true">
          <span>iRAP</span>
        </div>
      )}

      <div className={styles.body}>
        <div className={styles.meta}>
          {article.categoryName ? <span>{article.categoryName}</span> : null}
          <span>{formatArticleDate(article.publishedAt)}</span>
          <span>{article.readingMinutes || 1} min read</span>
        </div>

        <h2>
          <Link to={article.canonicalPath}>{article.title}</Link>
        </h2>
        <p>{article.summary}</p>

        <div className={styles.footer}>
          <Link className={styles.author} to={article.authorPath}>
            {article.authorName}
          </Link>
          <Link className={styles.readLink} to={article.canonicalPath}>
            Read article
          </Link>
        </div>
      </div>
    </Card>
  );
}

export default ArticleCard;
