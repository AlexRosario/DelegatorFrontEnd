import type { Bill } from '../../types';
import Button from '@mui/material/Button';

export const ComButton = ({ bill }: { bill: Bill }) => {
	const actions = Array.isArray(bill.actions) ? bill.actions : bill.actions ? [bill.actions] : [];
	const passedSenate = actions.some(
		(action) =>
			action.text &&
			action.sourceSystem.name &&
			(action.text.includes('Passed') || action.text.includes('agreed')) &&
			action.sourceSystem.name === 'Senate'
	);
	const passedHouse = actions.some(
		(action) =>
			action.text &&
			action.sourceSystem.name &&
			(action.text.includes('Passed') || action.text.includes('agreed')) &&
			action.sourceSystem.name.includes('House')
	);
	return (
		<div className='send-wrapper'>
			{!passedSenate && <Button className=''>Send message to your senators.</Button>}
			{!passedHouse && (
				<Button
					className=''
					onClick={() => ('s', passedSenate, 'h', passedHouse, bill)}>
					Send message to your house representative.
				</Button>
			)}
		</div>
	);
};
