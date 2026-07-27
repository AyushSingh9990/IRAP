import { useCallback, useEffect, useState } from 'react';
import Alert from '../../components/common/Alert/Alert.jsx';
import Button from '../../components/common/Button/Button.jsx';
import Card from '../../components/common/Card/Card.jsx';
import EmptyState from '../../components/common/EmptyState/EmptyState.jsx';
import FormField from '../../components/common/FormField/FormField.jsx';
import Loader from '../../components/common/Loader/Loader.jsx';
import Select from '../../components/common/Select/Select.jsx';
import StatusBadge from '../../components/common/StatusBadge/StatusBadge.jsx';
import Textarea from '../../components/common/Textarea/Textarea.jsx';
import Seo from '../../components/seo/Seo.jsx';
import {
  getDocumentBlob,
  listDocumentReviewQueue,
  reviewDocument,
} from '../../api/documentApi.js';
import {
  documentCategories,
  documentStatusLabels,
  documentStatusTones,
  formatFileSize,
} from '../../config/documentConfig.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './AdminDocumentsPage.module.css';

function AdminDocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ status: 'pending', category: '' });
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    action: 'approve',
    applicantVisibleNote: '',
    internalNote: '',
    reason: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const result = await listDocumentReviewQueue({
        page,
        limit: 20,
        status: filters.status || undefined,
        category: filters.category || undefined,
      });
      setDocuments(result.data.documents);
      setMeta(result.meta);
      setSelected(null);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [filters.category, filters.status]);

  useEffect(() => {
    void load(1);
  }, [load]);

  function choose(document) {
    setSelected(document);
    setForm({
      action: document.reviewStatus === 'pending' ? 'approve' : 'request_replacement',
      applicantVisibleNote: document.applicantVisibleNote || '',
      internalNote: document.internalNote || '',
      reason: '',
    });
  }

  async function preview(document) {
    const previewWindow = window.open('about:blank', '_blank');
    if (previewWindow) previewWindow.opener = null;
    try {
      const blob = await getDocumentBlob(document.id, 'inline');
      const url = URL.createObjectURL(blob);
      if (previewWindow) previewWindow.location.href = url;
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (requestError) {
      previewWindow?.close();
      setError(getApiErrorMessage(requestError));
    }
  }

  async function saveReview(event) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const result = await reviewDocument(selected.id, form);
      setDocuments((current) =>
        current.map((item) =>
          item.id === selected.id ? result.data.document : item,
        ),
      );
      setSelected(result.data.document);
      setMessage(result.message);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Seo title="Document Review" description="Review private iRAP application documents." noIndex />
      <section className="section">
        <div className={`container ${styles.container}`}>
          <header className={styles.header}>
            <div>
              <p className={styles.eyebrow}>Reviewer workspace</p>
              <h1>Document review queue</h1>
              <p>Review current document versions without exposing private storage URLs.</p>
            </div>
            <Button to="/dashboard" variant="secondary">Dashboard</Button>
          </header>

          {message ? <Alert tone="success">{message}</Alert> : null}
          {error ? <Alert tone="error" title="Review request failed">{error}</Alert> : null}

          <Card className={styles.filters}>
            <FormField label="Review status">
              <Select
                value={filters.status}
                onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
              >
                <option value="">All statuses</option>
                {Object.entries(documentStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Category">
              <Select
                value={filters.category}
                onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
              >
                <option value="">All categories</option>
                {documentCategories.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </FormField>
          </Card>

          <div className={styles.workspace}>
            <section aria-labelledby="queue-title">
              <h2 id="queue-title">Queue ({meta.total})</h2>
              {loading ? (
                <div className={styles.loading}><Loader label="Loading review queue" /></div>
              ) : documents.length === 0 ? (
                <EmptyState title="No documents match these filters" description="The review queue is currently empty." />
              ) : (
                <div className={styles.queue}>
                  {documents.map((document) => (
                    <button
                      type="button"
                      key={document.id}
                      className={`${styles.queueItem} ${selected?.id === document.id ? styles.selected : ''}`}
                      onClick={() => choose(document)}
                    >
                      <div>
                        <strong>{document.title}</strong>
                        <span>{document.owner?.displayName} · {document.application?.reference}</span>
                        <small>{document.categoryLabel} · {formatFileSize(document.sizeBytes)}</small>
                      </div>
                      <StatusBadge tone={documentStatusTones[document.reviewStatus] || 'neutral'}>
                        {documentStatusLabels[document.reviewStatus] || document.reviewStatus}
                      </StatusBadge>
                    </button>
                  ))}
                </div>
              )}
              {meta.pages > 1 ? (
                <div className={styles.pagination}>
                  <Button size="small" variant="secondary" disabled={meta.page <= 1} onClick={() => load(meta.page - 1)}>Previous</Button>
                  <span>Page {meta.page} of {meta.pages}</span>
                  <Button size="small" variant="secondary" disabled={meta.page >= meta.pages} onClick={() => load(meta.page + 1)}>Next</Button>
                </div>
              ) : null}
            </section>

            <aside>
              {selected ? (
                <Card className={styles.reviewCard}>
                  <div className={styles.reviewHeading}>
                    <div>
                      <p className={styles.eyebrow}>{selected.application?.reference}</p>
                      <h2>{selected.title}</h2>
                      <p>{selected.originalFilename}</p>
                    </div>
                    <Button size="small" variant="secondary" onClick={() => preview(selected)}>Preview securely</Button>
                  </div>
                  <dl className={styles.details}>
                    <div><dt>Applicant</dt><dd>{selected.owner?.displayName}</dd></div>
                    <div><dt>Email</dt><dd>{selected.owner?.email}</dd></div>
                    <div><dt>Category</dt><dd>{selected.categoryLabel}</dd></div>
                    <div><dt>Application</dt><dd>{selected.application?.type}</dd></div>
                  </dl>
                  <form className={styles.reviewForm} onSubmit={saveReview}>
                    <FormField label="Review decision" required>
                      <Select
                        value={form.action}
                        onChange={(event) => setForm((current) => ({ ...current, action: event.target.value }))}
                      >
                        <option value="approve">Approve</option>
                        <option value="reject">Reject</option>
                        <option value="request_replacement">Request replacement</option>
                      </Select>
                    </FormField>
                    <FormField
                      label="Applicant-visible note"
                      required={form.action !== 'approve'}
                      hint="Explain rejection or replacement requests clearly."
                    >
                      <Textarea
                        rows={4}
                        value={form.applicantVisibleNote}
                        onChange={(event) => setForm((current) => ({ ...current, applicantVisibleNote: event.target.value }))}
                      />
                    </FormField>
                    <FormField label="Internal note">
                      <Textarea
                        rows={4}
                        value={form.internalNote}
                        onChange={(event) => setForm((current) => ({ ...current, internalNote: event.target.value }))}
                      />
                    </FormField>
                    <FormField label="Reason code or summary">
                      <Textarea
                        rows={2}
                        value={form.reason}
                        onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
                      />
                    </FormField>
                    <Button type="submit" isLoading={saving}>Save review</Button>
                  </form>
                </Card>
              ) : (
                <EmptyState title="Select a document" description="Choose an item from the queue to inspect and review it." />
              )}
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}

export default AdminDocumentsPage;
