import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCertificatePdf,
  listMyMemberships,
  startMembershipRenewal,
} from '../../api/membershipApi.js';
import Alert from '../../components/common/Alert/Alert.jsx';
import Button from '../../components/common/Button/Button.jsx';
import Card from '../../components/common/Card/Card.jsx';
import EmptyState from '../../components/common/EmptyState/EmptyState.jsx';
import Loader from '../../components/common/Loader/Loader.jsx';
import StatusBadge from '../../components/common/StatusBadge/StatusBadge.jsx';
import Seo from '../../components/seo/Seo.jsx';
import {
  certificateStatusLabels,
  certificateStatusTones,
  formatRegistryDate,
  membershipStatusLabels,
  membershipStatusTones,
} from '../../config/membershipConfig.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './MembershipsPage.module.css';

function openBlob(blob, filename, download) {
  const url = URL.createObjectURL(blob);
  if (download) {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function MembershipsPage() {
  const navigate = useNavigate();
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listMyMemberships();
      setMemberships(result.data.memberships);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function startRenewal(membershipId) {
    setWorkingId(membershipId);
    setError('');
    setMessage('');
    try {
      const result = await startMembershipRenewal(membershipId);
      setMessage(result.message);
      navigate(`/dashboard/applications/${result.data.application.id}`);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setWorkingId('');
    }
  }

  async function handlePdf(certificate, download) {
    setWorkingId(certificate.id);
    setError('');
    try {
      const blob = await getCertificatePdf(certificate.id, download);
      openBlob(blob, `${certificate.certificateNumber}.pdf`, download);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setWorkingId('');
    }
  }

  return (
    <>
      <Seo
        title="Memberships and Certificates"
        description="Manage approved iRAP membership, accreditation, renewal, and certificate records."
        noIndex
      />
      <section className="section">
        <div className={`container ${styles.container}`}>
          <header className={styles.header}>
            <div>
              <p className={styles.eyebrow}>Approved records</p>
              <h1>Memberships and certificates</h1>
              <p>
                View registration details, validity dates, certificate history,
                and eligible renewal actions.
              </p>
            </div>
            <Button to="/dashboard/applications" variant="secondary">
              Applications
            </Button>
          </header>

          {message ? <Alert tone="success">{message}</Alert> : null}
          {error ? <Alert tone="error">{error}</Alert> : null}

          {loading ? (
            <div className={styles.loading}>
              <Loader label="Loading membership records" size="large" />
            </div>
          ) : memberships.length === 0 ? (
            <EmptyState
              title="No membership record has been issued"
              description="Approved membership or accreditation records will appear here after administrative issuance."
              action={<Button to="/dashboard/applications">View applications</Button>}
            />
          ) : (
            <div className={styles.membershipList}>
              {memberships.map((membership) => {
                const renewalAvailable =
                  new Date() >= new Date(membership.renewalOpensAt) &&
                  !['suspended', 'revoked', 'expired'].includes(membership.status);
                return (
                  <Card key={membership.id} className={styles.membershipCard}>
                    <div className={styles.cardHeading}>
                      <div>
                        <p className={styles.type}>{membership.typeLabel}</p>
                        <h2>{membership.approvedName}</h2>
                        <p className={styles.registration}>
                          {membership.registrationNumber}
                        </p>
                      </div>
                      <StatusBadge tone={membershipStatusTones[membership.status] || 'neutral'}>
                        {membershipStatusLabels[membership.status] || membership.status}
                      </StatusBadge>
                    </div>

                    <dl className={styles.details}>
                      <div><dt>Valid from</dt><dd>{formatRegistryDate(membership.validFrom)}</dd></div>
                      <div><dt>Valid until</dt><dd>{formatRegistryDate(membership.validUntil)}</dd></div>
                      <div><dt>Renewal opens</dt><dd>{formatRegistryDate(membership.renewalOpensAt)}</dd></div>
                      <div><dt>Payment status</dt><dd>{membership.paymentStatus.replaceAll('_', ' ')}</dd></div>
                    </dl>

                    <div className={styles.actions}>
                      <Button
                        disabled={!renewalAvailable || workingId === membership.id}
                        onClick={() => startRenewal(membership.id)}
                      >
                        {workingId === membership.id ? 'Starting…' : 'Start renewal'}
                      </Button>
                      <Button to={`/dashboard/applications/${membership.currentApplication?.id}`} variant="secondary">
                        Current application
                      </Button>
                    </div>

                    <section className={styles.certificates}>
                      <h3>Certificate history</h3>
                      {membership.certificates.length === 0 ? (
                        <p>No certificate has been generated for this record.</p>
                      ) : (
                        <div className={styles.certificateList}>
                          {membership.certificates.map((certificate) => (
                            <article key={certificate.id} className={styles.certificate}>
                              <div>
                                <strong>{certificate.certificateTitle}</strong>
                                <span>{certificate.certificateNumber}</span>
                                <small>
                                  {formatRegistryDate(certificate.issueDate)} – {formatRegistryDate(certificate.expiryDate)}
                                </small>
                              </div>
                              <StatusBadge tone={certificateStatusTones[certificate.status] || 'neutral'}>
                                {certificateStatusLabels[certificate.status] || certificate.status}
                              </StatusBadge>
                              <div className={styles.certificateActions}>
                                <Button
                                  size="small"
                                  variant="secondary"
                                  disabled={workingId === certificate.id}
                                  onClick={() => handlePdf(certificate, false)}
                                >
                                  Preview
                                </Button>
                                <Button
                                  size="small"
                                  disabled={workingId === certificate.id}
                                  onClick={() => handlePdf(certificate, true)}
                                >
                                  Download
                                </Button>
                                <a href={certificate.verificationUrl} target="_blank" rel="noreferrer">
                                  Verify
                                </a>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </section>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default MembershipsPage;
