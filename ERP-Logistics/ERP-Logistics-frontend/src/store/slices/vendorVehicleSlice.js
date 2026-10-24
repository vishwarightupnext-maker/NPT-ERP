import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

const rv = (err, fallback) => err.response?.data?.message || fallback;

export const fetchVendorVehicles = createAsyncThunk('vendorVehicle/fetchAll', async (vendorId, { rejectWithValue }) => {
  try { const { data } = await api.get('/vendor-vehicles', { params: { vendorId } }); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to load vendor vehicles.')); }
});

export const createVendorVehicle = createAsyncThunk('vendorVehicle/create', async (payload, { rejectWithValue }) => {
  try { const { data } = await api.post('/vendor-vehicles', payload); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to add vehicle.')); }
});

export const deleteVendorVehicle = createAsyncThunk('vendorVehicle/delete', async (id, { rejectWithValue }) => {
  try { await api.delete(`/vendor-vehicles/${id}`); return id; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to delete vehicle.')); }
});

const vendorVehicleSlice = createSlice({
  name: 'vendorVehicle',
  initialState: { list: [], loading: false, error: null },
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchVendorVehicles.pending, s => { s.loading = true; s.error = null; })
      .addCase(fetchVendorVehicles.fulfilled, (s, { payload }) => { s.loading = false; s.list = payload; })
      .addCase(fetchVendorVehicles.rejected, (s, { payload }) => { s.loading = false; s.error = payload; })
      .addCase(createVendorVehicle.fulfilled, (s, { payload }) => { s.list.push(payload); })
      .addCase(deleteVendorVehicle.fulfilled, (s, { payload }) => { s.list = s.list.filter(v => v._id !== payload); });
  },
});

export default vendorVehicleSlice.reducer;
