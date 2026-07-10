import { useState, useEffect } from 'react';

export function useScrollThreshold(multiplier = 1.5): boolean {
	const [isPastThreshold, setIsPastThreshold] = useState(false);

	useEffect(() => {
		const handleScroll = () => {
			// Get current viewport height
			const vh = window.innerHeight;
			// Calculate the pixel threshold (e.g., 1.5 * 1080px)
			const threshold = vh * multiplier;

			// Check if current scroll position is past the threshold
			if (window.scrollY >= threshold) {
				setIsPastThreshold(true);
			} else {
				setIsPastThreshold(false);
			}
		};

		// Run once initially, then listen for scroll events
		handleScroll();
		window.addEventListener('scroll', handleScroll, { passive: true });

		return () => window.removeEventListener('scroll', handleScroll);
	}, [multiplier]);

	return isPastThreshold;
}
