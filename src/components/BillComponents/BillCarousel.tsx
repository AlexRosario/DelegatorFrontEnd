import { useEffect, useMemo, useState, useCallback } from 'react';
import { useDisplayBills } from '../../providers/BillProvider';
import { BillCard } from './BillCard';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleRight, faAngleLeft } from '@fortawesome/free-solid-svg-icons';
import { ClipLoader } from 'react-spinners';
import { useSwipeable } from 'react-swipeable';

export const BillCarousel = () => {
	const { billsToDisplay, setCurrentIndex, currentIndex, filteredBills, billFilter } = useDisplayBills();
	const [color, setColor] = useState('grey');

	// SSR-safe "notDesktop" + keeps up with resizes
	const [isMobile, setIsMobile] = useState(false);
	useEffect(() => {
		const setFlag = () => setIsMobile(window.innerWidth < 1024);
		setFlag();
		let raf = 0;
		const onResize = () => {
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(setFlag);
		};
		window.addEventListener('resize', onResize, { passive: true });
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('resize', onResize);
		};
	}, []);

	useEffect(() => {
		const interval = setInterval(() => {
			const colors = ['red', 'blue', 'white'];
			setColor(colors[Math.floor(Math.random() * colors.length)]);
		}, 750);
		return () => clearInterval(interval);
	}, []);

	const next = billsToDisplay.length > 0 ? (currentIndex < filteredBills.length - 1 ? currentIndex + 1 : 0) : 0;

	const prev = billsToDisplay.length > 0 ? (currentIndex > 0 ? currentIndex - 1 : filteredBills.length - 1) : 0;

	const isLoading = billsToDisplay.length === 0;

	const updateSlides = useCallback(() => {
		document.querySelectorAll('.bill-card').forEach((slide, index) => {
			slide.classList.remove('active', 'prev', 'next');
			if (index === currentIndex) slide.classList.add('active');
			if (index === prev) slide.classList.add('prev');
			if (index === next) slide.classList.add('next');
		});
	}, [currentIndex, prev, next]);

	useEffect(() => {
		updateSlides();
	}, [updateSlides]);

	const goToNum = (number: number) => setCurrentIndex(number);
	const goToNext = () => (currentIndex < filteredBills.length - 1 ? goToNum(currentIndex + 1) : goToNum(0));
	const goToPrev = () => (currentIndex > 0 ? goToNum(currentIndex - 1) : goToNum(filteredBills.length - 1));

	// --- Swipe handlers: active only on mobile / non-desktop ---
	const swipeHandlers = useSwipeable(
		useMemo(
			() => ({
				onSwipedLeft: () => goToNext(),
				onSwipedRight: () => goToPrev(),
				preventScrollOnSwipe: true,
				trackTouch: true,
				trackMouse: false, // set true if you want mouse-drag on desktop too
				delta: 30, // px threshold before it counts as a swipe
				// onSwiping: (e) => { /* optional: add 'swiping' class for UI feedback */ },
			}),
			[goToNext, goToPrev]
		)
	);

	return (
		<>
			{billFilter === 'Bills with Votes' ? (
				<b>
					These Bills have been alrerady been voted on and will be solely used to better predict alignment with your
					representative/s
				</b>
			) : (
				<b className='bill-carousel-info'>
					If a bill has not been voted on, you will later have the option to send a letter to your senator or
					representative letting them know how you feel.
				</b>
			)}

			<div className='carousel-container'>
				{!isMobile && (
					<FontAwesomeIcon
						icon={faAngleLeft}
						onClick={goToPrev}
						className='arrows-carousel'
					/>
				)}

				{/* Apply swipe handlers only when notDesktop */}
				<div
					className='carousel'
					{...(isMobile ? swipeHandlers : {})}>
					{isLoading ? (
						<ClipLoader
							color={color}
							size={48}
							speedMultiplier={0.9}
						/>
					) : filteredBills.length === 0 ? null : isMobile ? (
						// MOBILE / NON-DESKTOP: show just the current card (swipe to change)
						<BillCard
							bill={filteredBills[Math.min(Math.max(currentIndex, 0), filteredBills.length - 1)]}
							key={(filteredBills[currentIndex] as any)?.id ?? `current-${currentIndex}`}
							className='active'
						/>
					) : (
						// DESKTOP: map them all with active/prev/next classes, and click-to-nav on neighbors
						filteredBills.map((bill, index) => (
							<BillCard
								bill={bill}
								key={(bill as any)?.id ?? index}
								className={
									index === currentIndex ? ' active' : index === prev ? ' prev' : index === next ? ' next' : ''
								}
								onClick={() => {
									if (index === prev) goToPrev();
									if (index === next) goToNext();
								}}
							/>
						))
					)}
				</div>
				{!isMobile && (
					<FontAwesomeIcon
						icon={faAngleRight}
						onClick={goToNext}
						className='arrows-carousel'
					/>
				)}
			</div>
		</>
	);
};
