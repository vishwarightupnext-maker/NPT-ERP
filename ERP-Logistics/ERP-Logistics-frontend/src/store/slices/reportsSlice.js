import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

const rv = (err, fallback) => err.response?.data?.message || fallback;

export const fetchReportData = createAsyncThunk('reports/fetch', async ({ endpoint, params }, { rejectWithValue }) => {
  try { const { data } = await api.get(`/reports/${endpoint}`, { params }); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to load report.')); }
});

const reportsSlice = createSlice({
  name: 'reports',
  initialState: { rows: [], loading: false, error: null },
  reducers: {
    clearReport(state) { state.rows = []; state.error = null; },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchReportData.pending, s => { s.loading = true; s.error = null; })
      .addCase(fetchReportData.fulfilled, (s, { payload }) => { s.loading = false; s.rows = payload; })
      .addCase(fetchReportData.rejected, (s, { payload }) => { s.loading = false; s.error = payload; s.rows = []; });
  },
});

export const { clearReport } = reportsSlice.actions;
export default reportsSlice.reducer;
