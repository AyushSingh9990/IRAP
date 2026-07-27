import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

function readableRouteName(pathname) {
  if (pathname === '/') return 'Home';
  const segment = pathname
    .split('/')
    .filter(Boolean)
    .at(-1)
    ?.replace(/[-_]+/g, ' ');
  return segment ? segment.replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Page';
}

function RouteAnnouncer() {
  const { pathname } = useLocation();
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const heading = document.querySelector('main h1, [role="main"] h1');
      const pageName = heading?.textContent?.trim() || readableRouteName(pathname);
      setAnnouncement(`${pageName} page loaded`);
      heading?.setAttribute('tabindex', '-1');
      heading?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  return (
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      {announcement}
    </div>
  );
}

export default RouteAnnouncer;
