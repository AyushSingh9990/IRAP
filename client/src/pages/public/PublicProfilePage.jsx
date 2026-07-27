import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getDirectoryProfile } from '../../api/directoryApi.js';
import Alert from '../../components/common/Alert/Alert.jsx';
import Card from '../../components/common/Card/Card.jsx';
import Loader from '../../components/common/Loader/Loader.jsx';
import StatusBadge from '../../components/common/StatusBadge/StatusBadge.jsx';
import Seo from '../../components/seo/Seo.jsx';
import {
  directoryDefinitions,
  formatDirectoryDate,
} from '../../config/directoryConfig.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './PublicProfilePage.module.css';

function PublicProfilePage() {
  const { directoryType, slug } = useParams();
  const definition = directoryDefinitions[directoryType];
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');

      try {
        const result = await getDirectoryProfile(directoryType, slug);
        if (active) setProfile(result.data.profile);
      } catch (requestError) {
        if (active) setError(getApiErrorMessage(requestError));
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [directoryType, slug]);

  if (!definition) return null;

  if (loading) {
    return (
      <section className="section">
        <div className={`container ${styles.loading}`}>
          <Loader label="Loading public profile" size="large" />
        </div>
      </section>
    );
  }

  if (error || !profile) {
    return (
      <section className="section">
        <div className="container">
          <Alert tone="error">{error || 'Public profile not found.'}</Alert>
        </div>
      </section>
    );
  }

  const image = profile.photoUrl || profile.logoUrl;
  const socialLinks = Object.entries(
    profile.contact?.socialLinks || {},
  ).filter(([, value]) => value);

  return (
    <>
      <Seo
        title={profile.seoTitle || profile.displayName}
        description={
          profile.seoDescription ||
          profile.headline ||
          `${profile.displayName} — verified iRAP public profile.`
        }
        path={`/directory/${directoryType}/${profile.slug}`}
        structuredData={{
          '@context': 'https://schema.org',
          '@type':
            profile.profileType === 'member'
              ? 'Person'
              : profile.profileType === 'course'
                ? 'Course'
                : 'Organization',
          name: profile.displayName,
          description: profile.biography || profile.headline || undefined,
          url: `/directory/${directoryType}/${profile.slug}`,
        }}
      />

      <section className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          {image ? (
            <img className={styles.avatar} alt="" src={image} />
          ) : (
            <div className={styles.avatarFallback} aria-hidden="true">
              {profile.displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <div className={styles.badges}>
              <StatusBadge tone="success">Verified</StatusBadge>
              <StatusBadge tone="info">{definition.singular}</StatusBadge>
            </div>
            <h1>{profile.displayName}</h1>
            {profile.headline ? <p>{profile.headline}</p> : null}
          </div>
        </div>
      </section>

      <section className="section">
        <div className={`container ${styles.layout}`}>
          <main className={styles.main}>
            {profile.biography ? (
              <Card>
                <h2>About</h2>
                <p className={styles.prose}>{profile.biography}</p>
              </Card>
            ) : null}

            {profile.mission ? (
              <Card>
                <h2>Mission</h2>
                <p className={styles.prose}>{profile.mission}</p>
              </Card>
            ) : null}

            <Card>
              <div className={styles.listGrid}>
                {[
                  ['Modalities', profile.modalities],
                  ['Services', profile.services],
                  ['Qualifications', profile.qualifications],
                  ['Languages', profile.languages],
                ].map(([title, items]) =>
                  items?.length ? (
                    <section key={title}>
                      <h2>{title}</h2>
                      <ul>
                        {items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </section>
                  ) : null,
                )}
              </div>
            </Card>

            {profile.locations?.length ? (
              <Card>
                <h2>Service locations</h2>
                <div className={styles.locations}>
                  {profile.locations.map((location, index) => (
                    <article key={`${location.label}-${index}`}>
                      <strong>
                        {location.label ||
                          [location.city, location.state, location.countryCode]
                            .filter(Boolean)
                            .join(', ')}
                      </strong>
                      {location.address ? <p>{location.address}</p> : null}
                      <small>
                        {[location.city, location.state, location.countryCode]
                          .filter(Boolean)
                          .join(', ')}
                      </small>
                    </article>
                  ))}
                </div>
              </Card>
            ) : null}

            {profile.galleryUrls?.length ? (
              <Card>
                <h2>Gallery</h2>
                <div className={styles.gallery}>
                  {profile.galleryUrls.map((url) => (
                    <img alt="" key={url} loading="lazy" src={url} />
                  ))}
                </div>
              </Card>
            ) : null}

            {profile.videoUrls?.length ? (
              <Card>
                <h2>Videos</h2>
                <div className={styles.videoLinks}>
                  {profile.videoUrls.map((url, index) => (
                    <a
                      href={url}
                      key={url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Open video {index + 1}
                    </a>
                  ))}
                </div>
              </Card>
            ) : null}
          </main>

          <aside className={styles.sidebar}>
            <Card className={styles.registryCard}>
              <h2>Registry details</h2>
              <dl>
                <div>
                  <dt>Registration number</dt>
                  <dd>{profile.registrationNumber}</dd>
                </div>
                <div>
                  <dt>Valid from</dt>
                  <dd>{formatDirectoryDate(profile.validFrom)}</dd>
                </div>
                <div>
                  <dt>Valid until</dt>
                  <dd>{formatDirectoryDate(profile.validUntil)}</dd>
                </div>
                <div>
                  <dt>Online availability</dt>
                  <dd>{profile.onlineAvailable ? 'Available' : 'Not listed'}</dd>
                </div>
                {profile.profileType === 'course' ? (
                  <>
                    <div>
                      <dt>Accredited provider</dt>
                      <dd>{profile.course?.providerName || 'Not available'}</dd>
                    </div>
                    <div>
                      <dt>Credit hours</dt>
                      <dd>
                        {profile.course?.cpdHours || '—'}{' '}
                        {profile.course?.creditUnit || ''}
                      </dd>
                    </div>
                    <div>
                      <dt>Total learning hours</dt>
                      <dd>{profile.course?.totalLearningHours || '—'}</dd>
                    </div>
                  </>
                ) : null}
              </dl>
              <Link
                to={
                  profile.profileType === 'course'
                    ? '/verify-course-certificate'
                    : '/verify-certificate'
                }
              >
                Verify certificate
              </Link>
            </Card>

            {(profile.contact?.email ||
              profile.contact?.telephone ||
              profile.contact?.website) ? (
              <Card className={styles.contactCard}>
                <h2>Public contact</h2>
                {profile.contact.email ? (
                  <a href={`mailto:${profile.contact.email}`}>
                    {profile.contact.email}
                  </a>
                ) : null}
                {profile.contact.telephone ? (
                  <a href={`tel:${profile.contact.telephone}`}>
                    {profile.contact.telephone}
                  </a>
                ) : null}
                {profile.contact.website ? (
                  <a
                    href={profile.contact.website}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Visit website
                  </a>
                ) : null}
                {socialLinks.map(([network, url]) => (
                  <a
                    href={url}
                    key={network}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {network.charAt(0).toUpperCase()}{network.slice(1)}
                  </a>
                ))}
              </Card>
            ) : null}

            {profile.businessHours ? (
              <Card>
                <h2>Business hours</h2>
                <p className={styles.prose}>{profile.businessHours}</p>
              </Card>
            ) : null}

            {profile.pricingText ? (
              <Card>
                <h2>Pricing information</h2>
                <p className={styles.prose}>{profile.pricingText}</p>
              </Card>
            ) : null}
          </aside>
        </div>
      </section>
    </>
  );
}

export default PublicProfilePage;
