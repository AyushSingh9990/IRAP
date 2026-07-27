export function appendApplicationStatusHistory(
  application,
  {
    newStatus,
    changedBy,
    ipAddress = '',
    reason = '',
    internalNote = '',
    applicantVisibleNote = '',
    relatedDocument = null,
    relatedPayment = null,
  },
) {
  const previousStatus = application.status || null;
  if (previousStatus === newStatus) return false;

  if (application.statusHistory.length >= 100) {
    application.statusHistory.shift();
  }

  application.status = newStatus;
  application.statusHistory.push({
    previousStatus,
    newStatus,
    changedBy,
    ipAddress,
    reason,
    internalNote,
    applicantVisibleNote,
    relatedDocument,
    relatedPayment,
    changedAt: new Date(),
  });
  return true;
}
