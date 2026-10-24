import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

const rv = (err, fallback) => err.response?.data?.message || fallback;

export const fetchOfficeExpenses = createAsyncThunk('officeExpense/fetchAll', async (params, { rejectWithValue }) => {
  try { const { data } = await api.get('/office-expenses', { params }); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to load expenses.')); }
});

export const createOfficeExpense = createAsyncThunk('officeExpense/create', async (payload, { rejectWithValue }) => {
  try { const { data } = await api.post('/office-expenses', payload); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to add expense.')); }
});

export const updateOfficeExpense = createAsyncThunk('officeExpense/update', async ({ id, ...body }, { rejectWithValue }) => {
  try { const { data } = await api.patch(`/office-expenses/${id}`, body); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to update expense.')); }
});

export const deleteOfficeExpense = createAsyncThunk('officeExpense/delete', async (id, { rejectWithValue }) => {
  try { await api.delete(`/office-expenses/${id}`); return id; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to delete expense.')); }
});

export const fetchMonthlyExpenseReport = createAsyncThunk('officeExpense/monthly', async (params, { rejectWithValue }) => {
  try { const { data } = await api.get('/office-expenses/reports/monthly', { params }); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to load monthly report.')); }
});

export const fetchYearlyExpenseReport = createAsyncThunk('officeExpense/yearly', async (_, { rejectWithValue }) => {
  try { const { data } = await api.get('/office-expenses/reports/yearly'); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to load yearly report.')); }
});

export const fetchDepartmentExpenseReport = createAsyncThunk('officeExpense/department', async (params, { rejectWithValue }) => {
  try { const { data } = await api.get('/office-expenses/reports/department', { params }); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to load department report.')); }
});

const officeExpenseSlice = createSlice({
  name: 'officeExpense',
  initialState: {
    list: [], monthlyReport: null, yearlyReport: null, departmentReport: null,
    loading: false, error: null,
  },
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchOfficeExpenses.pending, s => { s.loading = true; s.error = null; })
      .addCase(fetchOfficeExpenses.fulfilled, (s, { payload }) => { s.loading = false; s.list = payload; })
      .addCase(fetchOfficeExpenses.rejected, (s, { payload }) => { s.loading = false; s.error = payload; })
      .addCase(createOfficeExpense.fulfilled, (s, { payload }) => { s.list.unshift(payload); })
      .addCase(updateOfficeExpense.fulfilled, (s, { payload }) => {
        const i = s.list.findIndex(e => e._id === payload._id);
        if (i !== -1) s.list[i] = payload;
      })
      .addCase(deleteOfficeExpense.fulfilled, (s, { payload }) => { s.list = s.list.filter(e => e._id !== payload); })
      .addCase(fetchMonthlyExpenseReport.fulfilled, (s, { payload }) => { s.monthlyReport = payload; })
      .addCase(fetchYearlyExpenseReport.fulfilled, (s, { payload }) => { s.yearlyReport = payload; })
      .addCase(fetchDepartmentExpenseReport.fulfilled, (s, { payload }) => { s.departmentReport = payload; });
  },
});

export default officeExpenseSlice.reducer;
