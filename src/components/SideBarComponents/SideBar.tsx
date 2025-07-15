import { faChair, faLandmarkDome } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useScreenInfo } from '../../providers/ScreenProvider';
import { useState } from 'react';
import { BillSubMenu } from './BillSubMenu';
import { RepSubMenu } from './RepSubMenu';
import { useDisplayMember } from '../../providers/MemberProvider';
export const SideBar = ({ scrolled }: { scrolled: boolean }) => {
	const { screenSelect, setScreenSelect } = useScreenInfo();
	const { setChamber } = useDisplayMember();

	const [toggleMenu, setToggleMenu] = useState<'bills' | 'reps' | undefined>('bills');

	return (
		<aside
			className={`side-bar ${scrolled ? 'scrolled' : ''}`}
			onMouseLeave={() => setToggleMenu(undefined)}>
			<ul className={`${scrolled ? 'scrolled' : ''}`}>
				<li
					className={`screenSelect ${toggleMenu === 'bills' || screenSelect === 'bills' ? 'active' : ''}`}
					onMouseEnter={() => setToggleMenu('bills')}
					onClick={() => setScreenSelect('bills')}>
					<FontAwesomeIcon icon={faLandmarkDome} /> Bills
				</li>
				{(screenSelect == 'bills' || toggleMenu == 'bills') && <BillSubMenu />}

				<li
					className={`screenSelect ${toggleMenu === 'reps' || screenSelect == 'reps' ? 'active' : ''}`}
					onMouseEnter={() => {
						setToggleMenu('reps');
					}}
					onClick={() => {
						setScreenSelect('reps');
						setChamber('');
					}}>
					<FontAwesomeIcon icon={faChair} />
					Reps
				</li>
				{(screenSelect == 'reps' || toggleMenu == 'reps') && <RepSubMenu />}
			</ul>
		</aside>
	);
};
