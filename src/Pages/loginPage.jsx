import { useState } from 'react';
import './login-page.css';
import TextFieldCredentials from '../Components/TextFieldCredentials';
import Button from '../Components/Button';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaKey } from 'react-icons/fa';
import axios from 'axios';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const response = await axios.post('http://localhost:5000/login', { username, password });
      if (response.data.success) {
        // Store both role and priceListAccess in localStorage
        localStorage.setItem('userRole', response.data.role);
        localStorage.setItem('priceListAccess', response.data.priceListAccess);
        navigate('/SKUfinder');
      } else {
        setError('Invalid username or password');
      }
    } catch (error) {
      setError('Invalid username or password');
      console.error('Login error:', error);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <>
    {/* 
      1) Wrap the entire page content in "login-page-container" 
         so that we can hide its scrollbar in CSS.
    */}
    <div className="login-page-container">
      <h1 className="heading-h1">Welcome to PrimeSKU Finder</h1>
      <div className="container-div">
        <div className="containerLeft-div">
          <h1 className="login-Label-h1">Employee Login</h1>
          <div className="text-field-container">
            <FaUser className="user-icon" />
            <TextFieldCredentials
              className="animated-input"
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="text-field-container">
            <FaKey className="password-icon" />
            <TextFieldCredentials
              className="animated-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <Button onClick={handleLogin} className="animated-button">Sign In</Button>
        </div>
        <div className="containerRight-div">
          <img className="logo-img" src="logo.png" alt="Company Logo" />
        </div>
      </div>
      <div className="bottom-div"></div>
    </div>
    </>
  );
}
