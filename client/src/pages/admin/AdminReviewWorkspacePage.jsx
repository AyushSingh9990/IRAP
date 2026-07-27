import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getDocumentBlob } from '../../api/documentApi.js';
import {
  addApplicationReviewNote,
  approveReviewedApplication,
  assignApplicationReviewer,
  getApplicationReviewWorkspace,
  listReviewerAccounts,
  rejectReviewedApplication,
  requestApplicationInformation,
  suspendReviewedApplication,
  updateApplicationPaymentWaiver,
  updateApplicationReviewChecklist,
} from '../../api/reviewApi.js';
import Alert from '../../components/common/Alert/Alert.jsx';
import Button from '../../components/common/Button/Button.jsx';
import Card from '../../components/common/Card/Card.jsx';
import EmptyState from '../../components/common/EmptyState/EmptyState.jsx';
import FormField from '../../components/common/FormField/FormField.jsx';
import Input from '../../components/common/Input/Input.jsx';
import Loader from '../../components/common/Loader/Loader.jsx';
import Select from '../../components/common/Select/Select.jsx';
import StatusBadge from '../../components/common/StatusBadge/StatusBadge.jsx';
import Textarea from '../../components/common/Textarea/Textarea.jsx';
import Seo from '../../components/seo/Seo.jsx';
import { applicationStatusLabels, applicationStatusTones } from '../../config/applicationForms.js';
import { documentStatusLabels, documentStatusTones, formatFileSize } from '../../config/documentConfig.js';
import { formatMinorAmount, paymentStatusLabels, paymentStatusTones } from '../../config/paymentConfig.js';
import {
  auditActionLabels,
  auditOutcomeTones,
  formatSubmittedAnswer,
  humanizeFieldName,
  reviewCaseStatusLabels,
  reviewCaseStatusTones,
  reviewChecklistDefinitions,
} from '../../config/reviewConfig.js';
import useAuth from '../../hooks/useAuth.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './AdminReviewWorkspacePage.module.css';

function toLocalDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function safePaymentTone(status) {
  const tone = paymentStatusTones[status];
  return tone === 'danger' ? 'error' : tone || 'neutral';
}

function AdminReviewWorkspacePage() {
  const { applicationId } = useParams();
  const auth = useAuth();
  const canAssign = auth.hasPermission('application:assign');
  const [workspace, setWorkspace] = useState(null);
  const [reviewers, setReviewers] = useState([]);
  const [assignment, setAssignment] = useState({ reviewerId: '', dueAt: '' });
  const [checklist, setChecklist] = useState({});
  const [note, setNote] = useState({ visibility: 'internal', body: '' });
  const [waiver, setWaiver] = useState({ waived: false, reason: '' });
  const [decision, setDecision] = useState({
    action: 'request_information',
    reason: '',
    applicantVisibleNote: '',
    internalNote: '',
    requestedSections: [],
    confirmation: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const applyWorkspace = useCallback((next) => {
    setWorkspace(next);
    setAssignment({
      reviewerId: next.review.assignedReviewer?.id || '',
      dueAt: toLocalDateTime(next.review.dueAt),
    });
    setChecklist({ ...next.review.checklist });
    setWaiver({
      waived: Boolean(next.review.paymentWaiver?.waived),
      reason: next.review.paymentWaiver?.reason || '',
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getApplicationReviewWorkspace(applicationId);
      applyWorkspace(result.data.workspace);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [applicationId, applyWorkspace]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!canAssign) return undefined;
    let active = true;
    listReviewerAccounts()
      .then((result) => { if (active) setReviewers(result.data.reviewers); })
      .catch((requestError) => { if (active) setError(getApiErrorMessage(requestError)); });
    return () => { active = false; };
  }, [canAssign]);

  const stepEntries = useMemo(
    () => Object.entries(workspace?.application?.steps || {}),
    [workspace],
  );

  async function runSave(key, operation) {
    setSaving(key);
    setMessage('');
    setError('');
    try {
      await operation();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving('');
    }
  }

  async function saveAssignment(event) {
    event.preventDefault();
    await runSave('assignment', async () => {
      const result = await assignApplicationReviewer(applicationId, {
        reviewerId: assignment.reviewerId,
        dueAt: assignment.dueAt ? new Date(assignment.dueAt).toISOString() : null,
      });
      setMessage(result.message);
      await load();
    });
  }

  async function saveChecklist(event) {
    event.preventDefault();
    await runSave('checklist', async () => {
      const payload = Object.fromEntries(
        reviewChecklistDefinitions.map(({ key }) => [key, Boolean(checklist[key])]),
      );
      const result = await updateApplicationReviewChecklist(applicationId, payload);
      setWorkspace((current) => ({ ...current, review: result.data.review }));
      setChecklist({ ...result.data.review.checklist });
      setMessage(result.message);
    });
  }

  async function saveNote(event) {
    event.preventDefault();
    await runSave('note', async () => {
      const result = await addApplicationReviewNote(applicationId, note);
      setWorkspace((current) => ({ ...current, review: result.data.review }));
      setNote((current) => ({ ...current, body: '' }));
      setMessage(result.message);
    });
  }

  async function saveWaiver(event) {
    event.preventDefault();
    await runSave('waiver', async () => {
      const result = await updateApplicationPaymentWaiver(applicationId, waiver);
      setWorkspace((current) => ({ ...current, review: result.data.review }));
      setMessage(result.message);
      await load();
    });
  }

  async function previewDocument(document) {
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

  async function submitDecision(event) {
    event.preventDefault();
    await runSave('decision', async () => {
      const commonPayload = {
        reason: decision.reason,
        applicantVisibleNote: decision.applicantVisibleNote,
        internalNote: decision.internalNote,
      };
      let result;
      if (decision.action === 'request_information') {
        result = await requestApplicationInformation(applicationId, {
          ...commonPayload,
          requestedSections: decision.requestedSections,
        });
      } else if (decision.action === 'approve') {
        result = await approveReviewedApplication(applicationId, {
          ...commonPayload,
          confirmation: decision.confirmation,
        });
      } else if (decision.action === 'reject') {
        result = await rejectReviewedApplication(applicationId, {
          ...commonPayload,
          confirmation: decision.confirmation,
        });
      } else {
        result = await suspendReviewedApplication(applicationId, {
          ...commonPayload,
          confirmation: decision.confirmation,
        });
      }
      applyWorkspace(result.data.workspace);
      setDecision({
        action: 'request_information',
        reason: '',
        applicantVisibleNote: '',
        internalNote: '',
        requestedSections: [],
        confirmation: '',
      });
      setMessage(result.message);
    });
  }

  if (loading) return <div className={styles.loading}><Loader label="Loading review workspace" size="large" /></div>;

  if (!workspace) {
    return <div className={styles.container}>{error ? <Alert tone="error">{error}</Alert> : <EmptyState title="Review workspace unavailable" description="The application could not be loaded." />}</div>;
  }

  const { application, applicant, review, documents, payments, audit } = workspace;
  const requiresDecisionConfirmation = ['approve', 'reject', 'suspend'].includes(decision.action);
  const requiredConfirmation = decision.action === 'approve' ? 'APPROVE' : decision.action === 'reject' ? 'REJECT' : 'SUSPEND';

  return (
    <>
      <Seo title={`Review ${application.reference}`} description="Private structured iRAP application review workspace." noIndex />
      <div className={styles.container}>
        <header className={styles.header}>
          <div><p className={styles.eyebrow}>Structured review workspace</p><h1>{application.reference}</h1><p>{application.typeLabel} application submitted by {applicant.displayName}.</p></div>
          <div className={styles.headerActions}><StatusBadge tone={applicationStatusTones[application.status] || 'neutral'}>{applicationStatusLabels[application.status] || application.status}</StatusBadge><Button to="/admin/applications" variant="secondary">Back to queue</Button></div>
        </header>
        {message ? <Alert tone="success">{message}</Alert> : null}
        {error ? <Alert tone="error" title="Review action failed">{error}</Alert> : null}

        <section className={styles.summaryGrid} aria-label="Application summary">
          <Card><span>Applicant</span><strong>{applicant.displayName}</strong><small>{applicant.email}</small><small>{applicant.telephone || 'No telephone supplied'}</small></Card>
          <Card><span>Review case</span><StatusBadge tone={reviewCaseStatusTones[review.status] || 'neutral'}>{reviewCaseStatusLabels[review.status] || review.status}</StatusBadge><small>{review.assignedReviewer ? `Assigned to ${review.assignedReviewer.displayName}` : 'Unassigned'}</small></Card>
          <Card><span>Completion</span><strong>{application.completionPercentage}%</strong><small>Submitted {application.submittedAt ? new Date(application.submittedAt).toLocaleString() : 'date unavailable'}</small></Card>
          <Card><span>Payment check</span><StatusBadge tone={review.checklist.paymentConfirmedOrWaived ? 'success' : 'warning'}>{review.checklist.paymentConfirmedOrWaived ? 'Confirmed or waived' : 'Not confirmed'}</StatusBadge><small>{review.paymentWaiver.waived ? `Waived: ${review.paymentWaiver.reason}` : `${payments.length} payment record(s)`}</small></Card>
        </section>

        {canAssign ? (
          <Card>
            <form className={styles.assignmentForm} onSubmit={saveAssignment}>
              <div><p className={styles.eyebrow}>Assignment</p><h2>Reviewer and due date</h2></div>
              <FormField label="Assigned reviewer"><Select value={assignment.reviewerId} onChange={(event) => setAssignment((current) => ({ ...current, reviewerId: event.target.value }))}><option value="">Unassigned</option>{reviewers.map((reviewer) => <option key={reviewer.id} value={reviewer.id}>{reviewer.displayName} · {reviewer.email}</option>)}</Select></FormField>
              <FormField label="Review due date"><Input type="datetime-local" value={assignment.dueAt} onChange={(event) => setAssignment((current) => ({ ...current, dueAt: event.target.value }))} /></FormField>
              <Button type="submit" isLoading={saving === 'assignment'}>Save assignment</Button>
            </form>
          </Card>
        ) : null}

        <div className={styles.twoColumn}>
          <section className={styles.stack} aria-labelledby="answers-title">
            <Card>
              <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Submitted data</p><h2 id="answers-title">Application answers</h2></div></div>
              {stepEntries.length === 0 ? <EmptyState title="No submitted answers" description="No application step data was returned." /> : (
                <div className={styles.answers}>
                  {stepEntries.map(([stepKey, step]) => (
                    <details key={stepKey} open>
                      <summary><strong>{humanizeFieldName(stepKey)}</strong><span>{step.completionPercentage || 0}% complete</span></summary>
                      <dl>{Object.entries(step.data || {}).map(([field, value]) => <div key={field}><dt>{humanizeFieldName(field)}</dt><dd>{typeof value === 'object' && value !== null ? <pre>{formatSubmittedAnswer(value)}</pre> : formatSubmittedAnswer(value)}</dd></div>)}</dl>
                    </details>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Private evidence</p><h2>Documents</h2></div><Button to="/admin/documents" size="small" variant="secondary">Document queue</Button></div>
              {documents.length === 0 ? <EmptyState title="No current documents" description="No supporting documents are attached to this application." /> : (
                <div className={styles.itemList}>{documents.map((document) => <article key={document.id}><div><strong>{document.title}</strong><p>{document.originalFilename} · {formatFileSize(document.sizeBytes)}</p><small>{document.internalNote || document.applicantVisibleNote || 'No review note'}</small></div><div className={styles.itemActions}><StatusBadge tone={documentStatusTones[document.reviewStatus] || 'neutral'}>{documentStatusLabels[document.reviewStatus] || document.reviewStatus}</StatusBadge><Button size="small" variant="secondary" onClick={() => previewDocument(document)}>Preview</Button></div></article>)}</div>
              )}
            </Card>

            <Card>
              <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Financial status</p><h2>Payments</h2></div>{auth.hasPermission('payment:manage') ? <Button to="/admin/payments" size="small" variant="secondary">Payment management</Button> : null}</div>
              {payments.length === 0 ? <EmptyState title="No payment records" description="No payment is linked to this application." /> : (
                <div className={styles.itemList}>{payments.map((payment) => <article key={payment.id}><div><strong>{payment.reference}</strong><p>{payment.planSnapshot?.name || 'Application plan'} · {formatMinorAmount(payment.totalMinor, payment.currency)}</p><small>{payment.provider} · {payment.paidAt ? new Date(payment.paidAt).toLocaleString() : 'Not paid'}</small></div><StatusBadge tone={safePaymentTone(payment.status)}>{paymentStatusLabels[payment.status] || payment.status}</StatusBadge></article>)}</div>
              )}
              {canAssign ? <form className={styles.waiverForm} onSubmit={saveWaiver}><label className={styles.checkbox}><input type="checkbox" checked={waiver.waived} onChange={(event) => setWaiver((current) => ({ ...current, waived: event.target.checked }))} /><span>Waive payment requirement for this review</span></label><FormField label="Waiver reason" required={waiver.waived}><Textarea rows={3} value={waiver.reason} onChange={(event) => setWaiver((current) => ({ ...current, reason: event.target.value }))} /></FormField><Button type="submit" variant="secondary" isLoading={saving === 'waiver'}>Save payment waiver</Button></form> : null}
            </Card>
          </section>

          <aside className={styles.stack}>
            <Card>
              <div><p className={styles.eyebrow}>Approval controls</p><h2>Review checklist</h2><p>Every required item must be confirmed before approval. Membership and certificate records are issued in the current release.</p></div>
              <form className={styles.checklist} onSubmit={saveChecklist}>
                <label className={`${styles.checkbox} ${styles.readOnly}`}><input type="checkbox" checked={Boolean(review.checklist.paymentConfirmedOrWaived)} readOnly /><span><strong>Payment confirmed or formally waived</strong><small>Calculated from recorded payments or an authorized waiver.</small></span></label>
                {reviewChecklistDefinitions.map((item) => <label className={styles.checkbox} key={item.key}><input type="checkbox" checked={Boolean(checklist[item.key])} onChange={(event) => setChecklist((current) => ({ ...current, [item.key]: event.target.checked }))} /><span><strong>{item.label}</strong><small>{item.description}</small></span></label>)}
                <Button type="submit" isLoading={saving === 'checklist'}>Save checklist</Button>
              </form>
            </Card>

            <Card>
              <div><p className={styles.eyebrow}>Review communication</p><h2>Add review note</h2></div>
              <form className={styles.form} onSubmit={saveNote}>
                <FormField label="Visibility"><Select value={note.visibility} onChange={(event) => setNote((current) => ({ ...current, visibility: event.target.value }))}><option value="internal">Internal reviewers only</option><option value="applicant">Visible to applicant</option></Select></FormField>
                <FormField label="Note" required><Textarea rows={5} value={note.body} onChange={(event) => setNote((current) => ({ ...current, body: event.target.value }))} /></FormField>
                <Button type="submit" isLoading={saving === 'note'}>Add note</Button>
              </form>
              {review.notes.length ? <div className={styles.notes}>{[...review.notes].reverse().map((item) => <article key={item.id}><div><StatusBadge tone={item.visibility === 'applicant' ? 'info' : 'neutral'}>{item.visibility === 'applicant' ? 'Applicant visible' : 'Internal'}</StatusBadge><small>{item.createdBy?.displayName || 'Reviewer'} · {new Date(item.createdAt).toLocaleString()}</small></div><p>{item.body}</p></article>)}</div> : null}
            </Card>

            {workspace.permissions.canDecide ? (
              <Card>
                <div><p className={styles.eyebrow}>Controlled action</p><h2>Review decision</h2><p>Decisions create status history, notifications, and immutable audit entries.</p></div>
                <form className={styles.form} onSubmit={submitDecision}>
                  <FormField label="Action"><Select value={decision.action} onChange={(event) => setDecision((current) => ({ ...current, action: event.target.value, confirmation: '' }))}><option value="request_information">Request information</option><option value="approve">Approve application</option><option value="reject">Reject application</option>{application.status === 'approved' ? <option value="suspend">Suspend approved application</option> : null}</Select></FormField>
                  {decision.action === 'request_information' ? (
                    <fieldset className={styles.requestedSections}>
                      <legend>Application sections requiring changes</legend>
                      {stepEntries.map(([stepKey]) => (
                        <label className={styles.checkbox} key={stepKey}>
                          <input
                            type="checkbox"
                            checked={decision.requestedSections.includes(stepKey)}
                            onChange={(event) => setDecision((current) => ({
                              ...current,
                              requestedSections: event.target.checked
                                ? [...current.requestedSections, stepKey]
                                : current.requestedSections.filter((item) => item !== stepKey),
                            }))}
                          />
                          <span>{humanizeFieldName(stepKey)}</span>
                        </label>
                      ))}
                    </fieldset>
                  ) : null}
                  <FormField label="Reason" required={decision.action !== 'approve'}><Input value={decision.reason} onChange={(event) => setDecision((current) => ({ ...current, reason: event.target.value }))} /></FormField>
                  <FormField label="Applicant-visible note" required={['request_information', 'reject', 'suspend'].includes(decision.action)}><Textarea rows={5} value={decision.applicantVisibleNote} onChange={(event) => setDecision((current) => ({ ...current, applicantVisibleNote: event.target.value }))} /></FormField>
                  <FormField label="Internal decision note"><Textarea rows={4} value={decision.internalNote} onChange={(event) => setDecision((current) => ({ ...current, internalNote: event.target.value }))} /></FormField>
                  {requiresDecisionConfirmation ? <FormField label={`Type ${requiredConfirmation} to confirm`} required><Input value={decision.confirmation} onChange={(event) => setDecision((current) => ({ ...current, confirmation: event.target.value }))} /></FormField> : null}
                  <Button type="submit" variant={['reject', 'suspend'].includes(decision.action) ? 'danger' : 'primary'} isLoading={saving === 'decision'}>{decision.action === 'request_information' ? 'Send information request' : decision.action === 'approve' ? 'Approve application' : decision.action === 'reject' ? 'Reject application' : 'Suspend application'}</Button>
                </form>
              </Card>
            ) : null}
          </aside>
        </div>

        <div className={styles.twoColumn}>
          <Card>
            <div><p className={styles.eyebrow}>Workflow history</p><h2>Status history</h2></div>
            <div className={styles.timeline}>{[...application.statusHistory].reverse().map((entry) => <article key={entry.id}><span aria-hidden="true" /><div><div className={styles.timelineHeading}><strong>{applicationStatusLabels[entry.newStatus] || entry.newStatus}</strong><time>{new Date(entry.changedAt).toLocaleString()}</time></div>{entry.applicantVisibleNote ? <p><strong>Applicant note:</strong> {entry.applicantVisibleNote}</p> : null}{entry.internalNote ? <p><strong>Internal note:</strong> {entry.internalNote}</p> : null}{entry.reason ? <small>Reason: {entry.reason}</small> : null}</div></article>)}</div>
          </Card>
          <Card>
            <div><p className={styles.eyebrow}>Administrative audit</p><h2>Application audit history</h2></div>
            {audit.length === 0 ? <EmptyState title="No audit entries" description="Administrative review actions will be recorded here." /> : <div className={styles.auditList}>{audit.map((entry) => <article key={entry.id}><div><strong>{auditActionLabels[entry.action] || entry.action}</strong><p>{entry.actor?.displayName || 'Unknown actor'} · {new Date(entry.createdAt).toLocaleString()}</p>{entry.reason ? <small>{entry.reason}</small> : null}</div><StatusBadge tone={auditOutcomeTones[entry.outcome] || 'neutral'}>{entry.outcome}</StatusBadge></article>)}</div>}
          </Card>
        </div>
      </div>
    </>
  );
}

export default AdminReviewWorkspacePage;
