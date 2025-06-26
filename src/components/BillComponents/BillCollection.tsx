import { useState } from 'react';
import { useDisplayBills } from '../../providers/BillProvider';
import BillCard from './BillCard';
import { allPolicies } from '../../constants/policy-terms';
import type { Bill } from '../../types';
import { BillStatus } from './BillStatus';

export const BillCollection = () => {
	const { billsToDisplay, billSubject, setBillSubject, passedBills } = useDisplayBills();
	const [filterType, setFilterType] = useState('all');

	const policyBills = allPolicies.reduce<Record<string, Bill[]>>((acc, policy) => {
		acc[policy] = billsToDisplay.filter((bill) => {
			return bill.policyArea?.name === policy;
		});

		return acc;
	}, {});
	const createSelector = (category: string, label: string) => {
		return (
			<div
				className={`selector ${filterType === category ? 'active' : ''}`}
				onClick={() => {
					setFilterType(category);
					setBillSubject('');
				}}>
				{label}
			</div>
		);
	};
	const formPolicyRow = (policy: string) => {
		return (
			policyBills[policy].length > 0 && (
				<div key={policy}>
					<b>{policy}:</b>
					<div className='policy-row'>
						{policyBills[policy].map((bill, index) => (
							<BillCard
								bill={bill}
								key={index}
								className='bill-collection-card'
							/>
						))}
					</div>
				</div>
			)
		);
	};

	const formOtherRow = () => {
		return (
			<div className='policy-row'>
				{billsToDisplay
					.filter((bill) => !allPolicies.some((policy) => policy.toLowerCase() === bill.policyArea?.name.toLowerCase()))
					.map((bill, index) => (
						<BillCard
							bill={bill}
							key={index}
							className='bill-collection-card'
						/>
					))}
			</div>
		);
	};

	return (
		<div className='bill-collection-container'>
			<div className='search-subject'>
				<div className='selectors'>
					{createSelector('all', 'All')}
					{createSelector('policy', ' Filter by Policy')}
					{createSelector('legislative-term', 'Filter by Legislative Term')}
					{createSelector('letter-collection', 'Let them know')}
				</div>

				<div className='subject-fields'>
					{filterType === 'policy' && (
						<select
							value={billSubject || 'default'}
							onChange={(e) => {
								setBillSubject(e.target.value);
							}}>
							<option value='default'>Select a subject by suggested policy terms</option>
							{allPolicies.map((policy) => (
								<option
									key={policy}
									value={policy}>
									{policy}
								</option>
							))}
						</select>
					)}
					{filterType === 'legislative-term' && (
						<div className='legislative-term'>
							<div id='leg-term'>
								<input
									type='text'
									placeholder='Search for bills by legislative term'
									onChange={(e) => {
										setBillSubject(e.target.value);
									}}
								/>
								<a
									href='https://www.congress.gov/advanced-search/legislative-subject-terms?congresses%5B%5D=119'
									target='_blank'
									rel='noopener noreferrer'>
									List of Acceptable Terms
								</a>
							</div>
						</div>
					)}
					{filterType === 'bill-number' && (
						<div className='bill-number'>
							<div id='bill-num'>
								<input
									type='text'
									placeholder='Search for bills by number'
									onChange={(e) => {
										setBillSubject(e.target.value);
									}}
								/>
							</div>
						</div>
					)}
				</div>
			</div>
			<BillStatus />

			<div className='bill-collection'>
				{filterType === 'all' ? (
					<>
						{allPolicies.map((policy) => {
							return formPolicyRow(policy);
						})}

						<b>Other Bills:</b>
						{formOtherRow()}
					</>
				) : (filterType === 'policy' || filterType === 'legislative-term') && billsToDisplay.length > 0 ? (
					<div className='policy-row'>
						{billsToDisplay
							.filter((bill) => {
								return (
									bill.policyArea?.name.toLowerCase() === billSubject.toLowerCase() ||
									bill.subjects.legislativeSubjects?.some((legislativeSubject: { name: string; date: Date }) =>
										legislativeSubject.name.toLowerCase().startsWith(billSubject.toLowerCase())
									)
								);
							})
							.map((bill, index) => (
								<BillCard
									bill={bill}
									key={index}
									className='bill-collection-card'
								/>
							))}
					</div>
				) : filterType === 'letter-collection' ? (
					billsToDisplay
						.filter(
							(bill) => !bill.latestAction.text.includes('Became Public Law No:') //this filter covers all bill types, including those not needing presidential signatures
						)
						.map((bill, index) => (
							<BillCard
								bill={bill}
								key={index}
								className='bill-collection-card'
							/>
						))
				) : (
					<h1>No Bills</h1>
				)}
			</div>
		</div>
	);
};
