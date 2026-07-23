import { useState } from 'react';
import { useDisplayBills } from '../../providers/BillProvider';
import BillCard from './BillCard';
import Carousel from './Carousel';
import { allPolicies } from '../../constants/policy-terms';
import type { Bill } from '../../types';
import { BillStatus } from './BillStatus';
import { BillCollectionFilter } from './BillFilter';

const devMode = import.meta.env.DEV;

export const BillCollection = () => {
	const { billsToDisplay, billSubject } = useDisplayBills();
	const [filterType, setFilterType] = useState<string>('all');

	const policyBills = allPolicies.reduce<Record<string, Bill[]>>((acc, policy) => {
		acc[policy] = billsToDisplay.filter((bill) => {
			return bill.policyArea?.name === policy;
		});

		return acc;
	}, {});

	const formPolicyRow = (policy: string) => {
		console.log(policy, policyBills[policy]);
		return (
			policyBills[policy].length !== 0 && (
				<div
					key={policy}
					className='policy-row'>
					<b>{policy}:</b>
					<div className='policy-row-bills'>
						<Carousel bills={policyBills[policy]} />
					</div>
				</div>
			)
		);
	};
	console.log(policyBills);
	return (
		<>
			<BillCollectionFilter
				filterType={filterType}
				setFilterType={setFilterType}
			/>
			{devMode && <BillStatus />}

			<div className='bill-collection'>
				{filterType === 'all' ? (
					<div className='policy-container'>
						{allPolicies.map((policy) => {
							return formPolicyRow(policy);
						})}

						<b>Other Bills:</b>

						<Carousel
							bills={billsToDisplay.filter(
								(bill) => !allPolicies.some((policy) => policy.toLowerCase() === bill.policyArea?.name.toLowerCase()),
							)}
						/>
					</div>
				) : (filterType === 'policy' || filterType === 'legislative-term') && billsToDisplay.length > 0 ? (
					<Carousel
						bills={billsToDisplay.filter((bill) => {
							return (
								bill.policyArea?.name.toLowerCase() === billSubject.toLowerCase() ||
								bill.subjects.legislativeSubjects?.some((legislativeSubject: { name: string }) =>
									legislativeSubject.name.toLowerCase().startsWith(billSubject.toLowerCase()),
								)
							);
						})}
					/>
				) : filterType === 'letter-collection' ? (
					billsToDisplay
						.filter(
							(bill) => !bill.latestAction.text.includes('Became Public Law No:'), //this filter covers all bill types, including those not needing presidential signatures
						)
						.map((bill, index) => (
							<BillCard
								bill={bill}
								key={index}
							/>
						))
				) : (
					<h1>No Bills</h1>
				)}
			</div>
		</>
	);
};
