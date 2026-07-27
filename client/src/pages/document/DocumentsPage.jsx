import { useCallback, useEffect, useMemo, useState } from 'react';
import Alert from '../../components/common/Alert/Alert.jsx';
import Button from '../../components/common/Button/Button.jsx';
import Card from '../../components/common/Card/Card.jsx';
import EmptyState from '../../components/common/EmptyState/EmptyState.jsx';
import FileUploader from '../../components/common/FileUploader/FileUploader.jsx';
import FormField from '../../components/common/FormField/FormField.jsx';
import Input from '../../components/common/Input/Input.jsx';
import Loader from '../../components/common/Loader/Loader.jsx';
import Select from '../../components/common/Select/Select.jsx';
import StatusBadge from '../../components/common/StatusBadge/StatusBadge.jsx';
import Seo from '../../components/seo/Seo.jsx';
import { listApplications } from '../../api/applicationApi.js';
import {
  getDocumentBlob,
  listDocuments,
  removeDocument,
  replaceDocument,
  uploadDocument,
} from '../../api/documentApi.js';
import {
  documentCategories,
  documentStatusLabels,
  documentStatusTones,
  formatFileSize,
} from '../../config/documentConfig.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './DocumentsPage.module.css';

const editableStatuses = new Set(['draft', 'additional_information_required']);

function DocumentsPage() {
  const [applications, setApplications] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [fileError, setFileError] = useState('');
  const [file, setFile] = useState(null);
  const [replaceTarget, setReplaceTarget] = useState(null);
  const [includeHistory, setIncludeHistory] = useState(false);
  const [form, setForm] = useState({
    applicationId: '',
    category: 'qualification_certificate',
    title: '',
    expiryDate: '',
  });

  const editableApplications = useMemo(
    () => applications.filter((item) => item.isCurrent && editableStatuses.has(item.status)),
    [applications],
  );

  const uploadApplications = useMemo(() => {
    if (!replaceTarget) return editableApplications;
    const replacementApplication = applications.find(
      (application) => application.id === replaceTarget.application.id,
    );
    return replacementApplication ? [replacementApplication] : [];
  }, [applications, editableApplications, replaceTarget]);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [applicationResult, documentResult] = await Promise.all([
        listApplications(),
        listDocuments({ includeHistory: String(includeHistory) }),
      ]);
      setApplications(applicationResult.data.applications);
      setDocuments(documentResult.data.documents);
      const firstEditable = applicationResult.data.applications.find(
        (item) => item.isCurrent && editableStatuses.has(item.status),
      );
      setForm((current) => ({
        ...current,
        applicationId: current.applicationId || firstEditable?.id || '',
      }));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [includeHistory]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function startReplacement(document) {
    setReplaceTarget(document);
    setForm({
      applicationId: document.application.id,
      category: document.category,
      title: document.title,
      expiryDate: document.expiryDate
        ? new Date(document.expiryDate).toISOString().slice(0, 10)
        : '',
    });
    setFile(null);
    setMessage('Select the replacement file below. The previous version will remain in the audit history.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setReplaceTarget(null);
    setFile(null);
    setFileError('');
    setUploadProgress(0);
    setForm((current) => ({
      applicationId: editableApplications[0]?.id || current.applicationId,
      category: 'qualification_certificate',
      title: '',
      expiryDate: '',
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!file) {
      setFileError('Select one document before uploading.');
      return;
    }
    if (!form.applicationId || !form.title.trim()) {
      setError('Choose an editable application and enter a document title.');
      return;
    }

    const payload = new FormData();
    payload.append('file', file);
    payload.append('title', form.title.trim());
    payload.append('expiryDate', form.expiryDate);
    if (!replaceTarget) {
      payload.append('applicationId', form.applicationId);
      payload.append('category', form.category);
    }

    setSaving(true);
    setUploadProgress(0);
    try {
      const progress = (progressEvent) => {
        if (progressEvent.total) {
          setUploadProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
        }
      };
      const result = replaceTarget
        ? await replaceDocument(replaceTarget.id, payload, progress)
        : await uploadDocument(payload, progress);

      setDocuments((current) => {
        if (!replaceTarget) return [result.data.document, ...current];
        const nextDocuments = [
          result.data.document,
          ...current.map((item) =>
            item.id === replaceTarget.id
              ? { ...item, isCurrent: false, reviewStatus: 'superseded' }
              : item,
          ),
        ];
        return includeHistory ? nextDocuments : nextDocuments.filter((item) => item.isCurrent);
      });
      setMessage(result.message);
      resetForm();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function openDocument(document, disposition) {
    setError('');
    const previewWindow =
      disposition === 'inline' ? window.open('about:blank', '_blank') : null;
    if (previewWindow) previewWindow.opener = null;
    try {
      const blob = await getDocumentBlob(document.id, disposition);
      const url = URL.createObjectURL(blob);
      if (disposition === 'attachment') {
        const anchor = window.document.createElement('a');
        anchor.href = url;
        anchor.download = document.originalFilename;
        window.document.body.append(anchor);
        anchor.click();
        anchor.remove();
      } else if (previewWindow) {
        previewWindow.location.href = url;
      } else {
        const anchor = window.document.createElement('a');
        anchor.href = url;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        window.document.body.append(anchor);
        anchor.click();
        anchor.remove();
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (requestError) {
      previewWindow?.close();
      setError(getApiErrorMessage(requestError));
    }
  }

  async function remove(document) {
    if (!window.confirm(`Remove ${document.originalFilename}?`)) return;
    setError('');
    try {
      const result = await removeDocument(document.id);
      setDocuments((current) => current.filter((item) => item.id !== document.id));
      setMessage(result.message);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }

  return (
    <>
      <Seo title="My Documents" description="Manage private supporting documents for iRAP applications." noIndex />
      <section className="section">
        <div className={`container ${styles.container}`}>
          <header className={styles.header}>
            <div>
              <p className={styles.eyebrow}>Private document centre</p>
              <h1>Supporting documents</h1>
              <p>Upload evidence securely, view its review status, and replace documents when requested.</p>
            </div>
            <div className={styles.headerActions}>
              <Button to="/dashboard/applications" variant="secondary">Applications</Button>
              <Button to="/dashboard" variant="secondary">Dashboard</Button>
            </div>
          </header>

          {message ? <Alert tone="success">{message}</Alert> : null}
          {error ? <Alert tone="error" title="Document request failed">{error}</Alert> : null}

          <Card>
            <div className={styles.formHeading}>
              <div>
                <p className={styles.eyebrow}>{replaceTarget ? 'Replacement upload' : 'New upload'}</p>
                <h2>{replaceTarget ? `Replace ${replaceTarget.title}` : 'Add a supporting document'}</h2>
              </div>
              {replaceTarget ? <Button variant="secondary" onClick={resetForm}>Cancel replacement</Button> : null}
            </div>

            {!replaceTarget && editableApplications.length === 0 ? (
              <EmptyState
                title="No editable application"
                description="Start a draft application or wait for an additional-information request before uploading documents."
                action={<Button to="/dashboard/applications">Open applications</Button>}
              />
            ) : (
              <form className={styles.uploadForm} onSubmit={submit} noValidate>
                <div className={styles.formGrid}>
                  <FormField label="Application" required>
                    <Select
                      name="applicationId"
                      value={form.applicationId}
                      onChange={updateForm}
                      disabled={Boolean(replaceTarget)}
                    >
                      {uploadApplications.map((application) => (
                        <option key={application.id} value={application.id}>
                          {application.reference} — {application.typeLabel}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Document category" required>
                    <Select
                      name="category"
                      value={form.category}
                      onChange={updateForm}
                      disabled={Boolean(replaceTarget)}
                    >
                      {documentCategories.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Document title" required>
                    <Input name="title" value={form.title} onChange={updateForm} maxLength={160} />
                  </FormField>
                  <FormField label="Expiry date" hint="Optional. Use this for evidence that expires.">
                    <Input type="date" name="expiryDate" value={form.expiryDate} onChange={updateForm} />
                  </FormField>
                </div>

                <FormField label="File" error={fileError} required>
                  <FileUploader file={file} onChange={setFile} onError={setFileError} disabled={saving} />
                </FormField>

                {saving ? (
                  <div className={styles.progress} aria-live="polite">
                    <span style={{ width: `${uploadProgress}%` }} />
                    <strong>{uploadProgress}% uploaded</strong>
                  </div>
                ) : null}

                <Button type="submit" isLoading={saving} disabled={saving}>
                  {replaceTarget ? 'Upload replacement' : 'Upload document'}
                </Button>
              </form>
            )}
          </Card>

          <section aria-labelledby="documents-list-title">
            <div className={styles.sectionHeading}>
              <div>
                <h2 id="documents-list-title">
                  {includeHistory ? 'Document history' : 'Current documents'}
                </h2>
                <p>Private files are delivered only through authenticated API requests.</p>
              </div>
              <Button
                variant="secondary"
                onClick={() => setIncludeHistory((current) => !current)}
              >
                {includeHistory ? 'Show current versions' : 'Show version history'}
              </Button>
            </div>

            {loading ? (
              <div className={styles.loading}><Loader label="Loading documents" /></div>
            ) : documents.length === 0 ? (
              <EmptyState title="No documents uploaded" description="Use the secure upload form above to add supporting evidence." />
            ) : (
              <div className={styles.documentList}>
                {documents.map((document) => (
                  <Card key={document.id} className={styles.documentCard}>
                    <div className={styles.documentHeading}>
                      <div>
                        <p className={styles.reference}>{document.application?.reference}</p>
                        <h3>{document.title}</h3>
                        <p>{document.categoryLabel}</p>
                      </div>
                      <StatusBadge tone={documentStatusTones[document.reviewStatus] || 'neutral'}>
                        {documentStatusLabels[document.reviewStatus] || document.reviewStatus}
                      </StatusBadge>
                    </div>
                    <dl className={styles.details}>
                      <div><dt>File</dt><dd>{document.originalFilename}</dd></div>
                      <div><dt>Size</dt><dd>{formatFileSize(document.sizeBytes)}</dd></div>
                      <div><dt>Uploaded</dt><dd>{new Date(document.createdAt).toLocaleString()}</dd></div>
                      <div><dt>Expiry</dt><dd>{document.expiryDate ? new Date(document.expiryDate).toLocaleDateString() : 'Not supplied'}</dd></div>
                    </dl>
                    {document.applicantVisibleNote ? (
                      <Alert tone={document.reviewStatus === 'approved' ? 'success' : 'warning'}>
                        {document.applicantVisibleNote}
                      </Alert>
                    ) : null}
                    <div className={styles.actions}>
                      <Button size="small" variant="secondary" onClick={() => openDocument(document, 'inline')}>Preview</Button>
                      <Button size="small" variant="secondary" onClick={() => openDocument(document, 'attachment')}>Download</Button>
                      {document.canReplace ? <Button size="small" onClick={() => startReplacement(document)}>Replace</Button> : null}
                      {document.canDelete ? <Button size="small" variant="danger" onClick={() => remove(document)}>Remove</Button> : null}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </>
  );
}

export default DocumentsPage;
