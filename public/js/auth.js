import axios from 'axios';
import { showAlert } from './alert';

export const login = async (email, password) => {
  try {
    const res = await axios({
      method: 'POST',
      url: 'http://127.0.0.1:3000/api/v1/users/login/',
      data: {
        email: email,
        password: password
      }
    });

    if (res.data.status === 'success') {
      showAlert('success', 'Logged in successfully!');
      window.setTimeout(() => {
        location.assign('/');
      }, 1500);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};

export const logout = async () => {
  try {
    const res = await axios({
      method: 'GET',
      url: 'http://127.0.0.1:3000/api/v1/users/logout/'
    });

    if (res.data.status === 'success') window.location.replace('/'); // Redirect to Home Page
  } catch (err) {
    showAlert('error', 'Error logging out, please try again!');
  }
};

export const signup = async (firstName, lastName, email, password, passwordConfirm) => {
  // Preliminary checks
  if (password !== passwordConfirm) return showAlert('error', 'Password and Confirm Password should match!');

  try {
    const res = await axios({
      method: 'POST',
      url: 'http://127.0.0.1:3000/api/v1/users/signup/',
      data: {
        name: `${firstName} ${lastName}`,
        email: email,
        password: password,
        passwordConfirm: passwordConfirm
      }
    });
    if (res.data.status === 'success') {
      showAlert('success', 'Please confirm your email address!');
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};
