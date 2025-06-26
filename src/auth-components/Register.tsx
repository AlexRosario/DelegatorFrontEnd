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
import type { FrontEndRegistrant, Representative5Calls } from '../types';
export function RegisterInput({ labelText, inputProps }: { labelText: string; inputProps: ComponentProps<'input'> }) {
	return (
		<div className='input-wrap'>
			<label>{labelText}:</label>

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
	const [lockButton, setLockButton] = useState<boolean>(false);
	const addressErrorMessage = 'This address does not exist.';
	const navigate = useNavigate();

	const findReps = async (addressString: string) => {
		return await Requests.getCongressMembersFromFive(addressString).then((reps) => reps);
	};

	const handleRegister = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsFormSubmitted(true);
		setIsAddressValid(true);
		setErrorMessage('');
		const addressString = `${address.street}, ${address.city}, ${address.state} ${address.zipcode}`;
		const isValid = await Requests.isValidAddress(addressString);
		const members = await findReps(addressString);
		//address validator api reached free monthly limit. FiveCalls api doesnt validate address, but prioritizes a criteria
		if (members.error || !isValid) {
			setIsAddressValid(false);
			toast.error('Invalid address. Please try again.');
			setIsFormSubmitted(false);
			return;
		}
		await Promise.all(members.representatives.map((member: Representative5Calls) => Requests.addNewMember(member)));
		try {
			const message = await Requests.register(
				username,
				email,
				password,
				address,
				members.representatives.map((m: Representative5Calls) => m.id)
			);

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

			await setUser(data.userInfo);

			navigate('/', { state: address });
		} catch (error) {
			console.error('Fetch error:', error);
			setIsFormSubmitted(false);
		}
	};
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
			<Link to='/'>
				<button type='button'>Home</button>
			</Link>

			<form
				className='register-field'
				onSubmit={handleRegister}>
				<button
					className='btn'
					onClick={(e) => {
						e.preventDefault();
						const generatedUser = generateUser();
						setFrontEndRegistrant(generatedUser as FrontEndRegistrant);
						setConfirm(generatedUser.password);
					}}>
					Generate User
				</button>
				<RegisterInput
					labelText='Username'
					inputProps={{
						placeholder: 'Boogey',
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
						placeholder: 'HarrietT@email.com',
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

				<RegisterInput
					labelText='Password'
					inputProps={{
						placeholder: 'Password',
						onChange: (e) =>
							setFrontEndRegistrant({
								...frontEndRegistrant,
								password: e.target.value,
							}),
						value: password,
					}}
				/>
				<RegisterInput
					labelText='Confirm Password'
					inputProps={{
						placeholder: 'Confirm Password',
						onChange: (e) => {
							if (e.target.value !== password) {
								setLockButton(true);
							}
							setConfirm(e.target.value);
							setLockButton(false);
						},
						value: confirm,
					}}
				/>

				<ErrorMessage
					message={'Passwords do not match'}
					show={password !== confirm}
				/>

				<div className='address-prompt'>Give us your address and we'll find your representatives for you.</div>
				<RegisterInput
					labelText={`Street Address`}
					inputProps={{
						placeholder: '123 Main St.',
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

				<RegisterInput
					labelText={`City or Town`}
					inputProps={{
						placeholder: 'New York',
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
					labelText={`State`}
					inputProps={{
						placeholder: 'NY',
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
					labelText={`Zipcode`}
					inputProps={{
						placeholder: '12345',
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

				<ErrorMessage
					message={addressErrorMessage}
					show={!isAddressValid}
				/>

				<button
					type='submit'
					disabled={isFormSubmitted || lockButton}>
					Submit
				</button>
			</form>
		</div>
	);
};
