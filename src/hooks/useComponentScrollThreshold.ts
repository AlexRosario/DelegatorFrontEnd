import { useState, useEffect, type RefObject } from 'react';

export function useComponentScrollThreshold(containerRef: RefObject<HTMLElement | null>, pxThreshold = 400): boolean {
	const [isPastThreshold, setIsPastThreshold] = useState(false);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const handleScroll = () => {
			// container.scrollTop measures how many pixels the user has scrolled down
			if (container.scrollTop >= pxThreshold) {
				setIsPastThreshold(true);
			} else {
				setIsPastThreshold(false);
			}
		};

		// Run initially in case it's already scrolled, then add listener
		handleScroll();
		container.addEventListener('scroll', handleScroll, { passive: true });

		return () => container.removeEventListener('scroll', handleScroll);
	}, [containerRef, pxThreshold]);

	return isPastThreshold;
}
