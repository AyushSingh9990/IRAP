import { useCallback, useEffect, useState } from 'react';
import { listAdministrativeAuditHistory } from '../../api/reviewApi.js';
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
  auditActionLabels,
  auditOutcomeTones,
} from '../../config/reviewConfig.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './AdminAuditPage.module.css';

const defaultFilters = Object.freeze({
  search: '',
  action: '',
  outcome: '',
});

function AdminAuditPage() {
  const [filters, setFilters] = useState({ ...defaultFilters });
  const [appliedFilters, setAppliedFilters] = useState({ ...defaultFilters });
  const [entries, setEntries] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const result = await listAdministrativeAuditHistory({
        ...appliedFilters,
        page,
        limit: 25,
      });
      setEntries(result.data.entries);
      setMeta(result.meta);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    void load(1);
  }, [load]);

  function applyFilters(event) {
    event.preventDefault();
    setAppliedFilters({ ...filters });
  }

  function resetFilters() {
    setFilters({ ...defaultFilters });
    setAppliedFilters({ ...defaultFilters });
  }

  return (
    <>
      <Seo
        title="Administrative audit history"
        description="Review security-sensitive iRAP administrative actions."
        noIndex
      />
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Administrative accountability</p>
            <h1>Audit history</h1>
            <p>
              Search immutable records of reviewer assignments, information requests,
              application decisions, payment waivers, and review notes.
            </p>
          </div>
          <StatusBadge tone="info">
            {meta.total} entr{meta.total === 1 ? 'y' : 'ies'}
          </StatusBadge>
        </header>

        {error ? <Alert tone="error" title="Audit history could not load">{error}</Alert> : null}

        <Card>
          <form className={styles.filters} onSubmit={applyFilters}>
            <FormField label="Search" hint="Reference, actor, reason, entity, or request ID">
              <Input
                value={filters.search}
                onChange={(event) => setFilters((current) => ({
                  ...current,
                  search: event.target.value,
                }))}
              />
            </FormField>
            <FormField label="Action">
              <Select
                value={filters.action}
                onChange={(event) => setFilters((current) => ({
                  ...current,
                  action: event.target.value,
                }))}
              >
                <option value="">All actions</option>
                {Object.entries(auditActionLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Outcome">
              <Select
                value={filters.outcome}
                onChange={(event) => setFilters((current) => ({
                  ...current,
                  outcome: event.target.value,
                }))}
              >
                <option value="">All outcomes</option>
                <option value="pending">Pending</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
              </Select>
            </FormField>
            <div className={styles.filterActions}>
              <Button type="submit">Apply filters</Button>
              <Button type="button" variant="secondary" onClick={resetFilters}>Reset</Button>
            </div>
          </form>
        </Card>

        {loading ? (
          <div className={styles.loading}><Loader label="Loading audit history" /></div>
        ) : entries.length === 0 ? (
          <EmptyState
            title="No audit entries match these filters"
            description="Critical review actions will appear here after they occur."
          />
        ) : (
          <div className={styles.list}>
            {entries.map((entry) => (
              <Card className={styles.entry} key={entry.id}>
                <div className={styles.entryHeader}>
                  <div>
                    <p className={styles.entryAction}>
                      {auditActionLabels[entry.action] || entry.action}
                    </p>
                    <h2>{entry.application?.reference || entry.entityId}</h2>
                  </div>
                  <StatusBadge tone={auditOutcomeTones[entry.outcome] || 'neutral'}>
                    {entry.outcome}
                  </StatusBadge>
                </div>
                <dl className={styles.details}>
                  <div><dt>Actor</dt><dd>{entry.actor?.displayName || 'Unknown actor'}</dd></div>
                  <div><dt>Actor email</dt><dd>{entry.actor?.email || 'Unavailable'}</dd></div>
                  <div><dt>Entity</dt><dd>{entry.entityType} · {entry.entityId}</dd></div>
                  <div><dt>Recorded</dt><dd>{new Date(entry.createdAt).toLocaleString()}</dd></div>
                  <div><dt>Completed</dt><dd>{entry.completedAt ? new Date(entry.completedAt).toLocaleString() : 'Pending'}</dd></div>
                  <div><dt>Request ID</dt><dd>{entry.requestId || 'Unavailable'}</dd></div>
                </dl>
                {entry.reason ? <p className={styles.reason}><strong>Reason:</strong> {entry.reason}</p> : null}
                {entry.failureMessage ? (
                  <Alert tone="error" title="Recorded failure">{entry.failureMessage}</Alert>
                ) : null}
                <details className={styles.changes}>
                  <summary>Recorded value changes</summary>
                  <div className={styles.changeGrid}>
                    <div><h3>Previous values</h3><pre>{JSON.stringify(entry.previousValues || {}, null, 2)}</pre></div>
                    <div><h3>New values</h3><pre>{JSON.stringify(entry.newValues || {}, null, 2)}</pre></div>
                  </div>
                </details>
              </Card>
            ))}
          </div>
        )}

        {meta.pages > 1 ? (
          <nav className={styles.pagination} aria-label="Audit history pages">
            <Button
              variant="secondary"
              size="small"
              disabled={meta.page <= 1}
              onClick={() => load(meta.page - 1)}
            >
              Previous
            </Button>
            <span>Page {meta.page} of {meta.pages}</span>
            <Button
              variant="secondary"
              size="small"
              disabled={meta.page >= meta.pages}
              onClick={() => load(meta.page + 1)}
            >
              Next
            </Button>
          </nav>
        ) : null}
      </div>
    </>
  );
}

export default AdminAuditPage;
