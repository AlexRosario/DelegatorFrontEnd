import { useEffect, useState } from 'react';
import { Requests } from '../api';
import { useDisplayBills } from '../providers/BillProvider';
import { chamberPassage, chamberFailure } from '../utils/passage-utils';
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

/** Drop a member's cached vote log — call after recording new votes for them
 *  so alignment recomputes from fresh data instead of the page-load snapshot. */
export const invalidateMemberVotes = (bioguideId: string) => {
	memberVotesCache.delete(bioguideId);
};

export type Alignment = {
	/** 0–100, or null when there's nothing to compare yet (no comparable roll calls). */
	score: number | null;
	/** Overlapping votes where the member took a side (Yea/Nay) — the score's denominator. */
	comparedCount: number;
	matchedCount: number;
	/** Overlapping votes the member missed ("Not Voting") — accounted, but excluded
	 *  from the score: absence is not disagreement. */
	missedCount: number;
	/** SEPARATE score over bills the member's chamber disposed of WITHOUT a roll
	 *  call: unrecorded passage attributes an inferred Yea to every member,
	 *  unrecorded failure an inferred Nay — the onus for transparency is on the
	 *  member to demand a roll call. Kept apart from `score` (recorded data only). */
	inferredScore: number | null;
	inferredCount: number;
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
const EMPTY_ALIGNMENT: Alignment = {
	score: null,
	comparedCount: 0,
	matchedCount: 0,
	missedCount: 0,
	inferredScore: null,
	inferredCount: 0,
};

export function useAlignment(bioguideId: string, chamber?: 'House' | 'Senate'): Alignment {
	const { voteLog, votedBills } = useDisplayBills();
	const [alignment, setAlignment] = useState<Alignment>(EMPTY_ALIGNMENT);

	useEffect(() => {
		if (!bioguideId || voteLog.length === 0) {
			setAlignment(EMPTY_ALIGNMENT);
			return;
		}

		let active = true;
		getMemberVotes(bioguideId)
			.then((memberVotes) => {
				if (!active) return;

				// Bucket the member's position on each bill the user voted on:
				// Yea/Nay are comparable (they took a side), "Not Voting" is a missed
				// vote we account for separately, "Present" is neither and counts nowhere.
				const memberVoteFor = (userVote: { billId: string }) =>
					memberVotes.find((v) => v.billId === userVote.billId);

				const comparable = voteLog.filter((userVote) => {
					const vote = memberVoteFor(userVote)?.vote;
					return vote === 'Yea' || vote === 'Nay';
				});
				const matched = comparable.filter((userVote) => {
					const memberVote = memberVoteFor(userVote);
					return (
						(userVote.vote === 'Yes' && memberVote?.vote === 'Yea') ||
						(userVote.vote === 'No' && memberVote?.vote === 'Nay')
					);
				});
				const missed = voteLog.filter((userVote) => memberVoteFor(userVote)?.vote === 'Not Voting');

				// Inference: user-voted bills where this member has NO recorded position
				// AND their chamber disposed of the bill without a roll call. Unrecorded
				// passage attributes an inferred Yea; unrecorded failure an inferred Nay.
				let inferredCount = 0;
				let inferredMatched = 0;
				if (chamber) {
					for (const userVote of voteLog) {
						if (memberVoteFor(userVote)) continue; // recorded data wins; no inference needed
						const bill = votedBills.find((b) => b.id === userVote.billId);
						if (!bill) continue;

						// The chamber's FINAL word wins: passage trumps an earlier failed motion.
						const passed = chamberPassage(bill.actions, chamber);
						const failed = passed === null ? chamberFailure(bill.actions, chamber) : null;
						let inferredVote: 'Yea' | 'Nay';
						if (passed && passed !== 'roll-call') inferredVote = 'Yea';
						else if (failed && failed !== 'roll-call') inferredVote = 'Nay';
						else continue; // no unrecorded disposition in this chamber

						inferredCount++;
						if ((userVote.vote === 'Yes' && inferredVote === 'Yea') || (userVote.vote === 'No' && inferredVote === 'Nay')) {
							inferredMatched++;
						}
					}
				}

				setAlignment({
					// Guard the 0/0 case: nothing comparable → null, never NaN.
					score: comparable.length === 0 ? null : (matched.length / comparable.length) * 100,
					comparedCount: comparable.length,
					matchedCount: matched.length,
					missedCount: missed.length,
					inferredScore: inferredCount === 0 ? null : (inferredMatched / inferredCount) * 100,
					inferredCount,
				});
			})
			.catch((err) => console.error('Failed to compute alignment:', err));

		return () => {
			active = false;
		};
	}, [bioguideId, voteLog, votedBills, chamber]);

	return alignment;
}
