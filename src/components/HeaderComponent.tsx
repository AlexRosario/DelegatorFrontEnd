import { faHamburger, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import mainLogo from '../assets/main-logo.png';
import { useAuthInfo } from '../providers/AuthProvider';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { defaultUser } from '../providers/AuthProvider';
import { useEffect } from 'react';
import { Requests } from '../api';
import { useScreenInfo } from '../providers/ScreenProvider';

const NAV_ITEMS = [
	{ label: 'Bills', screen: 'bills' },
	{ label: 'My Reps', screen: 'reps' },
];

export const Header = () => {
	const { user, setUser } = useAuthInfo();
	const { screenSelect, setScreenSelect } = useScreenInfo();
	const { pathname } = useLocation();
	const navigate = useNavigate();
	// menuOpen drives the mobile hamburger; settingsOpen the desktop Settings dropdown.
	const [menuOpen, setMenuOpen] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [scrolled, setScrolled] = useState(false);
	const isSignedIn = Boolean(user.username);

	useEffect(() => {
		const handleScroll = () => {
			setScrolled(window.scrollY > 50);
		};

		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	const logOut = async () => {
		setUser(defaultUser);
		localStorage.clear();
		// The session lives in an httpOnly cookie — ask the server to clear it.
		await Requests.logout();
		window.location.href = '/';
	};

	const goTo = (screen: string) => {
		setScreenSelect(screen);
		setMenuOpen(false);
		setSettingsOpen(false);
		if (pathname !== '/bills') navigate('/bills');
	};

	const navLinks = NAV_ITEMS.map((item) => (
		<button
			key={item.screen}
			type='button'
			className={`header-nav-link ${pathname === '/bills' && screenSelect === item.screen ? 'active' : ''}`}
			aria-current={pathname === '/bills' && screenSelect === item.screen ? 'page' : undefined}
			onClick={() => goTo(item.screen)}>
			{item.label}
		</button>
	));

	const accountItems = (
		<>
			<span className='header-dropdown-user'>{user.username}</span>
			<button
				type='button'
				className='log-out'
				onClick={logOut}>
				Log Out
			</button>
		</>
	);

	return (
		<>
			<div className={`header-container ${scrolled ? 'scrolled' : ''}`}>
				<Link
					to='/'
					className='logo-wrapper'>
					<img
						src={mainLogo}
						alt='Delegator Logo'
						className='gator-logo'
					/>
				</Link>

				{isSignedIn && (
					<nav className='header-nav'>
						{navLinks}
						<button
							type='button'
							className={`header-nav-link ${settingsOpen ? 'active' : ''}`}
							aria-expanded={settingsOpen}
							onClick={() => setSettingsOpen(!settingsOpen)}>
							Settings
						</button>
					</nav>
				)}

				<div className='header-user'>
					<div className='header-actions'>
						<span className='live-feed-badge'>
							<span className='live-feed-dot' />
							<span className='live-feed-label'>Live feed</span>
						</span>
						{!isSignedIn && pathname === '/bills' && (
							<Link
								to='/home'
								className='header-sign-in'>
								Sign in
							</Link>
						)}
						{isSignedIn && (
							<button
								type='button'
								className='menu-burger'
								aria-label='Toggle navigation'
								aria-expanded={menuOpen}
								onClick={() => setMenuOpen(!menuOpen)}>
								<FontAwesomeIcon icon={menuOpen ? faXmark : faHamburger} />
							</button>
						)}
					</div>

					{isSignedIn && settingsOpen && <div className='header-dropdown settings-dropdown'>{accountItems}</div>}
					{isSignedIn && menuOpen && (
						<div className='header-dropdown mobile-menu'>
							{navLinks}
							<hr />
							{accountItems}
						</div>
					)}
				</div>
			</div>
		</>
	);
};
