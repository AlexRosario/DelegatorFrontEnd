import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './providers/AuthProvider';
import { ScreenProvider } from './providers/ScreenProvider';
import { Home } from './components/Home';
import { Register } from './auth-components/Register';
import App from './App';
import { Toaster } from 'react-hot-toast';

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<Toaster />
		<AuthProvider>
			<ScreenProvider>
				<BrowserRouter>
					<Routes>
						<Route
							path='/'
							element={<App />}
						/>
						<Route
							path='/register'
							element={<Register />}
						/>
						<Route
							path='/home'
							element={<Home />}
						/>
						<Route
							path='*'
							element={<div>Not Found</div>}
						/>
					</Routes>
				</BrowserRouter>
			</ScreenProvider>
		</AuthProvider>
	</React.StrictMode>
);
