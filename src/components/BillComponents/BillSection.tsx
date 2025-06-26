import { useDisplayBills } from '../../providers/BillProvider';
import { BillCollection } from './BillCollection';
import BillDiscover from './BillDiscover';

export const BillSection = () => {
  const { activeBillTab, setActiveBillTab } = useDisplayBills();
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;

  return (
    <section className="bill-section">
      <div className="bill-list">
        <button
          className={`bill-list-button ${activeBillTab === 'discover-bills' ? 'selected' : ''}`}
          onClick={() => {
            setActiveBillTab('discover-bills');
          }}
        >
          Discover Bills
        </button>
        {user && (
          <button
            className={`bill-list-button ${activeBillTab === 'voted-bills' ? 'selected' : ''}`}
            onClick={() => {
              setActiveBillTab('voted-bills');
            }}
          >
            My Bills
          </button>
        )}
      </div>

      <div className="bill-container">
        {activeBillTab === 'discover-bills' ? (
          <BillDiscover />
        ) : (
          user && <BillCollection />
        )}
      </div>
    </section>
  );
};
