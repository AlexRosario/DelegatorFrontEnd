import { useContext, createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';

export type AuthContextType = {
	user: User;
	setUser: (user: User) => void;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const defaultUser: User = {
	id: 0,
	username: '',
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
	const [user, setUser] = useState<User>(defaultUser);

	useEffect(() => {
		// Scrub storage written by older builds: JWTs and vote logs no longer
		// live client-side (cookie session + server-seeded votes).
		localStorage.removeItem('token');
		localStorage.removeItem('userLog');

		const userString = localStorage.getItem('user');
		if (userString) {
			try {
				const stored = JSON.parse(userString);
				// Re-persist only the PII-free shape — older builds stored zipcode
				// and district here, which must not survive this load.
				const cleaned: User = { id: stored.id ?? 0, username: stored.username ?? '' };
				if (stored.emailVerified !== undefined) cleaned.emailVerified = stored.emailVerified;
				localStorage.setItem('user', JSON.stringify(cleaned));
				setUser(cleaned);
			} catch (e) {
				console.error('Invalid user JSON in localStorage', e);
			}
		}
	}, []);

	return <AuthContext.Provider value={{ user, setUser }}>{children}</AuthContext.Provider>;
};

export const useAuthInfo = () => {
	return useContext(AuthContext);
};
