import { useEffect, useMemo, useState } from 'react';
import { Requests } from '../../api';
import { useAuthInfo } from '../../providers/AuthProvider';
import type { CongressMember, PastRep, PastRepReason } from '../../types';
import { RepCard } from './RepCard';

const REASON_LABELS: Record<PastRepReason, string> = {
	left_office: 'Left office',
	redistricted: 'District changed',
	moved: 'You moved',
	other: 'No longer your rep',
};

const formatDate = (iso: string) =>
	new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

// /members/mine/past returns raw DB members; derive `area` the same way
// MemberProvider does for current reps so RepCard renders them identically.
const withArea = (member: CongressMember): CongressMember => ({
	...member,
	area: member.area ?? (member.chamber === 'Senate' ? 'US Senate' : 'US House'),
	field_offices: member.field_offices ?? [],
});

const CHAMBER_EMPTY: Record<string, string> = {
	house: 'No past House representatives yet.',
	senate: 'No past senators yet.',
	'': 'No past representatives yet.',
};

/** "My Past Reps" tab: who used to represent the user, newest first. */
export const PastReps = ({ chamber }: { chamber: string }) => {
	const { user } = useAuthInfo();
	const userId = user?.id;
	const [pastReps, setPastReps] = useState<PastRep[]>([]);
	const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

	useEffect(() => {
		if (!userId) return;
		const controller = new AbortController();
		setStatus('loading');
		Requests.getPastMembers(controller.signal)
			.then((reps) => {
				setPastReps(reps.map((rep) => ({ ...rep, member: withArea(rep.member) })));
				setStatus('ready');
			})
			.catch((error) => {
				if (error.name === 'AbortError') return;
				console.error('Past reps unavailable:', error);
				setStatus('error');
			});
		return () => controller.abort();
	}, [userId]);

	// Follow the same chamber filter as the current reps above ('' = both).
	const visible = useMemo(() => {
		if (chamber === 'house') return pastReps.filter((rep) => rep.member.area === 'US House');
		if (chamber === 'senate') return pastReps.filter((rep) => rep.member.area === 'US Senate');
		return pastReps;
	}, [chamber, pastReps]);

	if (status !== 'ready' || visible.length === 0) {
		const note =
			status === 'loading'
				? 'Loading your past reps…'
				: status === 'error'
					? "Couldn't load your past reps. Try again later."
					: (CHAMBER_EMPTY[chamber] ?? CHAMBER_EMPTY['']);
		return (
			<div className='past-reps'>
				<p className='past-reps-empty'>{note}</p>
				{status === 'ready' && (
					<p className='past-reps-hint'>
						Reps appear here when they leave office or your district changes.
					</p>
				)}
			</div>
		);
	}

	return (
		<div className='past-reps'>
			<div className='reps'>
				{visible.map((rep) => (
					<RepCard
						key={rep.member.id ?? rep.member.bioguideId}
						member={rep.member}
						tenure={
							<div className='rep-tenure'>
								<span className='rep-tenure-reason'>{REASON_LABELS[rep.reason] ?? REASON_LABELS.other}</span>
								<span>
									Served you {rep.startedAt ? `from ${formatDate(rep.startedAt)} ` : ''}until{' '}
									{formatDate(rep.endedAt)}
								</span>
							</div>
						}
					/>
				))}
			</div>
		</div>
	);
};
