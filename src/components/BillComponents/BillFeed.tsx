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
	const { filteredBills, billFilter, setCurrentIndex, currentIndex, searchType } = useDisplayBills();

	const [color, setColor] = useState('grey');
	const containerRef = useRef<HTMLDivElement | null>(null);
	const sentinelRef = useRef<HTMLDivElement | null>(null);
	// Show the back-to-top arrow once the feed has scrolled this far down.
	const SHOW_TOP_ARROW_AFTER_PX = 1500;
	const isPastThreshold = useComponentScrollThreshold(containerRef, SHOW_TOP_ARROW_AFTER_PX);

	const isLoading = filteredBills.length === 0;
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
			{billFilter === 'Bills with Votes' ? (
				<b>
					These Bills have already been voted on and will be solely used to better predict alignment with your
					representative(s).
				</b>
			) : (
				<b className='bill-carousel-info'>
					If a bill has not been voted on, you will later have the option to send a letter to your senator or
					representative.
				</b>
			)}
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
						cssOverride={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
					/>
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
