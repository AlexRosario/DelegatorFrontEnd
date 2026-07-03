import { useContext, createContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Requests } from '../api';
import type { Bill, Vote } from '../types';

const PAGE_SIZE = 20;
/** Fetch another page when the discover pool drops to this many unseen bills. */
const LOW_POOL_THRESHOLD = 10;

type BillFilter = 'Passed' | 'Bills with Votes' | 'All Bills';
type BillTab = 'discover-bills' | 'voted-bills';
type SearchType = 'hopper' | 'bill-number';

type TBillProvider = {
	// Bill collections (derived)
	billsToDisplay: Bill[];
	filteredBills: Bill[];
	passedBills: Bill[];
	billsWithRollCalls: Bill[];
	// Config
	congress: number;
	// Filters / tabs
	billSubject: string;
	setBillSubject: (subject: string) => void;
	billFilter: BillFilter;
	setBillFilter: (filter: BillFilter) => void;
	activeBillTab: BillTab;
	setActiveBillTab: (tab: BillTab) => void;
	// User votes
	voteLog: Vote[];
	setVoteLog: React.Dispatch<React.SetStateAction<Vote[]>>;
	setVotedOnThisBill: (voted: boolean) => void;
	// Feed pagination (bumped by BillFeed's scroll sentinel)
	currentIndex: number;
	setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
	searchType: SearchType;
	setSearchType: React.Dispatch<React.SetStateAction<SearchType>>;
};

export const BillContext = createContext<TBillProvider>({
	billsToDisplay: [],
	filteredBills: [],
	passedBills: [],
	billsWithRollCalls: [],
	congress: 119,
	billSubject: '',
	setBillSubject: () => {},
	billFilter: 'All Bills',
	setBillFilter: () => {},
	activeBillTab: 'discover-bills',
	setActiveBillTab: () => {},
	voteLog: [],
	setVoteLog: () => {},
	setVotedOnThisBill: () => {},
	currentIndex: 0,
	setCurrentIndex: () => {},
	searchType: 'hopper',
	setSearchType: () => {},
});

const readStoredVoteLog = (): Vote[] => {
	const stored = localStorage.getItem('userLog');
	return stored ? JSON.parse(stored) : [];
};

export const BillProvider = ({ children }: { children: ReactNode }) => {
	const [voteLog, setVoteLog] = useState<Vote[]>(readStoredVoteLog);
	const [votedOnThisBill, setVotedOnThisBill] = useState(false);
	const [allBills, setAllBills] = useState<Bill[]>([]);
	const [newBills, setNewBills] = useState<Bill[]>([]);
	const [votedBills, setVotedBills] = useState<Bill[]>([]);
	const [activeBillTab, setActiveBillTab] = useState<BillTab>('discover-bills');
	const [billSubject, setBillSubject] = useState('');
	const [billFilter, setBillFilter] = useState<BillFilter>('All Bills');
	const [congress] = useState(119);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [searchType, setSearchType] = useState<'hopper' | 'bill-number'>('hopper');

	const prevIndexRef = useRef(currentIndex); // last index the fetch effect saw (scroll-direction detection)
	const isFetchingRef = useRef(false); // prevents overlapping page fetches

	const isFirstLoad = allBills.length === 0;

	// Derived collections
	const billsToDisplay = activeBillTab === 'discover-bills' ? newBills : votedBills;
	const passedBills = billsToDisplay.filter(
		// This text covers all bill types, including those not needing presidential signatures.
		(bill) => bill.latestAction.text.includes('Became Public Law No:')
	);
	const billsWithRollCalls = billsToDisplay.filter(
		(bill) =>
			Array.isArray(bill.actions) &&
			bill.actions.some((action) => Array.isArray(action.recordedVotes) && action.recordedVotes.length > 0)
	);
	const filteredBills =
		billFilter === 'Passed' ? passedBills : billFilter === 'Bills with Votes' ? billsWithRollCalls : billsToDisplay;

	/** Look up the bills a user has voted on (vote records store the canonical Bill.id). */
	const fetchUserBills = async (votes: Vote[]) => {
		try {
			const bills = await Promise.all(votes.map((vote) => Requests.getBillById(vote.billId)));
			return bills.filter((bill): bill is Bill => bill !== null);
		} catch (error) {
			console.error('Error fetching bill record:', error);
			return [];
		}
	};

	/** One page of pre-assembled bills from our DB. Offset derives from what we
	 *  already hold, so a failed request never skips a page. */
	const fetchNextPage = async () => {
		const data = await Requests.getBillsFromDb(String(congress), allBills.length, PAGE_SIZE);
		return (data?.bills ?? []) as Bill[];
	};

	// Partition fetched bills into the discover pool (unvoted), and keep the
	// voted-bills list stocked with the bills behind the user's vote records.
	useEffect(() => {
		setNewBills(allBills.filter((bill) => !voteLog.some((vote) => vote.billId === bill.id)));

		const votesToLoad = isFirstLoad ? voteLog : votedOnThisBill ? voteLog.slice(-1) : [];
		if (votesToLoad.length > 0) {
			fetchUserBills(votesToLoad).then((bills) => {
				if (bills.length === 0) return;
				setVotedBills((prev) => {
					const existing = new Set(prev.map((bill) => bill.id));
					return [...prev, ...bills.filter((bill) => !existing.has(bill.id))];
				});
				localStorage.setItem('userLog', JSON.stringify(voteLog));
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [allBills, voteLog]);

	// Fetch the next page when the feed scrolls near its end (BillFeed bumps
	// currentIndex), on first load, or when the discover pool runs low.
	useEffect(() => {
		const isScrollingForward = currentIndex > prevIndexRef.current;
		const isNearEnd = filteredBills.length - currentIndex <= PAGE_SIZE;
		prevIndexRef.current = currentIndex;

		const shouldFetch =
			(isScrollingForward && isNearEnd) ||
			isFirstLoad ||
			newBills.length <= LOW_POOL_THRESHOLD ||
			billsToDisplay.length === 0;
		if (!shouldFetch || isFetchingRef.current) return;

		isFetchingRef.current = true;
		fetchNextPage()
			.then((bills) => {
				if (bills.length === 0) return;
				setAllBills((prev) => {
					const existing = new Set(prev.map((bill) => bill.id));
					return [...prev, ...bills.filter((bill) => !existing.has(bill.id))];
				});
			})
			.catch((error) => console.error('Failed to fetch bills:', error))
			.finally(() => {
				isFetchingRef.current = false;
			});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentIndex, votedOnThisBill, newBills.length, billsToDisplay.length]);

	return (
		<BillContext.Provider
			value={{
				billsToDisplay,
				filteredBills,
				passedBills,
				billsWithRollCalls,
				congress,
				billSubject,
				setBillSubject,
				billFilter,
				setBillFilter,
				activeBillTab,
				setActiveBillTab,
				voteLog,
				setVoteLog,
				setVotedOnThisBill,
				currentIndex,
				setCurrentIndex,
				searchType,
				setSearchType,
			}}>
			{children}
		</BillContext.Provider>
	);
};

export const useDisplayBills = () => useContext(BillContext);
