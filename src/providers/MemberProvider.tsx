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
			const reps = await Requests.getMembers(userId);

			const congressDataResults = await Promise.all(
				reps.map(async (member: Representative5Calls) => {
					return await Requests.getCongressMember(member.id);
				})
			);
			return congressDataResults.map((obj) => {
				const rep = reps.find((r: Representative5Calls) => r.id == obj.member.bioguideId);
				return { ...obj.member, ...rep };
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
