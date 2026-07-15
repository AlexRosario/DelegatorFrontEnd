import { useEffect, useState } from 'react';
import BillCard from './BillCard';
import { searchForBill, Requests } from '../../api';
import type { Bill } from '../../types';
import { useDisplayBills } from '../../providers/BillProvider';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCaretDown } from '@fortawesome/free-solid-svg-icons';
import { BillFeed } from './BillFeed';
import { RepStrip } from '../RepComponents/RepStrip';
import { BILL_FACETS, facetCount, type BillFacetCounts } from '../../constants/billFacets';

export const BillDiscover = () => {
	const [searchedBill, setSearchedBill] = useState<Bill | null>(null);
	const [billNumber, setBillNumber] = useState('');
	const [billType, setBillType] = useState('hr');
	const billTypeArray = ['hr', 's', 'hjres', 'sjres', 'hconres', 'sconres', 'hres', 'sres'];
	const isNumeric = (billNumber: string) => {
		return /^\d+$/.test(billNumber) && billNumber.length > 0;
	};
	const { congress, setBillFilter, setCurrentIndex, searchType, setSearchType } = useDisplayBills();

	// Server truth about facet sizes: label counts in the menu and hide facets
	// with nothing in them. Menu still works (uncounted) if the fetch fails.
	const [facetCounts, setFacetCounts] = useState<BillFacetCounts | null>(null);
	useEffect(() => {
		Requests.getBillFacets(congress)
			.then(setFacetCounts)
			.catch((err) => console.error('Facet counts unavailable:', err));
	}, [congress]);

	// A facet shows if we don't know its size yet, it has bills, or it's the default.
	const visibleFacets = BILL_FACETS.filter((facet) => {
		const count = facetCount(facet, facetCounts);
		return count === null || count > 0 || facet.label === 'All Bills';
	});
	const ungrouped = visibleFacets.filter((facet) => !facet.group);
	const stageGroup = visibleFacets.filter((facet) => facet.group === 'By stage');
	const optionLabel = (facet: (typeof BILL_FACETS)[number]) => {
		const count = facetCount(facet, facetCounts);
		return count === null ? facet.label : `${facet.label} (${count})`;
	};

	const renderDiscoverBills = () => {
		const billNumberNotBlank = billNumber !== '';

		if (searchType === 'hopper') {
			return <BillFeed />;
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
			<RepStrip />
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
									setBillFilter(e.target.value);
								}}>
								{/* The menu IS the config: one BILL_FACETS entry per option,
								    sized and pruned by server counts. */}
								{ungrouped.map((facet) => (
									<option
										key={facet.label}
										value={facet.label}>
										{optionLabel(facet)}
									</option>
								))}
								{stageGroup.length > 0 && (
									<optgroup label='By stage'>
										{stageGroup.map((facet) => (
											<option
												key={facet.label}
												value={facet.label}>
												{optionLabel(facet)}
											</option>
										))}
									</optgroup>
								)}
							</select>
							<FontAwesomeIcon
								icon={faCaretDown}
								className='caret-select'
							/>
						</div>
					)}
				</div>
			</div>

			{renderDiscoverBills()}
		</div>
	);
};
export default BillDiscover;
