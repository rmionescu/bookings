import axios from 'axios';
import { showAlert } from './alert';

// type is either 'password' or 'data'
export const updateSettings = async (data, type) => {
  try {
    const url = type === 'password' ? '/api/v1/users/updateMyPassword/' : '/api/v1/users/me/';
    const res = await axios({
      method: 'PATCH',
      url: url,
      data: data
    });

    if (res.data.status === 'success') {
      showAlert('success', `Your ${type} updated successfully`);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};
