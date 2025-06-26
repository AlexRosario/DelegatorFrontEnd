import { faChair, faLandmarkDome } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useScreenInfo } from '../providers/ScreenProvider';

export const SideBar = () => {
  const { screenSelect, setScreenSelect } = useScreenInfo();

  return (
    <aside className="side-bar">
      <div className="side-bar-list" style={{ listStyle: 'none' }}>
        <li>you</li>
        <li>
          Bills{' '}
          <FontAwesomeIcon
            icon={faLandmarkDome}
            className={`screenSelect ${screenSelect === 'bills' ? 'active' : ''}`}
            onClick={() => setScreenSelect('bills')}
          />
        </li>
        <li>
          {' '}
          <FontAwesomeIcon
            icon={faChair}
            className={`screenSelect ${screenSelect === 'reps' ? 'active' : ''}`}
            onClick={() => {
              setScreenSelect('reps');
            }}
          />
          Reps
        </li>
        <li>af</li>
      </div>
    </aside>
  );
};
