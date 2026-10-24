import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

export const fetchUsers = createAsyncThunk('users/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/users');
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load users.');
  }
});

export const fetchPendingCount = createAsyncThunk('users/pendingCount', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/users/pending-count');
    return data.count;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed.');
  }
});

export const createUser = createAsyncThunk('users/create', async (payload, { rejectWithValue }) => {
  try {
    await api.post('/users', payload);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to save.');
  }
});

export const updateUser = createAsyncThunk('users/update', async ({ id, payload }, { rejectWithValue }) => {
  try {
    await api.put(`/users/${id}`, payload);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to save.');
  }
});

export const deleteUser = createAsyncThunk('users/delete', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/users/${id}`);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete.');
  }
});

export const approveUser = createAsyncThunk('users/approve', async ({ id, role }, { rejectWithValue }) => {
  try {
    const { data } = await api.patch(`/users/${id}/approve`, { role });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to approve.');
  }
});

export const rejectUser = createAsyncThunk('users/reject', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/users/${id}/reject`);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to reject.');
  }
});

const usersSlice = createSlice({
  name: 'users',
  initialState: { list: [], pendingCount: 0, loading: false, error: null },
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchUsers.pending,   state => { state.loading = true;  state.error = null; })
      .addCase(fetchUsers.fulfilled, (state, { payload }) => { state.loading = false; state.list = payload; })
      .addCase(fetchUsers.rejected,  (state, { payload }) => { state.loading = false; state.error = payload; })

      .addCase(fetchPendingCount.fulfilled, (state, { payload }) => { state.pendingCount = payload; })

      .addCase(approveUser.fulfilled, (state, { payload }) => {
        const i = state.list.findIndex(u => u._id === payload._id);
        if (i !== -1) state.list[i] = payload;
        state.pendingCount = Math.max(0, state.pendingCount - 1);
      })
      .addCase(rejectUser.fulfilled, (state, { payload }) => {
        state.list = state.list.filter(u => u._id !== payload);
        state.pendingCount = Math.max(0, state.pendingCount - 1);
      })
      .addCase(deleteUser.fulfilled, (state, { payload }) => {
        state.list = state.list.filter(u => u._id !== payload);
      });
  },
});

export default usersSlice.reducer;
