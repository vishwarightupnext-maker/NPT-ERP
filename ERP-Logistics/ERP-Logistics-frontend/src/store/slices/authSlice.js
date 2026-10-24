import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

export const fetchCurrentUser = createAsyncThunk('auth/fetchMe', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/auth/me');
    return data.user;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Unauthorized');
  }
});

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  try { await api.post('/auth/logout'); } catch { /* ignore */ }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: (() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } })(),
    token: localStorage.getItem('token'),
    // SuperAdmin uses a static token — no backend verification needed on refresh
    loading: !!localStorage.getItem('token') && localStorage.getItem('token') !== 'superadmin-static',
    error: null,
  },
  reducers: {
    setCredentials(state, { payload: { token, user } }) {
      state.token = token;
      state.user = user;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchCurrentUser.pending, state => { state.loading = true; state.error = null; })
      .addCase(fetchCurrentUser.fulfilled, (state, { payload }) => { state.user = payload; state.loading = false; })
      .addCase(fetchCurrentUser.rejected, state => {
        state.loading = false;
        state.user = null;
        state.token = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      })
      .addCase(logoutUser.fulfilled, state => {
        state.user = null;
        state.token = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      });
  },
});

export const { setCredentials } = authSlice.actions;
export default authSlice.reducer;
