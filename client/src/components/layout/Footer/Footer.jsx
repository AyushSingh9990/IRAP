import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPublicSiteConfiguration } from '../../../api/siteApi.js';
import { footerNavigation } from '../../../config/navigation.js';
import styles from './Footer.module.css';

function FooterLink({ item }) {
  if (!item.available) return <span aria-disabled="true">{item.label}</span>;
  return <Link to={item.to}>{item.label}</Link>;
}

function FooterColumn({ links, title }) {
  return <div><h2 className={styles.columnTitle}>{title}</h2><ul className={styles.linkList}>{links.map((item) => <li key={item.to}><FooterLink item={item} /></li>)}</ul></div>;
}

function value(configuration, key) {
  for (const group of Object.values(configuration?.groups || {})) {
    if (Object.prototype.hasOwnProperty.call(group, key)) return group[key];
  }
  return '';
}

function Footer() {
  const [configuration, setConfiguration] = useState(null);
  useEffect(() => {
    let active = true;
    getPublicSiteConfiguration().then((result) => { if (active) setConfiguration(result.data.configuration); }).catch(() => {});
    return () => { active = false; };
  }, []);

  const name = value(configuration, 'general.site_name') || 'iRAP';
  const description = value(configuration, 'footer.description') || 'A professional platform for controlled membership, accreditation, registry, certificates, renewal, and public verification services.';
  const copyright = value(configuration, 'footer.copyright');
  const email = value(configuration, 'contact.email');
  const telephone = value(configuration, 'contact.telephone');

  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.grid}`}>
        <div className={styles.brandColumn}>
          <Link className={styles.brand} to="/" aria-label={`${name} home`}><img aria-hidden="true" className={styles.brandLogo} src="/irap-logo.png" alt="" /></Link>
          <p>{description}</p>
          {email || telephone ? <p className={styles.settingsNote}>{email ? <a href={`mailto:${email}`}>{email}</a> : null}{email && telephone ? ' · ' : null}{telephone ? <a href={`tel:${telephone}`}>{telephone}</a> : null}</p> : <p className={styles.settingsNote}>Contact details are administrator-controlled and are not invented in source code.</p>}
        </div>
        <FooterColumn title="Platform" links={footerNavigation.platform} />
        <FooterColumn title="Resources" links={footerNavigation.resources} />
        <FooterColumn title="Legal" links={footerNavigation.legal} />
      </div>
      <div className={styles.bottomBar}><div className={`container ${styles.bottomInner}`}><p>{copyright || `© ${new Date().getFullYear()} ${name}. All rights reserved.`}</p><p>Public information is subject to administrator-approved settings.</p></div></div>
    </footer>
  );
}

export default Footer;
