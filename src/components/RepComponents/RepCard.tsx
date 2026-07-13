import { useState } from 'react';
import type { CongressMember } from '../../types';
import { useAlignment, alignmentColor } from '../../hooks/useAlignment';
import { RepDonors } from './RepDonors';
export const RepCard = ({ member }: { member: CongressMember }) => {
	const title = member.area == 'US House' ? 'Representative' : 'Senator';
	const bioguideId = member.bioguideId ?? member.id;
	const chamber = member.area === 'US House' ? 'House' : 'Senate';
	const { score, missedCount, inferredScore, inferredCount } = useAlignment(bioguideId, chamber);
	// The inferred (unrecorded-votes) score is progressive disclosure: it only
	// shows once the reader clicks the recorded score.
	const [showInferred, setShowInferred] = useState(false);

	// Card flips to a donors face. The back stays unmounted until the first flip
	// so the FEC fetch only happens for cards the user actually opens.
	const [flipped, setFlipped] = useState(false);
	const [backMounted, setBackMounted] = useState(false);
	const toggleFlip = () => {
		if (!flipped) setBackMounted(true);
		setFlipped((f) => !f);
	};

	return (
		<div className={`rep-card ${flipped ? 'flipped' : ''}`}>
			<div className='rep-flip-inner'>
				<div className='rep-flip-face rep-flip-front'>
					<div className='rep-card-left'>
						<div className='name-title'>
							<h3 className='font-face-Barlow'>{member.name.toUpperCase()}</h3>
							<h5>{`${title} from ${member.state}`}</h5>
						</div>
						<div
							className='rep-score'
							onClick={() => setShowInferred((showing) => !showing)}
							title='Click to show the inferred score for votes this chamber never recorded'>
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
							{showInferred &&
								(inferredScore !== null ? (
									<div
										className='inferred-alignment'
										title={`Bills the ${chamber} passed or failed without a roll call — an unrecorded pass counts as an inferred Yes from every member, an unrecorded fail as an inferred No`}>
										Inferred alignment (unrecorded votes): {inferredScore.toFixed(0)}% across {inferredCount}
									</div>
								) : (
									<div className='inferred-alignment'>No unrecorded (voice/unanimous) votes to infer from yet.</div>
								))}
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
					<button
						className='rep-flip-toggle'
						title='See top campaign donors (FEC)'
						onClick={toggleFlip}>
						💰 Donors
					</button>
				</div>

				<div className='rep-flip-face rep-flip-back'>
					{backMounted && <RepDonors member={member} />}
					<button
						className='rep-flip-toggle'
						title='Back to profile'
						onClick={toggleFlip}>
						↩ Profile
					</button>
				</div>
			</div>
		</div>
	);
};
