import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

export const fetchInvoices = createAsyncThunk('invoices/fetchAll', async (_, { rejectWithValue }) => {
  try { const { data } = await api.get('/invoices'); return data; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

export const createInvoice = createAsyncThunk('invoices/create', async (payload, { rejectWithValue }) => {
  try { await api.post('/invoices', payload); }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed to create invoice.'); }
});

export const updateInvoiceStatus = createAsyncThunk('invoices/updateStatus', async ({ id, status }, { rejectWithValue }) => {
  try { const { data } = await api.patch(`/invoices/${id}/status`, { status }); return data; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

export const deleteInvoice = createAsyncThunk('invoices/delete', async (id, { rejectWithValue }) => {
  try { await api.delete(`/invoices/${id}`); }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

const invoiceSlice = createSlice({
  name: 'invoices',
  initialState: { list: [], loading: false, error: null },
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchInvoices.pending, s => { s.loading = true; s.error = null; })
      .addCase(fetchInvoices.fulfilled, (s, { payload }) => { s.loading = false; s.list = payload; })
      .addCase(fetchInvoices.rejected, (s, { payload }) => { s.loading = false; s.error = payload; })
      .addCase(updateInvoiceStatus.fulfilled, (s, { payload }) => {
        const i = s.list.findIndex(inv => inv._id === payload._id);
        if (i !== -1) s.list[i] = payload;
      });
  },
});

export default invoiceSlice.reducer;
