import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  getCourseCertificateBlob,
  getCourseDocumentBlob,
  getMyCourse,
  listCourseDocuments,
  removeCourseDocument,
  submitMyCourse,
  updateMyCourse,
  uploadCourseDocument,
} from '../../api/courseApi.js';
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
import Textarea from '../../components/common/Textarea/Textarea.jsx';
import Seo from '../../components/seo/Seo.jsx';
import {
  courseDocumentCategories,
  courseDocumentStatusLabels,
  courseDocumentStatusTones,
  courseStatusLabels,
  courseStatusTones,
  editableCourseStatuses,
  formatCourseDate,
  joinCourseList,
  splitCourseList,
} from '../../config/courseConfig.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './CourseEditorPage.module.css';

const deliveryOptions = Object.freeze([
  { value: 'online', label: 'Online' },
  { value: 'in_person', label: 'In person' },
  { value: 'hybrid', label: 'Hybrid' },
]);

function instructorLines(instructors = []) {
  return instructors
    .map((instructor) =>
      [
        instructor.name,
        instructor.qualifications || '',
        instructor.biography || '',
      ].join(' | '),
    )
    .join('\n');
}

function parseInstructors(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, qualifications = '', biography = ''] = line
        .split('|')
        .map((part) => part.trim());

      return { name, qualifications, biography };
    })
    .filter((instructor) => instructor.name);
}

function courseToForm(course) {
  return {
    title: course.title || '',
    category: course.category || '',
    summary: course.summary || '',
    description: course.description || '',
    learningObjectivesText: joinCourseList(course.learningObjectives),
    targetAudienceText: joinCourseList(course.targetAudience),
    prerequisitesText: joinCourseList(course.prerequisites),
    deliveryMethods: course.deliveryMethods || [],
    language: course.language || '',
    totalLearningHours: course.totalLearningHours ?? '',
    creditHours: course.creditHours ?? '',
    creditUnit: course.creditUnit || '',
    assessmentMethod: course.assessmentMethod || '',
    qualityAssurance: course.qualityAssurance || '',
    instructorsText: instructorLines(course.instructors),
    scheduleText: course.scheduleText || '',
    priceMajor:
      Number.isInteger(course.priceMinor) && course.priceMinor >= 0
        ? String(course.priceMinor / 100)
        : '',
    currency: course.currency || 'INR',
    contactEmail: course.contactEmail || '',
    websiteUrl: course.websiteUrl || '',
    publicVisible: true,
    declarationAccepted: Boolean(course.declarationAccepted),
  };
}

function formToPayload(form) {
  const price = String(form.priceMajor).trim();

  return {
    title: form.title.trim(),
    category: form.category.trim(),
    summary: form.summary.trim(),
    description: form.description.trim(),
    learningObjectives: splitCourseList(form.learningObjectivesText),
    targetAudience: splitCourseList(form.targetAudienceText),
    prerequisites: splitCourseList(form.prerequisitesText),
    deliveryMethods: form.deliveryMethods,
    language: form.language.trim(),
    totalLearningHours:
      form.totalLearningHours === ''
        ? null
        : Number(form.totalLearningHours),
    creditHours:
      form.creditHours === '' ? null : Number(form.creditHours),
    creditUnit: form.creditUnit || null,
    assessmentMethod: form.assessmentMethod.trim(),
    qualityAssurance: form.qualityAssurance.trim(),
    instructors: parseInstructors(form.instructorsText),
    scheduleText: form.scheduleText.trim(),
    priceMinor: price === '' ? null : Math.round(Number(price) * 100),
    currency: form.currency.trim().toUpperCase(),
    contactEmail: form.contactEmail.trim(),
    websiteUrl: form.websiteUrl.trim(),
    publicVisible: true,
    declarationAccepted: form.declarationAccepted,
  };
}

function CourseEditorPage() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [form, setForm] = useState(null);
  const [documentForm, setDocumentForm] = useState({
    category: 'curriculum',
    title: '',
  });
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const editable = useMemo(
    () => course && editableCourseStatuses.has(course.status),
    [course],
  );

  async function load() {
    setLoading(true);
    setError('');

    try {
      const [courseResult, documentResult] = await Promise.all([
        getMyCourse(courseId),
        listCourseDocuments(courseId, true),
      ]);

      const nextCourse = courseResult.data.course;
      setCourse(nextCourse);
      setForm(courseToForm(nextCourse));
      setDocuments(documentResult.data.documents || []);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // The route identifier is the only loading dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleDelivery(method) {
    setForm((current) => ({
      ...current,
      deliveryMethods: current.deliveryMethods.includes(method)
        ? current.deliveryMethods.filter((item) => item !== method)
        : [...current.deliveryMethods, method],
    }));
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const result = await updateMyCourse(
        courseId,
        formToPayload(form),
      );
      setCourse(result.data.course);
      setForm(courseToForm(result.data.course));
      setMessage(result.message);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      if (editable) {
        await updateMyCourse(courseId, formToPayload(form));
      }

      const result = await submitMyCourse(courseId);
      setCourse(result.data.course);
      setForm(courseToForm(result.data.course));
      setMessage(result.message);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  async function upload(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!file) {
      setFileError('Select one course document.');
      return;
    }

    if (!documentForm.title.trim()) {
      setError('Enter a document title.');
      return;
    }

    const payload = new FormData();
    payload.append('file', file);
    payload.append('category', documentForm.category);
    payload.append('title', documentForm.title.trim());

    setUploading(true);
    setUploadProgress(0);

    try {
      const result = await uploadCourseDocument(
        courseId,
        payload,
        (progressEvent) => {
          if (progressEvent.total) {
            setUploadProgress(
              Math.round(
                (progressEvent.loaded / progressEvent.total) * 100,
              ),
            );
          }
        },
      );

      setDocuments((current) => [
        result.data.document,
        ...current.map((document) =>
          document.category === result.data.document.category &&
          document.isCurrent
            ? {
                ...document,
                isCurrent: false,
                reviewStatus: 'superseded',
              }
            : document,
        ),
      ]);
      setFile(null);
      setFileError('');
      setDocumentForm((current) => ({ ...current, title: '' }));
      setMessage(result.message);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setUploading(false);
    }
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

  async function removeDocument(documentId) {
    setError('');
    setMessage('');

    try {
      const result = await removeCourseDocument(documentId);
      setDocuments((current) =>
        current.filter((document) => document.id !== documentId),
      );
      setMessage(result.message);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }

  async function openCertificate(download) {
    if (!course?.certificate?.id) return;

    setError('');
    const preview = download
      ? null
      : window.open('about:blank', '_blank');

    if (preview) preview.opener = null;

    try {
      const blob = await getCourseCertificateBlob(
        course.certificate.id,
        download,
      );
      const url = URL.createObjectURL(blob);

      if (download) {
        const anchor = window.document.createElement('a');
        anchor.href = url;
        anchor.download = `${course.certificate.certificateNumber}.pdf`;
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
      <section className="section">
        <div className={`container ${styles.loading}`}>
          <Loader label="Loading course accreditation record" size="large" />
        </div>
      </section>
    );
  }

  if (!course || !form) {
    return (
      <section className="section">
        <div className="container">
          <Alert tone="error">
            {error || 'Course accreditation record not found.'}
          </Alert>
        </div>
      </section>
    );
  }

  return (
    <>
      <Seo
        title={course.title}
        description="Provider course accreditation workspace."
        noIndex
      />

      <section className="section">
        <div className={`container ${styles.container}`}>
          <header className={styles.header}>
            <div>
              <p className={styles.eyebrow}>{course.reference}</p>
              <h1>{course.title}</h1>
              <div className={styles.statusLine}>
                <StatusBadge
                  tone={courseStatusTones[course.status] || 'neutral'}
                >
                  {courseStatusLabels[course.status] || course.status}
                </StatusBadge>
                <span>{course.completionPercentage}% complete</span>
              </div>
            </div>
            <Button to="/dashboard/courses" variant="secondary">
              Back to courses
            </Button>
          </header>

          {message ? <Alert tone="success">{message}</Alert> : null}
          {error ? <Alert tone="error">{error}</Alert> : null}

          {course.review?.requestedFields?.length ? (
            <Alert tone="warning">
              Requested updates:{' '}
              {course.review.requestedFields.join(', ')}.
              {course.review.notes
                ?.filter((note) => note.visibility === 'provider')
                .slice(-1)
                .map((note) => ` ${note.body}`)}
            </Alert>
          ) : null}

          <form className={styles.form} onSubmit={save}>
            <Card className={styles.sectionCard}>
              <h2>Course identity</h2>
              <div className={styles.grid}>
                <FormField label="Course title">
                  <Input
                    disabled={!editable}
                    minLength="3"
                    maxLength="240"
                    required
                    value={form.title}
                    onChange={(event) =>
                      update('title', event.target.value)
                    }
                  />
                </FormField>
                <FormField label="Category">
                  <Input
                    disabled={!editable}
                    minLength="2"
                    maxLength="160"
                    required
                    value={form.category}
                    onChange={(event) =>
                      update('category', event.target.value)
                    }
                  />
                </FormField>
                <FormField label="Language">
                  <Input
                    disabled={!editable}
                    maxLength="80"
                    value={form.language}
                    onChange={(event) =>
                      update('language', event.target.value)
                    }
                  />
                </FormField>
                <FormField label="Public contact email">
                  <Input
                    disabled={!editable}
                    type="email"
                    value={form.contactEmail}
                    onChange={(event) =>
                      update('contactEmail', event.target.value)
                    }
                  />
                </FormField>
                <FormField label="Course website">
                  <Input
                    disabled={!editable}
                    type="url"
                    value={form.websiteUrl}
                    onChange={(event) =>
                      update('websiteUrl', event.target.value)
                    }
                  />
                </FormField>
              </div>

              <FormField label="Short public summary">
                <Textarea
                  disabled={!editable}
                  rows="4"
                  maxLength="500"
                  value={form.summary}
                  onChange={(event) =>
                    update('summary', event.target.value)
                  }
                />
              </FormField>

              <FormField label="Detailed course description">
                <Textarea
                  disabled={!editable}
                  rows="10"
                  maxLength="10000"
                  value={form.description}
                  onChange={(event) =>
                    update('description', event.target.value)
                  }
                />
              </FormField>
            </Card>

            <Card className={styles.sectionCard}>
              <h2>Curriculum and learner outcomes</h2>
              <div className={styles.grid}>
                <FormField
                  label="Learning objectives"
                  hint="One measurable objective per line."
                >
                  <Textarea
                    disabled={!editable}
                    rows="8"
                    value={form.learningObjectivesText}
                    onChange={(event) =>
                      update(
                        'learningObjectivesText',
                        event.target.value,
                      )
                    }
                  />
                </FormField>
                <FormField
                  label="Target audience"
                  hint="One audience group per line."
                >
                  <Textarea
                    disabled={!editable}
                    rows="8"
                    value={form.targetAudienceText}
                    onChange={(event) =>
                      update('targetAudienceText', event.target.value)
                    }
                  />
                </FormField>
                <FormField
                  label="Prerequisites"
                  hint="One prerequisite per line."
                >
                  <Textarea
                    disabled={!editable}
                    rows="8"
                    value={form.prerequisitesText}
                    onChange={(event) =>
                      update('prerequisitesText', event.target.value)
                    }
                  />
                </FormField>
                <FormField label="Schedule information">
                  <Textarea
                    disabled={!editable}
                    rows="8"
                    value={form.scheduleText}
                    onChange={(event) =>
                      update('scheduleText', event.target.value)
                    }
                  />
                </FormField>
              </div>
            </Card>

            <Card className={styles.sectionCard}>
              <h2>Delivery and CPD/CEU hours</h2>
              <fieldset className={styles.fieldset}>
                <legend>Delivery methods</legend>
                <div className={styles.checks}>
                  {deliveryOptions.map((option) => (
                    <label key={option.value}>
                      <input
                        type="checkbox"
                        disabled={!editable}
                        checked={form.deliveryMethods.includes(
                          option.value,
                        )}
                        onChange={() => toggleDelivery(option.value)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className={styles.grid}>
                <FormField label="Total learning hours">
                  <Input
                    disabled={!editable}
                    type="number"
                    min="0.5"
                    max="10000"
                    step="0.5"
                    value={form.totalLearningHours}
                    onChange={(event) =>
                      update(
                        'totalLearningHours',
                        event.target.value,
                      )
                    }
                  />
                </FormField>
                <FormField label="Accredited credit hours">
                  <Input
                    disabled={!editable}
                    type="number"
                    min="0.5"
                    max="10000"
                    step="0.5"
                    value={form.creditHours}
                    onChange={(event) =>
                      update('creditHours', event.target.value)
                    }
                  />
                </FormField>
                <FormField label="Credit unit">
                  <Select
                    disabled={!editable}
                    value={form.creditUnit}
                    onChange={(event) =>
                      update('creditUnit', event.target.value)
                    }
                  >
                    <option value="">Select CPD or CEU</option>
                    <option value="CPD">CPD</option>
                    <option value="CEU">CEU</option>
                  </Select>
                </FormField>
                <FormField label="Listed price">
                  <Input
                    disabled={!editable}
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.priceMajor}
                    onChange={(event) =>
                      update('priceMajor', event.target.value)
                    }
                  />
                </FormField>
                <FormField label="Currency">
                  <Input
                    disabled={!editable}
                    maxLength="3"
                    value={form.currency}
                    onChange={(event) =>
                      update(
                        'currency',
                        event.target.value.toUpperCase(),
                      )
                    }
                  />
                </FormField>
              </div>
            </Card>

            <Card className={styles.sectionCard}>
              <h2>Assessment, quality and faculty</h2>
              <FormField label="Assessment method">
                <Textarea
                  disabled={!editable}
                  rows="7"
                  maxLength="3000"
                  value={form.assessmentMethod}
                  onChange={(event) =>
                    update('assessmentMethod', event.target.value)
                  }
                />
              </FormField>
              <FormField label="Quality-assurance process">
                <Textarea
                  disabled={!editable}
                  rows="7"
                  maxLength="3000"
                  value={form.qualityAssurance}
                  onChange={(event) =>
                    update('qualityAssurance', event.target.value)
                  }
                />
              </FormField>
              <FormField
                label="Instructors"
                hint="One instructor per line: Name | Qualifications | Biography"
              >
                <Textarea
                  disabled={!editable}
                  rows="8"
                  value={form.instructorsText}
                  onChange={(event) =>
                    update('instructorsText', event.target.value)
                  }
                />
              </FormField>
            </Card>

            <Card className={styles.sectionCard}>
              <h2>Declaration and registry publication</h2>
              <p>
                An approved, active course is automatically published in the
                accredited-course registry while its provider accreditation
                and course certificate remain valid.
              </p>
              <div className={styles.checks}>
                <label>
                  <input
                    type="checkbox"
                    disabled={!editable}
                    checked={form.declarationAccepted}
                    onChange={(event) =>
                      update(
                        'declarationAccepted',
                        event.target.checked,
                      )
                    }
                  />
                  <span>
                    I confirm that the course information and evidence are
                    accurate and authorized for review.
                  </span>
                </label>
              </div>
            </Card>

            {editable ? (
              <div className={styles.actions}>
                <Button type="submit" isLoading={saving}>
                  Save draft
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  isLoading={submitting}
                  onClick={submit}
                >
                  Submit for review
                </Button>
              </div>
            ) : null}
          </form>

          <Card className={styles.sectionCard}>
            <h2>Curriculum and supporting evidence</h2>

            {editable ? (
              <form className={styles.uploadForm} onSubmit={upload}>
                <div className={styles.grid}>
                  <FormField label="Document category">
                    <Select
                      value={documentForm.category}
                      onChange={(event) =>
                        setDocumentForm((current) => ({
                          ...current,
                          category: event.target.value,
                        }))
                      }
                    >
                      {courseDocumentCategories.map((category) => (
                        <option
                          key={category.value}
                          value={category.value}
                        >
                          {category.label}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Document title">
                    <Input
                      value={documentForm.title}
                      onChange={(event) =>
                        setDocumentForm((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                    />
                  </FormField>
                </div>

                <FileUploader
                  file={file}
                  onChange={setFile}
                  onError={setFileError}
                />
                {fileError ? (
                  <Alert tone="error">{fileError}</Alert>
                ) : null}
                {uploading ? (
                  <p>Upload progress: {uploadProgress}%</p>
                ) : null}
                <Button type="submit" isLoading={uploading}>
                  Upload evidence
                </Button>
              </form>
            ) : null}

            {documents.length === 0 ? (
              <EmptyState
                title="No curriculum evidence uploaded"
                description="A curriculum document is required before submission."
              />
            ) : (
              <div className={styles.documentList}>
                {documents.map((document) => (
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
                      {document.providerVisibleNote ? (
                        <small>{document.providerVisibleNote}</small>
                      ) : null}
                    </div>
                    <div className={styles.documentActions}>
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
                      {editable &&
                      document.isCurrent &&
                      document.reviewStatus === 'pending' &&
                      course.status === 'draft' ? (
                        <Button
                          type="button"
                          variant="danger"
                          onClick={() => removeDocument(document.id)}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </Card>

          {course.certificate ? (
            <Card className={styles.certificateCard}>
              <div>
                <p className={styles.eyebrow}>
                  Approved course certificate
                </p>
                <h2>{course.certificate.certificateNumber}</h2>
                <p>
                  Accreditation {course.accreditationNumber} · valid until{' '}
                  {formatCourseDate(course.validUntil)}
                </p>
              </div>
              <div className={styles.actions}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => openCertificate(false)}
                >
                  Preview PDF
                </Button>
                <Button
                  type="button"
                  onClick={() => openCertificate(true)}
                >
                  Download PDF
                </Button>
              </div>
            </Card>
          ) : null}
        </div>
      </section>
    </>
  );
}

export default CourseEditorPage;
