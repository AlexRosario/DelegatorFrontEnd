import { Link } from 'react-router-dom';
import React, { useState } from 'react';
import type { ComponentProps } from 'react';
import { Requests } from '../api';
import toast from 'react-hot-toast';
import { useAuthInfo } from '../providers/AuthProvider';
import { ErrorMessage } from '../components/errorMessages';
import { useNavigate } from 'react-router-dom';
import * as _ from 'lodash-es';
import { faker } from '@faker-js/faker';
import type { FrontEndRegistrant } from '../types';

export function RegisterInput({ labelText, inputProps }: { labelText: string; inputProps: ComponentProps<'input'> }) {
	return (
		<div className='input-wrap'>
			<label>{labelText}</label>
			<input {...inputProps} />
		</div>
	);
}

export const Register = () => {
	const { setUser } = useAuthInfo();

	const [frontEndRegistrant, setFrontEndRegistrant] = useState({
		username: '',
		email: '',
		password: '',
		address: {
			street: '',
			city: '',
			state: '',
			zipcode: '',
		},
	});
	const { username, email, password, address } = frontEndRegistrant;
	const { street, city, state, zipcode } = address;
	const [confirm, setConfirm] = useState('');
	const [isFormSubmitted, setIsFormSubmitted] = useState<boolean>(false);
	const [errorMessage, setErrorMessage] = useState<string>('');
	const [isAddressValid, setIsAddressValid] = useState<boolean>(true);
	const [attested, setAttested] = useState<boolean>(false);
	const addressErrorMessage = 'We could not verify this address.';
	const navigate = useNavigate();

	const passwordsMismatch = confirm !== '' && password !== confirm;

	const handleRegister = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!attested) {
			toast.error('Please confirm that you live at this address.');
			return;
		}
		if (password !== confirm) {
			toast.error('Passwords do not match.');
			return;
		}
		setIsFormSubmitted(true);
		setIsAddressValid(true);
		setErrorMessage('');
		// Census-backed verification: validates the address and previews the district.
		// The server independently re-resolves the delegation at registration.
		const verification = await Requests.verifyAddress(address);
		if (!verification.valid) {
			setIsAddressValid(false);
			toast.error('We could not verify that address. Please check it and try again.');
			setIsFormSubmitted(false);
			return;
		}
		toast.success(
			verification.district !== undefined
				? `Address verified — ${verification.state}, District ${verification.district}`
				: 'Address verified'
		);
		try {
			const message = await Requests.register(username, email, password, address, attested);

			if (typeof message === 'string') {
				setErrorMessage(message);
				if (!message.includes('400')) {
					toast.error(message);
				} else {
					toast.error('Password must be at least 8 characters long');
				}
				setIsFormSubmitted(false);

				return;
			}

			toast.success('Registration successful');

			const data = await Requests.loginUser({ username, password });
			localStorage.setItem('user', JSON.stringify(data.userInfo));
			localStorage.setItem('token', JSON.stringify(data.token));
			// Fresh account, fresh vote log — without this, a previous account's
			// votes (shared localStorage key) leak in and hide bills from the feed.
			localStorage.setItem('userLog', JSON.stringify([]));

			await setUser(data.userInfo);

			navigate('/', { state: address });
		} catch (error) {
			console.error('Fetch error:', error);
			setIsFormSubmitted(false);
		}
	};

	// Dev-only convenience: prefill the form with a synthetic user. Never shipped
	// to production (and faker addresses fail Census verification anyway).
	const generateUser = () => {
		const capitalize = _.capitalize;
		return {
			username: capitalize(faker.internet.userName()),
			email: faker.internet.email(),
			password: faker.internet.password(),
			address: {
				street: faker.location.streetAddress(),
				city: capitalize(faker.location.city()),
				state: faker.location.state(),
				zipcode: faker.location.zipCode(),
			},
		};
	};

	return (
		<div className='register'>
			<div className='register-card'>
				<div className='register-head'>
					<h2>Create your account</h2>
					<Link
						to='/'
						className='register-back'>
						← Back to sign in
					</Link>
				</div>

				<form
					className='register-field'
					onSubmit={handleRegister}>
					{import.meta.env.DEV && (
						<button
							type='button'
							className='register-dev-fill'
							onClick={() => {
								const generatedUser = generateUser();
								setFrontEndRegistrant(generatedUser as FrontEndRegistrant);
								setConfirm(generatedUser.password);
							}}>
							Generate User (dev)
						</button>
					)}

					<RegisterInput
						labelText='Username'
						inputProps={{
							placeholder: 'Boogey',
							autoComplete: 'username',
							onChange: (e) =>
								setFrontEndRegistrant({
									...frontEndRegistrant,
									username: e.target.value,
								}),
							value: username,
						}}
					/>

					<ErrorMessage
						message={errorMessage}
						show={errorMessage.includes(username)}
					/>

					<RegisterInput
						labelText='Email'
						inputProps={{
							type: 'email',
							placeholder: 'HarrietT@email.com',
							autoComplete: 'email',
							onChange: (e) =>
								setFrontEndRegistrant({
									...frontEndRegistrant,
									email: e.target.value,
								}),
							value: email,
						}}
					/>

					<ErrorMessage
						message={errorMessage}
						show={errorMessage.includes('email')}
					/>

					<div className='register-row'>
						<RegisterInput
							labelText='Password'
							inputProps={{
								type: 'password',
								placeholder: '8+ characters',
								autoComplete: 'new-password',
								onChange: (e) =>
									setFrontEndRegistrant({
										...frontEndRegistrant,
										password: e.target.value,
									}),
								value: password,
							}}
						/>
						<RegisterInput
							labelText='Confirm password'
							inputProps={{
								type: 'password',
								placeholder: 'Repeat it',
								autoComplete: 'new-password',
								onChange: (e) => setConfirm(e.target.value),
								value: confirm,
							}}
						/>
					</div>

					<ErrorMessage
						message={'Passwords do not match'}
						show={passwordsMismatch}
					/>

					<div className='register-section'>
						<h3>Your address</h3>
						<p className='address-prompt'>
							We use it to find your congressional district and your representatives — verified against U.S. Census
							records. It's never shown to other users.
						</p>
					</div>

					<RegisterInput
						labelText='Street address'
						inputProps={{
							placeholder: '123 Main St.',
							autoComplete: 'street-address',
							onChange: (e) =>
								setFrontEndRegistrant({
									...frontEndRegistrant,
									address: {
										...frontEndRegistrant.address,
										street: e.target.value,
									},
								}),
							value: street,
						}}
					/>

					<div className='register-row register-row-3'>
						<RegisterInput
							labelText='City or town'
							inputProps={{
								placeholder: 'New York',
								autoComplete: 'address-level2',
								onChange: (e) =>
									setFrontEndRegistrant({
										...frontEndRegistrant,
										address: {
											...frontEndRegistrant.address,
											city: e.target.value,
										},
									}),
								value: city,
							}}
						/>
						<RegisterInput
							labelText='State'
							inputProps={{
								placeholder: 'NY',
								autoComplete: 'address-level1',
								onChange: (e) =>
									setFrontEndRegistrant({
										...frontEndRegistrant,
										address: {
											...frontEndRegistrant.address,
											state: e.target.value,
										},
									}),
								value: state,
							}}
						/>
						<RegisterInput
							labelText='Zipcode'
							inputProps={{
								placeholder: '12345',
								autoComplete: 'postal-code',
								inputMode: 'numeric',
								onChange: (e) =>
									setFrontEndRegistrant({
										...frontEndRegistrant,
										address: {
											...frontEndRegistrant.address,
											zipcode: e.target.value,
										},
									}),
								value: zipcode,
							}}
						/>
					</div>

					<ErrorMessage
						message={addressErrorMessage}
						show={!isAddressValid}
					/>

					<label className='attest-checkbox'>
						<input
							type='checkbox'
							checked={attested}
							onChange={(e) => setAttested(e.target.checked)}
						/>
						<span>
							I certify that I reside at this address and that messages sent through Delegator reflect my own views.
						</span>
					</label>

					<button
						type='submit'
						className='register-submit'
						disabled={isFormSubmitted || passwordsMismatch || !attested}>
						{isFormSubmitted ? 'Verifying…' : 'Create account'}
					</button>
				</form>
			</div>
		</div>
	);
};
