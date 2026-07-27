import { Helmet } from 'react-helmet-async';
import { siteConfig } from '../../config/siteConfig.js';

function normalizeStructuredData(structuredData) {
  if (!structuredData) return [];
  return Array.isArray(structuredData) ? structuredData : [structuredData];
}

function safeStructuredData(schema) {
  return JSON.stringify(schema).replace(/</g, '\\u003c');
}

function Seo({
  author = '',
  description = siteConfig.defaultDescription,
  image = '',
  modifiedTime = '',
  noIndex = false,
  path = '/',
  publishedTime = '',
  structuredData,
  title,
  type = 'website',
}) {
  const pageTitle = title ? `${title} | ${siteConfig.name}` : siteConfig.defaultTitle;
  const canonicalUrl = new URL(path, siteConfig.siteUrl).toString();
  const imageUrl = image ? new URL(image, siteConfig.siteUrl).toString() : '';
  const schemas = normalizeStructuredData(structuredData);

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={description} />
      {author ? <meta name="author" content={author} /> : null}
      <meta
        name="robots"
        content={noIndex ? 'noindex,nofollow' : 'index,follow'}
      />
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:site_name" content={siteConfig.name} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      {imageUrl ? <meta property="og:image" content={imageUrl} /> : null}
      {publishedTime ? <meta property="article:published_time" content={publishedTime} /> : null}
      {modifiedTime ? <meta property="article:modified_time" content={modifiedTime} /> : null}
      {author ? <meta property="article:author" content={author} /> : null}

      <meta name="twitter:card" content={imageUrl ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={description} />
      {imageUrl ? <meta name="twitter:image" content={imageUrl} /> : null}

      {schemas.map((schema, index) => (
        <script key={`${schema['@type'] || 'schema'}-${index}`} type="application/ld+json">
          {safeStructuredData(schema)}
        </script>
      ))}
    </Helmet>
  );
}

export default Seo;
