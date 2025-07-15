import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faThumbsUp, faThumbsDown } from '@fortawesome/free-solid-svg-icons';

type VoteButtonProps = {
	voteValue: string;
	onClick?: (voteValue: string) => void;
};

export const VoteButton = ({ voteValue, onClick }: VoteButtonProps) => {
	const color = voteValue == 'No' ? 'red' : 'green';
	const vote = voteValue == 'No' ? 'Oppose' : 'Support';

	return (
		<div
			className='selector'
			onClick={onClick ? () => onClick(voteValue) : undefined}
			style={{ backgroundColor: color }}>
			{vote}
			<FontAwesomeIcon icon={voteValue === 'No' ? faThumbsDown : faThumbsUp} />
		</div>
	);
};
export default VoteButton;
