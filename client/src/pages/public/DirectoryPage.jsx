import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { listDirectoryProfiles } from '../../api/directoryApi.js';
import Alert from '../../components/common/Alert/Alert.jsx';
import Button from '../../components/common/Button/Button.jsx';
import Card from '../../components/common/Card/Card.jsx';
import EmptyState from '../../components/common/EmptyState/EmptyState.jsx';
import FormField from '../../components/common/FormField/FormField.jsx';
import Input from '../../components/common/Input/Input.jsx';
import Loader from '../../components/common/Loader/Loader.jsx';
import Select from '../../components/common/Select/Select.jsx';
import StatusBadge from '../../components/common/StatusBadge/StatusBadge.jsx';
import Seo from '../../components/seo/Seo.jsx';
import {
  directoryDefinitions,
  directorySortOptions,
  formatDirectoryDate,
} from '../../config/directoryConfig.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import styles from './DirectoryPage.module.css';

const defaults = {
  search: '',
  modality: '',
  category: '',
  minimumPriceMinor: '',
  maximumPriceMinor: '',
  country: '',
  state: '',
  city: '',
  deliveryMethod: '',
  online: '',
  sort: 'name_asc',
  latitude: '',
  longitude: '',
  radiusKm: '',
  page: '1',
};

function readFilters(searchParams) {
  return Object.fromEntries(
    Object.keys(defaults).map((key) => [
      key,
      searchParams.get(key) ?? defaults[key],
    ]),
  );
}

function DirectoryPage({ directoryType }) {
  const definition = directoryDefinitions[directoryType];
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => readFilters(searchParams));
  const activeFilters = useMemo(
    () => readFilters(searchParams),
    [searchParams],
  );
  const [profiles, setProfiles] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');

  const query = useMemo(
    () => ({
      ...activeFilters,
      page: Number(activeFilters.page) || 1,
      limit: 12,
      online:
        activeFilters.online === ''
          ? undefined
          : activeFilters.online === 'true',
    }),
    [activeFilters],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await listDirectoryProfiles(directoryType, query);
      setProfiles(result.data.profiles || []);
      setMeta(result.meta || { page: 1, pages: 1, total: 0 });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, [directoryType, query]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setFilters(activeFilters);
  }, [activeFilters, directoryType]);

  function update(name, value) {
    setFilters((current) => ({
      ...current,
      [name]: value,
      page: '1',
    }));
  }

  function goToPage(page) {
    const next = new URLSearchParams(searchParams);

    if (page <= 1) {
      next.delete('page');
    } else {
      next.set('page', String(page));
    }

    setSearchParams(next);
  }

  function apply(event) {
    event.preventDefault();
    const next = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== defaults[key]) next.set(key, value);
    });

    setSearchParams(next);
  }

  function clear() {
    setFilters({ ...defaults });
    setSearchParams({});
  }

  function useLocation() {
    if (!navigator.geolocation) {
      setError('This browser does not provide geolocation.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          ...filters,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
          radiusKm: filters.radiusKm || '25',
          sort: 'distance',
          page: '1',
        };
        setFilters(next);
        const params = new URLSearchParams();
        Object.entries(next).forEach(([key, value]) => {
          if (value && value !== defaults[key]) params.set(key, value);
        });
        setSearchParams(params);
        setLocating(false);
      },
      () => {
        setError('Location access was not granted.');
        setLocating(false);
      },
      { timeout: 10000, maximumAge: 300000 },
    );
  }

  if (!definition) return null;

  return (
    <>
      <Seo
        title={definition.plural}
        description={definition.description}
        path={`/directory/${directoryType}`}
      />

      <section className={styles.hero}>
        <div className="container">
          <p className={styles.eyebrow}>{definition.eyebrow}</p>
          <h1>{definition.plural}</h1>
          <p>{definition.description}</p>
        </div>
      </section>

      <section className="section">
        <div className={`container ${styles.layout}`}>
          <Card className={styles.filtersCard}>
            <form className={styles.filters} onSubmit={apply}>
              <div className={styles.heading}>
                <h2>Search and filters</h2>
                <Button type="button" variant="ghost" onClick={clear}>
                  Clear
                </Button>
              </div>

              <FormField label="Keyword or registration number">
                <Input
                  value={filters.search}
                  onChange={(event) => update('search', event.target.value)}
                />
              </FormField>

              <div className={styles.filterGrid}>
                <FormField label="Modality">
                  <Input
                    value={filters.modality}
                    onChange={(event) => update('modality', event.target.value)}
                  />
                </FormField>
                {directoryType === 'courses' ? (
                  <>
                    <FormField label="Course category">
                      <Input
                        value={filters.category}
                        onChange={(event) =>
                          update('category', event.target.value)
                        }
                      />
                    </FormField>
                    <FormField label="Minimum price in minor units">
                      <Input
                        type="number"
                        min="0"
                        value={filters.minimumPriceMinor}
                        onChange={(event) =>
                          update('minimumPriceMinor', event.target.value)
                        }
                      />
                    </FormField>
                    <FormField label="Maximum price in minor units">
                      <Input
                        type="number"
                        min="0"
                        value={filters.maximumPriceMinor}
                        onChange={(event) =>
                          update('maximumPriceMinor', event.target.value)
                        }
                      />
                    </FormField>
                  </>
                ) : null}
                <FormField label="Country code">
                  <Input
                    maxLength="2"
                    placeholder="IN"
                    value={filters.country}
                    onChange={(event) =>
                      update('country', event.target.value.toUpperCase())
                    }
                  />
                </FormField>
                <FormField label="State or region">
                  <Input
                    value={filters.state}
                    onChange={(event) => update('state', event.target.value)}
                  />
                </FormField>
                <FormField label="City">
                  <Input
                    value={filters.city}
                    onChange={(event) => update('city', event.target.value)}
                  />
                </FormField>
                <FormField label="Delivery method">
                  <Select
                    value={filters.deliveryMethod}
                    onChange={(event) =>
                      update('deliveryMethod', event.target.value)
                    }
                  >
                    <option value="">Any method</option>
                    <option value="online">Online</option>
                    <option value="in_person">In person</option>
                    <option value="hybrid">Hybrid</option>
                  </Select>
                </FormField>
                <FormField label="Online availability">
                  <Select
                    value={filters.online}
                    onChange={(event) => update('online', event.target.value)}
                  >
                    <option value="">Any</option>
                    <option value="true">Available online</option>
                    <option value="false">Not listed as online</option>
                  </Select>
                </FormField>
                <FormField label="Sort">
                  <Select
                    value={filters.sort}
                    onChange={(event) => update('sort', event.target.value)}
                  >
                    {directorySortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </div>

              <details className={styles.distance}>
                <summary>Distance filter</summary>
                <div className={styles.filterGrid}>
                  <FormField label="Latitude">
                    <Input
                      value={filters.latitude}
                      onChange={(event) => update('latitude', event.target.value)}
                    />
                  </FormField>
                  <FormField label="Longitude">
                    <Input
                      value={filters.longitude}
                      onChange={(event) => update('longitude', event.target.value)}
                    />
                  </FormField>
                  <FormField label="Radius in km">
                    <Input
                      type="number"
                      min="1"
                      max="500"
                      value={filters.radiusKm}
                      onChange={(event) => update('radiusKm', event.target.value)}
                    />
                  </FormField>
                  <Button
                    type="button"
                    variant="secondary"
                    isLoading={locating}
                    onClick={useLocation}
                  >
                    Use my location
                  </Button>
                </div>
              </details>

              <Button type="submit">Apply filters</Button>
            </form>
          </Card>

          <div className={styles.results}>
            <div className={styles.heading}>
              <div>
                <p className={styles.eyebrow}>Verified public records</p>
                <h2>{meta.total} result{meta.total === 1 ? '' : 's'}</h2>
              </div>
              {meta.geospatial ? (
                <StatusBadge tone="info">Distance filtered</StatusBadge>
              ) : null}
            </div>

            {error ? <Alert tone="error">{error}</Alert> : null}

            {loading ? (
              <div className={styles.loading}>
                <Loader label="Loading directory" size="large" />
              </div>
            ) : profiles.length === 0 ? (
              <EmptyState
                title={`No ${definition.plural.toLowerCase()} match these filters`}
                description="Change the filters or return when eligible records are published."
              />
            ) : (
              <div className={styles.cards}>
                {profiles.map((profile) => (
                  <Card className={styles.profileCard} key={profile.id}>
                    <div className={styles.identity}>
                      <span aria-hidden="true">
                        {profile.displayName.slice(0, 1).toUpperCase()}
                      </span>
                      <div>
                        <StatusBadge tone="success">Verified</StatusBadge>
                        <h3>{profile.displayName}</h3>
                        {profile.headline ? <p>{profile.headline}</p> : null}
                      </div>
                    </div>
                    {profile.biography ? <p>{profile.biography}</p> : null}
                    <dl>
                      <div>
                        <dt>Registration</dt>
                        <dd>{profile.registrationNumber}</dd>
                      </div>
                      <div>
                        <dt>Valid until</dt>
                        <dd>{formatDirectoryDate(profile.validUntil)}</dd>
                      </div>
                      {profile.distanceKm !== null ? (
                        <div>
                          <dt>Distance</dt>
                          <dd>{profile.distanceKm} km</dd>
                        </div>
                      ) : null}
                    </dl>
                    <Link
                      className={styles.profileLink}
                      to={`/directory/${directoryType}/${profile.slug}`}
                    >
                      View public profile
                    </Link>
                  </Card>
                ))}
              </div>
            )}

            {meta.pages > 1 ? (
              <nav className={styles.pagination} aria-label="Directory pages">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={meta.page <= 1}
                  onClick={() => goToPage(meta.page - 1)}
                >
                  Previous
                </Button>
                <span>Page {meta.page} of {meta.pages}</span>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={meta.page >= meta.pages}
                  onClick={() => goToPage(meta.page + 1)}
                >
                  Next
                </Button>
              </nav>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}

export default DirectoryPage;
