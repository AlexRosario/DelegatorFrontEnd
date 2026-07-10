import { Link } from 'react-router-dom';
import { SignIn } from '../auth-components/SignIn';
import mainLogo from '../assets/main-logo.png';

export const Home = () => {
	return (
		<div className='home'>
			<div className='home-hero'>
				<img
					src={mainLogo}
					alt='Delegator'
					className='home-logo'
				/>
				<h1>
					<span>DELE</span>
					<span>GATOR</span>
				</h1>
				<p className='home-tagline'>Congress works for you. Watch it like you mean it.</p>
				<ul className='home-features'>
					<li>📜 Every bill, summarized — with plain-English translations</li>
					<li>🗳️ Vote yourself, then see how your representatives measure up</li>
					<li>✉️ Reach your members while a bill can still be changed</li>
				</ul>
			</div>

			<div className='home-card'>
				<h2>Welcome back</h2>
				<SignIn />
				<div className='home-divider'>
					<span>New to Delegator?</span>
				</div>
				<Link
					to='/Register'
					className='home-register-link'>
					<button
						type='button'
						className='home-secondary'>
						Create an account
					</button>
				</Link>
			</div>
		</div>
	);
};
