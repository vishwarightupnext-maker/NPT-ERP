import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

export const fetchCustomers = createAsyncThunk('customers/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/customers');
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load customers.');
  }
});

export const createCustomer = createAsyncThunk('customers/create', async (payload, { rejectWithValue }) => {
  try {
    await api.post('/customers', payload);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to add.');
  }
});

export const updateCustomerStatus = createAsyncThunk('customers/updateStatus', async ({ id, status }, { rejectWithValue }) => {
  try {
    await api.patch(`/customers/${id}/status`, { status });
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed.');
  }
});

const customersSlice = createSlice({
  name: 'customers',
  initialState: { list: [], loading: false, error: null },
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchCustomers.pending, state => { state.loading = true; state.error = null; })
      .addCase(fetchCustomers.fulfilled, (state, { payload }) => { state.loading = false; state.list = payload; })
      .addCase(fetchCustomers.rejected, (state, { payload }) => { state.loading = false; state.error = payload; });
  },
});

export default customersSlice.reducer;
