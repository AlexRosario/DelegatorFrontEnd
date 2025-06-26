import { useContext, createContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Requests } from '../api';
import type { Bill, Vote } from '../types';
import DOMPurify from 'dompurify';
import { searchForBill } from '../api';

type TBillProvider = {
	billsToDisplay: Bill[];
	billSubject: string;
	setBillSubject: (subject: string) => void;
	offset: number;
	setOffset: (offset: number | ((prevOffset: number) => number)) => void;
	congress: number;
	billFilter: 'Passed' | 'Bills with Votes' | 'All Bills';
	setBillFilter: (filterPassed: 'Passed' | 'Bills with Votes' | 'All Bills') => void;
	filteredBills: Bill[];
	passedBills: Bill[];
	setActiveBillTab: (tab: 'discover-bills' | 'voted-bills') => void;
	activeBillTab: 'discover-bills' | 'voted-bills';
	allBills: Bill[];
	setAllBills: (allBills: Bill[]) => void;
	newBills: Bill[];
	votedBills: Bill[];
	voteLog: Vote[];
	setVoteLog: (voteLog: Vote[]) => void;
	setVotedOnThisBill: (votedOnThisBill: boolean) => void;
	setNewBills: React.Dispatch<React.SetStateAction<Bill[]>>;
	setVotedBills: React.Dispatch<React.SetStateAction<Bill[]>>;
	currentIndex: number;
	setCurrentIndex: (index: number) => void;
	billsWithRollCalls: Bill[];
};

export const BillContext = createContext<TBillProvider>({
	billsToDisplay: [],
	billSubject: '',
	setBillSubject: () => {},
	offset: 0,
	setOffset: () => {},
	congress: 119,
	billFilter: 'All Bills',
	setBillFilter: () => {},
	filteredBills: [],
	passedBills: [],
	setActiveBillTab: () => {},
	activeBillTab: 'discover-bills',
	allBills: [],
	setAllBills: () => {},
	newBills: [],
	votedBills: [],
	voteLog: [],
	setVoteLog: () => {},
	setVotedOnThisBill: () => {},
	setNewBills: () => {},
	setVotedBills: () => {},
	currentIndex: 0,
	setCurrentIndex: () => {},
	billsWithRollCalls: [],
});

export const BillProvider = ({ children }: { children: ReactNode }) => {
	const localLogString = localStorage.getItem('userLog');
	const localLog = localLogString ? JSON.parse(localLogString) : [];
	const [voteLog, setVoteLog] = useState<Vote[]>(localLog);
	const [votedOnThisBill, setVotedOnThisBill] = useState(false);
	const [allBills, setAllBills] = useState<Bill[]>([]);
	const [newBills, setNewBills] = useState<Bill[]>([]);
	const [votedBills, setVotedBills] = useState<Bill[]>([]);
	const [activeBillTab, setActiveBillTab] = useState<'discover-bills' | 'voted-bills'>('discover-bills');
	const [billSubject, setBillSubject] = useState<string>('');
	const [offset, setOffset] = useState(0);
	const [billFilter, setBillFilter] = useState<'Passed' | 'Bills with Votes' | 'All Bills'>('All Bills');
	const [congress] = useState(119);
	const [currentIndex, setCurrentIndex] = useState(0);
	const prevIndexRef = useRef(currentIndex);
	const hasFetchedRef = useRef(false);
	const billsToDisplay = activeBillTab === 'discover-bills' ? newBills : votedBills;

	const passedBills =
		billsToDisplay.filter(
			(bill) => bill.latestAction.text.includes('Became Public Law No:') //this filter covers all bill types, including those not needing presidential signatures
		) || [];
	const billsWithRollCalls =
		billsToDisplay.filter(
			(bill: Bill) =>
				Array.isArray(bill.actions) &&
				bill.actions.some((action) => Array.isArray(action.recordedVotes) && action.recordedVotes.length > 0)
		) || [];
	const filteredBills =
		billFilter == 'Passed' ? passedBills : billFilter == 'Bills with Votes' ? billsWithRollCalls : billsToDisplay;

	let firstRender: boolean = allBills.length == 0 ? true : false;

	const fetchUserBills = async (voteLog: Vote[]) => {
		try {
			const billPromises = voteLog.map(async (vote) => {
				const raw = vote.billId.toLowerCase();
				const billType = raw.replace(/[^a-zA-Z]/g, '');
				const billNumber = raw.replace(/\D/g, '');
				return await searchForBill(billType, billNumber);
			});

			const bills = await Promise.all(billPromises);
			return bills?.filter((bill) => bill !== null);
		} catch (error) {
			console.error('Error fetching bill record:', error);
		}
	};

	const fetchBills = async () => {
		let fetchedBills: Bill[] = [];
		const congressStr = String(congress);
		try {
			let data;
			data = await Requests.getBills(congressStr, '', offset);
			fetchedBills = [...fetchedBills, ...(data?.bills ?? [])];
			const billPromises = fetchedBills.map(async (bill) => {
				const fullBillData = await Requests.getFullBill(congressStr, bill.type.toLowerCase(), bill.number);
				const summariesData = await Requests.getBillDetail(
					congressStr,
					bill.type.toLowerCase(),
					bill.number,
					'summaries'
				);
				const subjectsData = await Requests.getBillDetail(
					congressStr,
					bill.type.toLowerCase(),
					bill.number,
					'subjects'
				);
				const actionsData = await Requests.getBillDetail(congressStr, bill.type.toLowerCase(), bill.number, 'actions');
				return {
					...bill,
					...fullBillData.bill,
					summary:
						summariesData.summaries.length > 0
							? DOMPurify.sanitize(summariesData.summaries[summariesData.summaries.length - 1].text)
							: 'No Summary Available',
					subjects: subjectsData.subjects,
					actions: actionsData.actions,
				};
			});

			fetchedBills = await Promise.all(billPromises);

			return fetchedBills;
		} catch (error) {
			console.error('Failed to fetch bills:', error);
		} finally {
			setOffset((prevOffset) => prevOffset + 20);
		}
	};

	useEffect(() => {
		setNewBills(
			allBills.filter((bill: Bill) => !voteLog?.some((vote: Vote) => vote.billId === bill.type + bill.number))
		);
		if (firstRender || votedOnThisBill) {
			const log = firstRender ? voteLog : [voteLog[voteLog.length - 1]];
			fetchUserBills(log).then((bills) => {
				if (bills) {
					setVotedBills((prevBills) => {
						const existingIds = new Set(prevBills.map((bill) => bill.type + bill.number));
						const filteredNewBills = bills.filter((bill) => !existingIds.has(bill.type + bill.number));
						return [...prevBills, ...filteredNewBills];
					});
					localStorage.setItem('userLog', JSON.stringify(voteLog));
				}
			});
		}
		console.log('bills:', allBills);
		prevIndexRef.current = currentIndex;
	}, [allBills, voteLog]);

	useEffect(() => {
		const isScrollingForward = currentIndex > prevIndexRef.current;
		const isNearEnd = filteredBills.length - currentIndex <= 20;
		if (
			((isScrollingForward && isNearEnd) || firstRender || newBills.length <= 15 || billsToDisplay.length == 0) &&
			!hasFetchedRef.current
		) {
			hasFetchedRef.current = true;

			fetchBills()
				.then(async (bills) => {
					if (bills && bills.length > 0) {
						setAllBills((prevBills) => [...prevBills, ...bills]);
					}
				})
				.finally(() => {
					hasFetchedRef.current = false;
				})
				.catch((error) => {
					console.error('Failed to fetch bills:', error);
				});
			console.log('Bills', allBills, 'billsWithRollCalls', billsWithRollCalls);
			prevIndexRef.current = currentIndex;
		}
	}, [currentIndex, votedOnThisBill, newBills.length <= 15, currentIndex == newBills.length - 15]);

	return (
		<BillContext.Provider
			value={{
				billsToDisplay,
				billSubject,
				setBillSubject,
				offset,
				setOffset,
				congress,
				billFilter,
				setBillFilter,
				filteredBills,
				passedBills,
				setActiveBillTab,
				activeBillTab,
				allBills,
				setAllBills,
				newBills,
				votedBills,
				voteLog,
				setVoteLog,
				setVotedOnThisBill,
				setNewBills,
				setVotedBills,
				setCurrentIndex,
				currentIndex,
				billsWithRollCalls,
			}}>
			{children}
		</BillContext.Provider>
	);
};

export const useDisplayBills = () => {
	return useContext(BillContext);
};
