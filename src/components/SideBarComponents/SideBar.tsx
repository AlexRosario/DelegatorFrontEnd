import { faChair, faHashtag, faLandmarkDome, faCheckToSlot } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useScreenInfo } from '../../providers/ScreenProvider';
import { useDisplayBills } from '../../providers/BillProvider';
import { useDisplayMember } from '../../providers/MemberProvider';

/**
 * Flat navigation — no parent categories, no hover submenus. Each item IS a
 * destination, so the same list works as the desktop sidebar and the mobile
 * bottom bar with no per-breakpoint mounting logic.
 */
export const SideBar = ({ scrolled }: { scrolled: boolean }) => {
	const { screenSelect, setScreenSelect } = useScreenInfo();
	const { activeBillTab, setActiveBillTab, searchType, setSearchType } = useDisplayBills();
	const { setChamber } = useDisplayMember();

	const onBills = screenSelect === 'bills';
	const items = [
		{
			label: 'Hopper',
			icon: faLandmarkDome,
			active: onBills && activeBillTab === 'discover-bills' && searchType === 'hopper',
			select: () => {
				setScreenSelect('bills');
				setActiveBillTab('discover-bills');
				setSearchType('hopper');
			},
		},
		{
			label: 'Bill Number',
			icon: faHashtag,
			active: onBills && activeBillTab === 'discover-bills' && searchType === 'bill-number',
			select: () => {
				setScreenSelect('bills');
				setActiveBillTab('discover-bills');
				setSearchType('bill-number');
			},
		},
		{
			label: 'My Bills',
			icon: faCheckToSlot,
			active: onBills && activeBillTab === 'voted-bills',
			select: () => {
				setScreenSelect('bills');
				setActiveBillTab('voted-bills');
			},
		},
		{
			label: 'Reps',
			icon: faChair,
			active: screenSelect === 'reps',
			select: () => {
				setScreenSelect('reps');
				setChamber('');
			},
		},
	];

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
