import { useEffect, useState } from 'react';
import {
  getCoursePolicy,
  listAdminCourses,
  saveCoursePolicy,
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
import Seo from '../../components/seo/Seo.jsx';
import {
  courseStatusLabels,
  courseStatusTones,
  formatCourseDate,
} from '../../config/courseConfig.js';
import useAuth from '../../hooks/useAuth.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './AdminCoursesPage.module.css';

const emptyPolicy = Object.freeze({
  validityMonths: 12,
  accreditationPrefix: '',
  certificatePrefix: '',
  authorizedSignatory: {
    name: '',
    title: '',
  },
});

function AdminCoursesPage() {
  const auth = useAuth();
  const canManagePolicy = auth.hasPermission('course:manage:policy');
  const [policy, setPolicy] = useState(emptyPolicy);
  const [courses, setCourses] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1 });
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    assignment: 'all',
  });
  const [loading, setLoading] = useState(true);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load(query = filters) {
    setLoading(true);
    setError('');

    try {
      const queuePromise = listAdminCourses(query);
      const policyPromise = canManagePolicy
        ? getCoursePolicy()
        : Promise.resolve({ data: { policy: null } });

      const [queueResult, policyResult] = await Promise.all([
        queuePromise,
        policyPromise,
      ]);

      setCourses(queueResult.data.courses || []);
      setMeta(queueResult.meta || { total: 0, page: 1, pages: 1 });

      if (policyResult.data.policy) {
        setPolicy(policyResult.data.policy);
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // Initial load only; filters are applied explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function applyFilters(event) {
    event.preventDefault();
    await load(filters);
  }

  async function submitPolicy(event) {
    event.preventDefault();
    setSavingPolicy(true);
    setError('');
    setMessage('');

    try {
      const result = await saveCoursePolicy({
        validityMonths: Number(policy.validityMonths),
        accreditationPrefix: policy.accreditationPrefix
          .trim()
          .toUpperCase(),
        certificatePrefix: policy.certificatePrefix
          .trim()
          .toUpperCase(),
        authorizedSignatory: {
          name: policy.authorizedSignatory.name.trim(),
          title: policy.authorizedSignatory.title.trim(),
        },
      });

      setPolicy(result.data.policy);
      setMessage(result.message);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSavingPolicy(false);
    }
  }

  return (
    <>
      <Seo
        title="Course Accreditation Administration"
        description="Manage course policy and accreditation review queues."
        noIndex
      />

      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Provider-course administration</p>
            <h1>Course accreditation</h1>
            <p>
              Configure issuance policy, assign reviewers, review curriculum
              evidence, approve CPD or CEU hours, and manage accredited
              courses.
            </p>
          </div>
          <Button to="/directory/courses" variant="secondary">
            Approved-course directory
          </Button>
        </header>

        {message ? <Alert tone="success">{message}</Alert> : null}
        {error ? <Alert tone="error">{error}</Alert> : null}

        {canManagePolicy ? (
          <Card className={styles.policyCard}>
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>Issuance controls</p>
                <h2>Course accreditation policy</h2>
                <p>
                  The policy must be configured before any course can be
                  approved.
                </p>
              </div>
              <StatusBadge
                tone={
                  policy.accreditationPrefix &&
                  policy.certificatePrefix
                    ? 'success'
                    : 'warning'
                }
              >
                {policy.accreditationPrefix &&
                policy.certificatePrefix
                  ? 'Configured'
                  : 'Required'}
              </StatusBadge>
            </div>

            <form className={styles.policyForm} onSubmit={submitPolicy}>
              <FormField label="Validity in months">
                <Input
                  type="number"
                  min="1"
                  max="120"
                  required
                  value={policy.validityMonths}
                  onChange={(event) =>
                    setPolicy((current) => ({
                      ...current,
                      validityMonths: event.target.value,
                    }))
                  }
                />
              </FormField>

              <FormField
                label="Accreditation prefix"
                hint="Two to twelve letters or numbers."
              >
                <Input
                  minLength="2"
                  maxLength="12"
                  pattern="[A-Za-z0-9]+"
                  required
                  value={policy.accreditationPrefix}
                  onChange={(event) =>
                    setPolicy((current) => ({
                      ...current,
                      accreditationPrefix:
                        event.target.value.toUpperCase(),
                    }))
                  }
                />
              </FormField>

              <FormField
                label="Certificate prefix"
                hint="Two to twelve letters or numbers."
              >
                <Input
                  minLength="2"
                  maxLength="12"
                  pattern="[A-Za-z0-9]+"
                  required
                  value={policy.certificatePrefix}
                  onChange={(event) =>
                    setPolicy((current) => ({
                      ...current,
                      certificatePrefix:
                        event.target.value.toUpperCase(),
                    }))
                  }
                />
              </FormField>

              <FormField label="Authorized signatory">
                <Input
                  minLength="2"
                  maxLength="160"
                  required
                  value={policy.authorizedSignatory.name}
                  onChange={(event) =>
                    setPolicy((current) => ({
                      ...current,
                      authorizedSignatory: {
                        ...current.authorizedSignatory,
                        name: event.target.value,
                      },
                    }))
                  }
                />
              </FormField>

              <FormField label="Signatory title">
                <Input
                  minLength="2"
                  maxLength="160"
                  required
                  value={policy.authorizedSignatory.title}
                  onChange={(event) =>
                    setPolicy((current) => ({
                      ...current,
                      authorizedSignatory: {
                        ...current.authorizedSignatory,
                        title: event.target.value,
                      },
                    }))
                  }
                />
              </FormField>

              <Button type="submit" isLoading={savingPolicy}>
                Save policy
              </Button>
            </form>
          </Card>
        ) : null}

        <Card>
          <form className={styles.filters} onSubmit={applyFilters}>
            <FormField label="Search">
              <Input
                placeholder="Reference, title, category, or accreditation"
                value={filters.search}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    search: event.target.value,
                  }))
                }
              />
            </FormField>

            <FormField label="Status">
              <Select
                value={filters.status}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    status: event.target.value,
                  }))
                }
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

            <FormField label="Assignment">
              <Select
                value={filters.assignment}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    assignment: event.target.value,
                  }))
                }
              >
                <option value="all">All courses</option>
                <option value="mine">Assigned to me</option>
                <option value="unassigned">Unassigned</option>
              </Select>
            </FormField>

            <Button type="submit">Apply filters</Button>
          </form>
        </Card>

        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Review queue</p>
            <h2>Course records ({meta.total})</h2>
          </div>
        </div>

        {loading ? (
          <div className={styles.loading}>
            <Loader label="Loading course accreditation queue" size="large" />
          </div>
        ) : courses.length === 0 ? (
          <EmptyState
            title="No course records match these filters"
            description="Submitted provider courses will appear here."
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
                  <span>{course.completionPercentage}%</span>
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
                    <dt>Reviewer</dt>
                    <dd>
                      {course.review?.assignedReviewer?.displayName ||
                        'Unassigned'}
                    </dd>
                  </div>
                  <div>
                    <dt>Submitted</dt>
                    <dd>{formatCourseDate(course.submittedAt)}</dd>
                  </div>
                </dl>

                <Button
                  to={`/admin/courses/${course.id}`}
                  variant="secondary"
                >
                  Open review workspace
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default AdminCoursesPage;
