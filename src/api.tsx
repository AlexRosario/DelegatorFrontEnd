import type { BillCommentRecord, DonorSummary, Representative5Calls } from './types';
import type { BillQuery, BillFacetCounts } from './constants/billFacets';
import { API_BASE_URL } from './config';
import { parseSenateVoteXML, parseHouseVoteXML } from './utils/parser-utils';

export const Requests = {
	register: (
		username: string,
		email: string,
		password: string,
		address: {
			street: string;
			city: string;
			state: string;
			zipcode: string;
		},
		attest: boolean
	) => {
		const url = `${API_BASE_URL}/auth/register`;

		// The server derives the delegation itself (Census district + roster) —
		// no client-side member resolution needed.
		return fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				username: username,
				email: email,
				password: password,
				address: {
					street: address.street,
					city: address.city,
					state: address.state,
					zipcode: address.zipcode,
				},
				attest: attest,
			}),
		})
			.then(async (response) => {
				if (!response.ok) {
					const errorBody = await response.json();
					throw new Error(errorBody.message || `HTTP Error: ${response.status}`);
				}

				return response.json();
			})
			.catch((error) => {
				return error.message;
			});
	},
	async loginUser(credentials: { username: string; password: string }) {
		try {
			const response = await fetch(`${API_BASE_URL}/auth/login`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(credentials),
			});
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Login failed');
			}

			const data = await response.json();
			return data;
		} catch (error) {
			throw new Error('dang');
		}
	},
	addNewMember: async (member: Representative5Calls) => {
		try {
			const members = await fetch(`${API_BASE_URL}/members`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(member),
			});
			return members;
		} catch (error) {
			console.error('Error posting member:', error);
		}
	},
	getMembers: async (userId: number) => {
		try {
			const res = await fetch(`${API_BASE_URL}/members/by-user/${userId}`);
			if (!res.ok) throw new Error('Failed to fetch members');
			const data = await res.json();
			return data;
		} catch (err) {
			console.error('Error fetching members:', err);
			return null;
		}
	},
	getVoteLog: async (token: string) => {
		try {
			const response = await fetch(`${API_BASE_URL}/votes`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token?.replace(/^"|"$/g, '')}`,
				},
			});
			if (response.ok) {
				return await response.json();
			} else {
				console.error(`Failed to fetch vote log, status code: ${response.status}`);
				throw new Error(`HTTP error ${response.status} - ${response.statusText}`);
			}
		} catch (error) {
			console.error('Error fetching vote log:', error);
			throw error;
		}
	},
	// Throws on failure so callers never record a vote locally that the server
	// rejected. A 401 (expired/invalid JWT) throws 'session_expired' specifically.
	addVote: async (billId: string, vote: string, date: Date) => {
		const jwt = localStorage.getItem('token');

		const response = await fetch(`${API_BASE_URL}/votes`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${jwt?.replace(/^"|"$/g, '')}`,
			},
			body: JSON.stringify({
				billId: billId,
				vote: vote,
				date: date.toISOString(),
			}),
		});
		if (response.status === 401) throw new Error('session_expired');
		if (!response.ok) throw new Error(`Vote failed with status ${response.status}`);
		return response.json();
	},
	getMemberVoteLog: async (bioguideId: string) => {
		try {
			const data = await fetch(`${API_BASE_URL}/member_votes/${bioguideId}`);
			if (!data.ok) throw new Error('Failed to fetch member vote record');
			const memberVotes = await data.json();
			return memberVotes;
		} catch (err) {
			console.error('Error fetching member votes:', err);
			return null;
		}
	},
	addMemberVote: async (bioguideId: string, billId: string, vote: string, date: Date) => {
		try {
			await fetch(`${API_BASE_URL}/member_votes`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					bioguideId: bioguideId,
					billId: billId,
					vote: vote,
					date: date.toISOString(),
				}),
			});
		} catch (error) {
			console.error('Error posting vote:', error);
		}
	},

	// Record a constituent→member contact (CWC audit trail). The backend gates
	// this on verified email + Census-verified district + delegation membership.
	recordContactMessage: async (bioguideId: string, billId: string, body: string) => {
		const jwt = localStorage.getItem('token');
		const res = await fetch(`${API_BASE_URL}/contact/messages`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${jwt?.replace(/^"|"$/g, '')}`,
			},
			body: JSON.stringify({ bioguideId, billId, body }),
		});
		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			throw new Error(data.code ?? `contact_failed_${res.status}`);
		}
		return res.json();
	},
	// Census-backed address verification: validates the address AND returns the
	// congressional district it resolves to (free, authoritative, key-less).
	verifyAddress: async (address: { street: string; city: string; state: string; zipcode: string }) => {
		try {
			const params = new URLSearchParams(address).toString();
			const res = await fetch(`${API_BASE_URL}/location/verify?${params}`);
			return (await res.json()) as {
				valid: boolean;
				matchedAddress?: string;
				state?: string;
				district?: number;
			};
		} catch (error) {
			console.error('Error validating address:', error);
			return { valid: false };
		}
	},
	// Generate (or fetch the cached) plain-English translation for a bill. The
	// backend computes it once, stores it on the bill, and serves it free after.
	translateLegalBill: async (billId: string) => {
		const res = await fetch(`${API_BASE_URL}/translate/${billId}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
		});
		if (res.status === 402) throw new Error('payment_required');
		const data = await res.json();
		return data.translation;
	},
	getCongressMembersFromFive: async (address: string) => {
		const response = await fetch(`${API_BASE_URL}/fiveCallsRoutes/representatives?location=${address}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
		});

		return response.json();
	},
	// Fetch a roll call straight from the recordedVote's own `url` (clerk.house.gov
	// or senate.gov), proxied through the backend allowlist. The host tells us which
	// parser to use, so House and Senate share one path.
	getRollCallByUrl: async (url: string) => {
		try {
			const res = await fetch(`${API_BASE_URL}/api/roll-call?url=${encodeURIComponent(url)}`);
			if (!res.ok) throw new Error(`HTTP error ${res.status}`);
			const xmlText = await res.text();
			const { metadata, votes } = url.includes('senate.gov')
				? parseSenateVoteXML(xmlText)
				: parseHouseVoteXML(xmlText);
			return [metadata, votes];
		} catch (err) {
			console.error('Failed to fetch or parse roll call:', err);
		}
	},
	// Pre-assembled bills straight from our DB — one call, no per-bill proxy fan-out.
	// The one place a bill-list query becomes a URL — facets (stage/roll-call),
	// personalization (voted), and pagination all serialize here.
	getBillsFromDb: async (opts: {
		congress: string | number;
		offset: number;
		limit?: number;
		query?: BillQuery;
		voted?: 'exclude' | 'only';
	}) => {
		const params = new URLSearchParams({
			congress: String(opts.congress),
			offset: String(opts.offset),
			limit: String(opts.limit ?? 20),
		});
		if (opts.query?.stage?.length) params.set('stage', opts.query.stage.join(','));
		if (opts.query?.hasRollCall) params.set('hasRollCall', 'true');
		const headers: Record<string, string> = {};
		if (opts.voted) {
			params.set('voted', opts.voted);
			const jwt = localStorage.getItem('token');
			if (jwt) headers.Authorization = `Bearer ${jwt.replace(/^"|"$/g, '')}`;
		}
		try {
			let res = await fetch(`${API_BASE_URL}/bills?${params}`, { headers });
			if (res.status === 401 && opts.voted === 'exclude') {
				// Stale session: serve the unpersonalized feed rather than nothing —
				// the client-side vote filter still hides this user's own votes.
				params.delete('voted');
				res = await fetch(`${API_BASE_URL}/bills?${params}`);
			}
			if (!res.ok) throw new Error(`HTTP error ${res.status}`);
			return await res.json(); // { total, limit, offset, bills }
		} catch (err) {
			console.error('Error fetching bills:', err);
			return { bills: [] };
		}
	},
	// Facet counts for the filter menu (which facets exist and how big).
	getBillFacets: async (congress: string | number) => {
		const res = await fetch(`${API_BASE_URL}/bills/facets?congress=${congress}`);
		if (!res.ok) throw new Error(`Failed to load bill facets (${res.status})`);
		return res.json() as Promise<BillFacetCounts>;
	},
	// Per-bill discussion thread — fetched only when the chat panel opens, never
	// in the feed payload (the list carries just commentCount).
	getBillComments: async (billId: string, cursor?: number) => {
		const params = cursor ? `?cursor=${cursor}` : '';
		const res = await fetch(`${API_BASE_URL}/bills/${billId}/comments${params}`);
		if (!res.ok) throw new Error(`Failed to load comments (${res.status})`);
		return res.json() as Promise<{ comments: BillCommentRecord[]; nextCursor: number | null }>;
	},
	// Throws on failure (like addVote) so the panel never shows a comment the
	// server rejected; 401 throws 'session_expired'.
	addBillComment: async (billId: string, body: string) => {
		const jwt = localStorage.getItem('token');
		const res = await fetch(`${API_BASE_URL}/bills/${billId}/comments`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${jwt?.replace(/^"|"$/g, '')}`,
			},
			body: JSON.stringify({ body }),
		});
		if (res.status === 401) throw new Error('session_expired');
		if (!res.ok) throw new Error(`Comment failed with status ${res.status}`);
		return res.json() as Promise<BillCommentRecord>;
	},
	// Aggregate Yes/No counts among each member's constituents (app users who
	// have that member in their delegation) for one bill.
	getConstituentVotes: async (billId: string, memberIds: string[]) => {
		const res = await fetch(`${API_BASE_URL}/bills/${billId}/constituent-votes?members=${memberIds.join(',')}`);
		if (!res.ok) throw new Error(`Failed to load constituent votes (${res.status})`);
		return res.json() as Promise<{
			billId: string;
			results: { bioguideId: string; yes: number; no: number; total: number }[];
		}>;
	},
	// FEC donor summary for a member (cached server-side). 404 = no FEC mapping.
	getMemberDonors: async (bioguideId: string, signal?: AbortSignal) => {
		const res = await fetch(`${API_BASE_URL}/members/${bioguideId}/donors`, { signal });
		if (res.status === 404) return null;
		if (!res.ok) throw new Error(`Failed to load donor data (${res.status})`);
		return res.json() as Promise<DonorSummary>;
	},
	getBillById: async (id: string, signal?: AbortSignal) => {
		try {
			const res = await fetch(`${API_BASE_URL}/bills/${id}`, { signal });
			if (!res.ok) return null;
			return await res.json();
		} catch (err) {
			console.error('Error fetching bill:', err);
			return null;
		}
	},
};
// Look a bill up by type/number; reads our assembled DB bill (with congress.gov
// proxy fallback). Summary HTML is sanitized where it's injected (BillCard).
export const searchForBill = async (billType: string, billNumber: string, signal?: AbortSignal) => {
	return Requests.getBillById(`119-${billType.toLowerCase()}-${billNumber}`, signal);
};
