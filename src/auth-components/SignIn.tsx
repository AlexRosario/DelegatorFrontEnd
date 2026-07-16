import { useEffect, useState } from 'react';
import { Requests } from '../api';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthInfo } from '../providers/AuthProvider';

export const SignIn = () => {
  const [name, setName] = useState('');
  const [pWord, setPWord] = useState('');
  const { setUser } = useAuthInfo();

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.state) {
      setName(location.state.username || '');
      setPWord(location.state.password || '');
    }
  }, [location.state]);

  const handleSignIn = async () => {
    await Requests.loginUser({ username: name, password: pWord })
      .then(async (data) => {
        if (!data) {
          throw new Error('User not found or incorrect password');
        }

        // Session JWT arrives as an httpOnly cookie (never touchable from JS);
        // the vote log is server-seeded by BillProvider on mount. Only the
        // PII-free user object persists client-side.
        localStorage.setItem('user', JSON.stringify(data.userInfo));

        setUser(data.userInfo);
        navigate('/', {
          state: data.address
        });
      })
      .catch((err) => {
        toast.error('No matching credentials found');
        console.error('Fetch error:', err.message);
      });
  };

  return (
    <>
      <form
        className="sign-in-field"
        onSubmit={(e) => {
          e.preventDefault();
          handleSignIn();
        }}
      >
        <input
          className="name"
          type="text"
          name="name"
          placeholder="Username"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          className="password"
          type="password"
          name="password"
          placeholder="Password"
          value={pWord}
          onChange={(e) => setPWord(e.target.value)}
        />

        <button type="submit">Sign In</button>
      </form>
    </>
  );
};
