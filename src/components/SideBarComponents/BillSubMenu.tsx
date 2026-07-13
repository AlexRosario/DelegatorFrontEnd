import { useAuthInfo } from '../../providers/AuthProvider';
import { useDisplayBills } from '../../providers/BillProvider';
import { useScreenInfo } from '../../providers/ScreenProvider';

export const BillSubMenu = () => {
	const { activeBillTab, setActiveBillTab } = useDisplayBills();
	const { user } = useAuthInfo();
	const { screenSelect, setScreenSelect } = useScreenInfo();
	// bill-sub-menu: on mobile this renders INSIDE the bottom bar (the generic
	// .sub-menu is hidden there, but this one is shown inline). A tab is only
	// "active" while the bills screen is showing — on the reps screen these act
	// as plain navigation.
	const onBills = screenSelect === 'bills';
	return (
		<ul className='sub-menu bill-sub-menu'>
			<li
				className={`sub-list-tab ${onBills && activeBillTab === 'discover-bills' ? 'active' : ''}`}
				onClick={() => {
					setScreenSelect('bills');
					setActiveBillTab('discover-bills');
				}}>
				Discover Bills
			</li>

			{user && (
				<li
					className={`sub-list-tab ${onBills && activeBillTab === 'voted-bills' ? 'active' : ''}`}
					onClick={() => {
						setScreenSelect('bills');
						setActiveBillTab('voted-bills');
					}}>
					My Bills
				</li>
			)}
		</ul>
	);
};
