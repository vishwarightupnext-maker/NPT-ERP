import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

export const fetchRoutes = createAsyncThunk('routes/fetchAll', async (_, { rejectWithValue }) => {
  try { const { data } = await api.get('/routes'); return data; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

export const createRoute = createAsyncThunk('routes/create', async (payload, { rejectWithValue }) => {
  try { await api.post('/routes', payload); }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed to create route.'); }
});

export const deleteRoute = createAsyncThunk('routes/delete', async (id, { rejectWithValue }) => {
  try { await api.delete(`/routes/${id}`); }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

const routeSlice = createSlice({
  name: 'routes',
  initialState: { list: [], loading: false, error: null },
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchRoutes.pending, s => { s.loading = true; s.error = null; })
      .addCase(fetchRoutes.fulfilled, (s, { payload }) => { s.loading = false; s.list = payload; })
      .addCase(fetchRoutes.rejected, (s, { payload }) => { s.loading = false; s.error = payload; });
  },
});

export default routeSlice.reducer;
