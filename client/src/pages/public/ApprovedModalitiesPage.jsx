import { useMemo, useState } from 'react';
import EmptyState from '../../components/common/EmptyState/EmptyState.jsx';
import FormField from '../../components/common/FormField/FormField.jsx';
import Input from '../../components/common/Input/Input.jsx';
import PageHero from '../../components/public/PageHero/PageHero.jsx';
import SectionHeading from '../../components/public/SectionHeading/SectionHeading.jsx';
import Seo from '../../components/seo/Seo.jsx';
import styles from './ApprovedModalitiesPage.module.css';

const modalities = Object.freeze([]);
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function ApprovedModalitiesPage() {
  const [query, setQuery] = useState('');
  const filteredModalities = useMemo(
    () => modalities.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  return (
    <>
      <Seo
        title="Approved Modalities"
        description="Search the administrator-managed iRAP approved modalities register. The production list contains only real active records."
        path="/approved-modalities"
      />
      <PageHero
        breadcrumbItems={[{ label: 'Home', to: '/' }, { label: 'Approved modalities' }]}
        eyebrow="Approved modalities"
        title="An administrator-managed eligibility register"
        description="The modalities collection starts empty. Authorized administrators will add, review, activate, deactivate, and maintain the real approved list without copying another organization’s content."
      />

      <section className="section">
        <div className="container stack stack--large">
          <div className={styles.controls}>
            <SectionHeading
              eyebrow="Search"
              title="Find an approved modality"
              description="Search becomes meaningful after authorized administrators publish active modality records."
            />
            <FormField label="Modality name">
              <Input
                value={query}
                placeholder="Search modalities"
                onChange={(event) => setQuery(event.target.value)}
              />
            </FormField>
          </div>

          <nav className={styles.alphabet} aria-label="Modality alphabet navigation">
            {alphabet.map((letter) => (
              <span key={letter} aria-disabled="true">{letter}</span>
            ))}
          </nav>

          {filteredModalities.length ? (
            <div className={styles.list}>
              {filteredModalities.map((modality) => (
                <article key={modality.slug}>
                  <h2>{modality.name}</h2>
                  <p>{modality.description}</p>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title={query ? 'No approved modalities match this search' : 'No approved modalities are currently available'}
              description={query
                ? 'Try another term after the approved modality register has been populated.'
                : 'The administrator will add the real approved modalities. No copied or invented list is displayed.'}
            />
          )}
        </div>
      </section>
    </>
  );
}

export default ApprovedModalitiesPage;
