import {
	faHashtag,
	faLandmarkDome,
	faCheckToSlot,
	faUsers,
	faLandmark,
	faHouseFlag,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useScreenInfo } from '../../providers/ScreenProvider';
import { useDisplayBills } from '../../providers/BillProvider';
import { useDisplayMember } from '../../providers/MemberProvider';

/**
 * Flat navigation — no parent categories, no hover submenus. Each item IS a
 * destination, so the same list works as the desktop sidebar and the mobile
 * bottom bar with no per-breakpoint mounting logic. The list is scoped to the
 * current screen (bills vs. reps); the header nav switches between screens.
 */
export const SideBar = ({ scrolled }: { scrolled: boolean }) => {
	const { screenSelect } = useScreenInfo();
	const { activeBillTab, setActiveBillTab, searchType, setSearchType } = useDisplayBills();
	const { chamber, setChamber } = useDisplayMember();

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

	// chamber '' means both chambers (see RepSection).
	const repItems = [
		{ label: 'All Reps', icon: faUsers, active: chamber === '', select: () => setChamber('') },
		{ label: 'Senate', icon: faLandmark, active: chamber === 'senate', select: () => setChamber('senate') },
		{ label: 'House', icon: faHouseFlag, active: chamber === 'house', select: () => setChamber('house') },
	];

	const items = screenSelect === 'reps' ? repItems : billItems;

	return (
		<aside className={`side-bar ${scrolled ? 'scrolled' : ''}`}>
			<ul className={scrolled ? 'scrolled' : ''}>
				{items.map((item) => (
					<li
						key={item.label}
						className={`screenSelect ${item.active ? 'active' : ''}`}
						onClick={item.select}>
						<FontAwesomeIcon icon={item.icon} />
						{item.label}
					</li>
				))}
			</ul>
		</aside>
	);
};
