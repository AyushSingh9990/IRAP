import { useCallback, useEffect, useMemo, useState } from 'react';
import { listApplications } from '../../api/applicationApi.js';
import { listDocuments } from '../../api/documentApi.js';
import {
  confirmRazorpayPayment,
  getReceiptBlob,
  initializePayment,
  listPaymentHistory,
  listPaymentPlans,
  requestPaymentQuote,
  submitOfflinePayment,
  syncStripePayment,
} from '../../api/paymentApi.js';
import StripePaymentForm from '../../components/payment/StripePaymentForm/StripePaymentForm.jsx';
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
  createIdempotencyKey,
  formatMinorAmount,
  paymentStatusLabels,
  paymentStatusTones,
  providerLabels,
} from '../../config/paymentConfig.js';
import useAuth from '../../hooks/useAuth.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './PaymentsPage.module.css';

let razorpayScriptPromise;

function loadRazorpayScript() {
  if (globalThis.Razorpay) return Promise.resolve(globalThis.Razorpay);
  razorpayScriptPromise ||= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(globalThis.Razorpay);
    script.onerror = () => reject(new Error('Razorpay Checkout could not be loaded.'));
    document.head.appendChild(script);
  });
  return razorpayScriptPromise;
}

const initialBilling = (user) => ({
  fullName: user?.displayName || '',
  email: user?.email || '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  countryCode: 'IN',
});

function PaymentsPage() {
  const auth = useAuth();
  const [applications, setApplications] = useState([]);
  const [plans, setPlans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [configuration, setConfiguration] = useState(null);
  const [applicationId, setApplicationId] = useState('');
  const [planId, setPlanId] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [provider, setProvider] = useState('offline');
  const [billing, setBilling] = useState(() => initialBilling(auth.user));
  const [quote, setQuote] = useState(null);
  const [offline, setOffline] = useState({
    reference: '',
    bankName: '',
    paidAt: '',
    proofDocumentId: '',
    applicantNote: '',
  });
  const [stripeSession, setStripeSession] = useState(null);
  const [stripePaymentId, setStripePaymentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const payableApplications = useMemo(
    () => applications.filter((item) => item.status === 'payment_pending'),
    [applications],
  );
  const selectedApplication = useMemo(
    () => applications.find((item) => item.id === applicationId),
    [applicationId, applications],
  );
  const applicationDocuments = useMemo(
    () => documents.filter(
      (item) => item.application?.id === applicationId && item.category === 'payment_proof',
    ),
    [applicationId, documents],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [applicationResult, historyResult, documentResult] = await Promise.all([
        listApplications(),
        listPaymentHistory(),
        listDocuments({ includeHistory: false }),
      ]);
      const loadedApplications = applicationResult.data.applications;
      setApplications(loadedApplications);
      setPayments(historyResult.data.payments);
      setDocuments(documentResult.data.documents);
      const firstPayable = loadedApplications.find((item) => item.status === 'payment_pending');
      setApplicationId((current) => current || firstPayable?.id || '');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirectedIntent = params.get('payment_intent');
    const pendingPaymentId = sessionStorage.getItem(
      'irap_pending_stripe_payment_id',
    );

    if (!redirectedIntent || !pendingPaymentId) return;

    let active = true;
    setSaving(true);
    setError('');
    syncStripePayment(pendingPaymentId)
      .then(async (result) => {
        if (!active) return;
        setMessage(
          result.data.payment.status === 'captured'
            ? 'Stripe payment confirmed.'
            : `Stripe payment status: ${result.data.payment.status}.`,
        );
        sessionStorage.removeItem('irap_pending_stripe_payment_id');
        window.history.replaceState({}, '', window.location.pathname);
        await load();
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setSaving(false);
      });

    return () => {
      active = false;
    };
  }, [load]);

  useEffect(() => {
    if (!selectedApplication) {
      setPlans([]);
      return;
    }
    let active = true;
    listPaymentPlans(selectedApplication.type, selectedApplication.purpose || 'initial')
      .then((result) => {
        if (!active) return;
        setPlans(result.data.plans);
        setConfiguration(result.data.paymentConfiguration);
        setProvider((current) => {
          if (result.data.paymentConfiguration.providers[current]) return current;
          return result.data.paymentConfiguration.defaultProvider;
        });
        setPlanId((current) => {
          const stillAvailable = result.data.plans.some((plan) => plan.id === current);
          return stillAvailable ? current : result.data.plans[0]?.id || '';
        });
      })
      .catch((requestError) => active && setError(getApiErrorMessage(requestError)));
    return () => {
      active = false;
    };
  }, [selectedApplication]);

  function updateBilling(field, value) {
    setBilling((current) => ({ ...current, [field]: value }));
    setQuote(null);
  }

  async function calculateQuote() {
    if (!applicationId || !planId) return;
    setSaving(true);
    setError('');
    setMessage('');
    setStripeSession(null);
    try {
      const result = await requestPaymentQuote({
        applicationId,
        planId,
        couponCode,
        billingCountry: billing.countryCode,
        billingState: billing.state,
      });
      setQuote(result.data.quote);
      setMessage('Quote calculated using the current plan, coupon, and tax rules.');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function completeRazorpay() {
    setSaving(true);
    setError('');
    try {
      const result = await initializePayment({
        applicationId,
        planId,
        couponCode,
        provider: 'razorpay',
        idempotencyKey: createIdempotencyKey('razorpay'),
        billing,
      });
      const { payment, providerSession } = result.data;
      const Razorpay = await loadRazorpayScript();
      const checkout = new Razorpay({
        key: providerSession.publicKey,
        amount: payment.totalMinor,
        currency: payment.currency,
        order_id: providerSession.id,
        name: 'iRAP',
        description: payment.planSnapshot.name,
        prefill: {
          name: billing.fullName,
          email: billing.email,
          contact: billing.phone,
        },
        handler: async (providerResult) => {
          try {
            const confirmed = await confirmRazorpayPayment({
              paymentId: payment.id,
              razorpayOrderId: providerResult.razorpay_order_id,
              razorpayPaymentId: providerResult.razorpay_payment_id,
              razorpaySignature: providerResult.razorpay_signature,
            });
            setMessage(confirmed.message);
            await load();
          } catch (requestError) {
            setError(getApiErrorMessage(requestError));
          }
        },
        modal: {
          ondismiss: () => setMessage('Razorpay checkout was closed before completion.'),
        },
      });
      checkout.on('payment.failed', (failure) => {
        setError(failure.error?.description || 'Razorpay reported a failed payment.');
      });
      checkout.open();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function initializeStripe() {
    setSaving(true);
    setError('');
    try {
      const result = await initializePayment({
        applicationId,
        planId,
        couponCode,
        provider: 'stripe',
        idempotencyKey: createIdempotencyKey('stripe'),
        billing,
      });
      setStripeSession(result.data.providerSession);
      setStripePaymentId(result.data.payment.id);
      sessionStorage.setItem(
        'irap_pending_stripe_payment_id',
        result.data.payment.id,
      );
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function submitOffline(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const result = await submitOfflinePayment({
        applicationId,
        planId,
        couponCode,
        idempotencyKey: createIdempotencyKey('offline'),
        billing,
        ...offline,
        paidAt: new Date(offline.paidAt).toISOString(),
      });
      setMessage(result.message);
      setOffline({ reference: '', bankName: '', paidAt: '', proofDocumentId: '', applicantNote: '' });
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function downloadReceipt(payment) {
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

  return (
    <>
      <Seo title="Payments" description="Manage iRAP application payments and receipts." noIndex />
      <section className="section">
        <div className={`container ${styles.container}`}>
          <header className={styles.header}>
            <div>
              <p className={styles.eyebrow}>Secure billing</p>
              <h1>Payments and plans</h1>
              <p>Choose an active plan, review the calculated tax and discount, then complete payment.</p>
            </div>
            <div className={styles.actions}>
              <Button to="/dashboard/applications" variant="secondary">Applications</Button>
              <Button to="/dashboard" variant="secondary">Dashboard</Button>
            </div>
          </header>

          {message ? <Alert tone="success">{message}</Alert> : null}
          {error ? <Alert tone="error" title="Payment request failed">{error}</Alert> : null}

          {loading ? (
            <div className={styles.loading}><Loader label="Loading payments" /></div>
          ) : payableApplications.length === 0 ? (
            <EmptyState
              title="No application is awaiting payment"
              description="Submit an application that requires payment, or review your payment history below."
              action={<Button to="/dashboard/applications">Open applications</Button>}
            />
          ) : (
            <div className={styles.checkoutGrid}>
              <Card className={styles.formCard}>
                <h2>1. Application and plan</h2>
                <FormField label="Application" required>
                  <Select value={applicationId} onChange={(event) => { setApplicationId(event.target.value); setQuote(null); }}>
                    {payableApplications.map((item) => (
                      <option key={item.id} value={item.id}>{item.reference} · {item.typeLabel}</option>
                    ))}
                  </Select>
                </FormField>
                {plans.length === 0 ? (
                  <Alert tone="warning">No active payment plan has been configured for this application type.</Alert>
                ) : (
                  <div className={styles.planGrid}>
                    {plans.map((plan) => (
                      <button
                        type="button"
                        key={plan.id}
                        className={`${styles.plan} ${plan.id === planId ? styles.selectedPlan : ''}`}
                        onClick={() => { setPlanId(plan.id); setQuote(null); }}
                      >
                        <strong>{plan.name}</strong>
                        <span>{formatMinorAmount(plan.amountMinor, plan.currency)}</span>
                        <small>{plan.description}</small>
                      </button>
                    ))}
                  </div>
                )}
                <FormField label="Coupon code">
                  <Input value={couponCode} onChange={(event) => { setCouponCode(event.target.value.toUpperCase()); setQuote(null); }} maxLength={40} />
                </FormField>

                <h2>2. Billing details</h2>
                <div className={styles.fieldGrid}>
                  <FormField label="Full name" required><Input value={billing.fullName} onChange={(event) => updateBilling('fullName', event.target.value)} /></FormField>
                  <FormField label="Email" required><Input type="email" value={billing.email} onChange={(event) => updateBilling('email', event.target.value)} /></FormField>
                  <FormField label="Phone"><Input value={billing.phone} onChange={(event) => updateBilling('phone', event.target.value)} /></FormField>
                  <FormField label="Country code" required><Input value={billing.countryCode} maxLength={2} onChange={(event) => updateBilling('countryCode', event.target.value.toUpperCase())} /></FormField>
                  <FormField label="State"><Input value={billing.state} onChange={(event) => updateBilling('state', event.target.value)} /></FormField>
                  <FormField label="City"><Input value={billing.city} onChange={(event) => updateBilling('city', event.target.value)} /></FormField>
                  <FormField label="Postal code"><Input value={billing.postalCode} onChange={(event) => updateBilling('postalCode', event.target.value)} /></FormField>
                  <div className={styles.fullField}><FormField label="Address"><Input value={billing.addressLine1} onChange={(event) => updateBilling('addressLine1', event.target.value)} /></FormField></div>
                </div>
                <Button onClick={calculateQuote} isLoading={saving} disabled={!planId}>Calculate final amount</Button>
              </Card>

              <aside className={styles.summaryColumn}>
                <Card className={styles.summaryCard}>
                  <h2>Payment summary</h2>
                  {quote ? (
                    <dl className={styles.totals}>
                      <div><dt>Plan</dt><dd>{quote.plan.name}</dd></div>
                      <div><dt>Subtotal</dt><dd>{formatMinorAmount(quote.subtotalMinor, quote.currency)}</dd></div>
                      <div><dt>Discount</dt><dd>- {formatMinorAmount(quote.discountMinor, quote.currency)}</dd></div>
                      <div><dt>Tax {quote.taxRate ? `(${quote.taxRate.name})` : ''}</dt><dd>{formatMinorAmount(quote.taxMinor, quote.currency)}</dd></div>
                      <div className={styles.total}><dt>Total</dt><dd>{formatMinorAmount(quote.totalMinor, quote.currency)}</dd></div>
                    </dl>
                  ) : (
                    <p>Calculate the quote to lock the current plan, coupon, and tax calculation.</p>
                  )}
                </Card>

                {quote && configuration?.enabled ? (
                  <Card className={styles.paymentCard}>
                    <h2>3. Payment method</h2>
                    <div className={styles.providers}>
                      {Object.entries(configuration.providers)
                        .filter(([, enabled]) => enabled)
                        .map(([value]) => (
                          <button
                            type="button"
                            key={value}
                            className={provider === value ? styles.activeProvider : ''}
                            onClick={() => { setProvider(value); setStripeSession(null); }}
                          >
                            {providerLabels[value]}
                          </button>
                        ))}
                    </div>

                    {provider === 'razorpay' ? (
                      <Button onClick={completeRazorpay} isLoading={saving} fullWidth>Pay with Razorpay</Button>
                    ) : null}

                    {provider === 'stripe' && !stripeSession ? (
                      <Button onClick={initializeStripe} isLoading={saving} fullWidth>Continue to Stripe</Button>
                    ) : null}
                    {provider === 'stripe' && stripeSession ? (
                      <StripePaymentForm
                        session={stripeSession}
                        paymentId={stripePaymentId}
                        onComplete={async () => {
                          setMessage('Stripe payment confirmed.');
                          sessionStorage.removeItem(
                            'irap_pending_stripe_payment_id',
                          );
                          setStripeSession(null);
                          await load();
                        }}
                      />
                    ) : null}

                    {provider === 'offline' ? (
                      <form className={styles.offlineForm} onSubmit={submitOffline}>
                        {configuration.offline?.instructions ? <Alert tone="info">{configuration.offline.instructions}</Alert> : null}
                        {configuration.offline?.accountName ? <p><strong>Account:</strong> {configuration.offline.accountName}</p> : null}
                        {configuration.offline?.accountReference ? <p><strong>Bank details:</strong> {configuration.offline.accountReference}</p> : null}
                        <FormField label="Transaction reference" required><Input value={offline.reference} onChange={(event) => setOffline((current) => ({ ...current, reference: event.target.value }))} /></FormField>
                        <FormField label="Bank or payment channel"><Input value={offline.bankName} onChange={(event) => setOffline((current) => ({ ...current, bankName: event.target.value }))} /></FormField>
                        <FormField label="Payment date and time" required><Input type="datetime-local" value={offline.paidAt} onChange={(event) => setOffline((current) => ({ ...current, paidAt: event.target.value }))} /></FormField>
                        <FormField label="Proof document" hint="Upload it in Documents using the Payment proof category, then select it here.">
                          <Select value={offline.proofDocumentId} onChange={(event) => setOffline((current) => ({ ...current, proofDocumentId: event.target.value }))}>
                            <option value="">No proof document selected</option>
                            {applicationDocuments.map((document) => <option key={document.id} value={document.id}>{document.title}</option>)}
                          </Select>
                        </FormField>
                        <FormField label="Applicant note"><Textarea rows={3} value={offline.applicantNote} onChange={(event) => setOffline((current) => ({ ...current, applicantNote: event.target.value }))} /></FormField>
                        <Button type="submit" isLoading={saving} disabled={!offline.reference || !offline.paidAt} fullWidth>Submit offline payment</Button>
                      </form>
                    ) : null}
                  </Card>
                ) : null}
              </aside>
            </div>
          )}

          <section className={styles.history} aria-labelledby="payment-history-title">
            <h2 id="payment-history-title">Payment history</h2>
            {payments.length === 0 ? (
              <EmptyState title="No payments recorded" description="Initialized, completed, failed, offline, and refunded payments will appear here." />
            ) : (
              <div className={styles.historyGrid}>
                {payments.map((payment) => (
                  <Card key={payment.id} className={styles.historyCard}>
                    <div className={styles.historyHeading}>
                      <div><p>{payment.reference}</p><h3>{payment.planSnapshot.name}</h3></div>
                      <StatusBadge tone={paymentStatusTones[payment.status] || 'neutral'}>{paymentStatusLabels[payment.status] || payment.status}</StatusBadge>
                    </div>
                    <dl className={styles.details}>
                      <div><dt>Amount</dt><dd>{formatMinorAmount(payment.totalMinor, payment.currency)}</dd></div>
                      <div><dt>Provider</dt><dd>{providerLabels[payment.provider]}</dd></div>
                      <div><dt>Application</dt><dd>{payment.application?.reference || '—'}</dd></div>
                      <div><dt>Created</dt><dd>{new Date(payment.createdAt).toLocaleString()}</dd></div>
                    </dl>
                    {payment.failureMessage ? <Alert tone="error">{payment.failureMessage}</Alert> : null}
                    {payment.hasReceipt ? <Button size="small" variant="secondary" onClick={() => downloadReceipt(payment)}>Download receipt</Button> : null}
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </>
  );
}

export default PaymentsPage;
