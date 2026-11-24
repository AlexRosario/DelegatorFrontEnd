import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComment, faEye, faHeart, faRetweet } from '@fortawesome/free-solid-svg-icons';
import { Header } from '../HeaderComponent';
import { useAuthInfo } from '../../providers/AuthProvider';
import { Requests } from '../../api';
import { WIRE_KIND_LABELS, WIRE_PLATFORM_LABELS, type WireKind, type WirePlatform, type WirePost } from './feedPosts';

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

// "45m", "6h", "3d", then a calendar date once it's over a week old.
function postedAgo(iso: string): string {
	const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
	if (minutes < 60) return `${minutes}m`;
	if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h`;
	if (minutes < 60 * 24 * 7) return `${Math.round(minutes / (60 * 24))}d`;
	return shortDate.format(new Date(iso));
}

function initials(name: string): string {
	return name
		.split(/\s+/)
		.filter((w) => /^[A-Za-z]/.test(w))
		.slice(0, 2)
		.map((w) => w[0].toUpperCase())
		.join('');
}

// Members read "Senate · D · Nevada"; everyone else gets their kind label.
function sourceLabel(source: WirePost['source']): string {
	const m = source.member;
	if (!m) return WIRE_KIND_LABELS[source.kind];
	return [m.chamber ?? 'Congress', m.party, m.district ? `${m.state}-${m.district}` : m.state].join(' · ');
}

const WireCard = ({ post }: { post: WirePost }) => {
	const { source, account, stats } = post;
	const platformLabel = WIRE_PLATFORM_LABELS[post.platform];
	return (
		<article className={`feed-card feed-card--${source.kind}`}>
			<div className='feed-card_meta'>
				<span className='feed-card_category'>{sourceLabel(source)}</span>
				<span>
					{platformLabel} · <time dateTime={post.postedAt}>{postedAgo(post.postedAt)}</time>
				</span>
			</div>

			<div className='feed-card_author'>
				<div
					className='feed-card_avatar'
					aria-hidden='true'>
					{initials(source.name)}
				</div>
				<div className='feed-card_author-text'>
					<span className='feed-card_name'>{source.name}</span>
					<span className='feed-card_handle'>{account.handle ? `@${account.handle}` : `${platformLabel} channel`}</span>
				</div>
			</div>

			{post.mediaUrl && (
				<a
					href={post.url}
					target='_blank'
					rel='noopener noreferrer'
					tabIndex={-1}
					aria-hidden='true'>
					<img
						src={post.mediaUrl}
						alt=''
						loading='lazy'
						className={`feed-card_image feed-card_image--${post.platform}`}
					/>
				</a>
			)}

			{post.title && (
				<h3 className='feed-card_title'>
					<a
						href={post.url}
						target='_blank'
						rel='noopener noreferrer'>
						{post.title}
					</a>
				</h3>
			)}

			{post.text && <p className='feed-card_text'>{post.text}</p>}

			<footer className='feed-card_footer'>
				{stats.comments != null && (
					<span title='Replies'>
						<FontAwesomeIcon icon={faComment} />
						{compact.format(stats.comments)}
					</span>
				)}
				{stats.reposts != null && (
					<span title='Reposts and quotes'>
						<FontAwesomeIcon icon={faRetweet} />
						{compact.format(stats.reposts)}
					</span>
				)}
				{stats.likes != null && (
					<span title='Likes'>
						<FontAwesomeIcon icon={faHeart} />
						{compact.format(stats.likes)}
					</span>
				)}
				{stats.views != null && (
					<span title='Views'>
						<FontAwesomeIcon icon={faEye} />
						{compact.format(stats.views)}
					</span>
				)}
				<a
					className='feed-card_source-link'
					href={post.url}
					target='_blank'
					rel='noopener noreferrer'>
					View on {platformLabel} ↗
				</a>
			</footer>
		</article>
	);
};

type LoadState = 'loading' | 'ready' | 'error';

export const Feed = () => {
	const { user } = useAuthInfo();
	const isSignedIn = Boolean(user.username);
	const [kind, setKind] = useState<WireKind | 'all'>('all');
	const [platform, setPlatform] = useState<WirePlatform | 'all'>('all');
	const [posts, setPosts] = useState<WirePost[]>([]);
	const [nextCursor, setNextCursor] = useState<number | null>(null);
	const [livePlatforms, setLivePlatforms] = useState<WirePlatform[]>([]);
	const [state, setState] = useState<LoadState>('loading');
	const [loadingMore, setLoadingMore] = useState(false);
	const [retryKey, setRetryKey] = useState(0);

	const filters = {
		kind: kind === 'all' ? undefined : kind,
		platform: platform === 'all' ? undefined : platform,
	};

	// First page whenever a filter changes; an in-flight request for the old
	// filters is aborted so its posts can't land under the new ones.
	useEffect(() => {
		const controller = new AbortController();
		setState('loading');
		Requests.getWire(filters, controller.signal)
			.then((page) => {
				setPosts(page.posts);
				setNextCursor(page.nextCursor);
				setLivePlatforms(page.livePlatforms);
				setState('ready');
			})
			.catch((err) => {
				if (controller.signal.aborted) return;
				console.error(err);
				setState('error');
			});
		return () => controller.abort();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [kind, platform, retryKey]);

	const loadMore = async () => {
		if (!nextCursor || loadingMore) return;
		setLoadingMore(true);
		try {
			const page = await Requests.getWire({ ...filters, cursor: nextCursor });
			setPosts((prev) => [...prev, ...page.posts]);
			setNextCursor(page.nextCursor);
		} catch (err) {
			console.error(err);
		} finally {
			setLoadingMore(false);
		}
	};

	const kindOptions = [['all', 'All voices'], ...Object.entries(WIRE_KIND_LABELS)] as [WireKind | 'all', string][];
	const platformOptions: [WirePlatform | 'all', string][] = [
		['all', 'All platforms'],
		...livePlatforms.map((p): [WirePlatform, string] => [p, WIRE_PLATFORM_LABELS[p]]),
	];

	return (
		<div className='feed-page'>
			<Header />
			<main className='feed'>
				<section className='feed-hero'>
					<h1>What America is saying about Congress</h1>
					<p className='feed-hero_lede'>
						Posts from members of Congress, federal agencies and independent newsrooms, taken straight from their own accounts.
					</p>
					<div className='feed-hero_ctas'>
						{!isSignedIn && (
							<>
								<Link
									to='/home'
									className='feed-cta feed-cta--primary'>
									Sign in
								</Link>
								<Link
									to='/register'
									className='feed-cta'>
									Create account
								</Link>
							</>
						)}
						<Link
							to='/bills'
							className='feed-cta feed-cta--plain'>
							Browse bills →
						</Link>
					</div>
				</section>

				<div className='feed-filters'>
					<div className='feed-filters_categories'>
						{kindOptions.map(([value, label]) => (
							<button
								key={value}
								type='button'
								aria-pressed={kind === value}
								className={`feed-chip${kind === value ? ' is-active' : ''}`}
								onClick={() => setKind(value)}>
								{label}
							</button>
						))}
					</div>
					{livePlatforms.length > 1 && (
						<div className='feed-filters_platforms'>
							{platformOptions.map(([value, label]) => (
								<button
									key={value}
									type='button'
									aria-pressed={platform === value}
									className={`feed-segment${platform === value ? ' is-active' : ''}`}
									onClick={() => setPlatform(value)}>
									{label}
								</button>
							))}
						</div>
					)}
				</div>

				<div className='feed-wire-head'>
					<span>The wire</span>
					{state === 'ready' && <span>Latest first</span>}
				</div>

				{state === 'loading' && <p className='feed-empty'>Loading the wire…</p>}

				{state === 'error' && (
					<p className='feed-empty'>
						The wire couldn't be loaded.{' '}
						<button
							type='button'
							className='feed-retry'
							onClick={() => setRetryKey((k) => k + 1)}>
							Try again
						</button>
					</p>
				)}

				{state === 'ready' &&
					(posts.length ? (
						<>
							<div className='feed-columns'>
								{posts.map((post) => (
									<div
										key={post.id}
										className='feed-columns_item'>
										<WireCard post={post} />
									</div>
								))}
							</div>
							{nextCursor && (
								<div className='feed-more'>
									<button
										type='button'
										className='feed-cta'
										disabled={loadingMore}
										onClick={loadMore}>
										{loadingMore ? 'Loading…' : 'Load more'}
									</button>
								</div>
							)}
						</>
					) : (
						<p className='feed-empty'>No posts match these filters yet.</p>
					))}
			</main>
		</div>
	);
};
