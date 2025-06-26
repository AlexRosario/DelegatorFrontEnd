import type { Representative5Calls, CongressMember } from './types';
import DOMPurify from 'dompurify';
import { parseSenateVoteXML } from './utils/parser-utils';

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
		const url = 'http://localhost:8080/auth/register';

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
			const response = await fetch('http://localhost:8080/auth/login', {
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
			const members = await fetch(`http://localhost:8080/members`, {
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
			const res = await fetch(`http://localhost:8080/members/by-user/${userId}`);
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
			const response = await fetch(`http://localhost:8080/votes`, {
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
			await fetch(`http://localhost:8080/votes`, {
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
			const data = await fetch(`http://localhost:8080/member_votes/${bioguideId}`);
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
			await fetch(`http://localhost:8080/member_votes`, {
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
			const res = await fetch(`http://localhost:8080/location/geocode?query=${query}`);
			const data = await res.json();

			return Array.isArray(data.data) && data.data.length > 0 && data.data[0].confidence > 0.8;
		} catch (error) {
			console.error('Error validating address:', error);
			return false;
		}
	},
	getBills: async (congress: string, billType: string, offset: number) => {
		const url = `http://localhost:8080/congressGovRoutes/bill${congress ? `/${congress}` : ''}${
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
		const url = `http://localhost:8080/congressGovRoutes/bill/${congress}/${billType}/${billNumber}`;
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
		const url = `http://localhost:8080/congressGovRoutes/bill/${congress}/${billType}/${billNumber}/${billDetail}`;
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
		try {
			const response = await fetch('/api/extract-bill-text', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					url: url,
				}),
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
	checkExistingReps: async (userId: String) => {
		const response = await fetch(`http://localhost:8080/users/${userId}/representatives`);
		if (!response.ok) {
			return [];
		}
		return response.json();
	},
	postNewReps: async (rep: CongressMember, userId: string) => {
		const response = await fetch(`http://localhost:8080/users/${userId}/representatives`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(rep),
		});

		if (!response.ok) {
			throw new Error('Failed to post new representative');
		}

		return response.json();
	},
	getCongressMembersFromFive: async (address: string) => {
		const response = await fetch(`http://localhost:8080/fiveCallsRoutes/representatives?location=${address}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
		});

		return response.json();
	},
	getCongressMember: async (bioID: string) => {
		const url = `http://localhost:8080/congressGovRoutes/member/${bioID}`;
		try {
			const response = await fetch(url, {
				method: 'GET',
			});
			if (!response.ok) {
				throw new Error(`Failed to fetch: ${response.statusText}`);
			}
			return await response.json();
		} catch (error) {
			console.error(error);
		}
	},
	getCongressMembersDB: (reps: string[]) => {
		const url = `http://localhost:8080/representatives`; // Assuming user has an 'id' property
		return fetch(url, {
			method: 'GET',
			headers: myHeaders,
		})
			.then((response) => {
				return response.json();
			})
			.then((members) => {
				return members.filter((memberName: string) => reps.includes(memberName));
			})
			.catch((error) => console.error('Fetch error:', error));
	},
	getHouseRollCall: async (rollId: number, year: string) => {
		try {
			const res = await fetch(`http://localhost:8080/api/house-roll-call/${rollId}/${year}`);
			const xmlText = await res.text();

			const parser = new DOMParser();
			const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
			const metaData = Array.from(xmlDoc.querySelectorAll('totals-by-party')).map((node) => ({
				party: node.querySelector('party')?.textContent ?? null,
				yeas: node.querySelector('yea-total')?.textContent ?? null,
				nays: node.querySelector('nay-total')?.textContent ?? null,
				present: node.querySelector('present-total')?.textContent ?? null,
				no_vote: node.querySelector('not-voting-total')?.textContent ?? null,
			}));
			const votes = Array.from(xmlDoc.querySelectorAll('recorded-vote')).map((node) => {
				const legislator = node.querySelector('legislator');
				return {
					id: legislator?.getAttribute('name-id'),
					name: legislator?.textContent,
					vote: node.querySelector('vote')?.textContent,
					party: legislator?.getAttribute('party'),
				};
			});
			return [metaData, votes];
		} catch (err) {
			console.error('Failed to fetch or parse XML:', err);
		}
	},
	getSenateRollCall: async (rollId: number, congress: number, sessionNum: number) => {
		try {
			const res = await fetch(`http://localhost:8080/api/senate-roll-call/${rollId}/${congress}/${sessionNum}`);
			const xmlText = await res.text();
			const { metadata, votes } = parseSenateVoteXML(xmlText);

			return [metadata, votes];
		} catch (err) {
			console.error('Failed to fetch or parse XML:', err);
		}
	},
};
export const searchForBill = async (billType: string, billNumber: string, signal?: AbortSignal) => {
	try {
		const fullBillDataPromise = await Requests.getFullBill('119', billType, billNumber, signal);
		const summariesDataPromise = await Requests.getBillDetail('119', billType, billNumber, 'summaries', signal);
		const subjectsDataPromise = await Requests.getBillDetail('119', billType, billNumber, 'subjects', signal);
		const actionsDataPromise = await Requests.getBillDetail('119', billType, billNumber, 'actions');

		const [fullBillData, summariesData, subjectsData, actionsData] = await Promise.all([
			fullBillDataPromise,
			summariesDataPromise,
			subjectsDataPromise,
			actionsDataPromise,
		]);

		return {
			...fullBillData.bill,
			summary:
				summariesData.summaries.length > 0
					? DOMPurify.sanitize(summariesData.summaries[summariesData.summaries.length - 1].text)
					: 'No Summary Available',
			subjects: subjectsData.subjects,
			actions: actionsData.actions,
		};
	} catch (error) {
		console.error('Failed to fetch bills:', error);
		return null;
	}
};
