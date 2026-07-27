import { useEffect, useRef, useState } from 'react';
import Alert from '../../common/Alert/Alert.jsx';
import Button from '../../common/Button/Button.jsx';
import { syncStripePayment } from '../../../api/paymentApi.js';
import { getApiErrorMessage } from '../../../utils/apiErrors.js';
import styles from './StripePaymentForm.module.css';

let stripeScriptPromise;

function loadStripeScript() {
  if (globalThis.Stripe) return Promise.resolve(globalThis.Stripe);
  stripeScriptPromise ||= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.async = true;
    script.onload = () => resolve(globalThis.Stripe);
    script.onerror = () => reject(new Error('Stripe.js could not be loaded.'));
    document.head.appendChild(script);
  });
  return stripeScriptPromise;
}

function StripePaymentForm({ session, paymentId, onComplete }) {
  const containerRef = useRef(null);
  const stripeRef = useRef(null);
  const elementsRef = useRef(null);
  const paymentElementRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function mount() {
      try {
        const Stripe = await loadStripeScript();
        if (!active || !Stripe) return;
        const stripe = Stripe(session.publicKey);
        const elements = stripe.elements({ clientSecret: session.clientSecret });
        const paymentElement = elements.create('payment', { layout: 'tabs' });
        paymentElement.mount(containerRef.current);
        paymentElement.on('ready', () => active && setReady(true));
        stripeRef.current = stripe;
        elementsRef.current = elements;
        paymentElementRef.current = paymentElement;
      } catch (requestError) {
        if (active) setError(requestError.message);
      }
    }

    void mount();
    return () => {
      active = false;
      paymentElementRef.current?.destroy();
    };
  }, [session.clientSecret, session.publicKey]);

  async function submit(event) {
    event.preventDefault();
    if (!stripeRef.current || !elementsRef.current) return;
    setSaving(true);
    setError('');
    try {
      const result = await stripeRef.current.confirmPayment({
        elements: elementsRef.current,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard/payments`,
        },
        redirect: 'if_required',
      });
      if (result.error) throw new Error(result.error.message);
      const synced = await syncStripePayment(paymentId);
      onComplete(synced.data.payment);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      {error ? <Alert tone="error">{error}</Alert> : null}
      <div ref={containerRef} className={styles.element} aria-busy={!ready} />
      <Button type="submit" isLoading={saving} disabled={!ready} fullWidth>
        Confirm Stripe payment
      </Button>
    </form>
  );
}

export default StripePaymentForm;
