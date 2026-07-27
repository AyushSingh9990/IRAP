import { useCallback, useEffect, useState } from 'react';
import { getSystemHealth } from '../../api/adminApi.js';
import Alert from '../../components/common/Alert/Alert.jsx';
import Button from '../../components/common/Button/Button.jsx';
import Card from '../../components/common/Card/Card.jsx';
import Loader from '../../components/common/Loader/Loader.jsx';
import Seo from '../../components/seo/Seo.jsx';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './AdminAdministration.module.css';

function AdminSystemHealthPage() {
  const [health, setHealth] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { const result = await getSystemHealth(); setHealth(result.data.health); } catch (e) { setError(getApiErrorMessage(e)); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  return <><Seo title="System Health" description="Review non-sensitive iRAP system health information." noIndex /><section className="section"><div className={`container ${styles.container}`}>
    <header className={styles.header}><div><p className={styles.eyebrow}>Operations</p><h1>System health</h1><p>Review database connectivity, process uptime and operational queue counts without exposing secrets or infrastructure credentials.</p></div><Button variant="secondary" onClick={() => void load()}>Refresh</Button></header>
    {error ? <Alert tone="error">{error}</Alert> : null}
    {loading ? <div className={styles.loading}><Loader label="Loading system health" size="large" /></div> : health ? <><Alert tone={health.status === 'operational' ? 'success' : 'warning'}>Current status: {health.status}</Alert><div className={styles.healthGrid}><Card className={styles.healthCard}><span>Database state</span><strong>{health.databaseState}</strong></Card><Card className={styles.healthCard}><span>Uptime</span><strong>{health.uptimeSeconds}s</strong></Card><Card className={styles.healthCard}><span>Users</span><strong>{health.counts.users}</strong></Card><Card className={styles.healthCard}><span>Failed audits, 24h</span><strong>{health.counts.auditFailures24h}</strong></Card></div><div className={styles.summaryGrid}><Card><h2 className={styles.sectionTitle}>Support queues</h2><p>Open contact enquiries: <strong>{health.counts.openContacts}</strong></p><p>Open complaints: <strong>{health.counts.openComplaints}</strong></p></Card><Card><h2 className={styles.sectionTitle}>Runtime</h2><p>Node: <code className={styles.code}>{health.nodeVersion}</code></p><p>Environment: <code className={styles.code}>{health.environment}</code></p><p>Checked: {new Date(health.checkedAt).toLocaleString()}</p></Card></div></> : null}
  </div></section></>;
}
export default AdminSystemHealthPage;
