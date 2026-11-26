import { useEffect, useMemo, useState } from 'react';
import { Requests } from '../../api';
import { useAuthInfo } from '../../providers/AuthProvider';
import type { CongressMember, DistrictHistory, SeatTerm } from '../../types';
import { RepCard } from './RepCard';

// Seat-history members are a congress.gov subset, not DB rows. Fill in what
// RepCard reads so it renders them like any other rep. RepCard only reads a
// handful of fields, so the cast is safe; missing ones (phone etc.) stay empty.
const toCardMember = (term: SeatTerm): CongressMember =>
	({
		...term.member,
		bioguideId: term.member.id,
		area: term.chamber === 'Senate' ? 'US Senate' : 'US House',
		field_offices: [],
	}) as unknown as CongressMember;

const seatLabel = (history: DistrictHistory, chamber: string) => {
	const { house, senate } = history.seats;
	const houseLabel = house ? `${house.state}'s District ${house.district}` : null;
	const senateLabel = senate ? `${senate.state}'s Senate seats` : null;
	if (chamber === 'house') return houseLabel;
	if (chamber === 'senate') return senateLabel;
	return [houseLabel, senateLabel].filter(Boolean).join(' and ') || null;
};

/** "Past District Reps" tab: everyone who has held the user's current seats. */
export const DistrictHistoryReps = ({ chamber }: { chamber: string }) => {
	const { user } = useAuthInfo();
	const userId = user?.id;
	const [history, setHistory] = useState<DistrictHistory | null>(null);
	const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

	useEffect(() => {
		if (!userId) return;
		const controller = new AbortController();
		setStatus('loading');
		Requests.getDistrictHistory(controller.signal)
			.then((data) => {
				setHistory(data);
				setStatus('ready');
			})
			.catch((error) => {
				if (error.name === 'AbortError') return;
				console.error('District history unavailable:', error);
				setStatus('error');
			});
		return () => controller.abort();
	}, [userId]);

	const visible = useMemo(() => {
		const terms = history?.terms ?? [];
		if (chamber === 'house') return terms.filter((term) => term.chamber === 'House');
		if (chamber === 'senate') return terms.filter((term) => term.chamber === 'Senate');
		return terms;
	}, [chamber, history]);

	// First load per seat queries congress.gov and can take several seconds.
	if (status === 'loading')
		return <p className='past-reps-empty'>Looking up your seats' history — this can take a few seconds…</p>;
	if (status === 'error' || !history)
		return <p className='past-reps-empty'>Couldn't load your district's history. Try again later.</p>;

	const label = seatLabel(history, chamber);

	return (
		<div className='past-reps'>
			{label && <p className='district-history-intro'>Everyone who has held {label} since {history.coverageFromYear}.</p>}
			{chamber !== 'senate' && history.seats.house && (
				<p className='past-reps-hint'>
					District boundaries are redrawn after each census, so earlier holders of this district number may have
					served different neighborhoods.
				</p>
			)}

			{visible.length === 0 ? (
				<p className='past-reps-empty'>
					{!history.seats.house && !history.seats.senate
						? "We couldn't determine your state and district yet."
						: chamber === 'house' && !history.seats.house
							? "We couldn't determine your House district yet."
							: 'No earlier holders to show.'}
				</p>
			) : (
				<div className='reps'>
					{visible.map((term) => (
						<RepCard
							key={`${term.member.id}-${term.chamber}-${term.startCongress}`}
							member={toCardMember(term)}
							tenure={
								<div className='rep-tenure'>
									<span className='rep-tenure-reason'>
										{term.chamber === 'Senate' ? `${term.state} Senate` : `${term.state} District ${term.district}`}
									</span>
									<span>
										Held this seat {term.startYear}–{term.endYear ?? 'present'}
									</span>
								</div>
							}
						/>
					))}
				</div>
			)}
		</div>
	);
};
