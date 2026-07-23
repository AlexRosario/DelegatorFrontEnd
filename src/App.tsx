import './App.scss';
import { Header } from './components/HeaderComponent';
import { BillSection } from './components/BillComponents/BillSection';
import { RepSection } from './components/RepComponents/RepSection';
import './fonts/BarlowCondensed-SemiBold.ttf';
import { BillProvider } from './providers/BillProvider';
import { MemberProvider } from './providers/MemberProvider';
import { useScreenInfo } from './providers/ScreenProvider';
import { useAuthInfo } from './providers/AuthProvider';
import { SideBar } from './components/SideBarComponents/SideBar';
import { useEffect, useState } from 'react';
function App() {
	const { screenSelect } = useScreenInfo();
	const { user } = useAuthInfo();
	const isSignedIn = Boolean(user.username);

	const [scrolled, setScrolled] = useState(false);
	useEffect(() => {
		const handleScroll = () => {
			setScrolled(window.scrollY > 50);
		};

		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);
	return (
		<div className='main'>
			<Header />

			<BillProvider>
				<MemberProvider>
					<div className={`main-body ${scrolled ? 'scrolled' : ''}${isSignedIn ? '' : ' no-nav'}`}>
						{/* Guests browse bills only — the Bills/Reps nav (sidebar on desktop,
						    bottom bar on mobile) appears once they sign in. */}
						{isSignedIn && <SideBar scrolled={scrolled} />}

						<div className={`content ${scrolled ? 'scrolled' : ''}`}>
							{screenSelect == 'bills' ? <BillSection /> : <RepSection />}
						</div>
					</div>
				</MemberProvider>
			</BillProvider>
			<footer>'E Pluribus Unum'</footer>
		</div>
	);
}

export default App;
