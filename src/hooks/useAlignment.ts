import { useEffect, useState } from 'react';
import { Requests } from '../api';
import { useDisplayBills } from '../providers/BillProvider';
import type { MemberVote } from '../types';

/**
 * One member-vote-log fetch per bioguideId per session — RepCard and RepStrip
 * both consume alignment, so they share the same in-flight/settled promise.
 */
const memberVotesCache = new Map<string, Promise<MemberVote[]>>();

const getMemberVotes = (bioguideId: string): Promise<MemberVote[]> => {
	let cached = memberVotesCache.get(bioguideId);
	if (!cached) {
		cached = Requests.getMemberVoteLog(bioguideId).then((votes) => votes ?? []);
		memberVotesCache.set(bioguideId, cached);
	}
	return cached;
};

export type Alignment = {
	/** 0–100, or null when there's nothing to compare yet (no overlapping roll calls). */
	score: number | null;
	/** How many of the user's votes had a matching member roll-call vote. */
	comparedCount: number;
	matchedCount: number;
};

/** Threshold color scale shared by the alignment bar and the rep-strip ring. */
export const alignmentColor = (score: number | null): string => {
	if (score === null) return '#bdbdbd'; // nothing to compare yet
	if (score >= 75) return '#4caf50';
	if (score >= 50) return '#ffeb3b';
	return '#f44336';
};

/**
 * How often this member's recorded votes agree with the user's votes on the
 * same bills. `score` is null (not 0) when no bills overlap — "no data" and
 * "0% aligned" are different states and must render differently.
 */
export function useAlignment(bioguideId: string): Alignment {
	const { voteLog } = useDisplayBills();
	const [alignment, setAlignment] = useState<Alignment>({ score: null, comparedCount: 0, matchedCount: 0 });

	useEffect(() => {
		if (!bioguideId || voteLog.length === 0) {
			setAlignment({ score: null, comparedCount: 0, matchedCount: 0 });
			return;
		}

		let active = true;
		getMemberVotes(bioguideId)
			.then((memberVotes) => {
				if (!active) return;

				const compared = voteLog.filter((userVote) =>
					memberVotes.some((memberVote) => memberVote.billId === userVote.billId)
				);
				const matched = compared.filter((userVote) => {
					const memberVote = memberVotes.find((v) => v.billId === userVote.billId);
					return (
						(userVote.vote === 'Yes' && memberVote?.vote === 'Yea') ||
						(userVote.vote === 'No' && memberVote?.vote === 'Nay')
					);
				});

				setAlignment({
					// Guard the 0/0 case: no overlap → null, never NaN.
					score: compared.length === 0 ? null : (matched.length / compared.length) * 100,
					comparedCount: compared.length,
					matchedCount: matched.length,
				});
			})
			.catch((err) => console.error('Failed to compute alignment:', err));

		return () => {
			active = false;
		};
	}, [bioguideId, voteLog]);

	return alignment;
}
