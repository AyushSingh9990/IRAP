import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import EmptyState from '../../components/common/EmptyState/EmptyState.jsx';
import PageHero from '../../components/public/PageHero/PageHero.jsx';
import RegistrySearch from '../../components/public/RegistrySearch/RegistrySearch.jsx';
import Seo from '../../components/seo/Seo.jsx';
import styles from './DirectoryLandingPage.module.css';

const roleLabels = {
  member: 'Professional members',
  training_provider: 'Training providers',
  organization: 'Organizations',
  course: 'Accredited courses',
};

function DirectoryLandingPage({ initialRole = '' }) {
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') || initialRole;
  const country = searchParams.get('country') || '';
  const city = searchParams.get('city') || '';
  const keyword = searchParams.get('keyword') || '';

  const activeFilters = useMemo(
    () => [
      role ? roleLabels[role] || role : '',
      country,
      city,
      keyword,
    ].filter(Boolean),
    [city, country, keyword, role],
  );

  return (
    <>
      <Seo
        title="Public Directory"
        description="Search the iRAP public registry shell. Only approved, active, consented records will be eligible for publication."
        path="/directory"
      />
      <PageHero
        breadcrumbItems={[{ label: 'Home', to: '/' }, { label: 'Directory' }]}
        eyebrow="Public directory"
        title="Search approved public records"
        description="The search interface is available now. Server-side records, advanced filters, sorting, pagination, public profiles, and geospatial search are not yet enabled in this environment."
        aside={
          <RegistrySearch
            key={`${role}-${country}-${city}-${keyword}`}
            initialRole={role}
            initialCountry={country}
            initialCity={city}
            initialKeyword={keyword}
          />
        }
      />

      <section className="section">
        <div className="container stack stack--large">
          {activeFilters.length ? (
            <div className={styles.filters} aria-label="Selected filters">
              <span>Selected filters:</span>
              {activeFilters.map((filter) => <strong key={filter}>{filter}</strong>)}
            </div>
          ) : null}
          <EmptyState
            title="No approved profiles are currently available"
            description="The production directory starts empty. Only approved, active, non-suspended, non-expired records with public-directory consent will appear here."
          />
        </div>
      </section>
    </>
  );
}

export default DirectoryLandingPage;
