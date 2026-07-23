import { useEffect, useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import type { Bill } from '../types';

import { BillCard } from './BillComponents/BillCard';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleRight, faAngleLeft } from '@fortawesome/free-solid-svg-icons';
import { RotatingLines } from 'react-loader-spinner';

export const Carousel = ({ bills }: { bills: Bill[] }) => {
	const [color, setColor] = useState('grey');
	let [index, setIndex] = useState<number>(0);

	const next = bills.length > 1 ? (index < bills.length - 1 ? index + 1 : 0) : 0;

	const prev = bills.length > 2 ? (index > 0 ? index - 1 : bills.length - 1) : 0;
	const isLoading = bills.length === 0 ? true : false;

	useEffect(() => {
		setIndex(0);
	}, [bills]);

	useEffect(() => {
		updateSlides();
	}, [index]);

	const goToNext = () => {
		setIndex((index) => (index == bills.length - 1 ? 0 : index + 1));
	};

	const goToPrev = () => {
		setIndex((index) => (index == 0 ? bills.length - 1 : index - 1));
	};

	const updateSlides = () => {
		console.log('active', index, 'prev', prev, 'next', next);
		document.querySelectorAll('.bill-card').forEach((slide, index) => {
			slide.classList.remove('active', 'prev', 'next');
			if (index === prev + 1 && index === next - 1) slide.classList.add('active');
			if (index === prev) slide.classList.add('prev');
			if (index === next) slide.classList.add('next');
		});
	};

	useEffect(() => {
		const interval = setInterval(() => {
			const colors = ['red', 'blue', 'green', 'purple', 'orange'];
			setColor(colors[Math.floor(Math.random() * colors.length)]);
		}, 750); // change color every second

		return () => clearInterval(interval);
	}, []);
	return (
		<div className='carousel'>
			<FontAwesomeIcon
				icon={faAngleLeft}
				onClick={goToPrev}
				className='arrows-carousel left'
			/>
			{!isLoading ? (
				bills.map((bill, index) => (
					<BillCard
						bill={bill}
						key={index}
						className={`bill-card ${index === prev ? 'prev' : ''} ${index === next ? 'next' : ''} ${index === index ? 'active' : ''}`}
						onClick={() => {
							if (index === prev) goToPrev();
							if (index === next) goToNext();
						}}></BillCard>
				))
			) : (
				<RotatingLines
					strokeColor={color}
					strokeWidth='5'
					animationDuration='0.75'
					width='96'
					visible={true}
				/>
			)}
			<FontAwesomeIcon
				icon={faAngleRight}
				onClick={goToNext}
				className='arrows-carousel right'
			/>
		</div>
	);
};
export default Carousel;
