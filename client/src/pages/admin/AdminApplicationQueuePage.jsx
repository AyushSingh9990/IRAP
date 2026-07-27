import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  bulkAssignApplicationReviewer,
  listApplicationReviewQueue,
  listReviewerAccounts,
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
import Seo from '../../components/seo/Seo.jsx';
import { applicationStatusLabels, applicationStatusTones } from '../../config/applicationForms.js';
import { applicationTypeLabels } from '../../config/reviewConfig.js';
import useAuth from '../../hooks/useAuth.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './AdminApplicationQueuePage.module.css';

const statusValues = [
  '',
  'submitted',
  'payment_pending',
  'payment_confirmed',
  'under_review',
  'additional_information_required',
  'resubmitted',
  'approved',
  'rejected',
  'suspended',
];

const defaultFilters = Object.freeze({
  search: '',
  status: '',
  type: '',
  assignment: 'all',
  reviewerId: '',
  sortBy: 'submittedAt',
  sortDirection: 'asc',
});

function AdminApplicationQueuePage() {
  const auth = useAuth();
  const canAssign = auth.hasPermission('application:assign');
  const [filters, setFilters] = useState({ ...defaultFilters });
  const [appliedFilters, setAppliedFilters] = useState({ ...defaultFilters });
  const [applications, setApplications] = useState([]);
  const [reviewers, setReviewers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [assignment, setAssignment] = useState({ reviewerId: '', dueAt: '' });
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const result = await listApplicationReviewQueue({
        ...appliedFilters,
        reviewerId: appliedFilters.assignment === 'all' ? appliedFilters.reviewerId : '',
        page,
        limit: 20,
      });
      setApplications(result.data.applications);
      setMeta(result.meta);
      setSelectedIds([]);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => { void load(1); }, [load]);

  useEffect(() => {
    if (!canAssign) return undefined;
    let active = true;
    listReviewerAccounts()
      .then((result) => { if (active) setReviewers(result.data.reviewers); })
      .catch((requestError) => { if (active) setError(getApiErrorMessage(requestError)); });
    return () => { active = false; };
  }, [canAssign]);

  const allVisibleSelected = useMemo(
    () => applications.length > 0 && applications.every((item) => selectedIds.includes(item.id)),
    [applications, selectedIds],
  );

  function applyFilters(event) {
    event.preventDefault();
    setAppliedFilters({ ...filters });
  }

  function resetFilters() {
    setFilters({ ...defaultFilters });
    setAppliedFilters({ ...defaultFilters });
  }

  function toggleSelection(applicationId) {
    setSelectedIds((current) => current.includes(applicationId)
      ? current.filter((id) => id !== applicationId)
      : [...current, applicationId]);
  }

  function toggleAll() {
    setSelectedIds(allVisibleSelected ? [] : applications.map((item) => item.id));
  }

  async function saveBulkAssignment(event) {
    event.preventDefault();
    if (selectedIds.length === 0) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const result = await bulkAssignApplicationReviewer({
        applicationIds: selectedIds,
        reviewerId: assignment.reviewerId,
        dueAt: assignment.dueAt ? new Date(assignment.dueAt).toISOString() : null,
      });
      setMessage(result.message);
      await load(meta.page);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Seo title="Application review queue" description="Search, assign, and open iRAP application reviews." noIndex />
      <div className={styles.container}>
        <header className={styles.header}>
          <div><p className={styles.eyebrow}>Application review</p><h1>Application queue</h1><p>Search and filter submitted applications, assign reviewers, manage due dates, and open the structured review workspace.</p></div>
          <StatusBadge tone="info">{meta.total} application{meta.total === 1 ? '' : 's'}</StatusBadge>
        </header>
        {message ? <Alert tone="success">{message}</Alert> : null}
        {error ? <Alert tone="error" title="Queue request failed">{error}</Alert> : null}

        <Card>
          <form className={styles.filters} onSubmit={applyFilters}>
            <FormField label="Search" hint="Reference, applicant name, or email">
              <Input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
            </FormField>
            <FormField label="Application status">
              <Select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
                {statusValues.map((status) => <option key={status || 'all'} value={status}>{status ? applicationStatusLabels[status] : 'All review statuses'}</option>)}
              </Select>
            </FormField>
            <FormField label="Application type">
              <Select value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}>
                <option value="">All application types</option>
                {Object.entries(applicationTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
            </FormField>
            <FormField label="Assignment">
              <Select value={filters.assignment} onChange={(event) => setFilters((current) => ({ ...current, assignment: event.target.value, reviewerId: '' }))}>
                <option value="all">All assignments</option>
                <option value="mine">Assigned to me</option>
                {canAssign ? <option value="unassigned">Unassigned</option> : null}
              </Select>
            </FormField>
            {canAssign && filters.assignment === 'all' ? (
              <FormField label="Reviewer">
                <Select value={filters.reviewerId} onChange={(event) => setFilters((current) => ({ ...current, reviewerId: event.target.value }))}>
                  <option value="">All reviewers</option>
                  {reviewers.map((reviewer) => <option key={reviewer.id} value={reviewer.id}>{reviewer.displayName} · {reviewer.email}</option>)}
                </Select>
              </FormField>
            ) : null}
            <FormField label="Sort by">
              <Select value={filters.sortBy} onChange={(event) => setFilters((current) => ({ ...current, sortBy: event.target.value }))}>
                <option value="submittedAt">Submitted date</option>
                <option value="updatedAt">Last updated</option>
                <option value="reference">Reference</option>
                <option value="status">Status</option>
              </Select>
            </FormField>
            <FormField label="Direction">
              <Select value={filters.sortDirection} onChange={(event) => setFilters((current) => ({ ...current, sortDirection: event.target.value }))}>
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </Select>
            </FormField>
            <div className={styles.filterActions}><Button type="submit">Apply filters</Button><Button type="button" variant="secondary" onClick={resetFilters}>Reset</Button></div>
          </form>
        </Card>

        {canAssign && selectedIds.length > 0 ? (
          <Card>
            <form className={styles.bulkBar} onSubmit={saveBulkAssignment}>
              <strong>{selectedIds.length} selected</strong>
              <FormField label="Assign reviewer">
                <Select value={assignment.reviewerId} onChange={(event) => setAssignment((current) => ({ ...current, reviewerId: event.target.value }))}>
                  <option value="">Remove assignment</option>
                  {reviewers.map((reviewer) => <option key={reviewer.id} value={reviewer.id}>{reviewer.displayName}</option>)}
                </Select>
              </FormField>
              <FormField label="Due date">
                <Input type="datetime-local" value={assignment.dueAt} onChange={(event) => setAssignment((current) => ({ ...current, dueAt: event.target.value }))} />
              </FormField>
              <Button type="submit" isLoading={saving}>Update assignments</Button>
            </form>
          </Card>
        ) : null}

        {loading ? (
          <div className={styles.loading}><Loader label="Loading application queue" /></div>
        ) : applications.length === 0 ? (
          <EmptyState title="No applications match these filters" description="Change the filters or wait for an applicant to submit a reviewable application." />
        ) : (
          <Card className={styles.tableCard}>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead><tr>{canAssign ? <th><input type="checkbox" aria-label="Select all visible applications" checked={allVisibleSelected} onChange={toggleAll} /></th> : null}<th>Application</th><th>Applicant</th><th>Status</th><th>Reviewer</th><th>Due</th><th aria-label="Actions" /></tr></thead>
                <tbody>
                  {applications.map((application) => (
                    <tr key={application.id}>
                      {canAssign ? <td><input type="checkbox" aria-label={`Select ${application.reference}`} checked={selectedIds.includes(application.id)} onChange={() => toggleSelection(application.id)} /></td> : null}
                      <td><strong>{application.reference}</strong><small>{application.typeLabel}</small></td>
                      <td><strong>{application.owner?.displayName || 'Unknown applicant'}</strong><small>{application.owner?.email}</small></td>
                      <td><StatusBadge tone={applicationStatusTones[application.status] || 'neutral'}>{applicationStatusLabels[application.status] || application.status}</StatusBadge></td>
                      <td>{application.review.assignedReviewer ? <><strong>{application.review.assignedReviewer.displayName}</strong><small>{application.review.assignedReviewer.email}</small></> : <span className={styles.muted}>Unassigned</span>}</td>
                      <td>{application.review.dueAt ? <time dateTime={application.review.dueAt}>{new Date(application.review.dueAt).toLocaleDateString()}</time> : <span className={styles.muted}>Not set</span>}</td>
                      <td><Button to={`/admin/applications/${application.id}`} size="small">Review</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {meta.pages > 1 ? (
          <nav className={styles.pagination} aria-label="Application queue pages"><Button variant="secondary" size="small" disabled={meta.page <= 1} onClick={() => load(meta.page - 1)}>Previous</Button><span>Page {meta.page} of {meta.pages}</span><Button variant="secondary" size="small" disabled={meta.page >= meta.pages} onClick={() => load(meta.page + 1)}>Next</Button></nav>
        ) : null}
      </div>
    </>
  );
}

export default AdminApplicationQueuePage;
