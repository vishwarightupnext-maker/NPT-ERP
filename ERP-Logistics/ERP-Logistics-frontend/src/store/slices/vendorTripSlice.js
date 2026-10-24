import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

const rv = (err, fallback) => err.response?.data?.message || fallback;

export const fetchVendorTrips = createAsyncThunk('vendorTrip/fetchAll', async (params, { rejectWithValue }) => {
  try { const { data } = await api.get('/vendor-trips', { params }); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to load trip entries.')); }
});

export const createVendorTrip = createAsyncThunk('vendorTrip/create', async (payload, { rejectWithValue }) => {
  try { const { data } = await api.post('/vendor-trips', payload); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to add trip entry.')); }
});

export const updateVendorTrip = createAsyncThunk('vendorTrip/update', async ({ id, ...body }, { rejectWithValue }) => {
  try { const { data } = await api.patch(`/vendor-trips/${id}`, body); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to update trip entry.')); }
});

export const deleteVendorTrip = createAsyncThunk('vendorTrip/delete', async (id, { rejectWithValue }) => {
  try { await api.delete(`/vendor-trips/${id}`); return id; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to delete trip entry.')); }
});

export const fetchVendorTripSummary = createAsyncThunk('vendorTrip/summary', async (vendorId, { rejectWithValue }) => {
  try { const { data } = await api.get('/vendor-trips/summary', { params: { vendorId } }); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to load trip summary.')); }
});

const vendorTripSlice = createSlice({
  name: 'vendorTrip',
  initialState: { list: [], summary: null, loading: false, error: null },
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchVendorTrips.pending, s => { s.loading = true; s.error = null; })
      .addCase(fetchVendorTrips.fulfilled, (s, { payload }) => { s.loading = false; s.list = payload; })
      .addCase(fetchVendorTrips.rejected, (s, { payload }) => { s.loading = false; s.error = payload; })
      .addCase(createVendorTrip.fulfilled, (s, { payload }) => { s.list.unshift(payload); })
      .addCase(updateVendorTrip.fulfilled, (s, { payload }) => {
        const i = s.list.findIndex(e => e._id === payload._id);
        if (i !== -1) s.list[i] = payload;
      })
      .addCase(deleteVendorTrip.fulfilled, (s, { payload }) => { s.list = s.list.filter(e => e._id !== payload); })
      .addCase(fetchVendorTripSummary.fulfilled, (s, { payload }) => { s.summary = payload; });
  },
});

export default vendorTripSlice.reducer;
