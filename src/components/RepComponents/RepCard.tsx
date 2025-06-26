import type { CongressMember, MemberVote } from '../../types';
import { useEffect, useState } from 'react';
import { useDisplayBills } from '../../providers/BillProvider';
import { Requests } from '../../api';
export const RepCard = ({ member }: { member: CongressMember }) => {
	const title = member.area == 'US House' ? 'Representative' : 'Senator';
	const bioguideId = member.bioguideId;
	const [memberVotes, setMemberVotes] = useState<number>(0);
	const { voteLog } = useDisplayBills();

	useEffect(() => {
		const getVotes = async () => {
			try {
				const memberVotes = await Requests.getMemberVoteLog(bioguideId);
				const votesWithRollCalls = voteLog.filter((vote) =>
					memberVotes.some((v: MemberVote) => v.billId == vote.billId)
				);
				const sameRollCallVotes = votesWithRollCalls.filter((userVote) => {
					const memberVote = memberVotes.find((memVote: MemberVote) => userVote.billId == memVote.billId);
					return (
						(userVote?.vote == 'Yes' && memberVote.vote == 'Yea') ||
						(userVote?.vote == 'No' && memberVote.vote == 'Nay')
					);
				});
				const score = sameRollCallVotes.length / votesWithRollCalls.length;

				setMemberVotes(score);
			} catch (err) {
				console.error('Failed to fetch member votes:', err);
			}
		};

		getVotes();
	}, [bioguideId, voteLog.length]);

	return (
		<div className='rep-card'>
			<div className='rep-card-left'>
				<div className='name-title'>
					<h3 className='font-face-Barlow'>{member.name.toUpperCase()}</h3>
					<h5>{`${title} from ${member.state}`}</h5>
				</div>
				{title == 'Senator' || title === 'Representative' ? (
					<div className='rep-score'>
						<div>
							Score: {voteLog.length > 0 ? (memberVotes * 100).toFixed(2) + '%' : 'No votes from you to compare yet.'}
						</div>
					</div>
				) : null}
			</div>

			<div className='rep-card-right'>
				<img
					src={`${member?.depiction.imageUrl}`}
					alt=''
					className='rep-photo'
				/>
				<div className='rep-info'>
					{(member.bioguideId || member.id) && <div>Bioguide-ID: {member.bioguideId || member.id} </div>}
					{member.district && member.bioguideId ? (
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
