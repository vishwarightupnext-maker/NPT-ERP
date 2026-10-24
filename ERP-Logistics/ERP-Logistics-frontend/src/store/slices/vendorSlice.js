import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

const rv = (err, fallback) => err.response?.data?.message || fallback;

/* ── Vendors ──────────────────────────────────────────────────────────────── */
export const fetchVendors = createAsyncThunk('vendor/fetchAll', async (_, { rejectWithValue }) => {
  try { const { data } = await api.get('/vendors'); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to load vendors.')); }
});

export const createVendor = createAsyncThunk('vendor/create', async (payload, { rejectWithValue }) => {
  try { const { data } = await api.post('/vendors', payload); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to add vendor.')); }
});

export const updateVendor = createAsyncThunk('vendor/update', async ({ id, ...body }, { rejectWithValue }) => {
  try { const { data } = await api.patch(`/vendors/${id}`, body); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to update vendor.')); }
});

export const deleteVendor = createAsyncThunk('vendor/delete', async (id, { rejectWithValue }) => {
  try { await api.delete(`/vendors/${id}`); return id; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to delete vendor.')); }
});

export const uploadVendorDocument = createAsyncThunk('vendor/uploadDocument', async ({ id, formData }, { rejectWithValue }) => {
  try {
    const { data } = await api.patch(`/vendors/${id}/documents`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    return data;
  } catch (err) { return rejectWithValue(rv(err, 'Failed to upload document.')); }
});

export const fetchVendorLedger = createAsyncThunk('vendor/fetchLedger', async (id, { rejectWithValue }) => {
  try { const { data } = await api.get(`/vendors/${id}/ledger`); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to load vendor ledger.')); }
});

export const fetchVendorPerformance = createAsyncThunk('vendor/fetchPerformance', async (id, { rejectWithValue }) => {
  try { const { data } = await api.get(`/vendors/${id}/performance`); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to load vendor performance.')); }
});

/* ── Commission Entries & Settlement ─────────────────────────────────────── */
export const fetchVendorCommissions = createAsyncThunk('vendor/fetchCommissions', async (params, { rejectWithValue }) => {
  try { const { data } = await api.get('/vendors/commissions', { params }); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to load commission entries.')); }
});


export const createVendorCommission = createAsyncThunk('vendor/createCommission', async (payload, { rejectWithValue }) => {
  try { const { data } = await api.post('/vendors/commissions', payload); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to add commission entry.')); }
});

export const updateVendorCommissionStatus = createAsyncThunk('vendor/updateCommissionStatus', async ({ id, status }, { rejectWithValue }) => {
  try { const { data } = await api.patch(`/vendors/commissions/${id}/status`, { status }); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to update commission status.')); }
});

export const deleteVendorCommission = createAsyncThunk('vendor/deleteCommission', async (id, { rejectWithValue }) => {
  try { await api.delete(`/vendors/commissions/${id}`); return id; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to delete commission entry.')); }
});

export const fetchCommissionSummary = createAsyncThunk('vendor/summary', async (_, { rejectWithValue }) => {
  try { const { data } = await api.get('/vendors/commissions/summary'); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to load commission summary.')); }
});

const vendorSlice = createSlice({
  name: 'vendor',
  initialState: {
    list: [], commissions: [], summary: null,
    ledger: null, performance: null,
    loading: false, error: null,
  },
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchVendors.pending, s => { s.loading = true; s.error = null; })
      .addCase(fetchVendors.fulfilled, (s, { payload }) => { s.loading = false; s.list = payload; })
      .addCase(fetchVendors.rejected, (s, { payload }) => { s.loading = false; s.error = payload; })
      .addCase(createVendor.fulfilled, (s, { payload }) => { s.list.unshift(payload); })
      .addCase(updateVendor.fulfilled, (s, { payload }) => {
        const i = s.list.findIndex(v => v._id === payload._id);
        if (i !== -1) s.list[i] = payload;
      })
      .addCase(deleteVendor.fulfilled, (s, { payload }) => { s.list = s.list.filter(v => v._id !== payload); })
      .addCase(uploadVendorDocument.fulfilled, (s, { payload }) => {
        const i = s.list.findIndex(v => v._id === payload._id);
        if (i !== -1) s.list[i] = payload;
      })
      .addCase(fetchVendorLedger.fulfilled, (s, { payload }) => { s.ledger = payload; })
      .addCase(fetchVendorPerformance.fulfilled, (s, { payload }) => { s.performance = payload; })

      .addCase(fetchVendorCommissions.fulfilled, (s, { payload }) => { s.commissions = payload; })
      .addCase(createVendorCommission.fulfilled, (s, { payload }) => { s.commissions.unshift(payload); })
      .addCase(updateVendorCommissionStatus.fulfilled, (s, { payload }) => {
        const i = s.commissions.findIndex(c => c._id === payload._id);
        if (i !== -1) s.commissions[i] = payload;
      })
      .addCase(deleteVendorCommission.fulfilled, (s, { payload }) => { s.commissions = s.commissions.filter(c => c._id !== payload); })
      .addCase(fetchCommissionSummary.fulfilled, (s, { payload }) => { s.summary = payload; });
  },
});

export default vendorSlice.reducer;
