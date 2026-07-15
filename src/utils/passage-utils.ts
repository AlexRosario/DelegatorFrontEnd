import type { Actions } from '../types';

/**
 * How a chamber disposed of a bill:
 *  - 'roll-call'  → individual positions recorded (transparent)
 *  - 'voice'      → passed by voice vote — no positions, no counts
 *  - 'unanimous'  → unanimous consent / without objection — no vote occurred
 *  - 'unrecorded' → passed, but the method text names no recorded vote
 *  - null         → hasn't passed this chamber
 */
export type PassageMethod = 'roll-call' | 'voice' | 'unanimous' | 'unrecorded' | null;

export const PASSAGE_LABEL: Record<Exclude<PassageMethod, null>, string> = {
	'roll-call': 'Roll Call',
	voice: 'Voice Vote',
	unanimous: 'Unanimous Consent',
	unrecorded: 'Unrecorded',
};

const methodFromText = (text: string): Exclude<PassageMethod, null> => {
	const t = text.toLowerCase();
	if (t.includes('voice vote')) return 'voice';
	if (t.includes('unanimous consent') || t.includes('without objection')) return 'unanimous';
	return 'unrecorded';
};

const chamberHasRollCall = (actions: Actions[], chamber: 'House' | 'Senate') =>
	actions.some(
		(action) => Array.isArray(action.recordedVotes) && action.recordedVotes.some((rv) => rv.chamber === chamber)
	);

/** Derive a chamber's passage method from the bill's action history. */
export function chamberPassage(actions: Actions[] | undefined, chamber: 'House' | 'Senate'): PassageMethod {
	if (!Array.isArray(actions)) return null;

	// Any recorded vote in this chamber = positions exist, regardless of how the
	// final passage happened.
	if (chamberHasRollCall(actions, chamber)) return 'roll-call';

	// Canonical Library of Congress passage marker: "Passed/agreed to in House: …"
	const passage = actions.find((action) => new RegExp(`^passed/agreed to in ${chamber}:`, 'i').test(action.text ?? ''));
	if (!passage) return null;
	return methodFromText(passage.text);
}

/** Has this chamber actually passed the bill? Uses only the canonical LOC
 *  passage marker — NOT loose text matching (which over-matches procedural
 *  actions) and NOT roll-call presence (a recorded amendment vote ≠ passage). */
export function chamberHasPassed(actions: Actions[] | undefined, chamber: 'House' | 'Senate'): boolean {
	if (!Array.isArray(actions)) return false;
	return actions.some((action) => new RegExp(`^passed/agreed to in ${chamber}:`, 'i').test(action.text ?? ''));
}

/**
 * Stages where the bill has left Congress and no chamber vote can occur.
 * Deliberately NOT included:
 *  - 'Passed Both Chambers' — versions may differ; amendments ping-pong a bill
 *    back to a chamber that already passed it, forcing a new vote.
 *  - 'Vetoed' — a two-thirds override vote is possible in both chambers.
 *  - 'To President' — a veto would return the bill for an override vote, so a
 *    veto-watch message ("if vetoed, vote X on the override") is still timely.
 */
const OUT_OF_CONGRESS_STAGES = ['Became Law', 'Failed'];

/** Can a constituent's message still influence a chamber vote on this bill? */
export function billStillInCongress(stage: string | null | undefined): boolean {
	if (stage) return !OUT_OF_CONGRESS_STAGES.includes(stage);
	return true; // no derived stage → can't rule a vote out, so keep contact open
}

/** Method by which a chamber FAILED the bill, when it did so without a roll call.
 *  Canonical LOC marker: "Failed of passage/not agreed to in House: …" */
export function chamberFailure(actions: Actions[] | undefined, chamber: 'House' | 'Senate'): PassageMethod {
	if (!Array.isArray(actions)) return null;
	if (chamberHasRollCall(actions, chamber)) return 'roll-call';

	const failure = actions.find((action) =>
		new RegExp(`^failed of passage/not agreed to in ${chamber}:`, 'i').test(action.text ?? '')
	);
	if (!failure) return null;
	return methodFromText(failure.text);
}
