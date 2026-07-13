import { useEffect, useState } from 'react';

/**
 * True while the given CSS media query matches. Keep the query in sync with the
 * breakpoint it mirrors in App.css (e.g. the 728px mobile bottom-bar cutoff).
 */
export function useMediaQuery(query: string): boolean {
	const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

	useEffect(() => {
		const mql = window.matchMedia(query);
		setMatches(mql.matches);
		const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
		mql.addEventListener('change', onChange);
		return () => mql.removeEventListener('change', onChange);
	}, [query]);

	return matches;
}
