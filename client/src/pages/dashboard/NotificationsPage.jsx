import { useCallback, useEffect, useState } from 'react';
import {
  getNotificationPreferences,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreferences,
} from '../../api/notificationApi.js';
import Alert from '../../components/common/Alert/Alert.jsx';
import Button from '../../components/common/Button/Button.jsx';
import Card from '../../components/common/Card/Card.jsx';
import EmptyState from '../../components/common/EmptyState/EmptyState.jsx';
import Loader from '../../components/common/Loader/Loader.jsx';
import Select from '../../components/common/Select/Select.jsx';
import StatusBadge from '../../components/common/StatusBadge/StatusBadge.jsx';
import Seo from '../../components/seo/Seo.jsx';
import {
  notificationCategoryLabels,
  notificationCategoryTones,
} from '../../config/dashboardConfig.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './NotificationsPage.module.css';

const defaultPreferences = {
  inAppEnabled: true,
  emailEnabled: true,
  applicationUpdates: true,
  paymentUpdates: true,
  documentUpdates: true,
  securityAlerts: true,
  announcements: true,
};

const preferenceLabels = {
  inAppEnabled: 'In-app notifications',
  emailEnabled: 'Email notifications',
  applicationUpdates: 'Application updates',
  paymentUpdates: 'Payment updates',
  documentUpdates: 'Document updates',
  securityAlerts: 'Required security alerts',
  announcements: 'Administrator announcements',
};

function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [status, setStatus] = useState('all');
  const [meta, setMeta] = useState({ unreadCount: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [notificationResult, preferenceResult] = await Promise.all([
        listNotifications({ status, page: 1, limit: 50 }),
        getNotificationPreferences(),
      ]);
      setNotifications(notificationResult.data.notifications);
      setMeta(notificationResult.meta);
      setPreferences({ ...defaultPreferences, ...preferenceResult.data.preferences });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { void load(); }, [load]);

  async function markRead(notificationId) {
    setError('');
    try {
      const result = await markNotificationRead(notificationId);
      setNotifications((items) => items.map((item) => (
        item.id === notificationId ? result.data.notification : item
      )));
      setMeta((current) => ({ ...current, unreadCount: Math.max(0, current.unreadCount - 1) }));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }

  async function markAllRead() {
    setError('');
    try {
      await markAllNotificationsRead();
      const now = new Date().toISOString();
      setNotifications((items) => items.map((item) => ({ ...item, readAt: item.readAt || now })));
      setMeta((current) => ({ ...current, unreadCount: 0 }));
      setMessage('All notifications were marked as read.');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }

  async function savePreferences() {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const result = await updateNotificationPreferences(preferences);
      setPreferences({ ...defaultPreferences, ...result.data.preferences });
      setMessage(result.message);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Seo title="Notifications" description="Review private iRAP account notifications." noIndex />
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Notification centre</p>
            <h1>Notifications</h1>
            <p>Review application, payment, document, security, and administrator updates.</p>
          </div>
          <div className={styles.actions}>
            <StatusBadge tone={meta.unreadCount ? 'warning' : 'success'}>{meta.unreadCount} unread</StatusBadge>
            <Button onClick={markAllRead} variant="secondary" disabled={!meta.unreadCount}>Mark all read</Button>
          </div>
        </header>

        {message ? <Alert tone="success">{message}</Alert> : null}
        {error ? <Alert tone="error">{error}</Alert> : null}

        <div className={styles.toolbar}>
          <label htmlFor="notification-status">Show</label>
          <Select id="notification-status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All notifications</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </Select>
        </div>

        {loading ? (
          <div className={styles.loading}><Loader label="Loading notifications" /></div>
        ) : notifications.length === 0 ? (
          <EmptyState title="No notifications found" description="Updates matching the selected filter will appear here." />
        ) : (
          <div className={styles.list}>
            {notifications.map((notification) => (
              <Card className={`${styles.notification} ${notification.readAt ? '' : styles.unread}`.trim()} key={notification.id}>
                <div className={styles.notificationBody}>
                  <div className={styles.notificationMeta}>
                    <StatusBadge tone={notificationCategoryTones[notification.category] || 'neutral'}>
                      {notificationCategoryLabels[notification.category] || notification.category}
                    </StatusBadge>
                    <time dateTime={notification.createdAt}>{new Date(notification.createdAt).toLocaleString()}</time>
                  </div>
                  <h2>{notification.title}</h2>
                  <p>{notification.message}</p>
                </div>
                <div className={styles.notificationActions}>
                  {notification.actionUrl ? <Button to={notification.actionUrl} variant="secondary" size="small">Open</Button> : null}
                  {!notification.readAt ? <Button onClick={() => markRead(notification.id)} size="small">Mark read</Button> : null}
                </div>
              </Card>
            ))}
          </div>
        )}

        <Card className={styles.preferences}>
          <div>
            <p className={styles.eyebrow}>Preferences</p>
            <h2>Notification preferences</h2>
            <p>Security-sensitive account alerts remain available in the notification centre when generated.</p>
          </div>
          <div className={styles.preferenceGrid}>
            {Object.entries(preferenceLabels).map(([key, label]) => (
              <label className={styles.checkbox} key={key}>
                <input
                  type="checkbox"
                  checked={key === 'securityAlerts' ? true : Boolean(preferences[key])}
                  disabled={key === 'securityAlerts'}
                  onChange={(event) => setPreferences((current) => ({ ...current, [key]: event.target.checked }))}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <Button onClick={savePreferences} isLoading={saving}>Save preferences</Button>
        </Card>
      </div>
    </>
  );
}

export default NotificationsPage;
