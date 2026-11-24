// The Wire: posts from curated accounts (members of Congress, federal agencies,
// reputable organizations), served by the backend's GET /wire.

export type WireKind = 'member' | 'agency' | 'organization';
export type WirePlatform = 'bluesky' | 'youtube' | 'instagram' | 'x';

export type WirePost = {
	id: number;
	platform: WirePlatform;
	url: string;
	title: string | null;
	text: string;
	mediaUrl: string | null;
	postedAt: string;
	stats: {
		likes: number | null;
		comments: number | null;
		reposts: number | null;
		views: number | null;
	};
	account: { handle: string | null; url: string | null };
	source: {
		slug: string;
		name: string;
		kind: WireKind;
		member: { id: string; party: string; state: string; district: number | null; chamber: string | null } | null;
	};
};

export type WirePage = {
	posts: WirePost[];
	nextCursor: number | null;
	livePlatforms: WirePlatform[];
};

export const WIRE_KIND_LABELS: Record<WireKind, string> = {
	member: 'Congress',
	agency: 'Agencies',
	organization: 'Organizations',
};

export const WIRE_PLATFORM_LABELS: Record<WirePlatform, string> = {
	bluesky: 'Bluesky',
	youtube: 'YouTube',
	instagram: 'Instagram',
	x: 'X',
};
