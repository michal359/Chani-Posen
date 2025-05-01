import React, { useState, useEffect } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { serverRequests } from '../Api';
import axios from 'axios';
axios.defaults.withCredentials = true;
import { Container, Typography, TextField, Button, Box, Alert, Link } from '@mui/material';

// import '../css/login.css';

const Login = ({ setUserData }) => {

  const navigate = useNavigate();
  const [loginError, setLoginError] = useState('');
  const [salt, setSalt] = useState('');
  const [email, setEmail] = useState('');

  function setToken(token, expiresIn) {
    const expirationTime = new Date().getTime() + expiresIn * 60000;
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('expirationTime', expirationTime);
  }

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    salt: ""
  });
  const URL = `login`;

  const handleLogin = () => {
    serverRequests('GET', `${URL}/${formData.username}`, null)
      .then(response => {
        if (!response.ok) {
          return;
        }
        return response.json();
      })
      .then(data => {
        if (data) {
          setSalt(data.salt);
          console.log("username after login ", formData.username)
        }
        else
          setLoginError("Incorrect password or username");
      })
      .catch(error => {
        console.error('Error:', error);
      });
  }

  useEffect(() => {
    if (salt) {
      setFormData(prev => ({ ...prev, salt }));
      serverRequests('POST', URL, { ...formData, salt })
        .then(response => {
          if (!response.ok) {
            setLoginError("Incorrect password or username");
            setSalt('');
            setFormData(prev => ({
              ...prev,
              password: ""
            }));
            return;
          }
          return response.json();
        })
        .then(data => {
          if (data) {
            const { user, token } = data;
            setToken(token, 60);
            setUserData(user);
            setLoginError("");
            switch (data.user.role_id) {
              case 1:
                navigate('/admin-home');
                break;
              case 2:
                navigate('/client-home');
                break;
              default:
                navigate('/');
            }
          }
        })
        .catch(error => {
          setLoginError('Error', error);
        });
    }
  }, [salt]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const forgotPasswordHandle = () => {
    serverRequests('GET', `users/email/${formData.username}`, null)
      .then(response => {
        return response.json();
      })
      .then(data => {
        if (data) {
          setEmail(data.email);
        } else {
          setLoginError('')
        }
      })
      .catch(error => {
        console.error('Error:', error);
      });
  }

  useEffect(() => {
    if (!email)
      return;
    serverRequests('PUT', `users/forgot-password`, { email: email })
      .then(response => {
        return response.json()
      })
      .then(data => {
        if (data) {
          setLoginError(data.message);
          setFormData({
            username: "",
            password: "",
            salt: ""
          })
        }
      })
      .catch(error => {
        console.error('Error:', error);
        setLoginError(error.message);
        setFormData(prev => ({
          ...prev,
          password: ""
        }));
      });
  }, [email])

  return (
    <Container maxWidth="xs" dir="rtl">
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 5, p: 3, borderRadius: 2, boxShadow: 3, bgcolor: 'white' }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          היי! כיף לראות אותך שוב 🥰
        </Typography>
        <Box component="form" sx={{ width: '100%', mt: 2, direction: 'rtl' }} onSubmit={e => { e.preventDefault(); handleLogin(); }}>
          <TextField
            fullWidth
            label="שם משתמש"
            variant="outlined"
            name="username"
            value={formData.username}
            onChange={handleChange}
            margin="normal"
            InputProps={{
              sx: {
                '& input:-webkit-autofill': {
                  WebkitBoxShadow: '0 0 0 1000px white inset',
                  WebkitTextFillColor: 'black',
                },
              },
            }}
          />
          <TextField
            fullWidth
            label="סיסמא"
            type="password"
            variant="outlined"
            name="password"
            value={formData.password}
            onChange={handleChange}
            margin="normal"
            InputProps={{
              sx: {
                '& input:-webkit-autofill': {
                  WebkitBoxShadow: '0 0 0 1000px white inset',
                  WebkitTextFillColor: 'black',
                },
              },
            }}
          />

          {loginError && <Alert severity="error" sx={{ mt: 2 }}>{loginError}</Alert>}

          <Button
            fullWidth
            variant="contained"
            type="submit"
            sx={{
              mt: 3,
              borderRadius: 3,
              backgroundColor: '#B68FFF',
              color: '#fff',
              '&:hover': {
                backgroundColor: '#A256E8',
              }
            }}
          >
            התחברי
          </Button>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
          <Button variant="body2" onClick={() => { }} style={{ color: '#B68FFF' }}>
            שכחת סיסמא?
          </Button>
        </Box>
        <Typography variant="body2" sx={{ mt: 2 }}>
          אין לך חשבון באתר? <NavLink to="/register" style={{ color: '#B68FFF', fontWeight: 600 }}>הירשמי</NavLink>
        </Typography>
      </Box>
    </Container>
  );

  // return (
  //   <div className='loginDiv'>
  //     <div className="form-container">
  //       <p className="title">היי! כיף לראות אותך שוב🥰</p>
  //       <p className="sub-title">רק שם משתמש וסיסמא...</p><br></br>
  //       <form className="form" onSubmit={e => { e.preventDefault(); handleLogin(); }}>
  //         <input
  //           type="text"
  //           className="input"
  //           placeholder="שם משתמש"
  //           name="username"
  //           value={formData.username}
  //           onChange={handleChange}
  //         />
  //         <input
  //           type="password"
  //           className="input"
  //           placeholder="סיסמא"
  //           name="password"
  //           value={formData.password}
  //           onChange={handleChange}
  //         />
  //         {loginError &&
  //           <p className='error' style={{ color: "red" }}>{loginError}</p>}
  //         <p className="page-link">
  //           <span className="page-link-label">שכחת סיסמא?</span>
  //         </p>
  //         <button className="form-btn" type="submit">התחברי</button>
  //       </form>
  //       <p className="sign-up-label">
  //         אין לך חשבון באתר? <NavLink to="/register" className="sign-up-link">הירשמי</NavLink>
  //       </p>

  //     </div>
  //   </div>
  // );
};

export default Login;
