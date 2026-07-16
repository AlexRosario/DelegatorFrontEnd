import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import type { CongressMember, Representative5Calls } from '../types';
import { Requests } from '../api';
import { useAuthInfo } from './AuthProvider';

type MemberContextType = {
	senators: CongressMember[];
	houseReps: CongressMember[];
	chamber: string;
	setChamber: (chamber: string) => void;
	representatives: CongressMember[];
};

export const MemberContext = createContext<MemberContextType>({} as MemberContextType);

export const MemberProvider = ({ children }: { children: ReactNode }) => {
	const representatives = useRef<CongressMember[]>([] as CongressMember[]);
	const [senators, setSenators] = useState<CongressMember[]>([]);
	const [houseReps, setHouseReps] = useState<CongressMember[]>([]);
	const [chamber, setChamber] = useState('house');
	const { user } = useAuthInfo();
	const userId = user.id;

	const getRepInfoFromMultipleAPIs = async () => {
		try {
			// Base member data comes from our DB roster (congress.gov, populated by the cron).
			// Guard against a null/failed response so the view degrades instead of blanking.
			const dbReps: CongressMember[] = (await Requests.getMembers()) ?? [];
			if (dbReps.length === 0) {
				console.warn(`No members returned for user ${userId} — check the /members/mine response.`);
			}

			// 5Calls is the live exception: it enriches each rep with the per-user
			// context it uniquely owns (area, reason, district field offices). The
			// server resolves the caller's location — no zipcode on the client.
			const fiveById: Record<string, Representative5Calls> = {};
			try {
				const five = await Requests.getMyFiveCallsReps();
				for (const rep of (five?.representatives ?? []) as Representative5Calls[]) {
					fiveById[rep.id] = rep;
				}
			} catch (error) {
				console.error('5Calls enrichment unavailable; using DB data only', error);
			}

			return dbReps.map((member) => {
				const five = fiveById[member.id];
				// Prefer 5Calls area; fall back to the DB chamber so the view still
				// works (and the house/senate split holds) if 5Calls is unavailable.
				const area: 'US House' | 'US Senate' =
					five?.area ?? member.area ?? (member.chamber === 'Senate' ? 'US Senate' : 'US House');
				return {
					...member,
					area,
					reason: five?.reason ?? member.reason,
					field_offices: five?.field_offices ?? member.field_offices ?? [],
				};
			});
		} catch (error) {
			console.error('Error fetching member bios:', error);
			throw error;
		}
	};

	const setStateVariables = async (reps: CongressMember[]) => {
		const house = await reps.filter((member: CongressMember) => member.area == 'US House');
		const senate = await reps.filter((member: CongressMember) => member.area == 'US Senate');
		setHouseReps(house);
		setSenators(senate);
		localStorage.setItem('houseReps', JSON.stringify(house));
		localStorage.setItem('senators', JSON.stringify(senate));
	};

	useEffect(() => {
		if (!userId) return;
		getRepInfoFromMultipleAPIs()
			.then((data) => {
				representatives.current = data;
				setStateVariables(data);
			})
			.catch((error) => {
				console.error('Fetch error:', error.message);
				if (error.response) {
					console.error('Response text:', error.response.statusText);
				}
			});
	}, [userId]);

	return (
		<MemberContext.Provider
			value={{
				senators,
				houseReps,
				chamber,
				setChamber,
				representatives: representatives.current,
			}}>
			{children}
		</MemberContext.Provider>
	);
};

export const useDisplayMember = () => {
	return useContext(MemberContext);
};
