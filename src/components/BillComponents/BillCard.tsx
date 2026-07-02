import { useState, useRef, useEffect } from 'react';
import { useDisplayBills } from '../../providers/BillProvider';
import type { Bill } from '../../types';
import { VoteButton } from './VoteButton';
import { VoteButtons } from './VoteButtons';
import { ComButton } from './ComButton';
import { Requests } from '../../api';
import { Link } from 'react-router-dom';
import { useOnScreen } from '../../hooks/useOnScreen';

export const BillCard = ({
	bill,
	className,
	onClick,
}: {
	bill: Bill;
	className?: string;
	onClick?: () => void | number;
}) => {
	const { congress, activeBillTab, voteLog } = useDisplayBills();
	const [textLink, setTextLink] = useState<string>('');
	const [searchedForLink, setSearchedForLink] = useState<boolean>(false);
	const userString = localStorage.getItem('user');
	const user = userString ? JSON.parse(userString) : null;
	// Show the cached translation immediately if this bill already has one.
	const [translatedText, setTranslatedText] = useState<string | null>(bill.plainSummary ?? null);
	const [text, setText] = useState<string>('');
	const vote = voteLog.find((vote) => vote.billId == bill.originChamberCode + bill.number);
	const voteCast = vote?.vote;

	// Measure the slide area so each column is exactly one card-width "page",
	// turning overflowing content into horizontally-scrollable slides (no vertical scroll).
	const slidesRef = useRef<HTMLDivElement | null>(null);
	const [slideWidth, setSlideWidth] = useState(0);
	useEffect(() => {
		const el = slidesRef.current;
		if (!el) return;
		const update = () => setSlideWidth(el.clientWidth);
		update();
		const ro = new ResizeObserver(update);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	// Render the heavy summary HTML only while the card is on-screen (fixed card
	// height → no layout shift). The full summary rides in the payload, so no
	// per-card fetch is needed — this just defers the expensive column layout.
	const cardRef = useRef<HTMLDivElement | null>(null);
	const isVisible = useOnScreen(cardRef);
	const hasSummary = bill.summary !== 'No Summary Available';

	const getMoreInfo = async () => {
		// The bill already carries its text-version url (served from our DB), so no
		// extra congress.gov call is needed.
		if (bill?.textVersions?.url) {
			setTextLink(bill.textVersions.url);
		} else {
			console.error('No text version available');
		}
		setSearchedForLink(true);
	};

	const handleTranslate = async () => {
		// The backend translates the bill by id (computes once, caches, serves free after).
		try {
			const translation = await Requests.translateLegalBill(bill.id);
			if (translation) setTranslatedText(translation);
		} catch (err) {
			console.error('Translation failed:', err);
		}
	};

	return (
		<div
			ref={cardRef}
			className={`bill-card${className == undefined ? '' : className}`}
			onClick={onClick}>
			<div className='bill-header'>
				<div className='bill-header_top'>
					<b>{`${bill.type}${bill.number}`}</b>
					{user && activeBillTab === 'discover-bills' ? (
						<VoteButtons bill={bill} />
					) : (
						<div>
							<VoteButton voteValue={voteCast ?? ''} />
						</div>
					)}
				</div>
				<div className='bill-header_bottom'>{!hasSummary ? <b>{bill.title}</b> : ''}</div>
			</div>
			{/* Overflowing content auto-flows into horizontal, scrollable slides. */}
			<div
				className={`${!hasSummary ? 'bill-no-summary' : 'bill-slides'}`}
				ref={slidesRef}
				style={slideWidth ? { columnWidth: `${slideWidth}px` } : undefined}>
				{translatedText && (
					<div className='translated-text'>
						<h4>Plain English Summary</h4>
						<p>{translatedText}</p>
					</div>
				)}
				{isVisible && <div dangerouslySetInnerHTML={{ __html: bill.summary }} />}
			</div>
			<div className='bill-footer'>
				{!textLink ? (
					<b
						onClick={async () => {
							await getMoreInfo();
						}}>
						{searchedForLink ? 'No Expanded Text' : 'Read Full Text'}
					</b>
				) : (
					<>
						<a
							href={textLink}
							target='_blank'
							rel='noreferrer'
							className='bill-url'>
							{textLink}
						</a>
						<button
							onClick={async () => {
								const data = await handleTranslate();
								console.log('dataText:', data);
							}}>
							Translate This Bill
						</button>
					</>
				)}
				<div className='bill-member-positions'>
					<b>{bill.latestAction.actionDate}</b>
					<div>{bill.latestAction.text}</div>
				</div>
				{!user && (
					<Link
						to='/Home'
						className='sign-in-link'>
						Sign in to Vote
					</Link>
				)}
				{activeBillTab == 'voted-bills' && <ComButton bill={bill} />}
			</div>{' '}
		</div>
	);
};

export default BillCard;
