import { useEffect, useState, type RefObject } from 'react';

/**
 * True while `ref` is within `rootMargin` of the viewport. Used to render a card's
 * heavy content only when it's on-screen (content virtualization) and to lazy-load
 * its full summary on demand.
 */
export function useOnScreen(ref: RefObject<Element | null>, rootMargin = '300px'): boolean {
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), { rootMargin });
		observer.observe(el);
		return () => observer.disconnect();
	}, [ref, rootMargin]);

	return isVisible;
}
