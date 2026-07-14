import { useContext, createContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Requests } from '../api';
import type { Bill, Vote } from '../types';
import { useAuthInfo } from './AuthProvider';

const PAGE_SIZE = 20;
/** Fetch another page when the discover pool drops to this many unseen bills. */
const LOW_POOL_THRESHOLD = 10;

type BillFilter = 'Passed' | 'Bills with Votes' | 'All Bills';
type BillTab = 'discover-bills' | 'voted-bills';
type SearchType = 'hopper' | 'bill-number';

/** Each facet is a SERVER query (its own where-clause + pagination), not a
 *  client-side subset — so "Bills with Votes" never depends on which page of
 *  "All Bills" happens to be loaded. */
const FILTER_PARAM: Record<BillFilter, 'passed' | 'roll-call' | undefined> = {
	'All Bills': undefined,
	Passed: 'passed',
	'Bills with Votes': 'roll-call',
};

type Pool = { bills: Bill[]; total: number | null }; // total null = not fetched yet

const EMPTY_POOLS: Record<BillFilter, Pool> = {
	'All Bills': { bills: [], total: null },
	Passed: { bills: [], total: null },
	'Bills with Votes': { bills: [], total: null },
};

type TBillProvider = {
	// Bill collections (derived)
	billsToDisplay: Bill[];
	filteredBills: Bill[];
	passedBills: Bill[];
	billsWithRollCalls: Bill[];
	// Feed state for the active facet
	feedTotal: number | null;
	feedExhausted: boolean;
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
	/** The bills behind the user's vote records — alignment inference reads their action histories. */
	votedBills: Bill[];
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
	feedTotal: null,
	feedExhausted: false,
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
	votedBills: [],
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
	const { user } = useAuthInfo();
	const [voteLog, setVoteLog] = useState<Vote[]>(readStoredVoteLog);
	const [votedOnThisBill, setVotedOnThisBill] = useState(false);
	const [pools, setPools] = useState<Record<BillFilter, Pool>>(EMPTY_POOLS);
	const [votedBills, setVotedBills] = useState<Bill[]>([]);
	const [activeBillTab, setActiveBillTab] = useState<BillTab>('discover-bills');
	const [billSubject, setBillSubject] = useState('');
	const [billFilter, setBillFilter] = useState<BillFilter>('All Bills');
	const [congress] = useState(119);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [searchType, setSearchType] = useState<SearchType>('hopper');

	const prevIndexRef = useRef(currentIndex); // last index the fetch effect saw (scroll-direction detection)
	const isFetchingRef = useRef(false); // prevents overlapping page fetches
	const loadedVoteLogRef = useRef(false); // first voteLog load fetches every voted bill; later ones only the newest

	// Derived collections — the active facet's pool, minus bills THIS user voted
	// on (userLog is a per-browser key; other accounts' entries must be inert).
	const activePool = pools[billFilter];
	const newBills = activePool.bills.filter(
		(bill) => !voteLog.some((vote) => vote.userId === user.id && vote.billId === bill.id)
	);
	const billsToDisplay = activeBillTab === 'discover-bills' ? newBills : votedBills;
	const filteredBills = billsToDisplay; // facet filtering already happened server-side
	const passedBills = pools['Passed'].bills;
	const billsWithRollCalls = pools['Bills with Votes'].bills;

	const feedTotal = activePool.total;
	const feedExhausted = activePool.total !== null && activePool.bills.length >= activePool.total;

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

	/** One page of the given facet from our DB. Offset derives from what the pool
	 *  already holds, so a failed request never skips a page. Signed-in users get
	 *  server-side vote exclusion (the DB owns the votes); the client-side filter
	 *  above stays as instant-feedback for votes cast this session. */
	const fetchNextPage = async (key: BillFilter, offset: number) => {
		const data = await Requests.getBillsFromDb(
			String(congress),
			offset,
			PAGE_SIZE,
			FILTER_PARAM[key],
			user.id ? 'exclude' : undefined
		);
		const incoming = (data?.bills ?? []) as Bill[];
		setPools((prev) => {
			const pool = prev[key];
			const existing = new Set(pool.bills.map((bill) => bill.id));
			return {
				...prev,
				[key]: {
					bills: [...pool.bills, ...incoming.filter((bill) => !existing.has(bill.id))],
					total: typeof data?.total === 'number' ? data.total : pool.total,
				},
			};
		});
	};

	// Initial voted-bills load: ONE server query per page (voted=only) instead of
	// a getBillById call per vote record — the DB knows which bills this user voted on.
	useEffect(() => {
		if (!user.id) return;
		let cancelled = false;
		(async () => {
			const collected: Bill[] = [];
			for (let offset = 0; ; ) {
				const data = await Requests.getBillsFromDb(String(congress), offset, 100, undefined, 'only');
				const page = (data?.bills ?? []) as Bill[];
				if (page.length === 0) break;
				collected.push(...page);
				offset += page.length;
				if (typeof data?.total === 'number' && collected.length >= data.total) break;
			}
			if (!cancelled && collected.length > 0) {
				setVotedBills((prev) => {
					const existing = new Set(prev.map((bill) => bill.id));
					return [...prev, ...collected.filter((bill) => !existing.has(bill.id))];
				});
			}
		})().catch((error) => console.error('Failed to load voted bills:', error));
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [user.id]);

	// New votes cast this session: append just the newest bill and sync userLog.
	useEffect(() => {
		if (!loadedVoteLogRef.current) {
			loadedVoteLogRef.current = true; // mount-time log came from localStorage — already loaded above
			return;
		}
		const votesToLoad = votedOnThisBill ? voteLog.slice(-1) : [];
		if (votesToLoad.length === 0) return;
		fetchUserBills(votesToLoad).then((bills) => {
			if (bills.length === 0) return;
			setVotedBills((prev) => {
				const existing = new Set(prev.map((bill) => bill.id));
				return [...prev, ...bills.filter((bill) => !existing.has(bill.id))];
			});
			localStorage.setItem('userLog', JSON.stringify(voteLog));
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [voteLog]);

	// Fetch the active facet's next page when: it has never been fetched, the
	// feed scrolls near its end (BillFeed bumps currentIndex), or the discover
	// pool runs low. feedExhausted stops the loop when the facet is fully loaded
	// — an empty facet renders as empty instead of spinning forever.
	useEffect(() => {
		const pool = pools[billFilter];
		const exhausted = pool.total !== null && pool.bills.length >= pool.total;
		const isScrollingForward = currentIndex > prevIndexRef.current;
		const isNearEnd = filteredBills.length - currentIndex <= PAGE_SIZE;
		prevIndexRef.current = currentIndex;

		const shouldFetch =
			!exhausted &&
			(pool.total === null || (isScrollingForward && isNearEnd) || newBills.length <= LOW_POOL_THRESHOLD);
		if (!shouldFetch || isFetchingRef.current) return;

		isFetchingRef.current = true;
		fetchNextPage(billFilter, pool.bills.length)
			.catch((error) => console.error('Failed to fetch bills:', error))
			.finally(() => {
				isFetchingRef.current = false;
			});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [billFilter, currentIndex, pools, votedOnThisBill, voteLog, user.id]);

	return (
		<BillContext.Provider
			value={{
				billsToDisplay,
				filteredBills,
				passedBills,
				billsWithRollCalls,
				feedTotal,
				feedExhausted,
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
				votedBills,
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
