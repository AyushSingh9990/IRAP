import { useCallback, useEffect, useMemo, useState } from 'react';
import { listUsers, updateUser } from '../../api/adminApi.js';
import Alert from '../../components/common/Alert/Alert.jsx';
import Button from '../../components/common/Button/Button.jsx';
import Card from '../../components/common/Card/Card.jsx';
import EmptyState from '../../components/common/EmptyState/EmptyState.jsx';
import FormField from '../../components/common/FormField/FormField.jsx';
import Input from '../../components/common/Input/Input.jsx';
import Loader from '../../components/common/Loader/Loader.jsx';
import Select from '../../components/common/Select/Select.jsx';
import Textarea from '../../components/common/Textarea/Textarea.jsx';
import Seo from '../../components/seo/Seo.jsx';
import { accountStatuses, permissionValues, roleValues } from '../../config/administrationConfig.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './AdminAdministration.module.css';

function AdminUsersPage() {
  const [filters, setFilters] = useState({ search: '', status: '', role: '', page: 1, limit: 20 });
  const [users, setUsers] = useState([]); const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [selectedId, setSelectedId] = useState(''); const [form, setForm] = useState({ accountStatus: 'active', roles: [], additionalPermissions: [], twoFactorEnforced: false, reason: '' });
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const selected = useMemo(() => users.find((user) => user.id === selectedId), [selectedId, users]);
  const load = useCallback(async () => { setLoading(true); setError(''); try { const result = await listUsers(filters); setUsers(result.data.users || []); setMeta(result.meta || { page: 1, pages: 1, total: 0 }); } catch (e) { setError(getApiErrorMessage(e)); } finally { setLoading(false); } }, [filters]);
  useEffect(() => { void load(); }, [load]);
  function choose(user) { setSelectedId(user.id); setForm({ accountStatus: user.accountStatus, roles: [...user.roles], additionalPermissions: [...user.additionalPermissions], twoFactorEnforced: user.twoFactorEnforced, reason: '' }); setMessage(''); }
  function toggle(field, value) { setForm((current) => ({ ...current, [field]: current[field].includes(value) ? current[field].filter((item) => item !== value) : [...current[field], value] })); }
  async function save(event) { event.preventDefault(); if (!selected) return; setSaving(true); setError(''); setMessage(''); try { const result = await updateUser(selected.id, form); setMessage(result.message); await load(); } catch (e) { setError(getApiErrorMessage(e)); } finally { setSaving(false); } }
  return <><Seo title="User Management" description="Manage iRAP user roles and account access." noIndex /><section className="section"><div className={`container ${styles.container}`}>
    <header className={styles.header}><div><p className={styles.eyebrow}>Access administration</p><h1>Users, roles and account status</h1><p>Search accounts, grant approved roles, assign exceptional permissions, enforce administrator-managed two-factor verification and revoke old sessions after access changes.</p></div></header>
    {message ? <Alert tone="success">{message}</Alert> : null}{error ? <Alert tone="error">{error}</Alert> : null}
    <div className={styles.toolbar}><FormField label="Search"><Input value={filters.search} onChange={(e) => setFilters((c) => ({ ...c, search: e.target.value, page: 1 }))} /></FormField><FormField label="Status"><Select value={filters.status} onChange={(e) => setFilters((c) => ({ ...c, status: e.target.value, page: 1 }))}><option value="">All statuses</option>{accountStatuses.map((status) => <option key={status}>{status}</option>)}</Select></FormField><FormField label="Role"><Select value={filters.role} onChange={(e) => setFilters((c) => ({ ...c, role: e.target.value, page: 1 }))}><option value="">All roles</option>{roleValues.map((role) => <option key={role}>{role}</option>)}</Select></FormField></div>
    {loading ? <div className={styles.loading}><Loader label="Loading users" size="large" /></div> : <div className={styles.workspace}><div className={styles.list}>{users.length ? users.map((user) => <button type="button" key={user.id} onClick={() => choose(user)} className={`${styles.listButton} ${selectedId === user.id ? styles.listButtonActive : ''}`}><strong>{user.displayName}</strong><span>{user.email}</span><small>{user.accountStatus} · {user.roles.join(', ')}</small></button>) : <EmptyState title="No users found" description="No account matches the current filters." />}</div>
      <Card>{selected ? <form className={styles.form} onSubmit={save}><h2 className={styles.sectionTitle}>{selected.displayName}</h2><p className={styles.muted}>{selected.email}</p><div className={styles.formGrid}><FormField label="Account status"><Select value={form.accountStatus} onChange={(e) => setForm((c) => ({ ...c, accountStatus: e.target.value }))}>{accountStatuses.map((status) => <option key={status}>{status}</option>)}</Select></FormField><label className={styles.checkbox}><input type="checkbox" checked={form.twoFactorEnforced} onChange={(e) => setForm((c) => ({ ...c, twoFactorEnforced: e.target.checked }))} /><span><strong>Enforce email two-factor verification</strong>Applies on the user’s next sign-in.</span></label></div><div><h3 className={styles.sectionTitle}>Roles</h3><div className={styles.checkGrid}>{roleValues.map((role) => <label className={styles.checkbox} key={role}><input type="checkbox" checked={form.roles.includes(role)} onChange={() => toggle('roles', role)} /><span><strong>{role}</strong></span></label>)}</div></div><div><h3 className={styles.sectionTitle}>Additional permissions</h3><p className={styles.muted}>Use only for exceptions not covered by assigned roles.</p><div className={styles.permissionList}>{permissionValues.map((permission) => <label className={styles.checkbox} key={permission}><input type="checkbox" checked={form.additionalPermissions.includes(permission)} onChange={() => toggle('additionalPermissions', permission)} /><span><strong>{permission}</strong></span></label>)}</div></div><FormField label="Reason for access change"><Textarea required minLength={3} rows={4} value={form.reason} onChange={(e) => setForm((c) => ({ ...c, reason: e.target.value }))} /></FormField><Button type="submit" disabled={saving || form.roles.length === 0}>{saving ? 'Saving…' : 'Save user access'}</Button></form> : <EmptyState title="Select a user" description="Choose an account to manage its access." />}</Card></div>}
    <div className={styles.pagination}><Button variant="secondary" disabled={meta.page <= 1} onClick={() => setFilters((c) => ({ ...c, page: c.page - 1 }))}>Previous</Button><span>Page {meta.page} of {meta.pages} · {meta.total} users</span><Button variant="secondary" disabled={meta.page >= meta.pages} onClick={() => setFilters((c) => ({ ...c, page: c.page + 1 }))}>Next</Button></div>
  </div></section></>;
}
export default AdminUsersPage;
