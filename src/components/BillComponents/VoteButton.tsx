import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faThumbsUp, faThumbsDown } from '@fortawesome/free-solid-svg-icons';

type VoteButtonProps = {
	voteValue: string;
	onClick?: (voteValue: string) => void;
};

export const VoteButton = ({ voteValue, onClick }: VoteButtonProps) => {
	const color = voteValue == 'No' ? '#8f1416' : '#377c29';

	return (
		<div
			className='vote-button-icon'
			onClick={onClick ? () => onClick(voteValue) : undefined}>
			<FontAwesomeIcon
				icon={voteValue === 'No' ? faThumbsDown : faThumbsUp}
				style={{ color: color, fontSize: '18px' }}
			/>
		</div>
	);
};
export default VoteButton;
