import { useEffect, useState } from 'react';
import { BillCarousel } from './BillCarousel';
import BillCard from './BillCard';
import { searchForBill } from '../../api';
import type { Bill } from '../../types';
import { useDisplayBills } from '../../providers/BillProvider';
import { BillStatus } from './BillStatus';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCaretDown } from '@fortawesome/free-solid-svg-icons';

type BillFilter = 'All Bills' | 'Passed' | 'Bills with Votes';

export const BillDiscover = () => {
	const [searchType, setSearchType] = useState<'hopper' | 'bill-number'>('hopper');
	const [searchedBill, setSearchedBill] = useState<Bill | null>(null);
	const [billNumber, setBillNumber] = useState('');
	const [billType, setBillType] = useState('hr');
	const billTypeArray = ['hr', 's', 'hjres', 'sjres', 'hconres', 'sconres', 'hres', 'sres'];
	const isNumeric = (billNumber: string) => {
		return /^\d+$/.test(billNumber) && billNumber.length > 0;
	};
	const { billsToDisplay, setBillFilter, setCurrentIndex, passedBills, billsWithRollCalls } = useDisplayBills();

	const renderDiscoverBills = () => {
		const billNumberNotBlank = billNumber !== '';

		if (searchType === 'hopper') {
			return <BillCarousel />;
		}

		if (searchedBill && billNumberNotBlank) {
			return (
				<BillCard
					bill={searchedBill}
					className='searched-bill'
				/>
			);
		}

		if (!isNumeric(billNumber) && billNumberNotBlank) {
			return <h2>{billNumber} is not a valid number</h2>;
		}

		if (billNumberNotBlank && searchedBill === null) {
			return <h2>No Bill found</h2>;
		}

		return <h2>Search for Bill by number</h2>;
	};

	useEffect(() => {
		const controller = new AbortController();

		const fetchBill = async () => {
			if (isNumeric(billNumber)) {
				const bill = await searchForBill(billType, billNumber, controller.signal);
				setSearchedBill(bill);
				if (!bill) {
					setSearchedBill(null);
				}
			}
		};

		const debounceFetch = setTimeout(fetchBill, 500);

		return () => {
			clearTimeout(debounceFetch);
			controller.abort();
		};
	}, [billNumber, billType]);

	return (
		<div className='bill-discover'>
			<div className='search-options'>
				<div className='selectors'>
					<div
						className={`selector ${searchType === 'hopper' ? 'active' : ''}`}
						onClick={() => {
							setSearchType('hopper');
						}}>
						Hopper
					</div>
					<div
						className={`selector dark-high-contrast ${searchType === 'bill-number' ? 'active' : ''} t`}
						onClick={() => {
							setSearchType('bill-number');
						}}>
						Bill Number
					</div>
					{searchType === 'bill-number' && (
						<div className='bill-number'>
							<div className='bill-type-selector'>
								<select
									name=''
									id=''
									onChange={(e) => setBillType(e.target.value)}>
									{billTypeArray.map((billType) => (
										<option
											key={billType}
											value={billType}>
											{billType}
										</option>
									))}
								</select>
							</div>
							<div className='bill-type-selector'>
								<input
									type='text'
									placeholder='Search for bills by number'
									onChange={(e) => {
										if (e.target.value === '') {
											setSearchedBill(null);
										}
										return setBillNumber(e.target.value);
									}}
								/>
							</div>
						</div>
					)}{' '}
					{searchType == 'hopper' && (
						<div className='select-wrapper'>
							<select
								onChange={(e) => {
									setCurrentIndex(0);
									setBillFilter(e.target.value as BillFilter);
								}}>
								<option value='default'>Filter Bills</option>
								{billsToDisplay.length > 0 && <option value='All Bills'>All Bills</option>}
								{billsWithRollCalls.length > 0 && <option value='Bills with Votes'>Bills with RollCalls</option>}
								{passedBills.length > 0 && <option value='Passed'>Passed Bills</option>}
							</select>
							<FontAwesomeIcon
								icon={faCaretDown}
								className='caret-select'
							/>
						</div>
					)}
				</div>
			</div>
			<BillStatus searchType={searchType} />

			{renderDiscoverBills()}
		</div>
	);
};
export default BillDiscover;
