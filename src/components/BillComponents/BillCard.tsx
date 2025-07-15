import { useState } from 'react';
import { useDisplayBills } from '../../providers/BillProvider';
import type { Bill } from '../../types';
import { VoteButton } from './VoteButton';
import { VoteButtons } from './VoteButtons';
import { ComButton } from './ComButton';
import { Requests } from '../../api';
import { Link } from 'react-router-dom';

export const BillCard = ({
	bill,
	className,
	onClick,
}: {
	bill: Bill;
	className?: string;
	onClick?: () => void | number;
}) => {
	const { congress, activeBillTab, voteLog } = useDisplayBills();
	const [textLink, setTextLink] = useState<string>('');
	const [searchedForLink, setSearchedForLink] = useState<boolean>(false);
	const userString = localStorage.getItem('user');
	const user = userString ? JSON.parse(userString) : null;
	const [translatedText, setTranslatedText] = useState<string | null>(null);
	const [text, setText] = useState<string>('');
	const vote = voteLog.find((vote) => vote.billId == bill.originChamberCode + bill.number);
	const voteCast = vote?.vote;

	const getMoreInfo = async (congress: string, billType: string, billNumber: string) => {
		try {
			const data = await Requests.getBillDetail(congress, billType.toLowerCase(), billNumber, 'text');

			if (data.textVersions.length > 0) {
				setTextLink(data.textVersions[0].formats[0].url);
			} else {
				console.error('No text versions available');
			}
			setSearchedForLink(true);
		} catch (error) {
			console.error('Error fetching bill summary:', error);
		}
	};

	const handleTranslate = async () => {
		if (bill?.textVersions && bill.textVersions.url) {
			const billText = await Requests.getBillText(textLink);
			const translation = await Requests.translateLegalBill(billText);
			console.log('translation', translation);
		}
	};

	return (
		<div
			className={`bill-card${className == undefined ? '' : className}`}
			onClick={onClick}>
			<div className='bill-header'>
				<b>{`${bill.type}${bill.number}`}</b>
				{user && activeBillTab === 'discover-bills' ? (
					<VoteButtons bill={bill} />
				) : (
					<div>
						<VoteButton voteValue={voteCast ?? ''} />
					</div>
				)}
			</div>

			{bill.summary === 'No Summary Available' ? <b>{bill.title}</b> : ''}

			{translatedText && (
				<div className='translated-text'>
					<h4>Plain English Summary</h4>
					<p>{translatedText}</p>
				</div>
			)}
			<div dangerouslySetInnerHTML={{ __html: bill.summary }} />
			{!textLink ? (
				<b
					onClick={async () => {
						await getMoreInfo(congress.toString(), bill.type, bill.number.toString());
					}}>
					{searchedForLink ? 'No Expanded Text' : 'Read Full Text'}
				</b>
			) : (
				<>
					<a
						href={textLink}
						target='_blank'
						rel='noreferrer'
						className='bill-url'>
						{textLink}
					</a>
					<button
						onClick={async () => {
							const data = await handleTranslate();
							console.log('dataText:', data);
						}}>
						Translate This Bill
					</button>
				</>
			)}
			<div className='bill-member-positions'>
				<b>{bill.latestAction.actionDate}</b>
				<div>{bill.latestAction.text}</div>
			</div>
			{!user && (
				<Link
					to='/Home'
					className='sign-in-link'>
					Sign in to Vote
				</Link>
			)}
			{activeBillTab == 'voted-bills' && <ComButton bill={bill} />}
		</div>
	);
};

export default BillCard;
