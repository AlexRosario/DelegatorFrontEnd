import { useEffect, useState } from 'react';
import type { Bill, CongressMember } from '../../types';
import { useDisplayMember } from '../../providers/MemberProvider';
import { useDisplayBills } from '../../providers/BillProvider';
import { Requests } from '../../api';
import { chamberHasPassed, chamberPassage, billStillInCongress, PASSAGE_LABEL } from '../../utils/passage-utils';

/**
 * The message varies by where the bill stands FOR THIS MEMBER'S CHAMBER — the
 * House and Senate are rarely in the same state, so one template can't be right
 * for both. Every post-vote variant explains WHY the constituent is writing at
 * this stage of the bill's life (oversight without context reads as hostility).
 *
 *  - advocate:  their chamber hasn't voted — urge a vote the user's way
 *  - roll-call: their chamber voted on the record — thank / hold accountable /
 *               ask about an absence, citing the public record
 *  - disclose:  their chamber passed WITHOUT recorded positions — ask them to
 *               state theirs publicly
 *  - veto-watch: bill is before the President — issues + override-readiness
 *  - override:  vetoed — urge a vote on the two-thirds override
 */
type DraftVariant = 'advocate' | 'roll-call' | 'disclose' | 'veto-watch' | 'override';

const memberChamber = (member: CongressMember): 'House' | 'Senate' => (member.area === 'US House' ? 'House' : 'Senate');

export const resolveDraftVariant = (bill: Bill, chamber: 'House' | 'Senate'): DraftVariant => {
	if (bill.stage === 'Vetoed') return 'override';
	if (bill.stage === 'To President') return 'veto-watch';
	if (!chamberHasPassed(bill.actions, chamber)) return 'advocate';
	return chamberPassage(bill.actions, chamber) === 'roll-call' ? 'roll-call' : 'disclose';
};

/** The chamber's most recent recorded-vote roll number on this bill, for citation. */
const lastRollNumber = (bill: Bill, chamber: 'House' | 'Senate'): number | null => {
	for (const action of bill.actions ?? []) {
		const rv = action.recordedVotes?.find((vote) => vote.chamber === chamber);
		if (rv?.rollNumber) return Number(rv.rollNumber);
	}
	return null;
};

const draftMessage = (
	member: CongressMember,
	bill: Bill,
	stance: 'Yes' | 'No' | undefined,
	variant: DraftVariant,
	/** This member's vote from our records — undefined means WE don't know, not
	 *  that they didn't vote (rows only exist once an app user recorded them). */
	memberVote?: string,
) => {
	const honorific = member.area === 'US House' ? 'Representative' : 'Senator';
	const lastName = member.lastName ?? member.name.split(' ').pop();
	const title = bill.title.length > 120 ? bill.title.slice(0, 117) + '…' : bill.title;
	const chamber = memberChamber(member);
	const header = `Dear ${honorific} ${lastName},

As your constituent, I am writing about ${bill.type.toUpperCase()} ${bill.number} — "${title}".`;
	const signoff = `

Respectfully,
[Your name]`;

	let body = '';
	switch (variant) {
		case 'advocate': {
			const stanceLine =
				stance === 'Yes'
					? 'I support this bill and urge you to vote YES when it comes before you.'
					: stance === 'No'
						? 'I oppose this bill and urge you to vote NO when it comes before you.'
						: 'I urge you to give it your full consideration and to represent the views of our district.';
			body = `${stanceLine}

I follow how my representatives vote, including passage by voice vote. If this bill comes to the floor, please support a recorded roll-call vote so constituents can see where you stand.`;
			break;
		}
		case 'roll-call': {
			const roll = lastRollNumber(bill, chamber);
			const cite = roll ? ` (Roll Call No. ${roll})` : '';
			const returnNote = `I am writing even though the ${chamber} has already voted because this bill can still return in amended form for another vote — and because I follow the votes my representatives cast.`;
			if (memberVote === 'Yea' || memberVote === 'Aye' || memberVote === 'Nay' || memberVote === 'No') {
				const votedYes = memberVote === 'Yea' || memberVote === 'Aye';
				const aligned = stance ? (stance === 'Yes') === votedYes : null;
				body =
					aligned === null
						? `The public record shows you voted ${memberVote} on this bill${cite}. I have not yet settled my own position, and I would value a note from your office explaining your vote.

${returnNote}`
						: aligned
							? `The public record shows you voted ${memberVote} on this bill${cite}. Thank you — that vote reflects my views.

${returnNote} If it returns, I urge you to hold that position.`
							: `The public record shows you voted ${memberVote} on this bill${cite}. I respectfully disagree: I ${stance === 'Yes' ? 'support' : 'oppose'} this bill.

${returnNote} If it returns to the floor, I urge you to reconsider.`;
			} else if (memberVote) {
				// 'Present' / 'Not Voting' — a recorded non-position.
				body = `The public record shows you were recorded as "${memberVote}" on this bill${cite}. As your constituent, I would like to know where you stand and why no position was cast.

${returnNote}`;
			} else {
				// Roll call happened but we hold no record for this member — ask,
				// don't accuse.
				body = `The ${chamber} decided this bill by recorded vote${cite}. I follow how my representatives vote, and I would welcome your office confirming how you voted and why.

${returnNote}`;
			}
			break;
		}
		case 'disclose': {
			const method = chamberPassage(bill.actions, chamber);
			const methodLabel =
				method && method !== 'roll-call' ? PASSAGE_LABEL[method].toLowerCase() : 'without a recorded vote';
			body = `The ${chamber} passed this bill by ${methodLabel}, so the public record does not show where you stood. Absent a recorded vote, constituents are left to infer that you supported its passage — if that inference is wrong, I would welcome a correction.

I am writing because, as your constituent, I want to know your position — please state it publicly or in a reply to this message. Going forward, I ask you to support recorded roll-call votes so constituents never have to write letters like this one to learn where their representatives stand.`;
			break;
		}
		case 'veto-watch': {
			const overrideAsk =
				stance === 'Yes'
					? 'I urge you to vote FOR the override.'
					: stance === 'No'
						? 'I urge you to vote AGAINST the override.'
						: 'I urge you to weigh these issues when you cast that vote.';
			body = `These are the issues in this bill that matter to me:
- [describe what you care about]

This bill has passed both chambers and is now before the President. I am writing at this stage because, if it is vetoed, it returns to Congress — where a two-thirds vote in each chamber can override. ${overrideAsk}`;
			break;
		}
		case 'override': {
			const ask =
				stance === 'Yes'
					? 'I support this bill and urge you to vote FOR the override.'
					: stance === 'No'
						? 'I oppose this bill and urge you to vote AGAINST the override.'
						: 'I urge you to represent the views of our district when you cast that vote.';
			body = `The President has vetoed this bill, which returns the decision to Congress: a two-thirds vote in each chamber overrides the veto. I am writing at this stage because your vote is once again decisive. ${ask}`;
			break;
		}
	}

	return `${header}

${body}${signoff}`;
};

/** One member row: contact links + an expandable, editable message draft. */
const MemberContactRow = ({ member, bill, stance }: { member: CongressMember; bill: Bill; stance?: 'Yes' | 'No' }) => {
	const [draftOpen, setDraftOpen] = useState(false);
	const [draft, setDraft] = useState('');
	const [copied, setCopied] = useState(false);

	const toggleDraft = async () => {
		setCopied(false);
		if (draftOpen) {
			setDraftOpen(false);
			return;
		}
		setDraftOpen(true);
		const variant = resolveDraftVariant(bill, memberChamber(member));
		// Only the roll-call variant needs this member's recorded position; a
		// failed lookup degrades to the ask-dont-accuse wording.
		let memberVote: string | undefined;
		if (variant === 'roll-call') {
			setDraft('Preparing draft…');
			try {
				const log = await Requests.getMemberVoteLog(member.bioguideId ?? member.id);
				memberVote = (log ?? []).find((vote: { billId: string; vote: string }) => vote.billId === bill.id)?.vote;
			} catch {
				// No record reachable — the template asks them to confirm their vote.
			}
		}
		setDraft(draftMessage(member, bill, stance, variant, memberVote));
	};

	const copyDraft = async () => {
		try {
			await navigator.clipboard.writeText(draft);
			setCopied(true);
			setTimeout(() => setCopied(false), 2500);
		} catch {
			// Clipboard blocked (permissions/http) — user can still select + copy manually.
			console.error('Clipboard unavailable — select the text and copy manually.');
		}
		// Record the contact in the audit trail (CWC-gated server-side). Copying is
		// the moment of intent; a gate rejection must not block the manual send.
		Requests.recordContactMessage(member.bioguideId ?? member.id, bill.id, draft).catch((err) => {
			console.warn('Contact not recorded:', err instanceof Error ? err.message : err);
		});
	};

	return (
		<div className='contact-member-block'>
			<div className='contact-member'>
				<img
					src={member.photoURL ?? member.depiction?.imageUrl ?? ''}
					alt={member.name}
					className='contact-member-photo'
				/>
				<div className='contact-member-info'>
					<b>{member.name}</b>
					<span className='contact-member-party'>{member.party}</span>
				</div>
				<div className='contact-member-actions'>
					{member.phone && <a href={`tel:${member.phone}`}>📞 {member.phone}</a>}
					{member.url && (
						<a
							href={member.url}
							target='_blank'
							rel='noreferrer'>
							Website ↗
						</a>
					)}
					<button
						className='contact-email-button'
						onClick={toggleDraft}>
						{draftOpen ? 'Hide draft' : '✉️ Draft message'}
					</button>
				</div>
			</div>

			{draftOpen && (
				<div className='contact-draft'>
					<textarea
						value={draft}
						rows={9}
						onChange={(e) => setDraft(e.target.value)}
					/>
					<div className='contact-draft-actions'>
						<button onClick={copyDraft}>{copied ? '✓ Copied' : 'Copy message'}</button>
						<span className='contact-draft-hint'>
							Paste it into the contact form on{' '}
							{member.url ? (
								<a
									href={member.url}
									target='_blank'
									rel='noreferrer'>
									their website ↗
								</a>
							) : (
								'their website'
							)}
							.
						</span>
					</div>
				</div>
			)}
		</div>
	);
};

/** One chamber's block in the contact modal: a status note + the user's members. */
const ChamberSection = ({
	title,
	note,
	members,
	bill,
	stance,
}: {
	title: string;
	note: string;
	members: CongressMember[];
	bill: Bill;
	stance?: 'Yes' | 'No';
}) => {
	if (members.length === 0) return null;
	return (
		<div className='contact-chamber'>
			<h5 className='contact-chamber-title'>{title}</h5>
			<p className='contact-chamber-note'>{note}</p>
			{members.map((member) => (
				<MemberContactRow
					key={member.bioguideId ?? member.id}
					member={member}
					bill={bill}
					stance={stance}
				/>
			))}
		</div>
	);
};

/**
 * Single contact icon in the card's footer bar. Opens a modal with options to
 * reach the user's representative and/or senators.
 *
 * Visibility: shown while the bill is still IN CONGRESS. A chamber that already
 * passed the bill is NOT excluded — amendments can send a bill back for a new
 * vote (and a veto puts both chambers back in play for an override) — so
 * chamber status is shown as context inside the modal, not used as a gate.
 */
export const ComButton = ({ bill }: { bill: Bill }) => {
	const [open, setOpen] = useState(false);
	const { senators, houseReps } = useDisplayMember();
	const { voteLog } = useDisplayBills();
	// The user's own stance on this bill personalizes the drafted message.
	const stance = voteLog.find((vote) => vote.billId === bill.id)?.vote;

	// Escape closes the modal.
	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setOpen(false);
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open]);

	if (!billStillInCongress(bill.stage)) return null;

	const isVetoed = bill.stage === 'Vetoed';
	const chamberNote = (chamber: 'House' | 'Senate') => {
		if (isVetoed) return `Vetoed — the ${chamber} can vote on a two-thirds override.`;
		if (bill.stage === 'To President')
			return `Awaiting the President — a veto would send it back to the ${chamber} for an override vote.`;
		if (!chamberHasPassed(bill.actions, chamber)) return `The ${chamber} has not voted on this bill yet.`;
		const method = chamberPassage(bill.actions, chamber);
		return method === 'roll-call'
			? `The ${chamber} passed this by recorded vote; amendments in the other chamber could send it back.`
			: `The ${chamber} passed this WITHOUT recording individual positions — the draft asks your member to state theirs.`;
	};

	return (
		<>
			<b
				className='contact-toggle'
				title='Contact your representative and senators about this bill'
				onClick={(e) => {
					e.stopPropagation();
					setOpen(true);
				}}>
				✉️
			</b>

			{open && (
				<div
					className='rep-modal-backdrop'
					onClick={(e) => {
						e.stopPropagation();
						setOpen(false);
					}}>
					<div
						className='rep-modal contact-modal'
						onClick={(e) => e.stopPropagation()}>
						<button
							className='rep-modal-close'
							aria-label='Close'
							onClick={() => setOpen(false)}>
							×
						</button>
						<h4 className='contact-modal-title'>
							Contact your members about {bill.type.toUpperCase()} {bill.number}
						</h4>
						{(() => {
							// When CWC delivery launches, sending will require a verified email +
							// Census-verified district — start nudging users toward that now.
							const stored = localStorage.getItem('user');
							const user = stored ? JSON.parse(stored) : null;
							return user && user.emailVerified === false ? (
								<p className='contact-chamber-note'>
									📬 Verify your email (check your inbox) to be ready for direct message delivery when it launches.
								</p>
							) : null;
						})()}
						<ChamberSection
							title='Your Representative — U.S. House'
							note={chamberNote('House')}
							members={houseReps}
							bill={bill}
							stance={stance}
						/>
						<ChamberSection
							title='Your Senators — U.S. Senate'
							note={chamberNote('Senate')}
							members={senators}
							bill={bill}
							stance={stance}
						/>
						{houseReps.length === 0 && senators.length === 0 && (
							<p className='contact-chamber-note'>Sign in to see your representatives and senators.</p>
						)}
					</div>
				</div>
			)}
		</>
	);
};
