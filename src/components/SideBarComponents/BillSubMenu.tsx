import { useAuthInfo } from '../../providers/AuthProvider';
import { useDisplayBills } from '../../providers/BillProvider';
import { useScreenInfo } from '../../providers/ScreenProvider';

export const BillSubMenu = () => {
	const { activeBillTab, setActiveBillTab } = useDisplayBills();
	const { user } = useAuthInfo();
	const { setScreenSelect } = useScreenInfo();
	return (
		<ul className='sub-menu'>
			<li
				className={`list-tab ${activeBillTab === 'discover-bills' ? 'active' : ''}`}
				onClick={() => {
					setScreenSelect('bills');
					setActiveBillTab('discover-bills');
				}}>
				Discover Bills
			</li>

			{user && (
				<li
					className={`list-tab ${activeBillTab === 'voted-bills' ? 'active' : ''}`}
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
