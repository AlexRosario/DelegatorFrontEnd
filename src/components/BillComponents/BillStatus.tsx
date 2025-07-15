import { useDisplayBills } from '../../providers/BillProvider';

type BillStatusProps = {
	searchType?: 'bill-number' | 'hopper';
};

export const BillStatus: React.FC<BillStatusProps> = ({ searchType }) => {
	const { billsToDisplay, billSubject, currentIndex, activeBillTab, filteredBills, passedBills } = useDisplayBills();

	const noDiscoverBillsToDisplay = activeBillTab === 'discover-bills' && billsToDisplay.length === 0;
	const noVotedBillsToDisplay = activeBillTab === 'voted-bills' && billsToDisplay.length === 0;
	const billSubjectIsEmpty = billSubject !== '' && activeBillTab === 'voted-bills' && billsToDisplay.length === 0;
	const discoverBillsIsPopulated = activeBillTab === 'discover-bills' && billsToDisplay.length !== 0;
	const votedBillsIsPopulated = activeBillTab === 'voted-bills' && billsToDisplay.length !== 0;

	return (
		<div className='bills-status'>
			{noDiscoverBillsToDisplay && <div className='animate-text'>Loading...</div>}
			{noVotedBillsToDisplay && <div>No Bills in Collection</div>}
			{billSubjectIsEmpty && <div>Couldn't fulfill request at this time</div>}
			{votedBillsIsPopulated && <h2>{`${billSubject ? billSubject : 'All'} Bills`} </h2>}
			{discoverBillsIsPopulated && searchType == 'hopper' && (
				<h2>
					{`Most Recent Bills ${filteredBills.length == 0 ? 0 : currentIndex + 1} of ${filteredBills.length}`}
					{passedBills.length == 0 && (
						<div style={window.innerWidth < 1000 ? { display: 'none' } : undefined}>
							<b>Congressional Bills made into law in this collection</b>
							<b>: {passedBills.length}</b>
						</div>
					)}
				</h2>
			)}
		</div>
	);
};
