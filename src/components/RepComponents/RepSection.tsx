import { useMemo } from 'react';
import { useDisplayMember } from '../../providers/MemberProvider.tsx';
import type { PastView } from '../../providers/MemberProvider.tsx';
import type { CongressMember } from '../../types.ts';
import { RepCard } from './RepCard.tsx';
import { PastReps } from './PastReps.tsx';
import { DistrictHistoryReps } from './DistrictHistoryReps.tsx';

const PAST_VIEW_TITLES: Record<Exclude<PastView, 'none'>, string> = {
	mine: 'My Past Reps',
	district: 'Past District Reps',
};

const CHAMBER_PILLS = [
	{ label: 'All Reps', value: '' },
	{ label: 'Senators', value: 'senate' },
	{ label: 'House Reps', value: 'house' },
];

export const RepSection = () => {
	const { senators, houseReps, chamber, setChamber, pastView } = useDisplayMember();

	const members = useMemo(() => {
		if (chamber === 'house') return houseReps;
		if (chamber === 'senate') return senators;
		return [...senators, ...houseReps];
	}, [chamber, senators, houseReps]);
	console.log('RepSection re-rendered. chamber:', chamber);

	return (
		<section className='rep-container'>
			<div className='rep-section'>
				<div
					className='repChamber'
					key={'repChamber'}>
					<h2 style={{ top: '200px', left: '50%' }}>119th Congress</h2>

					{/* Chamber pills: the mobile stand-in for the sidebar's chamber filters,
					    which leave the bottom bar below 728px (see _responsive.scss). */}
					<div className='selectors'>
						{CHAMBER_PILLS.map((pill) => (
							<div
								key={pill.label}
								className={`selector ${chamber === pill.value ? 'active' : ''}`}
								onClick={() => setChamber(pill.value)}>
								{pill.label}
							</div>
						))}
					</div>
				</div>

				<div
					className='reps'
					key={'reps'}>
					{members?.map((member: CongressMember) => {
						console.log('member', member.name);
						return (
							<RepCard
								member={member}
								key={member.id ?? member.bioguideId}
							/>
						);
					})}
				</div>

				{pastView !== 'none' && (
					<div className='past-section'>
						<h3 className='past-section-heading'>{PAST_VIEW_TITLES[pastView]}</h3>
						{pastView === 'mine' ? <PastReps chamber={chamber} /> : <DistrictHistoryReps chamber={chamber} />}
					</div>
				)}
			</div>
		</section>
	);
};
