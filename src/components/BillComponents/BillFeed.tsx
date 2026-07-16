import { useRef, useEffect, useState } from 'react';
import { useDisplayBills } from '../../providers/BillProvider';
import { BillCard } from './BillCard';
import { ClipLoader } from 'react-spinners';
import { BillStatus } from './BillStatus';
import { useComponentScrollThreshold } from '../../hooks/useComponentScrollThreshold';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import '@fortawesome/free-solid-svg-icons';
import { faArrowUp } from '@fortawesome/free-solid-svg-icons';

declare global {
	interface Window {
		__myObserver?: IntersectionObserver;
	}
}
export const BillFeed = () => {
	const { filteredBills, billFilter, setCurrentIndex, currentIndex, searchType, feedTotal, feedExhausted } =
		useDisplayBills();

	const [color, setColor] = useState('grey');
	const containerRef = useRef<HTMLDivElement | null>(null);
	const sentinelRef = useRef<HTMLDivElement | null>(null);
	// Show the back-to-top arrow once the feed has scrolled this far down.
	const SHOW_TOP_ARROW_AFTER_PX = 1500;
	const isPastThreshold = useComponentScrollThreshold(containerRef, SHOW_TOP_ARROW_AFTER_PX);

	// Three honest states: still fetching (total unknown), genuinely empty
	// (facet loaded, nothing to show), or has bills. The old `length === 0 →
	// spinner` conflated "loading" with "empty" and spun forever.
	const isLoading = filteredBills.length === 0 && feedTotal === null;
	const isEmpty = filteredBills.length === 0 && feedTotal !== null;
	const devMode = import.meta.env.DEV;

	// Infinite scroll: when the bottom sentinel scrolls into the feed's view, bump
	// the provider index — that triggers BillProvider's next fetch batch. Using a
	// functional update reads the LATEST index (no stale-closure on list length),
	// and IntersectionObserver fires once per "enter" so it paces one batch per scroll.
	useEffect(() => {
		const sentinel = sentinelRef.current;
		const root = containerRef.current;
		if (!sentinel || !root || isLoading) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					setCurrentIndex((prev) => prev + 20);
					console.log('yo:', currentIndex);
				}
			},
			{ root, rootMargin: '300px', threshold: 0 },
		);
		window.__myObserver = observer;

		observer.observe(sentinel);

		return () => observer.disconnect();
		// Re-attach once the first batch has rendered (the sentinel only exists then).
	}, [setCurrentIndex, isLoading, containerRef.current, sentinelRef.current]);

	// Loading spinner color animation
	useEffect(() => {
		const interval = setInterval(() => {
			const colors = ['red', 'blue', 'white'];
			setColor(colors[Math.floor(Math.random() * colors.length)]);
		}, 750);
		return () => clearInterval(interval);
	}, []);

	return (
		<>
			{devMode && <BillStatus searchType={searchType} />}
			<div
				ref={containerRef}
				id='bill-container'
				className='bill-feed'
				style={{ overflowY: 'auto' }} // the container is the scroll box / observer root
			>
				{isLoading ? (
					<ClipLoader
						color={color}
						size={48}
						cssOverride={{ marginTop: '50%' }}
					/>
				) : isEmpty ? (
					<p className='feed-empty-note'>
						{billFilter === 'All Bills'
							? 'No more bills to discover — you’re all caught up.'
							: 'No bills match this filter yet.'}
					</p>
				) : (
					<>
						{filteredBills.map((bill, index) => (
							<BillCard
								key={(bill as any)?.id ?? index}
								bill={bill}
							/>
						))}
						{/* Sentinel: observed to load the next batch as it nears view. */}
						<div
							ref={sentinelRef}
							style={{ height: 1 }}
						/>
						{feedExhausted && <p className='feed-empty-note'>You’re all caught up.</p>}
					</>
				)}
			</div>
			{/* Always mounted; the .in-view class fades it in/out (a conditional
			    render would skip the opacity transition). */}
			<FontAwesomeIcon
				icon={faArrowUp}
				title='Back to top'
				className={`scroll-top-arrow ${isPastThreshold ? 'in-view' : ''}`}
				onClick={() => containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
			/>
		</>
	);
};
