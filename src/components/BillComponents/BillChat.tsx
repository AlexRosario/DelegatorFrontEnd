import { useEffect, useState } from 'react';
import { Requests } from '../../api';
import type { BillCommentRecord } from '../../types';

/**
 * Discussion panel for one bill. Mounted only while open, so fetching on mount
 * is fetching on intent — the feed itself never loads comments.
 */
export const BillChat = ({ billId, onPosted }: { billId: string; onPosted?: () => void }) => {
	const [comments, setComments] = useState<BillCommentRecord[]>([]);
	const [nextCursor, setNextCursor] = useState<number | null>(null);
	const [loading, setLoading] = useState(true);
	const [draft, setDraft] = useState('');
	const [posting, setPosting] = useState(false);
	const userString = localStorage.getItem('user');
	const user = userString ? JSON.parse(userString) : null;

	useEffect(() => {
		let active = true;
		Requests.getBillComments(billId)
			.then((page) => {
				if (!active) return;
				setComments(page.comments);
				setNextCursor(page.nextCursor);
			})
			.catch((err) => console.error('Failed to load comments:', err))
			.finally(() => active && setLoading(false));
		return () => {
			active = false;
		};
	}, [billId]);

	const loadOlder = async () => {
		if (!nextCursor) return;
		try {
			const page = await Requests.getBillComments(billId, nextCursor);
			setComments((prev) => [...prev, ...page.comments]);
			setNextCursor(page.nextCursor);
		} catch (err) {
			console.error('Failed to load older comments:', err);
		}
	};

	const submit = async () => {
		const body = draft.trim();
		if (!body || posting) return;
		setPosting(true);
		try {
			const created = await Requests.addBillComment(billId, body);
			setComments((prev) => [created, ...prev]); // newest first
			setDraft('');
			onPosted?.();
		} catch (error) {
			if (error instanceof Error && error.message === 'session_expired') {
				alert('Your session has expired — please sign in again to comment.');
				localStorage.clear();
				window.location.href = '/Home';
				return;
			}
			console.error('Failed to post comment:', error);
		} finally {
			setPosting(false);
		}
	};

	return (
		<div className='bill-chat'>
			<div className='bill-chat-list'>
				{loading ? (
					<p className='bill-chat-empty'>Loading…</p>
				) : comments.length === 0 ? (
					<p className='bill-chat-empty'>No comments yet — start the discussion.</p>
				) : (
					<>
						{comments.map((comment) => (
							<div
								className='bill-chat-comment'
								key={comment.id}>
								<span className='bill-chat-author'>{comment.username}</span>
								<span className='bill-chat-body'>{comment.body}</span>
								<span className='bill-chat-date'>{new Date(comment.createdAt).toLocaleDateString()}</span>
							</div>
						))}
						{nextCursor && (
							<button
								className='bill-chat-older'
								onClick={loadOlder}>
								Load older comments
							</button>
						)}
					</>
				)}
			</div>

			{user ? (
				<div className='bill-chat-composer'>
					<input
						type='text'
						value={draft}
						maxLength={2000}
						placeholder='Add a comment…'
						onChange={(e) => setDraft(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter') submit();
						}}
					/>
					<button
						onClick={submit}
						disabled={posting || draft.trim() === ''}>
						{posting ? '…' : 'Post'}
					</button>
				</div>
			) : (
				<p className='bill-chat-signin'>Sign in to join the discussion.</p>
			)}
		</div>
	);
};
