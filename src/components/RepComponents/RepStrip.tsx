import { useEffect, useState } from 'react';
import type { CongressMember } from '../../types';
import { useDisplayMember } from '../../providers/MemberProvider';
import { useAlignment, alignmentColor } from '../../hooks/useAlignment';
import { RepCard } from './RepCard';

/**
 * The ring fills clockwise in proportion to the alignment score and takes the
 * score's threshold color; a full gray ring means "nothing to compare yet".
 */
const RepBubble = ({ member, onOpen }: { member: CongressMember; onOpen: (member: CongressMember) => void }) => {
	const bioguideId = member.bioguideId ?? member.id;
	const { score, comparedCount } = useAlignment(bioguideId);

	const ringBackground =
		score === null
			? alignmentColor(null)
			: `conic-gradient(${alignmentColor(score)} ${score}%, #e0e0e0 0)`;
	const label =
		score === null
			? `${member.name} — no shared roll-call votes yet`
			: `${member.name} — ${Math.round(score)}% aligned across ${comparedCount} shared vote${comparedCount === 1 ? '' : 's'}`;
	const lastName = member.lastName ?? member.name.split(' ').pop();

	return (
		<div
			className='rep-bubble'
			title={label}
			role='button'
			tabIndex={0}
			onClick={() => onOpen(member)}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') onOpen(member);
			}}>
			<div
				className='rep-ring'
				style={{ background: ringBackground }}>
				<img
					src={member.photoURL ?? member.depiction?.imageUrl ?? ''}
					alt={member.name}
				/>
			</div>
			<span className='rep-bubble-name'>{lastName}</span>
			<span className='rep-bubble-score'>{score === null ? '—' : `${Math.round(score)}%`}</span>
		</div>
	);
};

/**
 * Instagram-stories-style strip of the user's reps, senators first. Clicking a
 * bubble opens that rep's full card in a modal over the feed.
 */
export const RepStrip = () => {
	const { senators, houseReps } = useDisplayMember();
	const [openRep, setOpenRep] = useState<CongressMember | null>(null);
	const reps = [...senators, ...houseReps];

	// Escape closes the modal.
	useEffect(() => {
		if (!openRep) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setOpenRep(null);
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [openRep]);

	if (reps.length === 0) return null;

	return (
		<>
			<div className='rep-strip'>
				{reps.map((member) => (
					<RepBubble
						key={member.bioguideId ?? member.id}
						member={member}
						onOpen={setOpenRep}
					/>
				))}
			</div>

			{openRep && (
				<div
					className='rep-modal-backdrop'
					onClick={() => setOpenRep(null)}>
					{/* stopPropagation so clicks inside the card don't dismiss it */}
					<div
						className='rep-modal'
						onClick={(e) => e.stopPropagation()}>
						<button
							className='rep-modal-close'
							aria-label='Close'
							onClick={() => setOpenRep(null)}>
							×
						</button>
						<RepCard member={openRep} />
					</div>
				</div>
			)}
		</>
	);
};
