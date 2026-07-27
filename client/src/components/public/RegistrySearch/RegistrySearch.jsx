import { useMemo, useState } from 'react';
import { City, Country } from 'country-state-city';
import { useNavigate } from 'react-router-dom';
import Button from '../../common/Button/Button.jsx';
import FormField from '../../common/FormField/FormField.jsx';
import Input from '../../common/Input/Input.jsx';
import Select from '../../common/Select/Select.jsx';
import styles from './RegistrySearch.module.css';

function RegistrySearch({
  initialCity = '',
  initialCountry = '',
  initialKeyword = '',
  initialRole = '',
}) {
  const navigate = useNavigate();

  const [role, setRole] = useState(initialRole);
  const [country, setCountry] = useState(initialCountry);
  const [city, setCity] = useState(initialCity);
  const [keyword, setKeyword] = useState(initialKeyword);

  const countries = useMemo(
    () =>
      Country.getAllCountries().sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    [],
  );

  const cities = useMemo(() => {
    if (!country) return [];

    const values = City.getCitiesOfCountry(country) || [];

    return values
      .filter(
        (entry, index, collection) =>
          collection.findIndex(
            (candidate) =>
              candidate.name === entry.name &&
              candidate.stateCode === entry.stateCode,
          ) === index,
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [country]);

  const submit = (event) => {
    event.preventDefault();

    const params = new URLSearchParams();

    if (role) params.set('role', role);
    if (country) params.set('country', country);
    if (city) params.set('city', city);
    if (keyword.trim()) params.set('keyword', keyword.trim());

    navigate(
      `/directory${params.size ? `?${params.toString()}` : ''}`,
    );
  };

  return (
    <form
      className={styles.searchPanel}
      onSubmit={submit}
      aria-label="Registry search"
    >
      <div className={styles.grid}>
        <div className={styles.field}>
          <FormField label="Directory category">
            <Select
              className={styles.control}
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              <option value="">All categories</option>
              <option value="member">Professional members</option>
              <option value="training_provider">
                Training providers
              </option>
              <option value="organization">Organizations</option>
              <option value="course">Accredited courses</option>
            </Select>
          </FormField>
        </div>

        <div className={styles.field}>
          <FormField label="Country">
            <Select
              className={styles.control}
              value={country}
              onChange={(event) => {
                setCountry(event.target.value);
                setCity('');
              }}
            >
              <option value="">All countries</option>

              {countries.map((entry) => (
                <option key={entry.isoCode} value={entry.isoCode}>
                  {entry.name}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <div className={styles.field}>
          <FormField label="City">
            <Select
              className={styles.control}
              value={city}
              disabled={!country}
              onChange={(event) => setCity(event.target.value)}
            >
              <option value="">All cities</option>

              {cities.map((entry) => (
                <option
                  key={`${entry.name}-${entry.stateCode}`}
                  value={entry.name}
                >
                  {entry.name}
                  {entry.stateCode ? `, ${entry.stateCode}` : ''}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <div className={`${styles.field} ${styles.keywordField}`}>
          <FormField label="Keyword">
            <Input
              className={styles.control}
              value={keyword}
              placeholder="Name, modality, service or course"
              onChange={(event) => setKeyword(event.target.value)}
            />
          </FormField>
        </div>
      </div>

      <Button
        className={styles.submit}
        icon="search"
        type="submit"
      >
        Search the registry
      </Button>
    </form>
  );
}

export default RegistrySearch;