import type { Representative5Calls } from './types';
import { API_BASE_URL } from './config';
import DOMPurify from 'dompurify';
import { parseSenateVoteXML, parseHouseVoteXML } from './utils/parser-utils';
export const googleCivicHeader = new Headers();
googleCivicHeader.append('Content-Type', 'application/json');
googleCivicHeader.append('key', import.meta.env.VITE_GOOGLE_API_KEY);
export const myHeaders = {
	'Content-Type': 'application/json',
};

export const congressGovHeader = new Headers({
	...myHeaders,
	'X-API-Key': import.meta.env.VITE_API_KEY,
});

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
		memberIds: string
	) => {
		const url = `${API_BASE_URL}/auth/register`;

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
				memberIds: memberIds,
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
	addVote: async (billId: string, vote: string, date: Date) => {
		const jwt = localStorage.getItem('token');

		try {
			await fetch(`${API_BASE_URL}/votes`, {
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
		} catch (error) {
			console.error('Error posting vote:', error);
		}
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

	//External api calls
	isValidAddress: async (address: string): Promise<boolean> => {
		const query = encodeURIComponent(address);

		try {
			const res = await fetch(`${API_BASE_URL}/location/geocode?query=${query}`);
			const data = await res.json();

			return Array.isArray(data.data) && data.data.length > 0 && data.data[0].confidence > 0.8;
		} catch (error) {
			console.error('Error validating address:', error);
			return false;
		}
	},
	getBills: async (congress: string, billType: string, offset: number) => {
		const url = `${API_BASE_URL}/congressGovRoutes/bill${congress ? `/${congress}` : ''}${
			billType ? `/${billType}` : ''
		}${offset !== 0 ? `?offset=${offset}` : ''}`;
		try {
			const response = await fetch(url, {
				method: 'GET',
			});
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			return data;
		} catch (error) {
			console.error('Fetch error:', error);
			throw error;
		}
	},
	getFullBill: async (congress: string, billType: string, billNumber: string, signal?: AbortSignal) => {
		const url = `${API_BASE_URL}/congressGovRoutes/bill/${congress}/${billType}/${billNumber}`;
		try {
			const response = await fetch(url, {
				method: 'GET',
				signal,
			});
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			return data;
		} catch (error) {
			console.error('Fetch error:', error);
			throw error;
		}
	},
	getBillDetail: async (
		congress: string,
		billType: string,
		billNumber: string,
		billDetail: string,
		signal?: AbortSignal
	) => {
		const url = `${API_BASE_URL}/congressGovRoutes/bill/${congress}/${billType}/${billNumber}/${billDetail}`;
		try {
			const response = await fetch(url, {
				method: 'GET',
				signal,
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			return data;
		} catch (error) {
			console.error('Fetch error:', error);
			throw error;
		}
	},
	getBillText: async (url: string) => {
		console.log('url:', url);
		try {
			const params = new URLSearchParams({ url }).toString();
			const response = await fetch(`${API_BASE_URL}/congressGovRoutes/extract-text?${params}`, {
				method: 'GET',
			});
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			return data;
		} catch (error) {
			console.error('Fetch error:', error);
			throw error;
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
	getBillsFromDb: async (congress: string, offset: number, limit = 20) => {
		try {
			const res = await fetch(`${API_BASE_URL}/bills?congress=${congress}&offset=${offset}&limit=${limit}`);
			if (!res.ok) throw new Error(`HTTP error ${res.status}`);
			return await res.json(); // { total, limit, offset, bills }
		} catch (err) {
			console.error('Error fetching bills:', err);
			return { bills: [] };
		}
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
// Kept for callers that look a bill up by type/number; now reads our assembled DB
// bill (with congress.gov proxy fallback) instead of 4 separate proxy calls.
export const searchForBill = async (billType: string, billNumber: string, signal?: AbortSignal) => {
	const bill = await Requests.getBillById(`119-${billType.toLowerCase()}-${billNumber}`, signal);
	if (bill && typeof bill.summary === 'string') bill.summary = DOMPurify.sanitize(bill.summary);
	return bill;
};
