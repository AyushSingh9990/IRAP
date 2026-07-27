import styles from './ArticleContent.module.css';

function ArticleContent({ content }) {
  const blocks = String(content || '')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div className={styles.content}>
      {blocks.map((block, index) => (
        <p key={`${index}-${block.slice(0, 24)}`}>{block}</p>
      ))}
    </div>
  );
}

export default ArticleContent;
