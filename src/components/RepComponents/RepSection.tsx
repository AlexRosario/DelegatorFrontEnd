import { useMemo } from 'react';
import { useDisplayMember } from '../../providers/MemberProvider.tsx';
import type { CongressMember } from '../../types.ts';
import { RepCard } from './RepCard.tsx';

export const RepSection = () => {
	const { senators, houseReps, chamber, representatives, setChamber } = useDisplayMember();

	const members = useMemo(() => {
		if (chamber === 'house') return houseReps;
		if (chamber === 'senate') return senators;
		return [...senators, ...houseReps];
	}, [chamber]);
	console.log('RepSection re-rendered. chamber:', chamber);

	return (
		<section className='rep-container'>
			<h2 style={{ position: 'fixed', top: '200px', left: '50%' }}>119th Congress</h2>

			<div className='rep-section'>
				<div
					className='repChamber'
					key={'repChamber'}>
					<div className='selectors'>
						<div
							key={'house'}
							className={`selector ${chamber === 'house' ? 'active' : ''}`}
							onClick={() => {
								setChamber('house');
								console.log('members', members);
							}}>
							House Reps
						</div>
						<div
							key={'senate'}
							className={`selector ${chamber === 'senate' ? 'active' : ''}`}
							onClick={() => {
								setChamber('senate');
								console.log('members', members, chamber, senators, houseReps, representatives);
							}}>
							Senators
						</div>
					</div>
				</div>

				<div
					className='reps'
					key={'reps'}>
					{members?.map((member: CongressMember) => (
						<RepCard
							member={member}
							key={member.bioguideId}
						/>
					))}
				</div>
			</div>
		</section>
	);
};
