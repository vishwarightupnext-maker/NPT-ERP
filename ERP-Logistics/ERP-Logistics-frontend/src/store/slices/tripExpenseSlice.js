import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

const rv = (err, fallback) => err.response?.data?.message || fallback;

export const fetchExpenses = createAsyncThunk('tripExpense/fetchAll', async (params, { rejectWithValue }) => {
  try { const { data } = await api.get('/trip-expenses', { params }); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to load expenses.')); }
});

export const createExpense = createAsyncThunk('tripExpense/create', async (payload, { rejectWithValue }) => {
  try { const { data } = await api.post('/trip-expenses', payload); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to add expense.')); }
});

export const updateExpense = createAsyncThunk('tripExpense/update', async ({ id, ...body }, { rejectWithValue }) => {
  try { const { data } = await api.patch(`/trip-expenses/${id}`, body); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to update expense.')); }
});

export const deleteExpense = createAsyncThunk('tripExpense/delete', async (id, { rejectWithValue }) => {
  try { await api.delete(`/trip-expenses/${id}`); return id; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to delete expense.')); }
});

export const fetchExpenseSummary = createAsyncThunk('tripExpense/summary', async (params, { rejectWithValue }) => {
  try { const { data } = await api.get('/trip-expenses/summary', { params }); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to load expense summary.')); }
});

export const fetchDieselConsumption = createAsyncThunk('tripExpense/dieselConsumption', async (params, { rejectWithValue }) => {
  try { const { data } = await api.get('/trip-expenses/diesel-consumption', { params }); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to load diesel consumption.')); }
});

export const fetchProfitLoss = createAsyncThunk('tripExpense/profitLoss', async (params, { rejectWithValue }) => {
  try { const { data } = await api.get('/trip-expenses/profit-loss', { params }); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to load profit/loss.')); }
});

const tripExpenseSlice = createSlice({
  name: 'tripExpense',
  initialState: { list: [], summary: null, dieselConsumption: null, profitLoss: null, loading: false, error: null },
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchExpenses.pending, s => { s.loading = true; s.error = null; })
      .addCase(fetchExpenses.fulfilled, (s, { payload }) => { s.loading = false; s.list = payload; })
      .addCase(fetchExpenses.rejected, (s, { payload }) => { s.loading = false; s.error = payload; })
      .addCase(createExpense.fulfilled, (s, { payload }) => { s.list.unshift(payload); })
      .addCase(updateExpense.fulfilled, (s, { payload }) => {
        const i = s.list.findIndex(e => e._id === payload._id);
        if (i !== -1) s.list[i] = payload;
      })
      .addCase(deleteExpense.fulfilled, (s, { payload }) => { s.list = s.list.filter(e => e._id !== payload); })
      .addCase(fetchExpenseSummary.fulfilled, (s, { payload }) => { s.summary = payload; })
      .addCase(fetchDieselConsumption.fulfilled, (s, { payload }) => { s.dieselConsumption = payload; })
      .addCase(fetchProfitLoss.fulfilled, (s, { payload }) => { s.profitLoss = payload; });
  },
});

export default tripExpenseSlice.reducer;
