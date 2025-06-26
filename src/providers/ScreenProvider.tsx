import { useContext, createContext, useState } from 'react';
import type { ReactNode } from 'react';

export type ScreenContextType = {
	screenSelect: string;
	setScreenSelect: (screenSelect: string) => void;
};

const ScreenContext = createContext<ScreenContextType>({} as ScreenContextType);

export const ScreenProvider = ({ children }: { children: ReactNode }) => {
	const [screenSelect, setScreenSelect] = useState('bills');

	return <ScreenContext.Provider value={{ screenSelect, setScreenSelect }}>{children}</ScreenContext.Provider>;
};
export const useScreenInfo = () => useContext(ScreenContext);
