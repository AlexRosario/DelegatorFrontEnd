import { useState, useEffect } from 'react';
import { useSwipeable } from 'react-swipeable';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleRight, faAngleLeft } from '@fortawesome/free-solid-svg-icons';
import BillCard from './BillCard';
import type { Bill } from '../../types';

// A swipeable one-bill-at-a-time carousel. Distinct from BillCard's internal
// slides (which page through one bill's summary) — this pages through a
// whole list of bills.
//
// State-driven: the visible card is picked in React and given the `active`
// class. No global DOM queries, so multiple carousels on the same page (one
// per policy row) never clobber each other's cards.
const Carousel = ({ bills }: { bills: Bill[] }) => {
	let [index, setIndex] = useState<number>(0);
	const count = bills.length;

	// If the bill list itself changes (new filter, new fetch), the old index
	// may point past the new list's end — snap back to the first slide.
	useEffect(() => {
		setIndex(0);
	}, [bills]);

	const goToNext = () => {
		setIndex((index) => (count === 0 ? 0 : (index + 1) % count));
	};

	const goToPrev = () => {
		setIndex((index) => (count === 0 ? 0 : (index - 1 + count) % count));
	};

	const swipeHandlers = useSwipeable({
		onSwipedLeft: goToNext,
		onSwipedRight: goToPrev,
		preventScrollOnSwipe: true,
		trackMouse: true,
	});

	if (count === 0) return null;

	const bill = bills[Math.min(index, count - 1)];

	return (
		<div
			className='carousel'
			{...swipeHandlers}>
			{count > 1 && (
				<FontAwesomeIcon
					icon={faAngleLeft}
					onClick={goToPrev}
					className='arrows-carousel left'
				/>
			)}
			<BillCard
				bill={bill}
				className='active'
			/>
			{count > 1 && (
				<FontAwesomeIcon
					icon={faAngleRight}
					onClick={goToNext}
					className='arrows-carousel right'
				/>
			)}
		</div>
	);
};

export default Carousel;
