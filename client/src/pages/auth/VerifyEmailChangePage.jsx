import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { verifyEmailChange } from '../../api/authApi.js';
import AuthPageShell from '../../components/auth/AuthPageShell/AuthPageShell.jsx';
import Alert from '../../components/common/Alert/Alert.jsx';
import Loader from '../../components/common/Loader/Loader.jsx';
import useAuth from '../../hooks/useAuth.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';

function VerifyEmailChangePage() {
  const { token } = useParams();
  const { logout } = useAuth();
  const [state, setState] = useState({ status: 'loading', message: '' });

  useEffect(() => {
    let active = true;
    verifyEmailChange(token)
      .then(async (result) => {
        await logout();
        if (active) setState({ status: 'success', message: result.message });
      })
      .catch((error) => {
        if (active) {
          setState({ status: 'error', message: getApiErrorMessage(error) });
        }
      });
    return () => {
      active = false;
    };
  }, [logout, token]);

  return (
    <>
      <Helmet>
        <title>Confirm email change | iRAP</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <AuthPageShell
        title="Confirm your new email address"
        description="A successful change revokes all active sessions and requires a new login."
      >
        {state.status === 'loading' ? (
          <Loader label="Confirming email change" size="large" />
        ) : null}
        {state.status === 'success' ? (
          <Alert tone="success" title="Email address changed">
            {state.message} <Link to="/login">Continue to login</Link>
          </Alert>
        ) : null}
        {state.status === 'error' ? (
          <Alert tone="error" title="Email change unsuccessful">
            {state.message}
          </Alert>
        ) : null}
      </AuthPageShell>
    </>
  );
}

export default VerifyEmailChangePage;
