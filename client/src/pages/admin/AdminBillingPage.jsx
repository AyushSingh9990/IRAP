import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createBillingConfiguration,
  listBillingConfiguration,
  updateBillingConfiguration,
} from '../../api/paymentApi.js';
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
import { formatMinorAmount } from '../../config/paymentConfig.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './AdminBillingPage.module.css';

const applicationTypes = ['member', 'training_provider', 'organization'];
const billingPurposes = ['initial', 'renewal'];

const emptyForms = Object.freeze({
  plans: {
    code: '',
    name: '',
    description: '',
    applicationTypes: ['member'],
    purposes: ['initial'],
    amountMinor: '',
    currency: 'INR',
    featuresText: '',
    active: true,
    sortOrder: 100,
  },
  coupons: {
    code: '',
    description: '',
    type: 'percentage',
    value: '',
    currency: '',
    planIds: [],
    applicationTypes: [],
    minimumSubtotalMinor: 0,
    maximumDiscountMinor: 0,
    usageLimit: 0,
    perUserLimit: 1,
    active: true,
    validFrom: '',
    validUntil: '',
  },
  taxes: {
    code: '',
    name: '',
    countryCode: 'IN',
    stateCode: '',
    applicationTypes: [],
    rateBasisPoints: '',
    inclusive: false,
    priority: 100,
    active: true,
    validFrom: '',
    validUntil: '',
  },
});

function createEmptyForm(resource) {
  return structuredClone(emptyForms[resource]);
}

function toLocalDateTime(value) {
  return value ? new Date(value).toISOString().slice(0, 16) : '';
}

function formFromItem(resource, item) {
  const next = createEmptyForm(resource);
  for (const key of Object.keys(next)) {
    if (key in item) next[key] = item[key];
  }

  if (resource === 'plans') {
    next.purposes = item.purposes?.length ? item.purposes : ['initial'];
    next.featuresText = (item.features || []).join('\n');
  } else {
    next.validFrom = toLocalDateTime(item.validFrom);
    next.validUntil = toLocalDateTime(item.validUntil);
  }

  return next;
}

function normalizeForm(resource, form) {
  const payload = { ...form };

  if (resource === 'plans') {
    payload.amountMinor = Number(payload.amountMinor);
    payload.sortOrder = Number(payload.sortOrder);
    payload.features = payload.featuresText
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
    delete payload.featuresText;
  }

  if (resource === 'coupons') {
    for (const field of [
      'value',
      'minimumSubtotalMinor',
      'maximumDiscountMinor',
      'usageLimit',
      'perUserLimit',
    ]) {
      payload[field] = Number(payload[field]);
    }
    payload.currency = payload.type === 'fixed' ? payload.currency : '';
    payload.validFrom = payload.validFrom
      ? new Date(payload.validFrom).toISOString()
      : null;
    payload.validUntil = payload.validUntil
      ? new Date(payload.validUntil).toISOString()
      : null;
  }

  if (resource === 'taxes') {
    payload.rateBasisPoints = Number(payload.rateBasisPoints);
    payload.priority = Number(payload.priority);
    payload.validFrom = payload.validFrom
      ? new Date(payload.validFrom).toISOString()
      : null;
    payload.validUntil = payload.validUntil
      ? new Date(payload.validUntil).toISOString()
      : null;
  }

  return payload;
}

function AdminBillingPage() {
  const [resource, setResource] = useState('plans');
  const [items, setItems] = useState([]);
  const [planOptions, setPlanOptions] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState(() => createEmptyForm('plans'));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId),
    [items, selectedId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [result, plansResult] = await Promise.all([
        listBillingConfiguration(resource),
        resource === 'coupons'
          ? listBillingConfiguration('plans')
          : Promise.resolve(null),
      ]);
      setItems(result.data.items);
      setPlanOptions(plansResult?.data.items || []);
      setSelectedId('');
      setForm(createEmptyForm(resource));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [resource]);

  useEffect(() => {
    void load();
  }, [load]);

  function choose(item) {
    setSelectedId(item.id);
    setForm(formFromItem(resource, item));
    setMessage('');
  }

  function startNew() {
    setSelectedId('');
    setForm(createEmptyForm(resource));
    setMessage('');
  }

  function toggleArrayValue(field, value) {
    setForm((current) => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter((item) => item !== value)
        : [...current[field], value],
    }));
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = normalizeForm(resource, form);
      const result = selectedId
        ? await updateBillingConfiguration(resource, selectedId, payload)
        : await createBillingConfiguration(resource, payload);
      setMessage(result.message);
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item) {
    setError('');
    try {
      await updateBillingConfiguration(resource, item.id, {
        active: !item.active,
      });
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }

  return (
    <>
      <Seo
        title="Billing Configuration"
        description="Configure iRAP plans, coupons and taxes."
        noIndex
      />
      <section className="section">
        <div className={`container ${styles.container}`}>
          <header className={styles.header}>
            <div>
              <p className={styles.eyebrow}>Finance configuration</p>
              <h1>Plans, coupons and taxes</h1>
              <p>
                Amounts are stored in minor currency units to prevent
                floating-point payment errors.
              </p>
            </div>
            <div className={styles.actions}>
              <Button to="/admin/payments" variant="secondary">
                Payment queue
              </Button>
              <Button to="/dashboard" variant="secondary">
                Dashboard
              </Button>
            </div>
          </header>

          {message ? <Alert tone="success">{message}</Alert> : null}
          {error ? <Alert tone="error">{error}</Alert> : null}

          <div className={styles.tabs}>
            {['plans', 'coupons', 'taxes'].map((value) => (
              <button
                type="button"
                key={value}
                className={resource === value ? styles.activeTab : ''}
                onClick={() => {
                  setResource(value);
                  setMessage('');
                }}
              >
                {value[0].toUpperCase() + value.slice(1)}
              </button>
            ))}
          </div>

          <div className={styles.workspace}>
            <section>
              <h2>Configured {resource}</h2>
              {loading ? (
                <div className={styles.loading}>
                  <Loader label="Loading billing configuration" />
                </div>
              ) : items.length === 0 ? (
                <EmptyState
                  title={`No ${resource} configured`}
                  description="Create the first production configuration using the form."
                />
              ) : (
                <div className={styles.items}>
                  {items.map((item) => (
                    <Card key={item.id} className={styles.item}>
                      <button
                        type="button"
                        className={styles.itemMain}
                        onClick={() => choose(item)}
                      >
                        <strong>{item.name || item.code}</strong>
                        <span>{item.code}</span>
                        {resource === 'plans' ? (
                          <small>
                            {formatMinorAmount(item.amountMinor, item.currency)}
                          </small>
                        ) : null}
                      </button>
                      <Button
                        size="small"
                        variant={item.active ? 'secondary' : 'primary'}
                        onClick={() => toggleActive(item)}
                      >
                        {item.active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            <aside>
              <Card>
                <form className={styles.form} onSubmit={save}>
                  <div className={styles.formHeading}>
                    <h2>
                      {selected
                        ? `Edit ${selected.code}`
                        : `Create ${resource.slice(0, -1)}`}
                    </h2>
                    {selected ? (
                      <Button size="small" variant="secondary" onClick={startNew}>
                        New
                      </Button>
                    ) : null}
                  </div>

                  <FormField label="Code" required>
                    <Input
                      value={form.code}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          code: event.target.value.toUpperCase(),
                        }))
                      }
                    />
                  </FormField>

                  {resource !== 'coupons' ? (
                    <FormField label="Name" required>
                      <Input
                        value={form.name}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                      />
                    </FormField>
                  ) : null}

                  {resource !== 'taxes' ? (
                    <FormField label="Description">
                      <Textarea
                        rows={3}
                        value={form.description}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                      />
                    </FormField>
                  ) : null}

                  <fieldset className={styles.checks}>
                    <legend>Application types</legend>
                    {applicationTypes.map((value) => (
                      <label key={value}>
                        <input
                          type="checkbox"
                          checked={form.applicationTypes.includes(value)}
                          onChange={() =>
                            toggleArrayValue('applicationTypes', value)
                          }
                        />{' '}
                        {value.replaceAll('_', ' ')}
                      </label>
                    ))}
                  </fieldset>

                  {resource === 'plans' ? (
                    <>
                      <fieldset className={styles.checks}>
                        <legend>Billing purposes</legend>
                        {billingPurposes.map((value) => (
                          <label key={value}>
                            <input
                              type="checkbox"
                              checked={form.purposes.includes(value)}
                              onChange={() => toggleArrayValue('purposes', value)}
                            />{' '}
                            {value === 'initial' ? 'Initial application' : 'Renewal'}
                          </label>
                        ))}
                      </fieldset>
                      <div className={styles.grid}>
                        <FormField label="Amount (minor units)" required>
                          <Input
                            type="number"
                            min="1"
                            value={form.amountMinor}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                amountMinor: event.target.value,
                              }))
                            }
                          />
                        </FormField>
                        <FormField label="Currency" required>
                          <Input
                            maxLength={3}
                            value={form.currency}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                currency: event.target.value.toUpperCase(),
                              }))
                            }
                          />
                        </FormField>
                      </div>
                      <FormField label="Features" hint="One feature per line">
                        <Textarea
                          rows={5}
                          value={form.featuresText}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              featuresText: event.target.value,
                            }))
                          }
                        />
                      </FormField>
                      <FormField label="Sort order">
                        <Input
                          type="number"
                          min="0"
                          value={form.sortOrder}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              sortOrder: event.target.value,
                            }))
                          }
                        />
                      </FormField>
                    </>
                  ) : null}

                  {resource === 'coupons' ? (
                    <>
                      <div className={styles.grid}>
                        <FormField label="Discount type">
                          <Select
                            value={form.type}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                type: event.target.value,
                                currency:
                                  event.target.value === 'fixed'
                                    ? current.currency || 'INR'
                                    : '',
                              }))
                            }
                          >
                            <option value="percentage">Percentage</option>
                            <option value="fixed">Fixed minor amount</option>
                          </Select>
                        </FormField>
                        <FormField label="Value" required>
                          <Input
                            type="number"
                            min="1"
                            max={form.type === 'percentage' ? '100' : undefined}
                            value={form.value}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                value: event.target.value,
                              }))
                            }
                          />
                        </FormField>
                      </div>

                      {form.type === 'fixed' ? (
                        <FormField label="Fixed-discount currency" required>
                          <Input
                            maxLength={3}
                            value={form.currency}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                currency: event.target.value.toUpperCase(),
                              }))
                            }
                          />
                        </FormField>
                      ) : null}

                      <fieldset className={styles.checks}>
                        <legend>Restrict to plans</legend>
                        {planOptions.length === 0 ? (
                          <p>No plans are configured. Leave unrestricted.</p>
                        ) : (
                          planOptions.map((plan) => (
                            <label key={plan.id}>
                              <input
                                type="checkbox"
                                checked={form.planIds.includes(plan.id)}
                                onChange={() =>
                                  toggleArrayValue('planIds', plan.id)
                                }
                              />{' '}
                              {plan.name} ({plan.code})
                            </label>
                          ))
                        )}
                      </fieldset>

                      <div className={styles.grid}>
                        <FormField label="Minimum subtotal">
                          <Input
                            type="number"
                            min="0"
                            value={form.minimumSubtotalMinor}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                minimumSubtotalMinor: event.target.value,
                              }))
                            }
                          />
                        </FormField>
                        <FormField label="Maximum discount">
                          <Input
                            type="number"
                            min="0"
                            value={form.maximumDiscountMinor}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                maximumDiscountMinor: event.target.value,
                              }))
                            }
                          />
                        </FormField>
                      </div>
                      <div className={styles.grid}>
                        <FormField label="Total usage limit">
                          <Input
                            type="number"
                            min="0"
                            value={form.usageLimit}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                usageLimit: event.target.value,
                              }))
                            }
                          />
                        </FormField>
                        <FormField label="Per-user limit">
                          <Input
                            type="number"
                            min="0"
                            value={form.perUserLimit}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                perUserLimit: event.target.value,
                              }))
                            }
                          />
                        </FormField>
                      </div>
                    </>
                  ) : null}

                  {resource === 'taxes' ? (
                    <>
                      <div className={styles.grid}>
                        <FormField label="Country code">
                          <Input
                            maxLength={2}
                            value={form.countryCode}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                countryCode: event.target.value.toUpperCase(),
                              }))
                            }
                          />
                        </FormField>
                        <FormField label="State code">
                          <Input
                            value={form.stateCode}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                stateCode: event.target.value.toUpperCase(),
                              }))
                            }
                          />
                        </FormField>
                      </div>
                      <div className={styles.grid}>
                        <FormField label="Rate (basis points)" required>
                          <Input
                            type="number"
                            min="0"
                            max="10000"
                            value={form.rateBasisPoints}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                rateBasisPoints: event.target.value,
                              }))
                            }
                          />
                        </FormField>
                        <FormField label="Priority">
                          <Input
                            type="number"
                            min="0"
                            value={form.priority}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                priority: event.target.value,
                              }))
                            }
                          />
                        </FormField>
                      </div>
                      <label className={styles.boolean}>
                        <input
                          type="checkbox"
                          checked={form.inclusive}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              inclusive: event.target.checked,
                            }))
                          }
                        />{' '}
                        Tax is included in the plan price
                      </label>
                    </>
                  ) : null}

                  {resource !== 'plans' ? (
                    <div className={styles.grid}>
                      <FormField label="Valid from">
                        <Input
                          type="datetime-local"
                          value={form.validFrom}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              validFrom: event.target.value,
                            }))
                          }
                        />
                      </FormField>
                      <FormField label="Valid until">
                        <Input
                          type="datetime-local"
                          value={form.validUntil}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              validUntil: event.target.value,
                            }))
                          }
                        />
                      </FormField>
                    </div>
                  ) : null}

                  <label className={styles.boolean}>
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          active: event.target.checked,
                        }))
                      }
                    />{' '}
                    Active
                  </label>

                  <Button type="submit" isLoading={saving}>
                    {selectedId ? 'Save changes' : 'Create configuration'}
                  </Button>
                </form>
              </Card>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}

export default AdminBillingPage;
