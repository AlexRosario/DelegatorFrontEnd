import { useState } from 'react';
import { useDisplayBills } from '../../providers/BillProvider';
import BillCard from './BillCard';
import { allPolicies } from '../../constants/policy-terms';
import type { Bill } from '../../types';
import { BillStatus } from './BillStatus';
import { BillCollectionFilter } from './BillFilter';

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
		return (
			policyBills[policy].length > 0 && (
				<div key={policy}>
					<b>{policy}:</b>
					<div className='policy-row'>
						{policyBills[policy].map((bill, index) => (
							<BillCard
								bill={bill}
								key={index}
							/>
						))}
					</div>
				</div>
			)
		);
	};

	return (
		<>
			<BillCollectionFilter
				filterType={filterType}
				setFilterType={setFilterType}
			/>
			<BillStatus />

			<div className='bill-collection'>
				{filterType === 'all' ? (
					<>
						{allPolicies.map((policy) => {
							return formPolicyRow(policy);
						})}

						<b>Other Bills:</b>
						<div className='policy-row'>
							{billsToDisplay
								.filter(
									(bill) => !allPolicies.some((policy) => policy.toLowerCase() === bill.policyArea?.name.toLowerCase())
								)
								.map((bill, index) => (
									<BillCard
										bill={bill}
										key={index}
									/>
								))}
						</div>
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
							/>
						))
				) : (
					<h1>No Bills</h1>
				)}
			</div>
		</>
	);
};
