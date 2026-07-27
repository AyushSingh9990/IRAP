import { useEffect, useMemo, useState } from 'react';
import { createCourse, listMyCourses } from '../../api/courseApi.js';
import { listMyMemberships } from '../../api/membershipApi.js';
import Alert from '../../components/common/Alert/Alert.jsx';
import Button from '../../components/common/Button/Button.jsx';
import Card from '../../components/common/Card/Card.jsx';
import EmptyState from '../../components/common/EmptyState/EmptyState.jsx';
import FormField from '../../components/common/FormField/FormField.jsx';
import Input from '../../components/common/Input/Input.jsx';
import Loader from '../../components/common/Loader/Loader.jsx';
import Select from '../../components/common/Select/Select.jsx';
import StatusBadge from '../../components/common/StatusBadge/StatusBadge.jsx';
import Seo from '../../components/seo/Seo.jsx';
import {
  courseStatusLabels,
  courseStatusTones,
  formatCourseDate,
} from '../../config/courseConfig.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './ProviderCoursesPage.module.css';

function initialDraftPayload(form) {
  return {
    providerMembershipId: form.providerMembershipId,
    title: form.title.trim(),
    category: form.category.trim(),
    summary: '',
    description: '',
    learningObjectives: [],
    targetAudience: [],
    prerequisites: [],
    deliveryMethods: [],
    language: '',
    totalLearningHours: null,
    creditHours: null,
    creditUnit: null,
    assessmentMethod: '',
    qualityAssurance: '',
    instructors: [],
    scheduleText: '',
    priceMinor: null,
    currency: 'INR',
    contactEmail: '',
    websiteUrl: '',
    publicVisible: true,
    declarationAccepted: false,
  };
}

function ProviderCoursesPage() {
  const [memberships, setMemberships] = useState([]);
  const [courses, setCourses] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState('');
  const [form, setForm] = useState({
    providerMembershipId: '',
    title: '',
    category: '',
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const eligibleMemberships = useMemo(
    () =>
      memberships.filter(
        (membership) =>
          membership.type === 'training_provider' &&
          ['active', 'renewal_due'].includes(membership.status) &&
          new Date(membership.validUntil).getTime() >= Date.now(),
      ),
    [memberships],
  );

  async function load() {
    setLoading(true);
    setError('');

    try {
      const [membershipResult, courseResult] = await Promise.all([
        listMyMemberships(),
        listMyCourses(status ? { status } : {}),
      ]);

      const nextMemberships = membershipResult.data.memberships || [];
      setMemberships(nextMemberships);
      setCourses(courseResult.data.courses || []);
      setMeta(courseResult.meta || { total: 0, page: 1, pages: 1 });

      setForm((current) => ({
        ...current,
        providerMembershipId:
          current.providerMembershipId ||
          nextMemberships.find(
            (membership) =>
              membership.type === 'training_provider' &&
              ['active', 'renewal_due'].includes(membership.status),
          )?.id ||
          '',
      }));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // Status changes are submitted explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function filterCourses(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await listMyCourses(status ? { status } : {});
      setCourses(result.data.courses || []);
      setMeta(result.meta || { total: 0, page: 1, pages: 1 });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function submitCreate(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!form.providerMembershipId) {
      setError(
        'An active training-provider accreditation is required before creating courses.',
      );
      return;
    }

    setCreating(true);

    try {
      const result = await createCourse(initialDraftPayload(form));
      setCourses((current) => [result.data.course, ...current]);
      setMessage(result.message);
      setForm((current) => ({
        ...current,
        title: '',
        category: '',
      }));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <Seo
        title="Provider Courses"
        description="Create and manage course accreditation records."
        noIndex
      />

      <section className="section">
        <div className={`container ${styles.container}`}>
          <header className={styles.header}>
            <div>
              <p className={styles.eyebrow}>Training-provider workspace</p>
              <h1>Provider courses</h1>
              <p>
                Create course records, upload curriculum evidence, submit for
                accreditation review, and access approved course certificates.
              </p>
            </div>
            <Button to="/directory/courses" variant="secondary">
              Approved-course directory
            </Button>
          </header>

          {message ? <Alert tone="success">{message}</Alert> : null}
          {error ? <Alert tone="error">{error}</Alert> : null}

          {eligibleMemberships.length ? (
            <Card className={styles.createCard}>
              <div>
                <h2>Start a course accreditation record</h2>
                <p>
                  A saved draft is private until it is submitted and approved.
                </p>
              </div>

              <form className={styles.createForm} onSubmit={submitCreate}>
                <FormField label="Training-provider accreditation">
                  <Select
                    value={form.providerMembershipId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        providerMembershipId: event.target.value,
                      }))
                    }
                  >
                    {eligibleMemberships.map((membership) => (
                      <option key={membership.id} value={membership.id}>
                        {membership.approvedName} ·{' '}
                        {membership.registrationNumber}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <FormField label="Course title">
                  <Input
                    minLength="3"
                    maxLength="240"
                    required
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                  />
                </FormField>

                <FormField label="Course category">
                  <Input
                    minLength="2"
                    maxLength="160"
                    required
                    value={form.category}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                  />
                </FormField>

                <Button type="submit" isLoading={creating}>
                  Create draft
                </Button>
              </form>
            </Card>
          ) : (
            <Alert tone="warning">
              An active and unexpired training-provider accreditation is
              required before a course can be created.
            </Alert>
          )}

          <div className={styles.listHeading}>
            <div>
              <p className={styles.eyebrow}>Accreditation records</p>
              <h2>Your courses ({meta.total})</h2>
            </div>

            <form className={styles.filterForm} onSubmit={filterCourses}>
              <FormField label="Status">
                <Select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <option value="">All statuses</option>
                  {Object.entries(courseStatusLabels).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ),
                  )}
                </Select>
              </FormField>
              <Button type="submit" variant="secondary">
                Apply
              </Button>
            </form>
          </div>

          {loading ? (
            <div className={styles.loading}>
              <Loader label="Loading provider courses" size="large" />
            </div>
          ) : courses.length === 0 ? (
            <EmptyState
              title="No course records found"
              description="Create a course draft or change the selected status filter."
            />
          ) : (
            <div className={styles.grid}>
              {courses.map((course) => (
                <Card className={styles.courseCard} key={course.id}>
                  <div className={styles.cardHeading}>
                    <StatusBadge
                      tone={courseStatusTones[course.status] || 'neutral'}
                    >
                      {courseStatusLabels[course.status] || course.status}
                    </StatusBadge>
                    <span>{course.completionPercentage}% complete</span>
                  </div>

                  <div>
                    <p className={styles.reference}>{course.reference}</p>
                    <h3>{course.title}</h3>
                    <p>{course.category}</p>
                  </div>

                  <dl>
                    <div>
                      <dt>Provider</dt>
                      <dd>
                        {course.providerMembership?.approvedName ||
                          'Not available'}
                      </dd>
                    </div>
                    <div>
                      <dt>Updated</dt>
                      <dd>{formatCourseDate(course.updatedAt)}</dd>
                    </div>
                    {course.accreditationNumber ? (
                      <div>
                        <dt>Accreditation number</dt>
                        <dd>{course.accreditationNumber}</dd>
                      </div>
                    ) : null}
                    {course.validUntil ? (
                      <div>
                        <dt>Valid until</dt>
                        <dd>{formatCourseDate(course.validUntil)}</dd>
                      </div>
                    ) : null}
                  </dl>

                  <Button
                    to={`/dashboard/courses/${course.id}`}
                    variant="secondary"
                  >
                    Open course
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default ProviderCoursesPage;
