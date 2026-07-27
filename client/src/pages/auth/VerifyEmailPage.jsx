import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { verifyEmail } from '../../api/authApi.js';
import AuthPageShell from '../../components/auth/AuthPageShell/AuthPageShell.jsx';
import Alert from '../../components/common/Alert/Alert.jsx';
import Loader from '../../components/common/Loader/Loader.jsx';
import { getApiErrorMessage } from '../../utils/apiErrors.js';

function VerifyEmailPage() {
  const { token } = useParams(); const [state, setState] = useState({ status: 'loading', message: '' });
  useEffect(() => { let active = true; verifyEmail(token).then((result) => { if (active) setState({ status: 'success', message: result.message }); }).catch((error) => { if (active) setState({ status: 'error', message: getApiErrorMessage(error) }); }); return () => { active = false; }; }, [token]);
  return <><Helmet><title>Verify email | iRAP</title><meta name="robots" content="noindex,nofollow" /></Helmet><AuthPageShell title="Email verification" description="The verification token is single-use and stored only as a cryptographic hash in the database.">
    {state.status === 'loading' ? <Loader label="Verifying email address" size="large" /> : null}
    {state.status === 'success' ? <Alert tone="success" title="Email verified">{state.message} <Link to="/login">Continue to login</Link></Alert> : null}
    {state.status === 'error' ? <Alert tone="error" title="Verification unsuccessful">{state.message}</Alert> : null}
  </AuthPageShell></>;
}
export default VerifyEmailPage;
