import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  addCourseReviewNote,
  approveCourse,
  assignCourseReviewer,
  getAdminCourse,
  getCourseDocumentBlob,
  listCourseReviewers,
  rejectCourse,
  requestCourseInformation,
  reviewCourseDocument,
  saveCourseChecklist,
  updateCourseStatus,
} from '../../api/courseApi.js';
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
import {
  courseChecklistLabels,
  courseDocumentStatusLabels,
  courseDocumentStatusTones,
  courseStatusLabels,
  courseStatusTones,
  formatCourseDate,
  formatCourseMoney,
  splitCourseList,
} from '../../config/courseConfig.js';
import useAuth from '../../hooks/useAuth.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './AdminCourseReviewPage.module.css';

const emptyChecklist = Object.freeze(
  Object.fromEntries(
    Object.keys(courseChecklistLabels).map((key) => [key, false]),
  ),
);

function AdminCourseReviewPage() {
  const { courseId } = useParams();
  const auth = useAuth();
  const canAssign = auth.hasPermission('course:assign');
  const canDecide = auth.hasPermission('course:decide');
  const [workspace, setWorkspace] = useState(null);
  const [reviewers, setReviewers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [assignment, setAssignment] = useState({
    reviewerId: '',
    dueAt: '',
  });
  const [checklist, setChecklist] = useState(emptyChecklist);
  const [note, setNote] = useState({
    visibility: 'internal',
    body: '',
  });
  const [information, setInformation] = useState({
    requestedFieldsText: '',
    reason: '',
    providerVisibleNote: '',
    internalNote: '',
  });
  const [decision, setDecision] = useState({
    confirmation: '',
    reason: '',
    providerVisibleNote: '',
    internalNote: '',
  });
  const [statusAction, setStatusAction] = useState({
    action: 'suspend',
    confirmation: '',
    reason: '',
  });
  const [documentReviews, setDocumentReviews] = useState({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const allChecklistComplete = useMemo(
    () => Object.values(checklist).every(Boolean),
    [checklist],
  );

  async function load() {
    setLoading(true);
    setError('');

    try {
      const [workspaceResult, reviewerResult] = await Promise.all([
        getAdminCourse(courseId),
        canAssign
          ? listCourseReviewers()
          : Promise.resolve({ data: { reviewers: [] } }),
      ]);

      const nextWorkspace = workspaceResult.data.workspace;
      setWorkspace(nextWorkspace);
      setReviewers(reviewerResult.data.reviewers || []);
      setAssignment({
        reviewerId:
          nextWorkspace.review?.assignedReviewer?.id || '',
        dueAt: nextWorkspace.review?.dueAt
          ? new Date(nextWorkspace.review.dueAt)
              .toISOString()
              .slice(0, 10)
          : '',
      });
      setChecklist({
        ...emptyChecklist,
        ...(nextWorkspace.review?.checklist || {}),
      });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // Route and permission state are stable during the review.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  async function runAction(key, action) {
    setSaving(key);
    setError('');
    setMessage('');

    try {
      const result = await action();
      setMessage(result.message);
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving('');
    }
  }

  async function saveAssignment(event) {
    event.preventDefault();

    await runAction('assignment', () =>
      assignCourseReviewer(courseId, {
        reviewerId: assignment.reviewerId || null,
        dueAt: assignment.dueAt || '',
      }),
    );
  }

  async function saveChecklist(event) {
    event.preventDefault();

    await runAction('checklist', () =>
      saveCourseChecklist(courseId, checklist),
    );
  }

  async function submitNote(event) {
    event.preventDefault();

    await runAction('note', () =>
      addCourseReviewNote(courseId, {
        visibility: note.visibility,
        body: note.body.trim(),
      }),
    );

    setNote((current) => ({ ...current, body: '' }));
  }

  async function requestInformation(event) {
    event.preventDefault();

    await runAction('information', () =>
      requestCourseInformation(courseId, {
        requestedFields: splitCourseList(
          information.requestedFieldsText,
        ),
        reason: information.reason.trim(),
        providerVisibleNote:
          information.providerVisibleNote.trim(),
        internalNote: information.internalNote.trim(),
      }),
    );
  }

  async function submitDecision(action) {
    const request =
      action === 'approve' ? approveCourse : rejectCourse;

    await runAction(action, () =>
      request(courseId, {
        confirmation: decision.confirmation.trim(),
        reason: decision.reason.trim(),
        providerVisibleNote:
          decision.providerVisibleNote.trim(),
        internalNote: decision.internalNote.trim(),
      }),
    );
  }

  async function submitStatus(event) {
    event.preventDefault();

    await runAction('status', () =>
      updateCourseStatus(courseId, {
        action: statusAction.action,
        confirmation: statusAction.confirmation.trim(),
        reason: statusAction.reason.trim(),
      }),
    );
  }

  function updateDocumentReview(documentId, field, value) {
    setDocumentReviews((current) => ({
      ...current,
      [documentId]: {
        action: 'approve',
        providerVisibleNote: '',
        internalNote: '',
        reason: '',
        ...(current[documentId] || {}),
        [field]: value,
      },
    }));
  }

  async function submitDocumentReview(documentId) {
    const payload = {
      action: 'approve',
      providerVisibleNote: '',
      internalNote: '',
      reason: '',
      ...(documentReviews[documentId] || {}),
    };

    await runAction(`document-${documentId}`, () =>
      reviewCourseDocument(documentId, payload),
    );
  }

  async function openDocument(document, disposition) {
    setError('');
    const preview =
      disposition === 'inline'
        ? window.open('about:blank', '_blank')
        : null;

    if (preview) preview.opener = null;

    try {
      const blob = await getCourseDocumentBlob(
        document.id,
        disposition,
      );
      const url = URL.createObjectURL(blob);

      if (disposition === 'attachment') {
        const anchor = window.document.createElement('a');
        anchor.href = url;
        anchor.download = document.originalFilename;
        window.document.body.append(anchor);
        anchor.click();
        anchor.remove();
      } else if (preview) {
        preview.location.href = url;
      }

      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (requestError) {
      preview?.close();
      setError(getApiErrorMessage(requestError));
    }
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <Loader label="Loading course review workspace" size="large" />
      </div>
    );
  }

  if (!workspace) {
    return <Alert tone="error">{error || 'Course not found.'}</Alert>;
  }

  return (
    <>
      <Seo
        title={`Review ${workspace.reference}`}
        description="Structured course accreditation review workspace."
        noIndex
      />

      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>
              Structured course review workspace
            </p>
            <h1>{workspace.title}</h1>
            <p>
              {workspace.reference} · submitted by{' '}
              {workspace.owner?.displayName || 'Provider'}
            </p>
            <div className={styles.statusLine}>
              <StatusBadge
                tone={
                  courseStatusTones[workspace.status] || 'neutral'
                }
              >
                {courseStatusLabels[workspace.status] ||
                  workspace.status}
              </StatusBadge>
              <span>{workspace.completionPercentage}% complete</span>
            </div>
          </div>
          <Button to="/admin/courses" variant="secondary">
            Back to course queue
          </Button>
        </header>

        {message ? <Alert tone="success">{message}</Alert> : null}
        {error ? <Alert tone="error">{error}</Alert> : null}

        <div className={styles.summaryGrid}>
          <Card>
            <h2>Provider</h2>
            <p>
              {workspace.providerMembership?.approvedName ||
                'Not available'}
            </p>
            <small>
              {workspace.providerMembership?.registrationNumber}
            </small>
          </Card>
          <Card>
            <h2>Credits</h2>
            <p>
              {workspace.creditHours || '—'}{' '}
              {workspace.creditUnit || ''}
            </p>
            <small>
              {workspace.totalLearningHours || '—'} total learning hours
            </small>
          </Card>
          <Card>
            <h2>Delivery</h2>
            <p>
              {(workspace.deliveryMethods || [])
                .map((value) => value.replaceAll('_', ' '))
                .join(', ') || 'Not supplied'}
            </p>
            <small>{workspace.language}</small>
          </Card>
          <Card>
            <h2>Registry publication</h2>
            <p>
              {workspace.status === 'approved'
                ? 'Published while eligible'
                : 'Automatic after approval'}
            </p>
            <small>
              {formatCourseMoney(
                workspace.priceMinor,
                workspace.currency,
              )}
            </small>
          </Card>
        </div>

        {canAssign ? (
          <Card className={styles.section}>
            <h2>Reviewer assignment</h2>
            <form className={styles.inlineForm} onSubmit={saveAssignment}>
              <FormField label="Reviewer">
                <Select
                  value={assignment.reviewerId}
                  onChange={(event) =>
                    setAssignment((current) => ({
                      ...current,
                      reviewerId: event.target.value,
                    }))
                  }
                >
                  <option value="">Unassigned</option>
                  {reviewers.map((reviewer) => (
                    <option key={reviewer.id} value={reviewer.id}>
                      {reviewer.displayName} · {reviewer.email}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Due date">
                <Input
                  type="date"
                  value={assignment.dueAt}
                  onChange={(event) =>
                    setAssignment((current) => ({
                      ...current,
                      dueAt: event.target.value,
                    }))
                  }
                />
              </FormField>
              <Button
                type="submit"
                isLoading={saving === 'assignment'}
              >
                Save assignment
              </Button>
            </form>
          </Card>
        ) : null}

        <Card className={styles.section}>
          <h2>Course record</h2>
          <div className={styles.recordGrid}>
            <section>
              <h3>Summary</h3>
              <p>{workspace.summary || 'Not supplied'}</p>
            </section>
            <section>
              <h3>Description</h3>
              <p className={styles.preWrap}>
                {workspace.description || 'Not supplied'}
              </p>
            </section>
            <section>
              <h3>Learning objectives</h3>
              <ul>
                {(workspace.learningObjectives || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
            <section>
              <h3>Target audience</h3>
              <ul>
                {(workspace.targetAudience || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
            <section>
              <h3>Assessment method</h3>
              <p className={styles.preWrap}>
                {workspace.assessmentMethod || 'Not supplied'}
              </p>
            </section>
            <section>
              <h3>Quality assurance</h3>
              <p className={styles.preWrap}>
                {workspace.qualityAssurance || 'Not supplied'}
              </p>
            </section>
            <section>
              <h3>Instructors</h3>
              <ul>
                {(workspace.instructors || []).map((instructor) => (
                  <li key={instructor.id || instructor.name}>
                    <strong>{instructor.name}</strong>
                    {instructor.qualifications
                      ? ` — ${instructor.qualifications}`
                      : ''}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </Card>

        <Card className={styles.section}>
          <h2>Curriculum and supporting evidence</h2>

          {workspace.documents?.length ? (
            <div className={styles.documents}>
              {workspace.documents.map((document) => {
                const form = {
                  action: 'approve',
                  providerVisibleNote: '',
                  internalNote: '',
                  reason: '',
                  ...(documentReviews[document.id] || {}),
                };

                return (
                  <article className={styles.document} key={document.id}>
                    <div>
                      <StatusBadge
                        tone={
                          courseDocumentStatusTones[
                            document.reviewStatus
                          ] || 'neutral'
                        }
                      >
                        {courseDocumentStatusLabels[
                          document.reviewStatus
                        ] || document.reviewStatus}
                      </StatusBadge>
                      <h3>{document.title}</h3>
                      <p>
                        {document.categoryLabel} ·{' '}
                        {document.originalFilename}
                      </p>
                    </div>

                    <div className={styles.documentButtons}>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          openDocument(document, 'inline')
                        }
                      >
                        Preview
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          openDocument(document, 'attachment')
                        }
                      >
                        Download
                      </Button>
                    </div>

                    {document.isCurrent ? (
                      <div className={styles.documentReview}>
                        <FormField label="Decision">
                          <Select
                            value={form.action}
                            onChange={(event) =>
                              updateDocumentReview(
                                document.id,
                                'action',
                                event.target.value,
                              )
                            }
                          >
                            <option value="approve">Approve</option>
                            <option value="reject">Reject</option>
                            <option value="request_replacement">
                              Request replacement
                            </option>
                          </Select>
                        </FormField>
                        <FormField label="Provider-visible note">
                          <Textarea
                            rows="3"
                            value={form.providerVisibleNote}
                            onChange={(event) =>
                              updateDocumentReview(
                                document.id,
                                'providerVisibleNote',
                                event.target.value,
                              )
                            }
                          />
                        </FormField>
                        <FormField label="Internal note">
                          <Textarea
                            rows="3"
                            value={form.internalNote}
                            onChange={(event) =>
                              updateDocumentReview(
                                document.id,
                                'internalNote',
                                event.target.value,
                              )
                            }
                          />
                        </FormField>
                        <FormField label="Reason">
                          <Input
                            value={form.reason}
                            onChange={(event) =>
                              updateDocumentReview(
                                document.id,
                                'reason',
                                event.target.value,
                              )
                            }
                          />
                        </FormField>
                        <Button
                          type="button"
                          isLoading={
                            saving === `document-${document.id}`
                          }
                          onClick={() =>
                            submitDocumentReview(document.id)
                          }
                        >
                          Save document review
                        </Button>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No course evidence uploaded"
              description="Approval requires a current curriculum document."
            />
          )}
        </Card>

        <Card className={styles.section}>
          <div className={styles.sectionHeading}>
            <div>
              <h2>Controlled review checklist</h2>
              <p>
                Every item must be complete before course approval.
              </p>
            </div>
            <StatusBadge
              tone={allChecklistComplete ? 'success' : 'warning'}
            >
              {allChecklistComplete ? 'Complete' : 'Incomplete'}
            </StatusBadge>
          </div>

          <form onSubmit={saveChecklist}>
            <div className={styles.checklist}>
              {Object.entries(courseChecklistLabels).map(
                ([key, label]) => (
                  <label key={key}>
                    <input
                      type="checkbox"
                      checked={Boolean(checklist[key])}
                      onChange={(event) =>
                        setChecklist((current) => ({
                          ...current,
                          [key]: event.target.checked,
                        }))
                      }
                    />
                    <span>{label}</span>
                  </label>
                ),
              )}
            </div>
            <Button
              type="submit"
              isLoading={saving === 'checklist'}
            >
              Save checklist
            </Button>
          </form>
        </Card>

        <div className={styles.twoColumn}>
          <Card className={styles.section}>
            <h2>Add review note</h2>
            <form className={styles.form} onSubmit={submitNote}>
              <FormField label="Visibility">
                <Select
                  value={note.visibility}
                  onChange={(event) =>
                    setNote((current) => ({
                      ...current,
                      visibility: event.target.value,
                    }))
                  }
                >
                  <option value="internal">Internal</option>
                  <option value="provider">Provider visible</option>
                </Select>
              </FormField>
              <FormField label="Note">
                <Textarea
                  rows="5"
                  required
                  value={note.body}
                  onChange={(event) =>
                    setNote((current) => ({
                      ...current,
                      body: event.target.value,
                    }))
                  }
                />
              </FormField>
              <Button type="submit" isLoading={saving === 'note'}>
                Add note
              </Button>
            </form>
          </Card>

          <Card className={styles.section}>
            <h2>Request information</h2>
            <form className={styles.form} onSubmit={requestInformation}>
              <FormField
                label="Requested fields"
                hint="One field or section name per line."
              >
                <Textarea
                  rows="4"
                  required
                  value={information.requestedFieldsText}
                  onChange={(event) =>
                    setInformation((current) => ({
                      ...current,
                      requestedFieldsText: event.target.value,
                    }))
                  }
                />
              </FormField>
              <FormField label="Reason">
                <Input
                  required
                  value={information.reason}
                  onChange={(event) =>
                    setInformation((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                />
              </FormField>
              <FormField label="Provider-visible explanation">
                <Textarea
                  rows="5"
                  minLength="10"
                  required
                  value={information.providerVisibleNote}
                  onChange={(event) =>
                    setInformation((current) => ({
                      ...current,
                      providerVisibleNote: event.target.value,
                    }))
                  }
                />
              </FormField>
              <FormField label="Internal note">
                <Textarea
                  rows="4"
                  value={information.internalNote}
                  onChange={(event) =>
                    setInformation((current) => ({
                      ...current,
                      internalNote: event.target.value,
                    }))
                  }
                />
              </FormField>
              <Button
                type="submit"
                variant="secondary"
                isLoading={saving === 'information'}
              >
                Request information
              </Button>
            </form>
          </Card>
        </div>

        {workspace.review?.notes?.length ? (
          <Card className={styles.section}>
            <h2>Review notes</h2>
            <div className={styles.notes}>
              {workspace.review.notes.map((item) => (
                <article key={item.id}>
                  <StatusBadge
                    tone={
                      item.visibility === 'internal'
                        ? 'neutral'
                        : 'info'
                    }
                  >
                    {item.visibility}
                  </StatusBadge>
                  <p>{item.body}</p>
                  <small>
                    {item.createdBy?.displayName || 'Reviewer'} ·{' '}
                    {formatCourseDate(item.createdAt)}
                  </small>
                </article>
              ))}
            </div>
          </Card>
        ) : null}

        {canDecide &&
        ['submitted', 'resubmitted', 'under_review'].includes(
          workspace.status,
        ) ? (
          <Card className={styles.section}>
            <h2>Accreditation decision</h2>
            <div className={styles.form}>
              <FormField label="Confirmation">
                <Input
                  placeholder="APPROVE or REJECT"
                  value={decision.confirmation}
                  onChange={(event) =>
                    setDecision((current) => ({
                      ...current,
                      confirmation: event.target.value.toUpperCase(),
                    }))
                  }
                />
              </FormField>
              <FormField label="Reason">
                <Input
                  value={decision.reason}
                  onChange={(event) =>
                    setDecision((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                />
              </FormField>
              <FormField label="Provider-visible note">
                <Textarea
                  rows="5"
                  value={decision.providerVisibleNote}
                  onChange={(event) =>
                    setDecision((current) => ({
                      ...current,
                      providerVisibleNote: event.target.value,
                    }))
                  }
                />
              </FormField>
              <FormField label="Internal note">
                <Textarea
                  rows="5"
                  value={decision.internalNote}
                  onChange={(event) =>
                    setDecision((current) => ({
                      ...current,
                      internalNote: event.target.value,
                    }))
                  }
                />
              </FormField>
              <div className={styles.actions}>
                <Button
                  type="button"
                  isLoading={saving === 'approve'}
                  onClick={() => submitDecision('approve')}
                >
                  Approve course
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  isLoading={saving === 'reject'}
                  onClick={() => submitDecision('reject')}
                >
                  Reject course
                </Button>
              </div>
            </div>
          </Card>
        ) : null}

        {canDecide &&
        ['approved', 'suspended'].includes(workspace.status) ? (
          <Card className={styles.section}>
            <h2>Accreditation status control</h2>
            <form className={styles.form} onSubmit={submitStatus}>
              <FormField label="Action">
                <Select
                  value={statusAction.action}
                  onChange={(event) =>
                    setStatusAction((current) => ({
                      ...current,
                      action: event.target.value,
                      confirmation: '',
                    }))
                  }
                >
                  {workspace.status === 'approved' ? (
                    <option value="suspend">Suspend</option>
                  ) : (
                    <option value="reinstate">Reinstate</option>
                  )}
                  <option value="revoke">Revoke permanently</option>
                </Select>
              </FormField>
              <FormField label="Confirmation">
                <Input
                  placeholder={statusAction.action.toUpperCase()}
                  value={statusAction.confirmation}
                  onChange={(event) =>
                    setStatusAction((current) => ({
                      ...current,
                      confirmation: event.target.value.toUpperCase(),
                    }))
                  }
                />
              </FormField>
              <FormField label="Administrative reason">
                <Textarea
                  rows="4"
                  minLength="10"
                  required
                  value={statusAction.reason}
                  onChange={(event) =>
                    setStatusAction((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                />
              </FormField>
              <Button
                type="submit"
                variant={
                  statusAction.action === 'reinstate'
                    ? 'primary'
                    : 'danger'
                }
                isLoading={saving === 'status'}
              >
                Update course status
              </Button>
            </form>
          </Card>
        ) : null}
      </div>
    </>
  );
}

export default AdminCourseReviewPage;
