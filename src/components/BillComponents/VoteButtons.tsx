import { useEffect, useState } from 'react';
import { Requests } from '../../api';
import type { Bill, Vote } from '../../types';
import { useDisplayBills } from '../../providers/BillProvider';
import { useDisplayMember } from '../../providers/MemberProvider';
import { useAuthInfo } from '../../providers/AuthProvider';
import { VoteButton } from './VoteButton';

type HouseVote = {
	id: string | null;
	name?: string | null;
	party?: string | null;
	vote?: string | null;
};

type SenateVote = {
	firstName: string;
	fullName: string;
	lastName: string;
	lisMemberId: string;
	party: string;
	state: string;
	voteCast: string;
};
type Meta = {
	party: Element | null;
	yeas: Element | null;
	nays: Element | null;
	present: Element | null;
	no_vote: Element | null;
};

export const VoteButtons = ({ bill }: { bill: Bill }) => {
	const { user } = useAuthInfo();
	const { houseReps, senators } = useDisplayMember();
	const { id } = user;
	const { voteLog, setVoteLog, setVotedOnThisBill, activeBillTab } = useDisplayBills();
	const billId = bill.type + bill.number;
	const userHasBillVote =
		Array.isArray(voteLog) && voteLog.some((vote) => vote.userId === id && vote.billId === billId);
	const recordedVoteOnBill = userHasBillVote
		? voteLog.find((vote: Vote) => vote.userId === id && vote.billId === billId)
		: undefined;

	const userVoteDate = recordedVoteOnBill ? new Date(recordedVoteOnBill.date) : null;

	const latestActionDateOnBill = new Date(bill.latestAction.actionDate);

	const [newActionsSinceVoted, setNewActionsSinceVoted] = useState<boolean | undefined>(undefined);

	useEffect(() => {
		if (userVoteDate) {
			setNewActionsSinceVoted(userVoteDate < latestActionDateOnBill);
		}
	}, [userVoteDate, latestActionDateOnBill]);

	const recordVotes = async (vote: 'Yes' | 'No', repVotes: { bioguideId: string; vote: string }[]) => {
		const date = new Date();

		try {
			if (Array.isArray(voteLog)) {
				if (!userHasBillVote) {
					await Requests.addVote(billId, vote, date);
					setVoteLog([...voteLog, { userId: id, billId: billId, vote, date }]);
					if (repVotes.length > 0) {
						await repVotes.forEach((repVote) => {
							const { bioguideId, vote } = repVote;

							Requests.addMemberVote(bioguideId, billId, vote, latestActionDateOnBill);
						});
					}
					setVotedOnThisBill(true);
				}
			} else {
				console.error('Unexpected data format from getVoteLog:', voteLog);
			}
		} catch (error) {
			console.error('Error recording vote:', error);
		}
	};

	const handleVote = async (vote: 'Yes' | 'No') => {
		let allRepVotes: { bioguideId: string; vote: string }[] = [];
		if (!userHasBillVote) {
			const rollCallActions = bill.actions.filter((action) => action.recordedVotes?.length > 0);

			if (rollCallActions.length > 0) {
				try {
					const houseAction = rollCallActions.find((action) => /house/i.test(action.sourceSystem.name)) || null;

					const senateAction = rollCallActions.find((action) => /senate/i.test(action.sourceSystem.name)) || null;
					console.log('rollActions', rollCallActions);
					if (houseAction) {
						// Fetch the roll call from its own url — no year/roll rebuilding.
						const result = (await Requests.getRollCallByUrl(houseAction.recordedVotes[0].url)) ?? [[], []];
						const [metaData, votes] = result as [Meta[], HouseVote[]];
						console.log('metaDataHouse', metaData);
						houseReps.forEach((rep) => {
							// The House XML carries the bioguideId (name-id) — match on that
							// (robust against duplicate surnames); fall back to last name.
							const match = votes.find(
								(voteSearch: HouseVote) => voteSearch.id === rep.id || rep.lastName === voteSearch.name
							);
							if (match) {
								allRepVotes.push({
									bioguideId: rep.bioguideId ?? rep.id,
									vote: match.vote ?? '',
								});
							}
						});
					}
					console.log('houseAction', houseAction, 'senateActions', senateAction);

					if (senateAction) {
						const senateRoll = await Requests.getRollCallByUrl(senateAction.recordedVotes[0].url);
						if (senateRoll && Array.isArray(senateRoll)) {
							const [metaData, votes] = senateRoll;
							console.log('Sen meta:', metaData, 'votes:', votes);
							const senateCountsByParty = Array.isArray(votes)
								? votes.reduce(
										(
											acc: Record<
												string,
												{
													yeas: number;
													nays: number;
													present: number;
													no_vote: number;
												}
											>,
											vote
										) => {
											const party = vote.party == 'D' ? 'Democratic' : vote.party == 'R' ? 'Republican' : 'Independent';
											if (vote.voteCast === 'Yea') acc[party].yeas++;
											else if (vote.voteCast === 'Nay') acc[party].nays++;
											else if (vote.voteCast === 'Present') acc[party].present++;
											else acc[party].no_vote++;
											return acc;
										},
										{
											Republican: { yeas: 0, nays: 0, present: 0, no_vote: 0 },
											Democratic: { yeas: 0, nays: 0, present: 0, no_vote: 0 },
											Independent: { yeas: 0, nays: 0, present: 0, no_vote: 0 },
										}
								  )
								: {};
							console.log('senateCountsByParty', senateCountsByParty);
							senators.forEach((rep) => {
								if (Array.isArray(votes)) {
									// Senate XML has no bioguideId, so match on last name + first
									// initial — robust to nicknames (Chuck/Charles, Mike/Michael).
									const match = votes.find(
										(voteSearch: SenateVote) =>
											(rep.lastName ?? '').includes(voteSearch.lastName) &&
											(rep.firstName ?? '').charAt(0).toLowerCase() ===
												voteSearch.firstName.charAt(0).toLowerCase()
									);
									if (match) {
										allRepVotes.push({
											bioguideId: rep.bioguideId ?? rep.id,
											vote: match.voteCast,
										});
									}
								}
							});
						}
					}
				} catch (error) {
					console.error('Error fetching roll call data:', error);
				}
			}
			await recordVotes(vote, allRepVotes);
		}
	};

	return (
		<div className='vote-container'>
			{activeBillTab === 'discover-bills' && (
				<div className='vote-buttons'>
					<VoteButton
						onClick={() => handleVote('Yes')}
						voteValue='Yes'
					/>

					<VoteButton
						onClick={() => handleVote('No')}
						voteValue='No'
					/>
				</div>
			)}
			<div className='bill-status'>
				{recordedVoteOnBill
					? newActionsSinceVoted
						? `New actions since your last vote. Would you like to change vote?`
						: `You Voted ${recordedVoteOnBill?.vote}`
					: 'Needs Vote'}
			</div>
		</div>
	);
};

export default VoteButtons;
