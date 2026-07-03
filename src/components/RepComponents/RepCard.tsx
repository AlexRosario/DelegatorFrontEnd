import type { CongressMember } from '../../types';
import { useAlignment, alignmentColor } from '../../hooks/useAlignment';
export const RepCard = ({ member }: { member: CongressMember }) => {
	const title = member.area == 'US House' ? 'Representative' : 'Senator';
	const bioguideId = member.bioguideId ?? member.id;
	const { score, missedCount } = useAlignment(bioguideId);

	return (
		<div className='rep-card'>
			<div className='rep-card-left'>
				<div className='name-title'>
					<h3 className='font-face-Barlow'>{member.name.toUpperCase()}</h3>
					<h5>{`${title} from ${member.state}`}</h5>
				</div>
				<div className='rep-score'>
					{score === null ? (
						<div>No overlapping roll-call votes to compare yet.</div>
					) : (
						<div className='alignment-container'>
							<div className='alignment-bar'>
								<div
									className='fill'
									style={{ width: `${score}%`, backgroundColor: alignmentColor(score) }}></div>
							</div>
							<div>Alignment Score: {score.toFixed(2)}</div>
						</div>
					)}
					{missedCount > 0 && (
						<div className='missed-votes-note'>
							Missed {missedCount} vote{missedCount === 1 ? '' : 's'} on bills you voted on
						</div>
					)}
				</div>
			</div>

			<div className='rep-card-right'>
				<img
					src={member.photoURL ?? member.depiction?.imageUrl ?? ''}
					alt=''
					className='rep-photo'
				/>
				<div className='rep-info'>
					{(member.bioguideId || member.id) && <div>Bioguide-ID: {member.bioguideId || member.id} </div>}
					{member.district ? (
						<span className='rep-district'>
							{member.state} District {member.district}
						</span>
					) : title === 'Senator' ? (
						<span>{member.state} Senator</span>
					) : null}

					<div>{member.party}</div>
					<div>Phone: {member.phone}</div>
					<div>
						<span>
							<span className='rep-links'>
								<a
									href={`${member.url}}`}
									className='rep-links-link'>
									{member.url}
								</a>
								<br />
							</span>
						</span>
					</div>
				</div>
			</div>
		</div>
	);
};
