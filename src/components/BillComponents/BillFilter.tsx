import { useDisplayBills } from '../../providers/BillProvider';
import { allPolicies } from '../../constants/policy-terms';
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBook, faEnvelope, faGavel, faScroll } from '@fortawesome/free-solid-svg-icons';

interface BillFilterProps {
	filterType: string;
	setFilterType: React.Dispatch<React.SetStateAction<string>>;
}

export const BillCollectionFilter: React.FC<BillFilterProps> = ({ filterType, setFilterType }) => {
	const { billSubject, setBillSubject } = useDisplayBills();

	const createSelector = (category: string, label: string) => {
		return (
			<div
				className={`selector ${filterType === category ? 'active' : ''}`}
				onClick={() => {
					setFilterType(category);
					setBillSubject('');
				}}>
				<div className='selector-label'>{label}</div>

				{category == 'policy' ? (
					<FontAwesomeIcon icon={faGavel} />
				) : category == 'legislative-term' ? (
					<FontAwesomeIcon icon={faScroll} />
				) : category == 'letter-collection' ? (
					<FontAwesomeIcon icon={faEnvelope} />
				) : (
					<FontAwesomeIcon icon={faBook} />
				)}
			</div>
		);
	};
	return (
		<div className='search-subject'>
			<div className='selectors'>
				{createSelector('all', 'All')}
				{createSelector('policy', 'Policy')}
				{createSelector('legislative-term', 'Legislative')}
				{createSelector('letter-collection', 'Message')}
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
	);
};
