const PUBLIC_CACHEABLE_PREFIXES = Object.freeze([
  '/api/v1/site/public',
  '/api/v1/directories',
  '/api/v1/articles/public',
]);

export function responseCachePolicy(request, response, next) {
  const isPublicCacheable =
    request.method === 'GET' &&
    PUBLIC_CACHEABLE_PREFIXES.some((prefix) => request.path.startsWith(prefix));

  if (isPublicCacheable) {
    response.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  } else {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Pragma', 'no-cache');
  }

  next();
}
