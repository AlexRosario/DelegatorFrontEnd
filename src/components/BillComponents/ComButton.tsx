import { useEffect, useState } from 'react';
import type { Bill, CongressMember } from '../../types';
import { useDisplayMember } from '../../providers/MemberProvider';
import { useDisplayBills } from '../../providers/BillProvider';
import { chamberHasPassed, billStillInCongress } from '../../utils/passage-utils';

/** Draft a constituent message for one member, personalized with the user's
 *  stance on the bill (from their in-app vote) and a roll-call transparency ask. */
const draftMessage = (member: CongressMember, bill: Bill, stance?: 'Yes' | 'No') => {
	const honorific = member.area === 'US House' ? 'Representative' : 'Senator';
	const lastName = member.lastName ?? member.name.split(' ').pop();
	const title = bill.title.length > 120 ? bill.title.slice(0, 117) + '…' : bill.title;
	const stanceLine =
		stance === 'Yes'
			? 'I support this bill and urge you to vote YES when it comes before you.'
			: stance === 'No'
				? 'I oppose this bill and urge you to vote NO when it comes before you.'
				: 'I urge you to give it your full consideration and to represent the views of our district.';

	return `Dear ${honorific} ${lastName},

As your constituent, I am writing about ${bill.type.toUpperCase()} ${bill.number} — "${title}".

${stanceLine}

I follow how my representatives vote, including passage by voice vote. If this bill comes to the floor, please support a recorded roll-call vote so constituents can see where you stand.

Respectfully,
[Your name]`;
};

/** One member row: contact links + an expandable, editable message draft. */
const MemberContactRow = ({ member, bill, stance }: { member: CongressMember; bill: Bill; stance?: 'Yes' | 'No' }) => {
	const [draftOpen, setDraftOpen] = useState(false);
	const [draft, setDraft] = useState('');
	const [copied, setCopied] = useState(false);

	const toggleDraft = () => {
		if (!draftOpen) setDraft(draftMessage(member, bill, stance));
		setDraftOpen((open) => !open);
		setCopied(false);
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
		return chamberHasPassed(bill.actions, chamber)
			? `The ${chamber} has passed this bill, but amendments in the other chamber could send it back for another vote.`
			: `The ${chamber} has not voted on this bill yet.`;
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
