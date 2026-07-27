import { useEffect, useMemo, useState } from 'react';
import {
  listMyDirectoryProfiles,
  saveMyDirectoryProfile,
} from '../../api/directoryApi.js';
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
import { joinList, splitList } from '../../config/directoryConfig.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './PublicProfileSettingsPage.module.css';

const socialNetworks = Object.freeze([
  'linkedin',
  'facebook',
  'instagram',
  'youtube',
  'x',
]);

const deliveryOptions = Object.freeze([
  { value: 'online', label: 'Online' },
  { value: 'in_person', label: 'In person' },
  { value: 'hybrid', label: 'Hybrid' },
]);

function emptySocialLinks() {
  return {
    linkedin: '',
    facebook: '',
    instagram: '',
    youtube: '',
    x: '',
  };
}

function emptyLocation() {
  return {
    label: '',
    countryCode: '',
    state: '',
    city: '',
    address: '',
    latitude: '',
    longitude: '',
  };
}

function emptyForm() {
  return {
    slug: '',
    headline: '',
    biography: '',
    modalitiesText: '',
    qualificationsText: '',
    servicesText: '',
    languagesText: '',
    deliveryMethods: [],
    onlineAvailable: false,
    locations: [],
    contact: {
      email: '',
      telephone: '',
      website: '',
      showEmail: false,
      showTelephone: false,
      socialLinks: emptySocialLinks(),
    },
    businessHours: '',
    pricingText: '',
    photoUrl: '',
    logoUrl: '',
    galleryUrlsText: '',
    videoUrlsText: '',
    mission: '',
    trainerInformation: '',
    seoTitle: '',
    seoDescription: '',
    directoryVisible: false,
    published: false,
  };
}

function normalizeLocationForForm(location = {}) {
  return {
    _id: location._id || '',
    label: location.label || '',
    countryCode: location.countryCode || '',
    state: location.state || '',
    city: location.city || '',
    address: location.address || '',
    latitude:
      location.latitude === null || location.latitude === undefined
        ? ''
        : String(location.latitude),
    longitude:
      location.longitude === null || location.longitude === undefined
        ? ''
        : String(location.longitude),
  };
}

function profileToForm(profile) {
  return {
    slug: profile.slug || '',
    headline: profile.headline || '',
    biography: profile.biography || '',
    modalitiesText: joinList(profile.modalities),
    qualificationsText: joinList(profile.qualifications),
    servicesText: joinList(profile.services),
    languagesText: joinList(profile.languages),
    deliveryMethods: profile.deliveryMethods || [],
    onlineAvailable: Boolean(profile.onlineAvailable),
    locations: (profile.locations || []).map(normalizeLocationForForm),
    contact: {
      email: profile.contact?.email || '',
      telephone: profile.contact?.telephone || '',
      website: profile.contact?.website || '',
      showEmail: Boolean(profile.contact?.showEmail),
      showTelephone: Boolean(profile.contact?.showTelephone),
      socialLinks: {
        ...emptySocialLinks(),
        ...(profile.contact?.socialLinks || {}),
      },
    },
    businessHours: profile.businessHours || '',
    pricingText: profile.pricingText || '',
    photoUrl: profile.photoUrl || '',
    logoUrl: profile.logoUrl || '',
    galleryUrlsText: joinList(profile.galleryUrls),
    videoUrlsText: joinList(profile.videoUrls),
    mission: profile.mission || '',
    trainerInformation: profile.trainerInformation || '',
    seoTitle: profile.seoTitle || '',
    seoDescription: profile.seoDescription || '',
    directoryVisible: Boolean(profile.directoryVisible),
    published: Boolean(profile.published),
  };
}

function nullableNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  return Number(value);
}

function formToPayload(form) {
  return {
    slug: form.slug.trim() || undefined,
    headline: form.headline.trim(),
    biography: form.biography.trim(),
    modalities: splitList(form.modalitiesText),
    qualifications: splitList(form.qualificationsText),
    services: splitList(form.servicesText),
    languages: splitList(form.languagesText),
    deliveryMethods: form.deliveryMethods,
    onlineAvailable: form.onlineAvailable,
    locations: form.locations.map((location) => ({
      label: location.label.trim(),
      countryCode: location.countryCode.trim().toUpperCase(),
      state: location.state.trim(),
      city: location.city.trim(),
      address: location.address.trim(),
      latitude: nullableNumber(location.latitude),
      longitude: nullableNumber(location.longitude),
    })),
    contact: {
      email: form.contact.email.trim(),
      telephone: form.contact.telephone.trim(),
      website: form.contact.website.trim(),
      showEmail: form.contact.showEmail,
      showTelephone: form.contact.showTelephone,
      socialLinks: Object.fromEntries(
        Object.entries(form.contact.socialLinks).map(([key, value]) => [
          key,
          value.trim(),
        ]),
      ),
    },
    businessHours: form.businessHours.trim(),
    pricingText: form.pricingText.trim(),
    photoUrl: form.photoUrl.trim(),
    logoUrl: form.logoUrl.trim(),
    galleryUrls: splitList(form.galleryUrlsText),
    videoUrls: splitList(form.videoUrlsText),
    mission: form.mission.trim(),
    trainerInformation: form.trainerInformation.trim(),
    seoTitle: form.seoTitle.trim(),
    seoDescription: form.seoDescription.trim(),
    directoryVisible: form.directoryVisible,
    published: form.published,
  };
}

function PublicProfileSettingsPage() {
  const [profiles, setProfiles] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selected = useMemo(
    () => profiles.find((profile) => profile.membershipId === selectedId) || null,
    [profiles, selectedId],
  );

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');

      try {
        const result = await listMyDirectoryProfiles();
        const nextProfiles = result.data.profiles || [];

        if (!active) return;

        setProfiles(nextProfiles);
        const first = nextProfiles[0] || null;
        setSelectedId(first?.membershipId || '');
        setForm(first ? profileToForm(first) : emptyForm());
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
  }, []);

  function selectProfile(membershipId) {
    const profile =
      profiles.find((item) => item.membershipId === membershipId) || null;

    setSelectedId(membershipId);
    setForm(profile ? profileToForm(profile) : emptyForm());
    setMessage('');
    setError('');
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateContact(field, value) {
    setForm((current) => ({
      ...current,
      contact: {
        ...current.contact,
        [field]: value,
      },
    }));
  }

  function updateSocial(network, value) {
    setForm((current) => ({
      ...current,
      contact: {
        ...current.contact,
        socialLinks: {
          ...current.contact.socialLinks,
          [network]: value,
        },
      },
    }));
  }

  function toggleDeliveryMethod(method) {
    setForm((current) => ({
      ...current,
      deliveryMethods: current.deliveryMethods.includes(method)
        ? current.deliveryMethods.filter((item) => item !== method)
        : [...current.deliveryMethods, method],
    }));
  }

  function addLocation() {
    setForm((current) => ({
      ...current,
      locations: [...current.locations, emptyLocation()],
    }));
  }

  function updateLocation(index, field, value) {
    setForm((current) => ({
      ...current,
      locations: current.locations.map((location, locationIndex) =>
        locationIndex === index
          ? { ...location, [field]: value }
          : location,
      ),
    }));
  }

  function removeLocation(index) {
    setForm((current) => ({
      ...current,
      locations: current.locations.filter(
        (_location, locationIndex) => locationIndex !== index,
      ),
    }));
  }

  async function save(event) {
    event.preventDefault();
    if (!selectedId) return;

    setSaving(true);
    setMessage('');
    setError('');

    try {
      const result = await saveMyDirectoryProfile(
        selectedId,
        formToPayload(form),
      );
      const saved = result.data.profile;

      setProfiles((current) =>
        current.map((profile) =>
          profile.membershipId === selectedId ? saved : profile,
        ),
      );
      setForm(profileToForm(saved));
      setMessage(result.message);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Seo
        title="Public Profile Settings"
        description="Manage consent-controlled public directory information."
        noIndex
      />

      <section className="section">
        <div className={`container ${styles.container}`}>
          <header className={styles.header}>
            <div>
              <p className={styles.eyebrow}>Directory visibility</p>
              <h1>Public profile settings</h1>
              <p>
                Choose the information that may be displayed publicly. Private
                applications, documents, payments, review notes and audit data
                are never published here.
              </p>
            </div>
            {selected?.publicUrl ? (
              <Button to={selected.publicUrl} variant="secondary">
                View public profile
              </Button>
            ) : null}
          </header>

          {message ? <Alert tone="success">{message}</Alert> : null}
          {error ? <Alert tone="error">{error}</Alert> : null}

          {loading ? (
            <div className={styles.loading}>
              <Loader label="Loading public profile settings" size="large" />
            </div>
          ) : profiles.length === 0 ? (
            <EmptyState
              title="No issued membership or accreditation is available"
              description="A public profile becomes available after an approved record has been issued."
            />
          ) : (
            <>
              <Card>
                <FormField label="Membership or accreditation">
                  <Select
                    value={selectedId}
                    onChange={(event) => selectProfile(event.target.value)}
                  >
                    {profiles.map((profile) => (
                      <option
                        key={profile.membershipId}
                        value={profile.membershipId}
                      >
                        {profile.displayName} · {profile.registrationNumber}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </Card>

              <form className={styles.form} onSubmit={save}>
                <Card className={styles.section}>
                  <h2>Public identity</h2>

                  <div className={styles.grid}>
                    <FormField label="Approved public name">
                      <Input disabled value={selected?.displayName || ''} />
                    </FormField>

                    <FormField
                      label="SEO-friendly slug"
                      hint="Use lowercase letters, numbers and hyphens. Leave blank to generate automatically."
                    >
                      <Input
                        pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                        value={form.slug}
                        onChange={(event) =>
                          updateField('slug', event.target.value.toLowerCase())
                        }
                      />
                    </FormField>

                    <FormField label="Headline">
                      <Input
                        maxLength="240"
                        value={form.headline}
                        onChange={(event) =>
                          updateField('headline', event.target.value)
                        }
                      />
                    </FormField>

                    <FormField label="Photo URL">
                      <Input
                        type="url"
                        value={form.photoUrl}
                        onChange={(event) =>
                          updateField('photoUrl', event.target.value)
                        }
                      />
                    </FormField>

                    <FormField label="Logo URL">
                      <Input
                        type="url"
                        value={form.logoUrl}
                        onChange={(event) =>
                          updateField('logoUrl', event.target.value)
                        }
                      />
                    </FormField>
                  </div>

                  <FormField label="Biography or description">
                    <Textarea
                      rows="8"
                      maxLength="5000"
                      value={form.biography}
                      onChange={(event) =>
                        updateField('biography', event.target.value)
                      }
                    />
                  </FormField>
                </Card>

                <Card className={styles.section}>
                  <h2>Professional information</h2>

                  <div className={styles.grid}>
                    {[
                      ['modalitiesText', 'Modalities'],
                      ['qualificationsText', 'Qualifications'],
                      ['servicesText', 'Services'],
                      ['languagesText', 'Languages'],
                    ].map(([field, label]) => (
                      <FormField
                        key={field}
                        label={label}
                        hint="Enter one item per line."
                      >
                        <Textarea
                          rows="6"
                          value={form[field]}
                          onChange={(event) =>
                            updateField(field, event.target.value)
                          }
                        />
                      </FormField>
                    ))}
                  </div>

                  <fieldset className={styles.fieldset}>
                    <legend>Delivery and availability</legend>
                    <div className={styles.checks}>
                      {deliveryOptions.map((option) => (
                        <label key={option.value}>
                          <input
                            type="checkbox"
                            checked={form.deliveryMethods.includes(option.value)}
                            onChange={() =>
                              toggleDeliveryMethod(option.value)
                            }
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                      <label>
                        <input
                          type="checkbox"
                          checked={form.onlineAvailable}
                          onChange={(event) =>
                            updateField(
                              'onlineAvailable',
                              event.target.checked,
                            )
                          }
                        />
                        <span>Accepting online enquiries</span>
                      </label>
                    </div>
                  </fieldset>

                  <FormField label="Mission">
                    <Textarea
                      rows="5"
                      maxLength="3000"
                      value={form.mission}
                      onChange={(event) =>
                        updateField('mission', event.target.value)
                      }
                    />
                  </FormField>

                  <FormField label="Trainer information">
                    <Textarea
                      rows="5"
                      maxLength="3000"
                      value={form.trainerInformation}
                      onChange={(event) =>
                        updateField(
                          'trainerInformation',
                          event.target.value,
                        )
                      }
                    />
                  </FormField>
                </Card>

                <Card className={styles.section}>
                  <div className={styles.sectionHeading}>
                    <div>
                      <h2>Service locations</h2>
                      <p>
                        Coordinates are optional. A complete latitude and
                        longitude pair enables distance filtering.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={addLocation}
                    >
                      Add location
                    </Button>
                  </div>

                  {form.locations.length === 0 ? (
                    <EmptyState
                      title="No public locations added"
                      description="Add a location only when it may be displayed publicly."
                    />
                  ) : (
                    <div className={styles.locations}>
                      {form.locations.map((location, index) => (
                        <fieldset
                          className={styles.location}
                          key={location._id || `location-${index}`}
                        >
                          <legend>Location {index + 1}</legend>

                          <div className={styles.grid}>
                            {[
                              ['label', 'Location label'],
                              ['countryCode', 'Country code'],
                              ['state', 'State or region'],
                              ['city', 'City'],
                              ['address', 'Public address'],
                              ['latitude', 'Latitude'],
                              ['longitude', 'Longitude'],
                            ].map(([field, label]) => (
                              <FormField key={field} label={label}>
                                <Input
                                  value={location[field] ?? ''}
                                  onChange={(event) =>
                                    updateLocation(
                                      index,
                                      field,
                                      event.target.value,
                                    )
                                  }
                                />
                              </FormField>
                            ))}
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => removeLocation(index)}
                          >
                            Remove location
                          </Button>
                        </fieldset>
                      ))}
                    </div>
                  )}
                </Card>

                <Card className={styles.section}>
                  <h2>Public contact and links</h2>

                  <div className={styles.grid}>
                    <FormField label="Email">
                      <Input
                        type="email"
                        value={form.contact.email}
                        onChange={(event) =>
                          updateContact('email', event.target.value)
                        }
                      />
                    </FormField>

                    <FormField label="Telephone">
                      <Input
                        value={form.contact.telephone}
                        onChange={(event) =>
                          updateContact('telephone', event.target.value)
                        }
                      />
                    </FormField>

                    <FormField label="Website">
                      <Input
                        type="url"
                        value={form.contact.website}
                        onChange={(event) =>
                          updateContact('website', event.target.value)
                        }
                      />
                    </FormField>

                    {socialNetworks.map((network) => (
                      <FormField
                        key={network}
                        label={`${network.charAt(0).toUpperCase()}${network.slice(1)} URL`}
                      >
                        <Input
                          type="url"
                          value={form.contact.socialLinks[network]}
                          onChange={(event) =>
                            updateSocial(network, event.target.value)
                          }
                        />
                      </FormField>
                    ))}
                  </div>

                  <div className={styles.checks}>
                    <label>
                      <input
                        type="checkbox"
                        checked={form.contact.showEmail}
                        onChange={(event) =>
                          updateContact('showEmail', event.target.checked)
                        }
                      />
                      <span>Show email publicly</span>
                    </label>

                    <label>
                      <input
                        type="checkbox"
                        checked={form.contact.showTelephone}
                        onChange={(event) =>
                          updateContact(
                            'showTelephone',
                            event.target.checked,
                          )
                        }
                      />
                      <span>Show telephone publicly</span>
                    </label>
                  </div>

                  <div className={styles.grid}>
                    <FormField label="Business hours">
                      <Textarea
                        rows="5"
                        maxLength="1500"
                        value={form.businessHours}
                        onChange={(event) =>
                          updateField('businessHours', event.target.value)
                        }
                      />
                    </FormField>

                    <FormField label="Pricing information">
                      <Textarea
                        rows="5"
                        maxLength="1000"
                        value={form.pricingText}
                        onChange={(event) =>
                          updateField('pricingText', event.target.value)
                        }
                      />
                    </FormField>

                    <FormField
                      label="Gallery image URLs"
                      hint="Enter one public image URL per line."
                    >
                      <Textarea
                        rows="5"
                        value={form.galleryUrlsText}
                        onChange={(event) =>
                          updateField(
                            'galleryUrlsText',
                            event.target.value,
                          )
                        }
                      />
                    </FormField>

                    <FormField
                      label="Video URLs"
                      hint="Enter one public video URL per line."
                    >
                      <Textarea
                        rows="5"
                        value={form.videoUrlsText}
                        onChange={(event) =>
                          updateField(
                            'videoUrlsText',
                            event.target.value,
                          )
                        }
                      />
                    </FormField>
                  </div>
                </Card>

                <Card className={styles.section}>
                  <h2>Search presentation</h2>

                  <div className={styles.grid}>
                    <FormField label="SEO title">
                      <Input
                        maxLength="180"
                        value={form.seoTitle}
                        onChange={(event) =>
                          updateField('seoTitle', event.target.value)
                        }
                      />
                    </FormField>

                    <FormField label="SEO description">
                      <Textarea
                        rows="4"
                        maxLength="320"
                        value={form.seoDescription}
                        onChange={(event) =>
                          updateField(
                            'seoDescription',
                            event.target.value,
                          )
                        }
                      />
                    </FormField>
                  </div>
                </Card>

                <Card className={styles.publish}>
                  <div>
                    <h2>Visibility and publishing</h2>
                    <p>
                      Publishing requires an active membership or accreditation
                      and explicit directory visibility.
                    </p>
                  </div>

                  <div className={styles.checks}>
                    <label>
                      <input
                        type="checkbox"
                        checked={form.directoryVisible}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            directoryVisible: event.target.checked,
                            published: event.target.checked
                              ? current.published
                              : false,
                          }))
                        }
                      />
                      <span>Enable public-directory visibility</span>
                    </label>

                    <label>
                      <input
                        type="checkbox"
                        disabled={!form.directoryVisible}
                        checked={form.published}
                        onChange={(event) =>
                          updateField('published', event.target.checked)
                        }
                      />
                      <span>Publish this profile</span>
                    </label>
                  </div>

                  <Button type="submit" isLoading={saving}>
                    Save public profile
                  </Button>
                </Card>
              </form>
            </>
          )}
        </div>
      </section>
    </>
  );
}

export default PublicProfileSettingsPage;
