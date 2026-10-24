import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

export const fetchLRs = createAsyncThunk('lr/fetchAll', async (_, { rejectWithValue }) => {
  try { const { data } = await api.get('/lr'); return data; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

export const createLR = createAsyncThunk('lr/create', async (payload, { rejectWithValue }) => {
  try { const { data } = await api.post('/lr', payload); return data; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed to create LR.'); }
});

export const updateLR = createAsyncThunk('lr/update', async ({ id, ...body }, { rejectWithValue }) => {
  try { const { data } = await api.put(`/lr/${id}`, body); return data; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed to update LR.'); }
});

export const updateLRStatus = createAsyncThunk('lr/updateStatus', async ({ id, status }, { rejectWithValue }) => {
  try { const { data } = await api.patch(`/lr/${id}/status`, { status }); return data; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

export const deleteLR = createAsyncThunk('lr/delete', async (id, { rejectWithValue }) => {
  try { await api.delete(`/lr/${id}`); }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

const lrSlice = createSlice({
  name: 'lr',
  initialState: { list: [], loading: false, error: null },
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchLRs.pending, s => { s.loading = true; s.error = null; })
      .addCase(fetchLRs.fulfilled, (s, { payload }) => { s.loading = false; s.list = payload; })
      .addCase(fetchLRs.rejected, (s, { payload }) => { s.loading = false; s.error = payload; })
      .addCase(updateLR.fulfilled, (s, { payload }) => {
        const i = s.list.findIndex(l => l._id === payload._id);
        if (i !== -1) s.list[i] = payload;
      })
      .addCase(updateLRStatus.fulfilled, (s, { payload }) => {
        const i = s.list.findIndex(l => l._id === payload._id);
        if (i !== -1) s.list[i] = payload;
      });
  },
});

export default lrSlice.reducer;
