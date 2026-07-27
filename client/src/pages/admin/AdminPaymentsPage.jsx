import { useCallback, useEffect, useState } from 'react';
import {
  createPaymentRefund,
  getReceiptBlob,
  listAdminPayments,
  reviewOfflinePayment,
} from '../../api/paymentApi.js';
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
  formatMinorAmount,
  paymentStatusLabels,
  paymentStatusTones,
  providerLabels,
} from '../../config/paymentConfig.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './AdminPaymentsPage.module.css';

function AdminPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ status: '', provider: '', search: '' });
  const [selected, setSelected] = useState(null);
  const [review, setReview] = useState({ action: 'approve', note: '', internalNote: '' });
  const [refund, setRefund] = useState({ amountMinor: '', reason: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const result = await listAdminPayments({ page, limit: 20, ...filters });
      setPayments(result.data.payments);
      setMeta(result.meta);
      setSelected(null);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load(1);
  }, [load]);

  function choosePayment(payment) {
    setSelected(payment);
    setReview({ action: 'approve', note: '', internalNote: '' });
    setRefund({ amountMinor: '', reason: '' });
    setMessage('');
  }

  async function saveOfflineReview(event) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      const result = await reviewOfflinePayment(selected.id, review);
      setMessage(result.message);
      await load(meta.page);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function downloadReceipt(payment) {
    setError('');
    try {
      const blob = await getReceiptBlob(payment.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${payment.receipt?.receiptNumber || payment.reference}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }

  async function issueRefund(event) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      const result = await createPaymentRefund(selected.id, {
        amountMinor: Number(refund.amountMinor),
        reason: refund.reason,
      });
      setMessage(result.message);
      await load(meta.page);
      setRefund({ amountMinor: '', reason: '' });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Seo title="Payment Administration" description="Review iRAP payments and refunds." noIndex />
      <section className="section">
        <div className={`container ${styles.container}`}>
          <header className={styles.header}>
            <div><p className={styles.eyebrow}>Finance workspace</p><h1>Payments and refunds</h1><p>Review offline transfers, inspect provider transactions, and track refunds.</p></div>
            <div className={styles.actions}><Button to="/admin/billing" variant="secondary">Plans, coupons and taxes</Button><Button to="/dashboard" variant="secondary">Dashboard</Button></div>
          </header>
          {message ? <Alert tone="success">{message}</Alert> : null}
          {error ? <Alert tone="error">{error}</Alert> : null}

          <Card className={styles.filters}>
            <FormField label="Status"><Select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}><option value="">All statuses</option>{Object.entries(paymentStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></FormField>
            <FormField label="Provider"><Select value={filters.provider} onChange={(event) => setFilters((current) => ({ ...current, provider: event.target.value }))}><option value="">All providers</option>{Object.entries(providerLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></FormField>
            <FormField label="Search"><Input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Reference, email or provider ID" /></FormField>
          </Card>

          <div className={styles.workspace}>
            <section>
              <h2>Payment queue ({meta.total})</h2>
              {loading ? <div className={styles.loading}><Loader label="Loading payments" /></div> : payments.length === 0 ? <EmptyState title="No payments match these filters" description="Change the filters or wait for a new transaction." /> : (
                <div className={styles.queue}>{payments.map((payment) => (
                  <button type="button" key={payment.id} className={`${styles.queueItem} ${selected?.id === payment.id ? styles.selected : ''}`} onClick={() => choosePayment(payment)}>
                    <div><strong>{payment.reference}</strong><span>{payment.owner?.displayName} · {payment.application?.reference}</span><small>{providerLabels[payment.provider]} · {formatMinorAmount(payment.totalMinor, payment.currency)}</small></div>
                    <StatusBadge tone={paymentStatusTones[payment.status] || 'neutral'}>{paymentStatusLabels[payment.status] || payment.status}</StatusBadge>
                  </button>
                ))}</div>
              )}
              {meta.pages > 1 ? <div className={styles.pagination}><Button size="small" variant="secondary" disabled={meta.page <= 1} onClick={() => load(meta.page - 1)}>Previous</Button><span>Page {meta.page} of {meta.pages}</span><Button size="small" variant="secondary" disabled={meta.page >= meta.pages} onClick={() => load(meta.page + 1)}>Next</Button></div> : null}
            </section>

            <aside>
              {selected ? <Card className={styles.detailCard}>
                <div className={styles.detailHeading}><div><p className={styles.eyebrow}>{selected.reference}</p><h2>{selected.planSnapshot.name}</h2></div><StatusBadge tone={paymentStatusTones[selected.status] || 'neutral'}>{paymentStatusLabels[selected.status] || selected.status}</StatusBadge></div>
                <dl className={styles.details}><div><dt>Applicant</dt><dd>{selected.owner?.displayName}</dd></div><div><dt>Email</dt><dd>{selected.billing.email}</dd></div><div><dt>Total</dt><dd>{formatMinorAmount(selected.totalMinor, selected.currency)}</dd></div><div><dt>Refunded</dt><dd>{formatMinorAmount(selected.refundedMinor, selected.currency)}</dd></div><div><dt>Provider payment</dt><dd>{selected.providerPaymentId || '—'}</dd></div></dl>
                {selected.receipt ? <Button size="small" variant="secondary" onClick={() => downloadReceipt(selected)}>Download receipt</Button> : null}
                {selected.refunds?.length ? <div className={styles.form}><h3>Refund history</h3>{selected.refunds.map((item) => <p key={item._id || item.providerRefundId}><strong>{formatMinorAmount(item.amountMinor, item.currency)}</strong> · {item.status} · {item.reason}</p>)}</div> : null}

                {selected.provider === 'offline' && selected.status === 'offline_pending' ? <form className={styles.form} onSubmit={saveOfflineReview}>
                  <h3>Review offline payment</h3>
                  <FormField label="Decision"><Select value={review.action} onChange={(event) => setReview((current) => ({ ...current, action: event.target.value }))}><option value="approve">Approve</option><option value="reject">Reject</option></Select></FormField>
                  <FormField label="Applicant-visible note" required><Textarea rows={3} value={review.note} onChange={(event) => setReview((current) => ({ ...current, note: event.target.value }))} /></FormField>
                  <FormField label="Internal note"><Textarea rows={3} value={review.internalNote} onChange={(event) => setReview((current) => ({ ...current, internalNote: event.target.value }))} /></FormField>
                  <Button type="submit" isLoading={saving}>Save review</Button>
                </form> : null}

                {['captured', 'partially_refunded'].includes(selected.status) && selected.refundableMinor > 0 ? <form className={styles.form} onSubmit={issueRefund}>
                  <h3>Create refund</h3>
                  <FormField label={`Amount in minor units (maximum ${selected.refundableMinor})`} required><Input type="number" min="1" max={selected.refundableMinor} value={refund.amountMinor} onChange={(event) => setRefund((current) => ({ ...current, amountMinor: event.target.value }))} /></FormField>
                  <FormField label="Reason" required><Textarea rows={3} value={refund.reason} onChange={(event) => setRefund((current) => ({ ...current, reason: event.target.value }))} /></FormField>
                  <Button type="submit" variant="danger" isLoading={saving}>Create refund</Button>
                </form> : null}
              </Card> : <EmptyState title="Select a payment" description="Choose a payment to review its transaction details." />}
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}

export default AdminPaymentsPage;
