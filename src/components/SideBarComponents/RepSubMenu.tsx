import { useScreenInfo } from '../../providers/ScreenProvider';
import { useDisplayMember } from '../../providers/MemberProvider';
export const RepSubMenu = () => {
	const { chamber, setChamber } = useDisplayMember();

	const { setScreenSelect } = useScreenInfo();

	return (
		<ul className='sub-menu'>
			<li
				key={'senate'}
				className={`list-tab ${chamber === 'senate' ? 'active' : ''}`}
				onClick={() => {
					setScreenSelect('reps');
					setChamber('senate');
				}}>
				Senate
			</li>
			<li
				key={'house'}
				className={`list-tab ${chamber === 'house' ? 'active' : ''}`}
				onClick={() => {
					setScreenSelect('reps');
					setChamber('house');
				}}>
				House
			</li>
		</ul>
	);
};
