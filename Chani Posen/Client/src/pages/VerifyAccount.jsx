import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { serverRequests } from '../Api';

function VerifyAccount() {
    const { token } = useParams();
    const navigate = useNavigate();

    const [message, setMessage] = useState('מאמתים את החשבון שלך...');
    const [tokenValid, setTokenValid] = useState(false);
    const [userId, setUserId] = useState(null);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordSaved, setPasswordSaved] = useState(false);
    const [submitDisabled, setSubmitDisabled] = useState(false);
    const [error, setError] = useState('');
    const [tokenExpired, setTokenExpired] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendMessage, setResendMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setMessage('קישור לא תקין.');
            return;
        }

        serverRequests('GET', `clients/verify-token/${token}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    setMessage('הקישור תקין וניתן להזין סיסמה');
                    setTokenValid(true);
                    setUserId(data.user_id);
                    setTokenExpired(false);
                } else {
                    if (data.message === "הטוקן לא נמצא במערכת") {
                        setMessage('קישור לא קיים');
                        setTokenExpired(false);
                    } else if (data.message === "תוקף הטוקן פג") {
                        setMessage('קישור פג תוקף');
                        setTokenExpired(true);
                        setUserId(data.user_id); // חשוב לשמור כדי שנוכל לשלוח בקשה לשרת
                        setTokenValid(false);
                    } else {
                        setMessage('קישור לא תקין או שפג תוקפו.');
                        setTokenExpired(false);
                    }
                }
            })
            .catch(error => {
                console.error('Error:', error);
                setMessage('שגיאה בבדיקה. נסה שוב מאוחר יותר.');
            });
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitDisabled(true);

        if (!password || !confirmPassword) {
            setError('נא למלא את שני השדות');
            setSubmitDisabled(false);
            return;
        }

        if (password !== confirmPassword) {
            setError('הסיסמאות אינן תואמות');
            setSubmitDisabled(false);
            return;
        }

        try {
            const res = await serverRequests('POST', 'clients/set-password', {
                user_id: userId,
                password,
                token_id: token,
            });

            const data = await res.json();
            if (data.success) {
                setMessage('הסיסמה נשמרה והחשבון אומת בהצלחה. בדוק את המייל שלך.');
                setTokenValid(false);
                setPasswordSaved(true);
                setTimeout(() => {
                    navigate('/login');
                }, 4000);
            } else {
                setError(data.message || 'שגיאה בהגדרת הסיסמה');
                setSubmitDisabled(false);
            }
        } catch (err) {
            console.error('שגיאה בשליחת סיסמה:', err);
            setError('שגיאה בהגדרת הסיסמה');
            setSubmitDisabled(false);
        }
    };

    const handleResendVerification = async () => {
        if (!userId) return;

        setResendLoading(true);
        setResendMessage('');
        try {
            const res = await serverRequests('POST', 'clients/resend-verification', { user_id: userId });
            const data = await res.json();

            if (data.success) {
                setResendMessage('קישור אימות חדש נשלח למייל שלך.');
            } else {
                setResendMessage('שגיאה בשליחת הקישור החדש. נסה שוב מאוחר יותר.');
            }
        } catch (err) {
            console.error('שגיאה בשליחת קישור חדש:', err);
            setResendMessage('שגיאה בשליחת הקישור החדש. נסה שוב מאוחר יותר.');
        }
        setResendLoading(false);
    };

    return (
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <h2>{message}</h2>

            {tokenValid && (
                <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
                    <div>
                        <input
                            type="password"
                            placeholder="סיסמה"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{ padding: '0.5rem', marginBottom: '0.5rem' }}
                        />
                    </div>
                    <div>
                        <input
                            type="password"
                            placeholder="אישור סיסמה"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            style={{ padding: '0.5rem', marginBottom: '0.5rem' }}
                        />
                    </div>
                    <button type="submit" style={{ padding: '0.5rem 1rem' }} disabled={submitDisabled}>
                        {passwordSaved ? 'הסיסמה נשמרת...' : 'אשר סיסמה'}
                    </button>

                    {error && <p style={{ color: 'red', marginTop: '0.5rem' }}>{error}</p>}
                </form>
            )}

            {tokenExpired && (
                <div style={{ marginTop: '2rem' }}>
                    <button
                        onClick={handleResendVerification}
                        disabled={resendLoading}
                        style={{ padding: '0.5rem 1rem' }}
                    >
                        {resendLoading ? 'שולח...' : 'שלח קישור אימות חדש'}
                    </button>
                    {resendMessage && <p style={{ marginTop: '1rem', color: 'green' }}>{resendMessage}</p>}
                </div>
            )}
        </div>
    );
}

export default VerifyAccount;
