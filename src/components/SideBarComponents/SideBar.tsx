import {
	faHashtag,
	faLandmarkDome,
	faCheckToSlot,
	faUsers,
	faLandmark,
	faHouseFlag,
	faClockRotateLeft,
	faMapLocationDot,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useScreenInfo } from '../../providers/ScreenProvider';
import { useDisplayBills } from '../../providers/BillProvider';
import { useDisplayMember } from '../../providers/MemberProvider';
import type { PastView } from '../../providers/MemberProvider';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

/**
 * Flat navigation — no parent categories, no hover submenus. Each item IS a
 * destination, so the same list works as the desktop sidebar and the mobile
 * bottom bar with no per-breakpoint mounting logic. The list is scoped to the
 * current screen (bills vs. reps); the header nav switches between screens.
 */
export const SideBar = ({ scrolled }: { scrolled: boolean }) => {
	const { screenSelect } = useScreenInfo();
	const { activeBillTab, setActiveBillTab, searchType, setSearchType } = useDisplayBills();
	const { chamber, setChamber, pastView, setPastView } = useDisplayMember();

	const billItems = [
		{
			label: 'Hopper',
			icon: faLandmarkDome,
			active: activeBillTab === 'discover-bills' && searchType === 'hopper',
			select: () => {
				setActiveBillTab('discover-bills');
				setSearchType('hopper');
			},
		},
		{
			label: 'Bill Number',
			icon: faHashtag,
			active: activeBillTab === 'discover-bills' && searchType === 'bill-number',
			select: () => {
				setActiveBillTab('discover-bills');
				setSearchType('bill-number');
			},
		},
		{
			label: 'My Bills',
			icon: faCheckToSlot,
			active: activeBillTab === 'voted-bills',
			select: () => setActiveBillTab('voted-bills'),
		},
	];

	// chamber '' means both chambers (see RepSection). The chamber filter applies
	// to the current reps and to whichever past-reps section is showing below them.
	// The two past sections are toggles: turning one on turns the other off, and
	// clicking the active one hides it.
	const pastItem = (label: string, icon: IconDefinition, view: PastView, groupStart = false) => ({
		label,
		icon,
		groupStart,
		active: pastView === view,
		select: () => setPastView(pastView === view ? 'none' : view),
	});
	const repItems = [
		{ label: 'All Reps', chamberFilter: true, icon: faUsers, active: chamber === '', select: () => setChamber('') },
		{ label: 'Senate', chamberFilter: true, icon: faLandmark, active: chamber === 'senate', select: () => setChamber('senate') },
		{ label: 'House', chamberFilter: true, icon: faHouseFlag, active: chamber === 'house', select: () => setChamber('house') },
		pastItem('My Past Reps', faClockRotateLeft, 'mine', true),
		pastItem('Past District Reps', faMapLocationDot, 'district'),
	];

	const items: {
		label: string;
		icon: IconDefinition;
		active: boolean;
		select: () => void;
		groupStart?: boolean;
		/** Hidden in the mobile bottom bar; the reps page shows chamber pills instead. */
		chamberFilter?: boolean;
	}[] =
		screenSelect === 'reps' ? repItems : billItems;

	return (
		<aside className={`side-bar ${scrolled ? 'scrolled' : ''}`}>
			<ul className={scrolled ? 'scrolled' : ''}>
				{items.map((item) => (
					<li
						key={item.label}
						className={`screenSelect ${item.active ? 'active' : ''} ${item.groupStart ? 'group-start' : ''} ${item.chamberFilter ? 'chamber-filter' : ''}`}
						onClick={item.select}>
						<FontAwesomeIcon icon={item.icon} />
						{item.label}
					</li>
				))}
			</ul>
		</aside>
	);
};
