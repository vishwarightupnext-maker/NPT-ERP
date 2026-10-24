import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

export const fetchDispatches = createAsyncThunk('dispatches/fetchAll', async (_, { rejectWithValue }) => {
  try { const { data } = await api.get('/dispatches'); return data; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

export const createDispatch = createAsyncThunk('dispatches/create', async (payload, { rejectWithValue }) => {
  try { await api.post('/dispatches', payload); }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed to create dispatch.'); }
});

export const updateDispatch = createAsyncThunk('dispatches/update', async ({ id, ...body }, { rejectWithValue }) => {
  try { const { data } = await api.put(`/dispatches/${id}`, body); return data; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed to update dispatch.'); }
});

export const updateDispatchStatus = createAsyncThunk('dispatches/updateStatus', async ({ id, status, distance, rating }, { rejectWithValue }) => {
  try { const { data } = await api.patch(`/dispatches/${id}/status`, { status, distance, rating }); return data; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

export const deleteDispatch = createAsyncThunk('dispatches/delete', async (id, { rejectWithValue }) => {
  try { await api.delete(`/dispatches/${id}`); }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

const dispatchSlice = createSlice({
  name: 'dispatches',
  initialState: { list: [], loading: false, error: null },
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchDispatches.pending, s => { s.loading = true; s.error = null; })
      .addCase(fetchDispatches.fulfilled, (s, { payload }) => { s.loading = false; s.list = payload; })
      .addCase(fetchDispatches.rejected, (s, { payload }) => { s.loading = false; s.error = payload; })
      .addCase(updateDispatch.fulfilled, (s, { payload }) => {
        const i = s.list.findIndex(d => d._id === payload._id);
        if (i !== -1) s.list[i] = payload;
      })
      .addCase(updateDispatchStatus.fulfilled, (s, { payload }) => {
        const i = s.list.findIndex(d => d._id === payload._id);
        if (i !== -1) s.list[i] = payload;
      });
  },
});

export default dispatchSlice.reducer;
