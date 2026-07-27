export function getApiErrorMessage(
  error,
  fallback = 'The request could not be completed.',
) {
  const responseData = error?.response?.data;
  const message = responseData?.message || error?.message || fallback;
  const debugMessage = responseData?.debug?.message;

  if (import.meta.env.DEV && debugMessage && debugMessage !== message) {
    return `${message} — ${debugMessage}`;
  }

  return message;
}

export function getApiFieldErrors(error) {
  const entries = error?.response?.data?.errors;
  if (!Array.isArray(entries)) return {};

  return entries.reduce((result, item) => {
    if (item?.field && item?.message) result[item.field] = item.message;
    return result;
  }, {});
}
