import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Ensures every route navigation starts at the top of the page.
export function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname, location.search]);

  return null;
}

