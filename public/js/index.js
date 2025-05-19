import 'core-js/stable';
import { displayMap } from './mapbox';
import { login, logout, signup } from './auth';
import { updateSettings } from './updateSettings';
import { bookTour } from './stripe';

// DOM ELEMENTS
const mapBox = document.getElementById('map');

// VALUES

// DELEGATION
if (mapBox) {
  const locations = JSON.parse(mapBox.dataset.locations);
  displayMap(locations);
}

// SIGNUP
document.querySelector('.form--signup')?.addEventListener('submit', async e => {
  e.preventDefault();

  document.querySelector('.btn--signup').textContent = 'Please wait...';
  const firstName = document.getElementById('firstName').value;
  const lastName = document.getElementById('lastName').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const passwordConfirm = document.getElementById('passwordConfirm').value;

  await signup(firstName, lastName, email, password, passwordConfirm);

  document.querySelector('.btn--signup').textContent = 'Sign Up';
});

// LOGIN
document.querySelector('.form--login')?.addEventListener('submit', e => {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  login(email, password);
});

// LOGOUT
document.querySelector('.nav__el--logout')?.addEventListener('click', logout);

// UPDATE SETTINGS
document.querySelector('.form-user-data')?.addEventListener('submit', async e => {
  e.preventDefault();

  document.querySelector('.btn--save-settings').textContent = 'Updating...';

  const form = new FormData();
  form.append('name', document.getElementById('name').value);
  form.append('email', document.getElementById('email').value);
  form.append('photo', document.getElementById('photo').files[0]);

  await updateSettings(form, 'data');

  const userUploadedFile = form.get('photo');

  // If the user changed it's picture update header and settings photo
  if (userUploadedFile.type === 'image/jpeg') {
    const userPhotoCurrent = document.querySelector('.form__user-photo'); // settings photo
    const userPhotoIconCurrent = document.querySelector('.nav__user-img'); // header photo

    userPhotoCurrent.setAttribute('src', `img/users/${userUploadedFile.name}`);
    userPhotoIconCurrent.setAttribute('src', `img/users/${userUploadedFile.name}`);
  }

  document.querySelector('.btn--save-settings').textContent = 'Save settings';
});

// UPDATE PASSWORD
document.querySelector('.form-user-password')?.addEventListener('submit', async e => {
  e.preventDefault();

  document.querySelector('.btn--save-password').textContent = 'Updating...';

  const passwordCurrent = document.getElementById('password-current').value;
  const password = document.getElementById('password').value;
  const passwordConfirm = document.getElementById('password-confirm').value;

  await updateSettings({ passwordCurrent, password, passwordConfirm }, 'password');

  document.querySelector('.btn--save-password').textContent = 'Save password';
  document.getElementById('password-current').value = '';
  document.getElementById('password').value = '';
  document.getElementById('password-confirm').value = '';
});

// PROCESS PAYMENTS
document.querySelector('#book-tour')?.addEventListener('click', async e => {
  e.target.textContent = 'Processing...';
  const { tourId } = e.target.dataset;
  await bookTour(tourId);
  e.target.textContent = 'Book tour now!';
});
