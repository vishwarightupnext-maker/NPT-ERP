import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

const rv = (err, fallback) => err.response?.data?.message || fallback;

/* ── Attendance ───────────────────────────────────────────────────────────── */
export const fetchDriverAttendance = createAsyncThunk('driverHR/fetchAttendance', async (params, { rejectWithValue }) => {
  try { const { data } = await api.get('/driver-hr/attendance', { params }); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to load attendance.')); }
});

export const upsertDriverAttendance = createAsyncThunk('driverHR/upsertAttendance', async (payload, { rejectWithValue }) => {
  try { const { data } = await api.post('/driver-hr/attendance/entry', payload); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to save attendance.')); }
});

export const deleteDriverAttendance = createAsyncThunk('driverHR/deleteAttendance', async (id, { rejectWithValue }) => {
  try { await api.delete(`/driver-hr/attendance/${id}`); return id; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to delete.')); }
});

export const fetchDriverAttendanceSummary = createAsyncThunk('driverHR/attendanceSummary', async (params, { rejectWithValue }) => {
  try { const { data } = await api.get('/driver-hr/attendance/summary', { params }); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to load summary.')); }
});

/* ── Leave ────────────────────────────────────────────────────────────────── */
export const fetchDriverLeaves = createAsyncThunk('driverHR/fetchLeaves', async (params, { rejectWithValue }) => {
  try { const { data } = await api.get('/driver-hr/leaves', { params }); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to load leaves.')); }
});

export const createDriverLeave = createAsyncThunk('driverHR/createLeave', async (payload, { rejectWithValue }) => {
  try { const { data } = await api.post('/driver-hr/leaves', payload); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to submit leave.')); }
});

export const updateDriverLeaveStatus = createAsyncThunk('driverHR/updateLeaveStatus', async ({ id, status }, { rejectWithValue }) => {
  try { const { data } = await api.patch(`/driver-hr/leaves/${id}/status`, { status }); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to update leave.')); }
});

/* ── Salary / Payslips ────────────────────────────────────────────────────── */
export const fetchDriverPayslips = createAsyncThunk('driverHR/fetchPayslips', async (params, { rejectWithValue }) => {
  try { const { data } = await api.get('/driver-hr/payslips', { params }); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to load payslips.')); }
});

export const generateDriverPayslip = createAsyncThunk('driverHR/generatePayslip', async (payload, { rejectWithValue }) => {
  try { const { data } = await api.post('/driver-hr/payslips', payload); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to generate payslip.')); }
});

export const updateDriverPayslipStatus = createAsyncThunk('driverHR/updatePayslipStatus', async ({ id, status }, { rejectWithValue }) => {
  try { const { data } = await api.patch(`/driver-hr/payslips/${id}/status`, { status }); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to update payslip.')); }
});

/* ── Performance ──────────────────────────────────────────────────────────── */
export const fetchDriverPerformance = createAsyncThunk('driverHR/fetchPerformance', async (driverId, { rejectWithValue }) => {
  try { const { data } = await api.get(`/driver-hr/performance/${driverId}`); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to load performance.')); }
});

export const addDriverIncident = createAsyncThunk('driverHR/addIncident', async ({ driverId, ...payload }, { rejectWithValue }) => {
  try { const { data } = await api.post(`/driver-hr/performance/${driverId}/incidents`, payload); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to add incident.')); }
});

export const addDriverPenalty = createAsyncThunk('driverHR/addPenalty', async ({ driverId, ...payload }, { rejectWithValue }) => {
  try { const { data } = await api.post(`/driver-hr/performance/${driverId}/penalties`, payload); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to add penalty.')); }
});

export const addDriverRating = createAsyncThunk('driverHR/addRating', async ({ driverId, ...payload }, { rejectWithValue }) => {
  try { const { data } = await api.post(`/driver-hr/performance/${driverId}/ratings`, payload); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to add rating.')); }
});

export const adjustDriverRewardPoints = createAsyncThunk('driverHR/adjustRewardPoints', async ({ driverId, delta }, { rejectWithValue }) => {
  try { const { data } = await api.patch(`/driver-hr/performance/${driverId}/reward-points`, { delta }); return data; }
  catch (err) { return rejectWithValue(rv(err, 'Failed to update reward points.')); }
});

const driverHRSlice = createSlice({
  name: 'driverHR',
  initialState: {
    attendance: [], attendanceSummary: null,
    leaves: [],
    payslips: [],
    performance: null,
    loading: false, error: null,
  },
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchDriverAttendance.pending, s => { s.loading = true; s.error = null; })
      .addCase(fetchDriverAttendance.fulfilled, (s, { payload }) => { s.loading = false; s.attendance = payload; })
      .addCase(fetchDriverAttendance.rejected, (s, { payload }) => { s.loading = false; s.error = payload; })
      .addCase(fetchDriverAttendanceSummary.fulfilled, (s, { payload }) => { s.attendanceSummary = payload; })

      .addCase(fetchDriverLeaves.fulfilled, (s, { payload }) => { s.leaves = payload; })
      .addCase(updateDriverLeaveStatus.fulfilled, (s, { payload }) => {
        const i = s.leaves.findIndex(l => l._id === payload._id);
        if (i !== -1) s.leaves[i] = payload;
      })

      .addCase(fetchDriverPayslips.fulfilled, (s, { payload }) => { s.payslips = payload; })
      .addCase(generateDriverPayslip.fulfilled, (s, { payload }) => {
        const i = s.payslips.findIndex(p => p._id === payload._id);
        if (i !== -1) s.payslips[i] = payload; else s.payslips.unshift(payload);
      })
      .addCase(updateDriverPayslipStatus.fulfilled, (s, { payload }) => {
        const i = s.payslips.findIndex(p => p._id === payload._id);
        if (i !== -1) s.payslips[i] = payload;
      })

      .addCase(fetchDriverPerformance.fulfilled, (s, { payload }) => { s.performance = payload; })
      .addCase(addDriverIncident.fulfilled,  (s, { payload }) => { if (s.performance) Object.assign(s.performance, { incidents: payload.incidents, rewardPoints: payload.rewardPoints }); })
      .addCase(addDriverPenalty.fulfilled,   (s, { payload }) => { if (s.performance) Object.assign(s.performance, { penalties: payload.penalties, rewardPoints: payload.rewardPoints }); })
      .addCase(addDriverRating.fulfilled,    (s, { payload }) => { if (s.performance) Object.assign(s.performance, { ratings: payload.ratings, rewardPoints: payload.rewardPoints }); })
      .addCase(adjustDriverRewardPoints.fulfilled, (s, { payload }) => { if (s.performance) s.performance.rewardPoints = payload.rewardPoints; });
  },
});

export default driverHRSlice.reducer;
