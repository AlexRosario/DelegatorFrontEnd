import { useDisplayBills } from '../../providers/BillProvider';
import { BillCollection } from './BillCollection';
import BillDiscover from './BillDiscover';

export const BillSection = () => {
	const { activeBillTab } = useDisplayBills();
	const userString = localStorage.getItem('user');
	const user = userString ? JSON.parse(userString) : null;

	return (
		<section className='bill-section'>
			{/* Discover/My Bills switching lives in the sidebar now. */}
			<div className='bill-container'>
				{activeBillTab === 'discover-bills' ? <BillDiscover /> : user && <BillCollection />}
			</div>
		</section>
	);
};
