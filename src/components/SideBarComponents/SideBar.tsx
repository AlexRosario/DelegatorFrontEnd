import { faChair, faLandmarkDome } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useScreenInfo } from '../../providers/ScreenProvider';
import { useState } from 'react';
import { BillSubMenu } from './BillSubMenu';
import { RepSubMenu } from './RepSubMenu';
import { useDisplayMember } from '../../providers/MemberProvider';
import { useMediaQuery } from '../../hooks/useMediaQuery';
export const SideBar = ({ scrolled }: { scrolled: boolean }) => {
	const { screenSelect, setScreenSelect } = useScreenInfo();
	const { setChamber } = useDisplayMember();

	// Mirrors the App.css bottom-bar breakpoint. On mobile the bill submenu is a
	// permanent part of the bar, so hover state must not unmount it.
	const isMobile = useMediaQuery('(max-width: 727px)');
	const [toggleMenu, setToggleMenu] = useState<'bills' | 'reps' | undefined>('bills');

	return (
		<aside
			className={`side-bar ${scrolled ? 'scrolled' : ''}`}
			onMouseLeave={() => setToggleMenu(undefined)}>
			<ul className={`${scrolled ? 'scrolled' : ''}`}>
				{/* Hover highlight is desktop-only: touch fires mouseenter on tap but never
				    mouseleave, so on mobile a stale toggleMenu would pin the wrong item.
				    bills-select is hidden on mobile — its sub-tabs are the navigation. */}
				<li
					className={`screenSelect bills-select ${(!isMobile && toggleMenu === 'bills') || screenSelect === 'bills' ? 'active' : ''}`}
					onMouseEnter={() => setToggleMenu('bills')}
					onClick={() => setScreenSelect('bills')}>
					<FontAwesomeIcon icon={faLandmarkDome} /> Bills
				</li>
				{(isMobile || screenSelect == 'bills' || toggleMenu == 'bills') && <BillSubMenu />}

				<li
					className={`screenSelect ${(!isMobile && toggleMenu === 'reps') || screenSelect == 'reps' ? 'active' : ''}`}
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
