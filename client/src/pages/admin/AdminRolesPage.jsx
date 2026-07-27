import { useCallback, useEffect, useMemo, useState } from 'react';
import { listRoles, updateRole } from '../../api/adminApi.js';
import Alert from '../../components/common/Alert/Alert.jsx';
import Button from '../../components/common/Button/Button.jsx';
import Card from '../../components/common/Card/Card.jsx';
import EmptyState from '../../components/common/EmptyState/EmptyState.jsx';
import FormField from '../../components/common/FormField/FormField.jsx';
import Input from '../../components/common/Input/Input.jsx';
import Loader from '../../components/common/Loader/Loader.jsx';
import Textarea from '../../components/common/Textarea/Textarea.jsx';
import Seo from '../../components/seo/Seo.jsx';
import { permissionValues } from '../../config/administrationConfig.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './AdminAdministration.module.css';

function AdminRolesPage() {
  const [items, setItems] = useState([]); const [selectedRole, setSelectedRole] = useState(''); const [form, setForm] = useState({ label: '', description: '', additionalPermissions: [], active: true });
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const selected = useMemo(() => items.find((item) => item.role === selectedRole), [items, selectedRole]);
  const load = useCallback(async () => { setLoading(true); setError(''); try { const result = await listRoles(); setItems(result.data.items || []); } catch (e) { setError(getApiErrorMessage(e)); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  function choose(item) { setSelectedRole(item.role); setForm({ label: item.label, description: item.description, additionalPermissions: [...item.additionalPermissions], active: item.active }); setMessage(''); }
  function toggle(permission) { setForm((current) => ({ ...current, additionalPermissions: current.additionalPermissions.includes(permission) ? current.additionalPermissions.filter((item) => item !== permission) : [...current.additionalPermissions, permission] })); }
  async function save(event) { event.preventDefault(); if (!selected) return; setSaving(true); setError(''); setMessage(''); try { const result = await updateRole(selected.role, form); setMessage(result.message); await load(); } catch (e) { setError(getApiErrorMessage(e)); } finally { setSaving(false); } }
  return <><Seo title="Role Management" description="Manage iRAP role definitions and permission extensions." noIndex /><section className="section"><div className={`container ${styles.container}`}>
    <header className={styles.header}><div><p className={styles.eyebrow}>Authorization administration</p><h1>Role definitions and permissions</h1><p>Review immutable base permissions and add controlled role-level permissions. Super-administrator access cannot be disabled.</p></div></header>
    {message ? <Alert tone="success">{message}</Alert> : null}{error ? <Alert tone="error">{error}</Alert> : null}
    {loading ? <div className={styles.loading}><Loader label="Loading roles" size="large" /></div> : <div className={styles.workspace}><div className={styles.list}>{items.length ? items.map((item) => <button type="button" key={item.role} onClick={() => choose(item)} className={`${styles.listButton} ${selectedRole === item.role ? styles.listButtonActive : ''}`}><strong>{item.label}</strong><span>{item.role}</span><small>{item.effectivePermissions.length} effective permissions</small></button>) : <EmptyState title="No roles available" description="Role constants could not be loaded." />}</div>
      <Card>{selected ? <form className={styles.form} onSubmit={save}><h2 className={styles.sectionTitle}>{selected.role}</h2><div className={styles.formGrid}><FormField label="Display label"><Input required value={form.label} onChange={(e) => setForm((c) => ({ ...c, label: e.target.value }))} /></FormField><label className={styles.checkbox}><input type="checkbox" checked={form.active} disabled={selected.protected} onChange={(e) => setForm((c) => ({ ...c, active: e.target.checked }))} /><span><strong>Role active</strong>{selected.protected ? 'Protected system role.' : 'Inactive roles remain stored but should not be newly assigned.'}</span></label></div><FormField label="Description"><Textarea rows={4} value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} /></FormField><div><h3 className={styles.sectionTitle}>Base permissions</h3><p className={styles.muted}>{selected.basePermissions.length ? selected.basePermissions.join(', ') : 'No base permissions.'}</p></div><div><h3 className={styles.sectionTitle}>Additional role permissions</h3><div className={styles.permissionList}>{permissionValues.filter((permission) => !selected.basePermissions.includes(permission)).map((permission) => <label className={styles.checkbox} key={permission}><input type="checkbox" checked={form.additionalPermissions.includes(permission)} onChange={() => toggle(permission)} /><span><strong>{permission}</strong></span></label>)}</div></div><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save role definition'}</Button></form> : <EmptyState title="Select a role" description="Choose a role to inspect and manage its permission extensions." />}</Card></div>}
  </div></section></>;
}
export default AdminRolesPage;
