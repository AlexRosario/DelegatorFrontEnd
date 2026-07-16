import { useState, useRef, useEffect, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { useDisplayBills } from '../../providers/BillProvider';
import type { Bill } from '../../types';
import { VoteButton } from './VoteButton';
import { VoteButtons } from './VoteButtons';
import { ComButton } from './ComButton';
import { Requests } from '../../api';
import { Link } from 'react-router-dom';
import { useOnScreen } from '../../hooks/useOnScreen';
import { BillChat } from './BillChat';
import { ConstituentVotes } from './ConstituentVotes';
import { chamberPassage, PASSAGE_LABEL } from '../../utils/passage-utils';
export const BillCard = ({
	bill,
	className,
	onClick,
}: {
	bill: Bill;
	className?: string;
	onClick?: () => void | number;
}) => {
	const { activeBillTab, voteLog } = useDisplayBills();
	const [textLink, setTextLink] = useState<string>('');
	const [searchedForLink, setSearchedForLink] = useState<boolean>(false);
	const userString = localStorage.getItem('user');
	const user = userString ? JSON.parse(userString) : null;
	// Show the cached translation immediately if this bill already has one.
	const [translatedText, setTranslatedText] = useState<string | null>(bill.plainSummary ?? null);
	// Flip state: cards open on the original summary; the "Plain English" button
	// flips to the translation (and a fresh translation auto-flips when it lands).
	const [showTranslation, setShowTranslation] = useState(false);
	const [isTranslating, setIsTranslating] = useState(false);
	const [translateError, setTranslateError] = useState<string | null>(null);
	const [chatOpen, setChatOpen] = useState(false);
	const [commentCount, setCommentCount] = useState(bill.commentCount ?? 0);
	const vote = voteLog.find((vote) => vote.billId === bill.id);
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

	// Slide paging: arrows scroll whichever face is currently showing.
	const backSlidesRef = useRef<HTMLDivElement | null>(null);
	const activeSlides = () => (showTranslation && translatedText ? backSlidesRef.current : slidesRef.current);

	// Start every card on its FIRST slide — the summary renders in lazily, and
	// without this the browser's scroll anchoring can leave the strip scrolled.
	useEffect(() => {
		if (isVisible && slidesRef.current) slidesRef.current.scrollLeft = 0;
	}, [isVisible]);

	// Track "slide X of N" for the visible face (drives the top indicator and the
	// arrows — both only show when there's more than one slide).
	const [slidePage, setSlidePage] = useState({ index: 1, count: 1 });
	useEffect(() => {
		const el = activeSlides();
		if (!el) {
			setSlidePage({ index: 1, count: 1 });
			return;
		}
		const measure = () => {
			const gap = parseFloat(getComputedStyle(el).columnGap || '0') || 0;
			const step = el.clientWidth + gap; // one slide + its gap
			if (step <= 0) return;
			const count = Math.max(1, Math.round((el.scrollWidth + gap) / step));
			const index = Math.min(count, Math.round(el.scrollLeft / step) + 1);
			setSlidePage({ index, count });
		};
		// Measure after the column layout settles, then follow the user's scrolling.
		const raf = requestAnimationFrame(measure);
		el.addEventListener('scroll', measure, { passive: true });
		return () => {
			cancelAnimationFrame(raf);
			el.removeEventListener('scroll', measure);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isVisible, slideWidth, showTranslation, translatedText]);

	const scrollSlides = (direction: 1 | -1) => {
		const el = activeSlides();
		if (!el) return;
		const gap = parseFloat(getComputedStyle(el).columnGap || '0') || 0;
		el.scrollBy({ left: direction * (el.clientWidth + gap), behavior: 'smooth' });
	};
	const hasSummary = bill.summary !== 'No Summary Available';
	// Single sanitization choke point for the summary HTML injected below.
	const safeSummaryHtml = useMemo(() => DOMPurify.sanitize(bill.summary), [bill.summary]);

	// How each chamber passed the bill (roll call vs voice/unanimous) — surfacing
	// unrecorded passage is deliberate: ambiguity should be visible.
	const housePassage = useMemo(() => chamberPassage(bill.actions, 'House'), [bill.actions]);
	const senatePassage = useMemo(() => chamberPassage(bill.actions, 'Senate'), [bill.actions]);

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
		// The backend translates the bill by id (computes once, caches, serves free
		// after). When it lands, flip the card to the plain-English face.
		if (isTranslating) return;
		setIsTranslating(true);
		setTranslateError(null);
		try {
			const translation = await Requests.translateLegalBill(bill.id);
			if (translation) {
				setTranslatedText(translation);
				setShowTranslation(true);
			} else {
				setTranslateError('Translation unavailable right now — please try again later.');
			}
		} catch (err) {
			console.error('Translation failed:', err);
			setTranslateError(
				err instanceof Error && err.message === 'payment_required'
					? 'Payment is required to generate this translation.'
					: 'Translation unavailable right now — please try again later.',
			);
		} finally {
			setIsTranslating(false);
		}
	};

	return (
		<div
			ref={cardRef}
			// Chamber accent: House bills carry the brand red, Senate the brand blue.
			className={`bill-card ${bill.originChamberCode === 'S' ? 'bill-card--senate' : 'bill-card--house'}${
				className ? ` ${className}` : ''
			}`}
			onClick={onClick}>
			<div className='bill-header'>
				<div className='bill-header_top'>
					<b>{`${bill.type}${bill.number}`}</b>
					{!user ? (
						<Link
							to='/Home'
							className='bill-card_sign-in-link'>
							Sign in to Vote
						</Link>
					) : activeBillTab === 'discover-bills' ? (
						<VoteButtons bill={bill} />
					) : (
						<div>
							<VoteButton voteValue={voteCast ?? ''} />
						</div>
					)}
				</div>
				<div className='bill-header_bottom'>{!hasSummary ? <b>{bill.title}</b> : ''}</div>
				{(bill.stage || housePassage || senatePassage) && (
					<div className='passage-methods'>
						{bill.stage && (
							<span
								className={`stage-chip ${
									bill.stage === 'Became Law'
										? 'stage-law'
										: bill.stage === 'Vetoed' || bill.stage === 'Failed'
											? 'stage-dead'
											: ''
								}`}
								title='Where this bill is in the legislative process'>
								{bill.stage}
							</span>
						)}
						{housePassage && (
							<span
								className={`passage-chip passage-${housePassage}`}
								title={
									housePassage === 'roll-call'
										? 'Individual House votes were recorded'
										: 'The House passed this without recording individual votes'
								}>
								House: {PASSAGE_LABEL[housePassage]}
							</span>
						)}
						{senatePassage && (
							<span
								className={`passage-chip passage-${senatePassage}`}
								title={
									senatePassage === 'roll-call'
										? 'Individual Senate votes were recorded'
										: 'The Senate passed this without recording individual votes'
								}>
								Senate: {PASSAGE_LABEL[senatePassage]}
							</span>
						)}
					</div>
				)}
			</div>
			{/* Content flips between the original text (front) and the AI plain-English
			    translation (back); the chat panel overlays whichever face is showing. */}
			<div className={`bill-content-flip ${showTranslation && translatedText ? 'flipped' : ''}`}>
				<div className='bill-content-flip-inner'>
					<div className='bill-flip-face'>
						{/* Overflowing content auto-flows into horizontal, scrollable slides.
						    Columns ONLY on the slides class — .bill-no-summary has no
						    horizontal-scroll containment, so columns there spill past the card. */}
						<div
							className={`${!hasSummary ? 'bill-no-summary' : 'bill-slides'}`}
							ref={slidesRef}
							style={hasSummary && slideWidth ? { columnWidth: `${slideWidth}px` } : undefined}>
							{isVisible && <div dangerouslySetInnerHTML={{ __html: safeSummaryHtml }} />}
							{translateError && <div className='translate-error'>{translateError}</div>}
							{/* How this member's constituents (app users) voted — flows into the slides. */}
							<ConstituentVotes
								billId={bill.id}
								active={isVisible}
							/>
							<div className='vote-status'>
								<div>{bill.latestAction.text}</div>
								<b>{bill.latestAction.actionDate}</b>
							</div>
						</div>
					</div>
					<div className='bill-flip-face bill-flip-back'>
						<div
							className='bill-slides'
							ref={backSlidesRef}
							style={slideWidth ? { columnWidth: `${slideWidth}px` } : undefined}>
							{isVisible && translatedText && (
								<div className='translated-text'>
									<h4>Plain English Summary</h4>
									<p>{translatedText}</p>
								</div>
							)}
						</div>
					</div>
				</div>
				{slidePage.count > 1 && !chatOpen && (
					<div className='slide-indicator'>
						{slidePage.index} / {slidePage.count}
					</div>
				)}
				{slidePage.count > 1 && !chatOpen && (
					<>
						<button
							className='slide-arrow left'
							aria-label='Previous slide'
							onClick={(e) => {
								e.stopPropagation();
								scrollSlides(-1);
							}}>
							‹
						</button>
						<button
							className='slide-arrow right'
							aria-label='Next slide'
							onClick={(e) => {
								e.stopPropagation();
								scrollSlides(1);
							}}>
							›
						</button>
					</>
				)}
				{chatOpen && (
					<div className='bill-chat-overlay'>
						<BillChat
							billId={bill.id}
							onPosted={() => setCommentCount((count) => count + 1)}
						/>
					</div>
				)}
			</div>
			<div className='bill-footer'>
				{/* The bottom bar: translation, discussion, contact (while the bill is
				    still in Congress — ComButton gates itself), and the full-text link. */}
				<div className='bill-footer-actions'>
					{translatedText ? (
						<button
							className='bill-flip-toggle'
							onClick={() => setShowTranslation((showing) => !showing)}>
							{showTranslation ? 'Show Original' : 'Plain English'}
						</button>
					) : (
						<button
							className='bill-flip-toggle'
							onClick={handleTranslate}
							disabled={isTranslating}>
							{isTranslating ? 'Translating…' : 'Translate'}
						</button>
					)}
					<b
						className='bill-chat-toggle'
						onClick={() => setChatOpen((open) => !open)}>
						{chatOpen ? '✕ Close' : `💬 ${commentCount}`}
					</b>
					<ComButton bill={bill} />
					{!textLink ? (
						<b
							className='bill-fulltext-toggle'
							onClick={async () => {
								await getMoreInfo();
							}}>
							{searchedForLink ? 'No Expanded Text' : 'Read Full Text'}
						</b>
					) : (
						<a
							href={textLink}
							target='_blank'
							rel='noreferrer'
							className='bill-url'>
							Full Text ↗
						</a>
					)}
				</div>
			</div>{' '}
		</div>
	);
};

export default BillCard;
