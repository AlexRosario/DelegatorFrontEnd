import { useDisplayBills } from '../../providers/BillProvider';

export const BillStatus = () => {
  const {
    billsToDisplay,
    billSubject,
    currentIndex,
    activeBillTab,
    filteredBills
  } = useDisplayBills();

  const noDiscoverBillsToDisplay =
    activeBillTab === 'discover-bills' && billsToDisplay.length === 0;
  const noVotedBillsToDisplay =
    activeBillTab === 'voted-bills' && billsToDisplay.length === 0;
  const billSubjectIsEmpty =
    billSubject !== '' &&
    activeBillTab === 'voted-bills' &&
    billsToDisplay.length === 0;
  const discoverBillsIsPopulated =
    activeBillTab === 'discover-bills' && billsToDisplay.length !== 0;
  const votedBillsIsPopulated =
    activeBillTab === 'voted-bills' && billsToDisplay.length !== 0;

  return (
    <>
      <div className="bills-status">
        {noDiscoverBillsToDisplay && (
          <div className="animate-text">Loading...</div>
        )}
        {noVotedBillsToDisplay && <div>No Bills in Collection</div>}
        {billSubjectIsEmpty && <div>Couldn't fulfill request at this time</div>}
        {discoverBillsIsPopulated && (
          <h2>{`Most Recent Bills ${filteredBills.length == 0 ? 0 : currentIndex + 1} of ${
            filteredBills.length
          }`}</h2>
        )}
        {votedBillsIsPopulated && (
          <h2>{`${billSubject ? billSubject : 'All'} Bills`} </h2>
        )}
      </div>
    </>
  );
};
