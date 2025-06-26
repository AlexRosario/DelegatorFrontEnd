import { Link } from 'react-router-dom';
import { SignIn } from '../auth-components/SignIn';

export const Home = () => {
	return (
		<>
			<div className='home'>
				<div className='home-left'>
					<h1>
						<span>DE</span>
						<span>LEGATOR</span>
					</h1>
				</div>
				<div className='home-right'>
					<SignIn />

					<div className='home-register'>
						<hr></hr>
						<Link to='/Register'>
							<button type='submit'>Create account</button>
						</Link>

						<Link
							to='/Register'
							className='join-link'>
							Not a member yet?
						</Link>
					</div>
				</div>
				<div className='contact'></div>
			</div>
		</>
	);
};
