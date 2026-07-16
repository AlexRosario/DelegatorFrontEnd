import { faAngleLeft, faHamburger } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import mainLogo from '../assets/main-logo.png';
import { useAuthInfo } from '../providers/AuthProvider';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { defaultUser } from '../providers/AuthProvider';
import { useEffect } from 'react';
import { Requests } from '../api';

export const Header = () => {
	const { user, setUser } = useAuthInfo();
	const [menuOpen, setMenuOpen] = useState(false);
	const [scrolled, setScrolled] = useState(false);

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

	return (
		<>
			<div className={`header-container ${scrolled ? 'scrolled' : ''}`}>
				<div className='logo-wrapper'>
					<img
						src={mainLogo}
						alt='Delegator Logo'
						className='gator-logo'
					/>
				</div>

				<div className='header-user'>
					{user.username ? (
						!menuOpen ? (
							<FontAwesomeIcon
								icon={faHamburger}
								className='menu-burger'
								onClick={() => {
									setMenuOpen(!menuOpen);
								}}
							/>
						) : (
							<>
								<div className='settings-header'>
									<FontAwesomeIcon
										icon={faAngleLeft}
										onClick={() => {
											setMenuOpen(!menuOpen);
										}}
									/>
									<b>Settings</b>
								</div>
								<div className='profile'>
									<h4>{user?.username}</h4>
									<h6
										onClick={logOut}
										className='log-out'>
										Log Out
									</h6>
								</div>
							</>
						)
					) : (
						<Link
							to='/Home'
							className='header_sign-in-link'>
							Sign in
						</Link>
					)}
				</div>
			</div>
		</>
	);
};
