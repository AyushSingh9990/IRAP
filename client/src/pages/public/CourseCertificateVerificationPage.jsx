import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { verifyCourseCertificate } from '../../api/courseApi.js';
import Alert from '../../components/common/Alert/Alert.jsx';
import Button from '../../components/common/Button/Button.jsx';
import Card from '../../components/common/Card/Card.jsx';
import FormField from '../../components/common/FormField/FormField.jsx';
import Input from '../../components/common/Input/Input.jsx';
import Loader from '../../components/common/Loader/Loader.jsx';
import StatusBadge from '../../components/common/StatusBadge/StatusBadge.jsx';
import PageHero from '../../components/public/PageHero/PageHero.jsx';
import Seo from '../../components/seo/Seo.jsx';
import { formatCourseDate } from '../../config/courseConfig.js';
import styles from './CourseCertificateVerificationPage.module.css';

const statusCopy = Object.freeze({
  valid: 'This course accreditation certificate is currently valid.',
  expired: 'This course accreditation certificate has expired.',
  suspended: 'This course accreditation is currently suspended.',
  revoked: 'This course accreditation has been revoked.',
});

function CourseCertificateVerificationPage() {
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

    verifyCourseCertificate(verificationCode)
      .then((result) => {
        if (active) setVerification(result.data.verification);
      })
      .catch((requestError) => {
        if (!active) return;

        if (requestError.response?.status === 404) {
          setNotFound(true);
        } else {
          setError(
            'The course-verification service could not complete the request.',
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [verificationCode]);

  function submit(event) {
    event.preventDefault();
    const value = identifier.trim();
    if (!value) return;

    navigate(`/verify/course/${encodeURIComponent(value)}`);
  }

  return (
    <>
      <Seo
        title="Verify an iRAP Course Certificate"
        description="Verify an iRAP course accreditation certificate or accreditation number."
        path={
          verificationCode
            ? `/verify/course/${verificationCode}`
            : '/verify-course-certificate'
        }
        noIndex
      />

      <PageHero
        breadcrumbItems={[
          { label: 'Home', to: '/' },
          { label: 'Course certificate verification' },
        ]}
        eyebrow="Public course verification"
        title="Verify a course accreditation"
        description="Enter the course certificate number, accreditation number, or verification code exactly as displayed."
        aside={
          <form className={styles.searchForm} onSubmit={submit}>
            <FormField label="Course certificate identifier">
              <Input
                autoComplete="off"
                minLength="3"
                maxLength="160"
                required
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
              />
            </FormField>
            <Button type="submit" fullWidth>
              Verify course
            </Button>
          </form>
        }
      />

      <section className="section">
        <div className={`container ${styles.container}`} aria-live="polite">
          {loading ? (
            <div className={styles.loading}>
              <Loader label="Verifying course certificate" size="large" />
            </div>
          ) : error ? (
            <Alert tone="error">{error}</Alert>
          ) : notFound ? (
            <Card className={styles.resultCard}>
              <div className={styles.resultHeading}>
                <div>
                  <p className={styles.eyebrow}>Verification result</p>
                  <h2>Course record not found</h2>
                </div>
                <StatusBadge tone="error">Not found</StatusBadge>
              </div>
              <p>
                No public course accreditation certificate matches this
                identifier.
              </p>
            </Card>
          ) : verification ? (
            <Card className={styles.resultCard}>
              <div className={styles.resultHeading}>
                <div>
                  <p className={styles.eyebrow}>Verification result</p>
                  <h2>{verification.courseTitle}</h2>
                </div>
                <StatusBadge
                  tone={
                    {
                      valid: 'success',
                      expired: 'warning',
                      suspended: 'error',
                      revoked: 'error',
                    }[verification.status] || 'neutral'
                  }
                >
                  {
                    {
                      valid: 'Valid',
                      expired: 'Expired',
                      suspended: 'Suspended',
                      revoked: 'Revoked',
                    }[verification.status]
                  }
                </StatusBadge>
              </div>

              <Alert
                tone={
                  verification.status === 'valid'
                    ? 'success'
                    : 'warning'
                }
              >
                {statusCopy[verification.status]}
              </Alert>

              <dl className={styles.details}>
                <div>
                  <dt>Accredited provider</dt>
                  <dd>{verification.providerName}</dd>
                </div>
                <div>
                  <dt>Provider registration</dt>
                  <dd>{verification.providerRegistrationNumber}</dd>
                </div>
                <div>
                  <dt>Accreditation number</dt>
                  <dd>{verification.accreditationNumber}</dd>
                </div>
                <div>
                  <dt>Certificate number</dt>
                  <dd>{verification.certificateNumber}</dd>
                </div>
                <div>
                  <dt>Credit hours</dt>
                  <dd>
                    {verification.creditHours} {verification.creditUnit}
                  </dd>
                </div>
                <div>
                  <dt>Category</dt>
                  <dd>{verification.category}</dd>
                </div>
                <div>
                  <dt>Issue date</dt>
                  <dd>{formatCourseDate(verification.issueDate)}</dd>
                </div>
                <div>
                  <dt>Expiry date</dt>
                  <dd>{formatCourseDate(verification.expiryDate)}</dd>
                </div>
              </dl>

              <p className={styles.privacyNote}>
                Public verification displays only the minimum registry
                information needed to validate the course accreditation.
              </p>
            </Card>
          ) : (
            <Card className={styles.resultCard}>
              <h2>Ready to verify</h2>
              <p>Use the verification field above to check a course record.</p>
            </Card>
          )}
        </div>
      </section>
    </>
  );
}

export default CourseCertificateVerificationPage;
