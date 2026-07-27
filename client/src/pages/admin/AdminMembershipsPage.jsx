import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  changeMembershipStatus,
  getAdminMembership,
  getMembershipPolicy,
  issueApprovedMembership,
  listAdminMemberships,
  processMembershipRenewals,
  replaceCertificate,
  revokeCertificate,
  saveMembershipPolicy,
} from '../../api/membershipApi.js';
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
  certificateStatusLabels,
  certificateStatusTones,
  formatRegistryDate,
  membershipStatusLabels,
  membershipStatusTones,
} from '../../config/membershipConfig.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './AdminMembershipsPage.module.css';

const emptyPolicy = Object.freeze({
  validityMonths: {
    member: '',
    trainingProvider: '',
    organization: '',
  },
  renewalWindowDays: '',
  gracePeriodDays: '',
  reminderDaysText: '',
  registrationPrefixes: {
    member: '',
    trainingProvider: '',
    organization: '',
  },
  certificatePrefix: '',
  authorizedSignatory: {
    name: '',
    title: '',
  },
});

function copyEmptyPolicy() {
  return structuredClone(emptyPolicy);
}

function policyToForm(policy) {
  if (!policy) return copyEmptyPolicy();
  return {
    validityMonths: {
      member: String(policy.validityMonths.member),
      trainingProvider: String(policy.validityMonths.trainingProvider),
      organization: String(policy.validityMonths.organization),
    },
    renewalWindowDays: String(policy.renewalWindowDays),
    gracePeriodDays: String(policy.gracePeriodDays),
    reminderDaysText: (policy.reminderDays || []).join(', '),
    registrationPrefixes: {
      member: policy.registrationPrefixes.member,
      trainingProvider: policy.registrationPrefixes.trainingProvider,
      organization: policy.registrationPrefixes.organization,
    },
    certificatePrefix: policy.certificatePrefix,
    authorizedSignatory: {
      name: policy.authorizedSignatory.name,
      title: policy.authorizedSignatory.title,
    },
  };
}

function policyPayload(form) {
  return {
    validityMonths: {
      member: Number(form.validityMonths.member),
      trainingProvider: Number(form.validityMonths.trainingProvider),
      organization: Number(form.validityMonths.organization),
    },
    renewalWindowDays: Number(form.renewalWindowDays),
    gracePeriodDays: Number(form.gracePeriodDays),
    reminderDays: form.reminderDaysText
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value >= 0),
    registrationPrefixes: {
      member: form.registrationPrefixes.member.trim().toUpperCase(),
      trainingProvider: form.registrationPrefixes.trainingProvider.trim().toUpperCase(),
      organization: form.registrationPrefixes.organization.trim().toUpperCase(),
    },
    certificatePrefix: form.certificatePrefix.trim().toUpperCase(),
    authorizedSignatory: {
      name: form.authorizedSignatory.name.trim(),
      title: form.authorizedSignatory.title.trim(),
    },
  };
}

function AdminMembershipsPage() {
  const [policy, setPolicy] = useState(null);
  const [policyForm, setPolicyForm] = useState(copyEmptyPolicy);
  const [memberships, setMemberships] = useState([]);
  const [unissuedApplications, setUnissuedApplications] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ search: '', type: '', status: '' });
  const [actionForm, setActionForm] = useState({ action: 'suspend', reason: '', confirmation: '' });
  const [certificateAction, setCertificateAction] = useState({ certificateId: '', action: 'replace', reason: '', confirmation: '' });
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selectedCertificate = useMemo(
    () => selected?.certificates?.find((item) => item.id === certificateAction.certificateId) || null,
    [certificateAction.certificateId, selected],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [policyResult, recordsResult] = await Promise.all([
        getMembershipPolicy(),
        listAdminMemberships({ ...filters, page: 1, limit: 100 }),
      ]);
      const nextPolicy = policyResult.data.policy;
      setPolicy(nextPolicy);
      setPolicyForm(policyToForm(nextPolicy));
      setMemberships(recordsResult.data.memberships);
      setUnissuedApplications(recordsResult.data.unissuedApplications);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateNested(section, field, value) {
    setPolicyForm((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value,
      },
    }));
  }

  async function savePolicy(event) {
    event.preventDefault();
    setWorking('policy');
    setMessage('');
    setError('');
    try {
      const result = await saveMembershipPolicy(policyPayload(policyForm));
      setPolicy(result.data.policy);
      setPolicyForm(policyToForm(result.data.policy));
      setMessage(result.message);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setWorking('');
    }
  }

  async function issue(applicationId) {
    setWorking(`issue:${applicationId}`);
    setMessage('');
    setError('');
    try {
      const result = await issueApprovedMembership(applicationId);
      setMessage(result.message);
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setWorking('');
    }
  }

  async function openRecord(membershipId) {
    setWorking(`record:${membershipId}`);
    setError('');
    try {
      const result = await getAdminMembership(membershipId);
      setSelected(result.data.membership);
      setCertificateAction((current) => ({
        ...current,
        certificateId: result.data.membership.currentCertificate?.id || '',
      }));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setWorking('');
    }
  }

  async function submitMembershipAction(event) {
    event.preventDefault();
    if (!selected) return;
    setWorking('membership-action');
    setMessage('');
    setError('');
    try {
      const result = await changeMembershipStatus(selected.id, actionForm);
      setMessage(result.message);
      setActionForm({ action: 'suspend', reason: '', confirmation: '' });
      await openRecord(selected.id);
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setWorking('');
    }
  }

  async function submitCertificateAction(event) {
    event.preventDefault();
    if (!certificateAction.certificateId) return;
    setWorking('certificate-action');
    setMessage('');
    setError('');
    try {
      const payload = {
        reason: certificateAction.reason,
        confirmation: certificateAction.confirmation,
      };
      const result = certificateAction.action === 'replace'
        ? await replaceCertificate(certificateAction.certificateId, payload)
        : await revokeCertificate(certificateAction.certificateId, payload);
      setMessage(result.message);
      setCertificateAction({ certificateId: '', action: 'replace', reason: '', confirmation: '' });
      await openRecord(selected.id);
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setWorking('');
    }
  }

  async function runProcessing() {
    setWorking('processing');
    setMessage('');
    setError('');
    try {
      const result = await processMembershipRenewals();
      setMessage(`${result.message} ${result.data.statusesUpdated} record(s) updated and ${result.data.remindersSent} reminder(s) created.`);
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setWorking('');
    }
  }

  return (
    <>
      <Seo
        title="Membership and Certificate Administration"
        description="Configure, issue and manage iRAP membership, accreditation and certificate records."
        noIndex
      />
      <section className="section">
        <div className={`container ${styles.container}`}>
          <header className={styles.header}>
            <div>
              <p className={styles.eyebrow}>Registry administration</p>
              <h1>Memberships and certificates</h1>
              <p>Configure issuance rules, issue approved records, manage validity and maintain certificate history.</p>
            </div>
            <div className={styles.headerActions}>
              <Button variant="secondary" onClick={runProcessing} isLoading={working === 'processing'}>
                Process renewals
              </Button>
              <Button to="/admin/applications" variant="secondary">Application queue</Button>
            </div>
          </header>

          {message ? <Alert tone="success">{message}</Alert> : null}
          {error ? <Alert tone="error">{error}</Alert> : null}

          {loading ? (
            <div className={styles.loading}><Loader label="Loading registry administration" size="large" /></div>
          ) : (
            <>
              <Card>
                <div className={styles.sectionHeading}>
                  <div>
                    <h2>Issuance and renewal policy</h2>
                    <p>{policy ? 'The active policy controls all new and renewed records.' : 'Configure the policy before issuing any approved record.'}</p>
                  </div>
                  <StatusBadge tone={policy ? 'success' : 'warning'}>{policy ? 'Configured' : 'Required'}</StatusBadge>
                </div>
                <form className={styles.policyForm} onSubmit={savePolicy}>
                  <fieldset className={styles.fieldset}>
                    <legend>Validity in months</legend>
                    <div className={styles.threeColumnGrid}>
                      <FormField label="Member" htmlFor="validity-member">
                        <Input id="validity-member" type="number" min="1" max="120" required value={policyForm.validityMonths.member} onChange={(event) => updateNested('validityMonths', 'member', event.target.value)} />
                      </FormField>
                      <FormField label="Training provider" htmlFor="validity-provider">
                        <Input id="validity-provider" type="number" min="1" max="120" required value={policyForm.validityMonths.trainingProvider} onChange={(event) => updateNested('validityMonths', 'trainingProvider', event.target.value)} />
                      </FormField>
                      <FormField label="Organization" htmlFor="validity-organization">
                        <Input id="validity-organization" type="number" min="1" max="120" required value={policyForm.validityMonths.organization} onChange={(event) => updateNested('validityMonths', 'organization', event.target.value)} />
                      </FormField>
                    </div>
                  </fieldset>

                  <div className={styles.threeColumnGrid}>
                    <FormField label="Renewal window (days)" htmlFor="renewal-window">
                      <Input id="renewal-window" type="number" min="1" max="365" required value={policyForm.renewalWindowDays} onChange={(event) => setPolicyForm((current) => ({ ...current, renewalWindowDays: event.target.value }))} />
                    </FormField>
                    <FormField label="Grace period (days)" htmlFor="grace-period">
                      <Input id="grace-period" type="number" min="0" max="365" required value={policyForm.gracePeriodDays} onChange={(event) => setPolicyForm((current) => ({ ...current, gracePeriodDays: event.target.value }))} />
                    </FormField>
                    <FormField label="Reminder offsets" htmlFor="reminder-days" hint="Comma-separated days before expiry, for example 90, 30, 7, 0.">
                      <Input id="reminder-days" required value={policyForm.reminderDaysText} onChange={(event) => setPolicyForm((current) => ({ ...current, reminderDaysText: event.target.value }))} />
                    </FormField>
                  </div>

                  <fieldset className={styles.fieldset}>
                    <legend>Registration prefixes</legend>
                    <div className={styles.fourColumnGrid}>
                      <FormField label="Member" htmlFor="prefix-member">
                        <Input id="prefix-member" minLength="2" maxLength="12" required value={policyForm.registrationPrefixes.member} onChange={(event) => updateNested('registrationPrefixes', 'member', event.target.value)} />
                      </FormField>
                      <FormField label="Provider" htmlFor="prefix-provider">
                        <Input id="prefix-provider" minLength="2" maxLength="12" required value={policyForm.registrationPrefixes.trainingProvider} onChange={(event) => updateNested('registrationPrefixes', 'trainingProvider', event.target.value)} />
                      </FormField>
                      <FormField label="Organization" htmlFor="prefix-organization">
                        <Input id="prefix-organization" minLength="2" maxLength="12" required value={policyForm.registrationPrefixes.organization} onChange={(event) => updateNested('registrationPrefixes', 'organization', event.target.value)} />
                      </FormField>
                      <FormField label="Certificate" htmlFor="prefix-certificate">
                        <Input id="prefix-certificate" minLength="2" maxLength="12" required value={policyForm.certificatePrefix} onChange={(event) => setPolicyForm((current) => ({ ...current, certificatePrefix: event.target.value }))} />
                      </FormField>
                    </div>
                  </fieldset>

                  <div className={styles.twoColumnGrid}>
                    <FormField label="Authorized signatory name" htmlFor="signatory-name">
                      <Input id="signatory-name" required value={policyForm.authorizedSignatory.name} onChange={(event) => updateNested('authorizedSignatory', 'name', event.target.value)} />
                    </FormField>
                    <FormField label="Authorized signatory title" htmlFor="signatory-title">
                      <Input id="signatory-title" required value={policyForm.authorizedSignatory.title} onChange={(event) => updateNested('authorizedSignatory', 'title', event.target.value)} />
                    </FormField>
                  </div>

                  <div className={styles.formActions}>
                    <Button type="submit" isLoading={working === 'policy'}>Save policy</Button>
                  </div>
                </form>
              </Card>

              <Card>
                <div className={styles.sectionHeading}>
                  <div>
                    <h2>Approved records awaiting issuance</h2>
                    <p>Only approved applications without a linked membership or accreditation record appear here.</p>
                  </div>
                  <StatusBadge tone={unissuedApplications.length ? 'warning' : 'success'}>{unissuedApplications.length}</StatusBadge>
                </div>
                {unissuedApplications.length === 0 ? (
                  <EmptyState title="No approved applications await issuance" description="Newly approved applications will appear here when a registry record still needs to be created." />
                ) : (
                  <div className={styles.unissuedList}>
                    {unissuedApplications.map((application) => (
                      <article className={styles.unissuedItem} key={application.id}>
                        <div>
                          <strong>{application.reference}</strong>
                          <span>{application.typeLabel} · {application.purpose.replaceAll('_', ' ')}{application.owner?.displayName ? ` · ${application.owner.displayName}` : ''}</span>
                        </div>
                        <Button disabled={!policy} isLoading={working === `issue:${application.id}`} onClick={() => issue(application.id)}>
                          Issue record
                        </Button>
                      </article>
                    ))}
                  </div>
                )}
              </Card>

              <Card>
                <div className={styles.sectionHeading}>
                  <div>
                    <h2>Registry records</h2>
                    <p>Search by approved name, registration number or account details.</p>
                  </div>
                </div>
                <div className={styles.filters}>
                  <FormField label="Search" htmlFor="membership-search">
                    <Input id="membership-search" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
                  </FormField>
                  <FormField label="Type" htmlFor="membership-type">
                    <Select id="membership-type" value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}>
                      <option value="">All types</option>
                      <option value="member">Professional member</option>
                      <option value="training_provider">Training provider</option>
                      <option value="organization">Organization</option>
                    </Select>
                  </FormField>
                  <FormField label="Status" htmlFor="membership-status">
                    <Select id="membership-status" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
                      <option value="">All statuses</option>
                      {Object.entries(membershipStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </Select>
                  </FormField>
                </div>

                {memberships.length === 0 ? (
                  <EmptyState title="No registry records match these filters" description="Change the filters or issue an approved application." />
                ) : (
                  <div className={styles.recordList}>
                    {memberships.map((membership) => (
                      <article className={styles.recordItem} key={membership.id}>
                        <div>
                          <strong>{membership.approvedName}</strong>
                          <span>{membership.registrationNumber} · {membership.typeLabel}</span>
                          <small>Valid until {formatRegistryDate(membership.validUntil)}</small>
                        </div>
                        <StatusBadge tone={membershipStatusTones[membership.status] || 'neutral'}>{membershipStatusLabels[membership.status] || membership.status}</StatusBadge>
                        <Button variant="secondary" isLoading={working === `record:${membership.id}`} onClick={() => openRecord(membership.id)}>Manage</Button>
                      </article>
                    ))}
                  </div>
                )}
              </Card>

              {selected ? (
                <Card className={styles.managementCard}>
                  <div className={styles.sectionHeading}>
                    <div>
                      <p className={styles.eyebrow}>Selected registry record</p>
                      <h2>{selected.approvedName}</h2>
                      <p>{selected.registrationNumber} · {selected.typeLabel}</p>
                    </div>
                    <StatusBadge tone={membershipStatusTones[selected.status] || 'neutral'}>{membershipStatusLabels[selected.status] || selected.status}</StatusBadge>
                  </div>

                  <dl className={styles.details}>
                    <div><dt>Owner</dt><dd>{selected.owner?.displayName || 'Not available'}</dd></div>
                    <div><dt>Owner email</dt><dd>{selected.owner?.email || 'Not available'}</dd></div>
                    <div><dt>Valid from</dt><dd>{formatRegistryDate(selected.validFrom)}</dd></div>
                    <div><dt>Valid until</dt><dd>{formatRegistryDate(selected.validUntil)}</dd></div>
                    <div><dt>Renewal opens</dt><dd>{formatRegistryDate(selected.renewalOpensAt)}</dd></div>
                    <div><dt>Renewal cycle</dt><dd>{selected.renewalCycle}</dd></div>
                  </dl>

                  <div className={styles.managementGrid}>
                    <form className={styles.actionForm} onSubmit={submitMembershipAction}>
                      <h3>Membership status action</h3>
                      <FormField label="Action" htmlFor="membership-action">
                        <Select id="membership-action" value={actionForm.action} onChange={(event) => setActionForm({ action: event.target.value, reason: '', confirmation: '' })}>
                          <option value="suspend">Suspend</option>
                          <option value="reinstate">Reinstate</option>
                          <option value="revoke">Revoke permanently</option>
                        </Select>
                      </FormField>
                      <FormField label="Reason" htmlFor="membership-reason">
                        <Textarea id="membership-reason" minLength="10" maxLength="1000" required value={actionForm.reason} onChange={(event) => setActionForm((current) => ({ ...current, reason: event.target.value }))} />
                      </FormField>
                      <FormField label={`Type ${actionForm.action.toUpperCase()} to confirm`} htmlFor="membership-confirmation">
                        <Input id="membership-confirmation" required value={actionForm.confirmation} onChange={(event) => setActionForm((current) => ({ ...current, confirmation: event.target.value }))} />
                      </FormField>
                      <Button type="submit" isLoading={working === 'membership-action'}>Apply status action</Button>
                    </form>

                    <form className={styles.actionForm} onSubmit={submitCertificateAction}>
                      <h3>Certificate action</h3>
                      <FormField label="Certificate" htmlFor="certificate-select">
                        <Select id="certificate-select" required value={certificateAction.certificateId} onChange={(event) => setCertificateAction((current) => ({ ...current, certificateId: event.target.value }))}>
                          <option value="">Select certificate</option>
                          {(selected.certificates || []).map((certificate) => (
                            <option key={certificate.id} value={certificate.id}>{certificate.certificateNumber} · {certificateStatusLabels[certificate.status] || certificate.status}</option>
                          ))}
                        </Select>
                      </FormField>
                      {selectedCertificate ? (
                        <p className={styles.selectedCertificateStatus}>
                          Current selection: <StatusBadge tone={certificateStatusTones[selectedCertificate.status] || 'neutral'}>{certificateStatusLabels[selectedCertificate.status] || selectedCertificate.status}</StatusBadge>
                        </p>
                      ) : null}
                      <FormField label="Action" htmlFor="certificate-action">
                        <Select id="certificate-action" value={certificateAction.action} onChange={(event) => setCertificateAction((current) => ({ ...current, action: event.target.value, confirmation: '' }))}>
                          <option value="replace">Issue replacement</option>
                          <option value="revoke">Revoke</option>
                        </Select>
                      </FormField>
                      <FormField label="Reason" htmlFor="certificate-reason">
                        <Textarea id="certificate-reason" minLength="10" maxLength="1000" required value={certificateAction.reason} onChange={(event) => setCertificateAction((current) => ({ ...current, reason: event.target.value }))} />
                      </FormField>
                      <FormField label={`Type ${certificateAction.action.toUpperCase()} to confirm`} htmlFor="certificate-confirmation">
                        <Input id="certificate-confirmation" required value={certificateAction.confirmation} onChange={(event) => setCertificateAction((current) => ({ ...current, confirmation: event.target.value }))} />
                      </FormField>
                      <Button type="submit" isLoading={working === 'certificate-action'}>Apply certificate action</Button>
                    </form>
                  </div>

                  <section className={styles.historySection}>
                    <h3>Certificate history</h3>
                    <div className={styles.certificateHistory}>
                      {(selected.certificates || []).map((certificate) => (
                        <article key={certificate.id}>
                          <div>
                            <strong>{certificate.certificateNumber}</strong>
                            <span>{certificate.certificateTitle}</span>
                            <small>{formatRegistryDate(certificate.issueDate)} – {formatRegistryDate(certificate.expiryDate)}</small>
                          </div>
                          <StatusBadge tone={certificateStatusTones[certificate.status] || 'neutral'}>{certificateStatusLabels[certificate.status] || certificate.status}</StatusBadge>
                          <a href={certificate.verificationUrl} target="_blank" rel="noreferrer">Public verification</a>
                        </article>
                      ))}
                    </div>
                  </section>
                </Card>
              ) : null}
            </>
          )}
        </div>
      </section>
    </>
  );
}

export default AdminMembershipsPage;
