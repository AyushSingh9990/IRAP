import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { verifyCourseCertificate } from '../../api/courseApi.js';
import { verifyPublicCertificate } from '../../api/membershipApi.js';
import Alert from '../../components/common/Alert/Alert.jsx';
import Button from '../../components/common/Button/Button.jsx';
import Card from '../../components/common/Card/Card.jsx';
import FormField from '../../components/common/FormField/FormField.jsx';
import Input from '../../components/common/Input/Input.jsx';
import Loader from '../../components/common/Loader/Loader.jsx';
import StatusBadge from '../../components/common/StatusBadge/StatusBadge.jsx';
import PageHero from '../../components/public/PageHero/PageHero.jsx';
import Seo from '../../components/seo/Seo.jsx';
import {
  formatRegistryDate,
} from '../../config/membershipConfig.js';
import styles from './CertificateVerificationPage.module.css';

const publicStatusMessages = Object.freeze({
  valid: 'This certificate is currently valid according to the iRAP registry.',
  expired: 'This certificate exists but its validity period has ended.',
  suspended: 'This certificate is connected to a currently suspended registry record.',
  revoked: 'This certificate has been revoked and must not be treated as valid.',
});

function CertificateVerificationPage() {
  const navigate = useNavigate();
  const { verificationCode = '' } = useParams();
  const [identifier, setIdentifier] = useState(verificationCode);
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(Boolean(verificationCode));
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setIdentifier(verificationCode);
    setVerification(null);
    setNotFound(false);
    setError('');

    if (!verificationCode) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    async function loadVerification() {
      try {
        const result = await verifyPublicCertificate(verificationCode);
        if (active) setVerification(result.data.verification);
      } catch (membershipError) {
        if (!active) return;

        if (membershipError.response?.status !== 404) {
          const message =
            membershipError.response?.data?.message ||
            'The verification service could not complete the request. Please try again.';
          setError(message);
          return;
        }

        try {
          const courseResult = await verifyCourseCertificate(verificationCode);
          if (!active) return;

          const course = courseResult.data.verification;
          setVerification({
            ...course,
            recordKind: 'course',
            certificateTitle: 'Course Accreditation Certificate',
            holderName: course.courseTitle,
            type: 'course',
            typeLabel: 'Accredited Course',
            registrationNumber: course.accreditationNumber,
            replacementIssued: false,
          });
        } catch (courseError) {
          if (!active) return;

          if (courseError.response?.status === 404) {
            setNotFound(true);
          } else {
            setError(
              courseError.response?.data?.message ||
                'The verification service could not complete the request. Please try again.',
            );
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadVerification();

    return () => {
      active = false;
    };
  }, [verificationCode]);

  function submit(event) {
    event.preventDefault();
    const value = identifier.trim();
    if (!value) return;
    navigate(`/verify/certificate/${encodeURIComponent(value)}`);
  }

  return (
    <>
      <Seo
        title="Verify an iRAP Certificate"
        description="Verify an iRAP membership, provider, organization or course accreditation certificate."
        path={verificationCode ? `/verify/certificate/${verificationCode}` : '/verify-certificate'}
        noIndex
      />
      <PageHero
        breadcrumbItems={[{ label: 'Home', to: '/' }, { label: 'Certificate verification' }]}
        eyebrow="Public verification"
        title="Verify an iRAP certificate"
        description="Enter a certificate number, registration number, course accreditation number or verification code exactly as displayed."
        aside={
          <form className={styles.searchForm} onSubmit={submit}>
            <FormField label="Certificate, registration or accreditation identifier" htmlFor="certificate-identifier">
              <Input
                id="certificate-identifier"
                autoComplete="off"
                minLength="3"
                maxLength="160"
                required
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
              />
            </FormField>
            <Button type="submit" fullWidth>Verify record</Button>
          </form>
        }
      />

      <section className="section">
        <div className={`container ${styles.container}`} aria-live="polite">
          {loading ? (
            <div className={styles.loading}><Loader label="Verifying certificate" size="large" /></div>
          ) : error ? (
            <Alert tone="error">{error}</Alert>
          ) : notFound ? (
            <Card className={styles.resultCard}>
              <div className={styles.resultHeading}>
                <div>
                  <p className={styles.eyebrow}>Verification result</p>
                  <h2>Record not found</h2>
                </div>
                <StatusBadge tone="error">Not found</StatusBadge>
              </div>
              <p>
                No public certificate, registration or course accreditation record matches this identifier. Check every character and try again.
              </p>
            </Card>
          ) : verification ? (
            <Card className={styles.resultCard}>
              <div className={styles.resultHeading}>
                <div>
                  <p className={styles.eyebrow}>Verification result</p>
                  <h2>{verification.certificateTitle}</h2>
                </div>
                <StatusBadge tone={({ valid: 'success', expired: 'warning', suspended: 'error', revoked: 'error' })[verification.status] || 'neutral'}>
                  {{ valid: 'Valid', expired: 'Expired', suspended: 'Suspended', revoked: 'Revoked' }[verification.status] || verification.status}
                </StatusBadge>
              </div>

              <Alert tone={verification.status === 'valid' ? 'success' : 'warning'}>
                {publicStatusMessages[verification.status] || 'The record was found in the iRAP registry.'}
              </Alert>

              <dl className={styles.details}>
                <div>
                  <dt>{verification.recordKind === 'course' ? 'Course title' : 'Approved name'}</dt>
                  <dd>{verification.holderName}</dd>
                </div>
                <div><dt>Record type</dt><dd>{verification.typeLabel}</dd></div>
                {verification.recordKind === 'course' ? (
                  <>
                    <div><dt>Accredited provider</dt><dd>{verification.providerName}</dd></div>
                    <div><dt>Provider registration</dt><dd>{verification.providerRegistrationNumber}</dd></div>
                    <div><dt>Accreditation number</dt><dd>{verification.accreditationNumber}</dd></div>
                  </>
                ) : (
                  <div><dt>Registration number</dt><dd>{verification.registrationNumber}</dd></div>
                )}
                <div><dt>Certificate number</dt><dd>{verification.certificateNumber}</dd></div>
                <div><dt>Issue date</dt><dd>{formatRegistryDate(verification.issueDate)}</dd></div>
                <div><dt>Expiry date</dt><dd>{formatRegistryDate(verification.expiryDate)}</dd></div>
              </dl>

              {verification.replacementIssued ? (
                <Alert tone="info">A replacement certificate has been issued for this record.</Alert>
              ) : null}

              <p className={styles.privacyNote}>
                Public verification intentionally displays only the minimum registry information needed to validate the certificate.
              </p>
            </Card>
          ) : (
            <Card className={styles.instructions}>
              <h2>Ready to verify</h2>
              <p>Use the search field above. The production registry does not publish private application, payment, document or contact information.</p>
            </Card>
          )}
        </div>
      </section>
    </>
  );
}

export default CertificateVerificationPage;
