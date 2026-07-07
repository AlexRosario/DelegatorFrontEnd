import { useEffect, useRef, useState } from 'react';
import { Requests } from '../../api';
import { useDisplayMember } from '../../providers/MemberProvider';

type Tally = { bioguideId: string; yes: number; no: number; total: number };

/**
 * Per-member constituent sentiment on one bill: for each member of the viewer's
 * delegation, a split bar of their constituents' Yes (green) vs No (red) votes.
 * Fetches once, only when the card is on-screen (`active`), and shows raw counts
 * alongside percentages so a small sample can't masquerade as a mandate.
 */
export const ConstituentVotes = ({ billId, active }: { billId: string; active: boolean }) => {
	const { senators, houseReps } = useDisplayMember();
	const delegation = [...senators, ...houseReps];
	const [tallies, setTallies] = useState<Record<string, Tally> | null>(null);
	const fetchedRef = useRef(false);

	useEffect(() => {
		if (!active || fetchedRef.current || delegation.length === 0) return;
		fetchedRef.current = true;
		const ids = delegation.map((member) => member.bioguideId ?? member.id);
		Requests.getConstituentVotes(billId, ids)
			.then((data) => {
				const byMember: Record<string, Tally> = {};
				for (const tally of data.results) byMember[tally.bioguideId] = tally;
				setTallies(byMember);
			})
			.catch((err) => console.error('Failed to load constituent votes:', err));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [active, billId, delegation.length]);

	// Signed-out users have no delegation — nothing to show.
	if (delegation.length === 0 || tallies === null) return null;

	return (
		<div className='constituent-votes'>
			<h5 className='constituent-votes-title'>Constituent votes</h5>
			{delegation.map((member) => {
				const id = member.bioguideId ?? member.id;
				const tally = tallies[id];
				const total = tally?.total ?? 0;
				const yesPct = total > 0 ? (tally.yes / total) * 100 : 0;
				const lastName = member.lastName ?? member.name.split(' ').pop();

				return (
					<div
						className='constituent-row'
						key={id}>
						<span className='constituent-name'>{lastName}</span>
						{total === 0 ? (
							<span className='constituent-none'>No constituent votes yet</span>
						) : (
							<>
								<div
									className='constituent-bar'
									title={`${tally.yes} Yes · ${tally.no} No among ${lastName}'s constituents on this app`}>
									<div
										className='constituent-bar-yes'
										style={{ width: `${yesPct}%` }}
									/>
								</div>
								<span className='constituent-pcts'>
									<span className='pct-yes'>{Math.round(yesPct)}%</span>
									{' / '}
									<span className='pct-no'>{Math.round(100 - yesPct)}%</span>
									<span className='constituent-total'> ({total})</span>
								</span>
							</>
						)}
					</div>
				);
			})}
		</div>
	);
};
