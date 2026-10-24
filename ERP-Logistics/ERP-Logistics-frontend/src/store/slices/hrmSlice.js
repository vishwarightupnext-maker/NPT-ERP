import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/hrmAxios';

// ── Stats ────────────────────────────────────────────────────────────────────
export const fetchHRMStats = createAsyncThunk('hrm/fetchStats', async (_, { rejectWithValue }) => {
  try { const { data } = await api.get('/hrm/stats'); return data; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

// ── Employees ─────────────────────────────────────────────────────────────────
export const fetchEmployees = createAsyncThunk('hrm/fetchEmployees', async (params = {}, { rejectWithValue }) => {
  try { const { data } = await api.get('/hrm/employees', { params }); return data; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});
export const createEmployee = createAsyncThunk('hrm/createEmployee', async (body, { rejectWithValue }) => {
  try { const { data } = await api.post('/hrm/employees', body); return data; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});
export const updateEmployee = createAsyncThunk('hrm/updateEmployee', async ({ id, ...body }, { rejectWithValue }) => {
  try { const { data } = await api.put(`/hrm/employees/${id}`, body); return data; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});
export const deleteEmployee = createAsyncThunk('hrm/deleteEmployee', async (id, { rejectWithValue }) => {
  try { await api.delete(`/hrm/employees/${id}`); return id; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

// ── Leaves ────────────────────────────────────────────────────────────────────
export const fetchLeaves = createAsyncThunk('hrm/fetchLeaves', async (params = {}, { rejectWithValue }) => {
  try { const { data } = await api.get('/hrm/leaves', { params }); return data; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});
export const createLeave = createAsyncThunk('hrm/createLeave', async (body, { rejectWithValue }) => {
  try { const { data } = await api.post('/hrm/leaves', body); return data; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});
export const updateLeaveStatus = createAsyncThunk('hrm/updateLeaveStatus', async ({ id, status }, { rejectWithValue }) => {
  try { const { data } = await api.patch(`/hrm/leaves/${id}/status`, { status }); return data; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});
export const deleteLeave = createAsyncThunk('hrm/deleteLeave', async (id, { rejectWithValue }) => {
  try { await api.delete(`/hrm/leaves/${id}`); return id; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

// ── Payslips ──────────────────────────────────────────────────────────────────
export const fetchPayslips = createAsyncThunk('hrm/fetchPayslips', async (params = {}, { rejectWithValue }) => {
  try { const { data } = await api.get('/hrm/payslips', { params }); return data; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});
export const generatePayslip = createAsyncThunk('hrm/generatePayslip', async (body, { rejectWithValue }) => {
  try { const { data } = await api.post('/hrm/payslips', body); return data; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});
export const updatePayslipStatus = createAsyncThunk('hrm/updatePayslipStatus', async ({ id, status }, { rejectWithValue }) => {
  try { const { data } = await api.patch(`/hrm/payslips/${id}/status`, { status }); return data; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});
export const deletePayslip = createAsyncThunk('hrm/deletePayslip', async (id, { rejectWithValue }) => {
  try { await api.delete(`/hrm/payslips/${id}`); return id; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

// ── Attendance ────────────────────────────────────────────────────────────────
export const clockIn = createAsyncThunk('hrm/clockIn', async (_, { rejectWithValue }) => {
  try { const { data } = await api.post('/hrm/attendance/clock-in'); return data; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});
export const clockOut = createAsyncThunk('hrm/clockOut', async (_, { rejectWithValue }) => {
  try { const { data } = await api.post('/hrm/attendance/clock-out'); return data; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});
export const fetchTodayAttendance = createAsyncThunk('hrm/fetchTodayAttendance', async (_, { rejectWithValue }) => {
  try { const { data } = await api.get('/hrm/attendance/today'); return data; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});
export const fetchMyAttendance = createAsyncThunk('hrm/fetchMyAttendance', async (params = {}, { rejectWithValue }) => {
  try { const { data } = await api.get('/hrm/attendance/mine', { params }); return data; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});
export const fetchAttendance = createAsyncThunk('hrm/fetchAttendance', async (params = {}, { rejectWithValue }) => {
  try { const { data } = await api.get('/hrm/attendance', { params }); return data; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

export const upsertAttendanceEntry = createAsyncThunk('hrm/upsertAttendance', async (body, { rejectWithValue }) => {
  try { const { data } = await api.post('/hrm/attendance/entry', body); return data; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});
export const deleteAttendanceEntry = createAsyncThunk('hrm/deleteAttendanceEntry', async (id, { rejectWithValue }) => {
  try { await api.delete(`/hrm/attendance/${id}`); return id; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});
export const fetchAttendanceSummary = createAsyncThunk('hrm/fetchAttendanceSummary', async (params, { rejectWithValue }) => {
  try { const { data } = await api.get('/hrm/attendance/summary', { params }); return data; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

// ── Daily Pay ─────────────────────────────────────────────────────────────────
export const fetchDailyPay = createAsyncThunk('hrm/fetchDailyPay', async (params, { rejectWithValue }) => {
  try { const { data } = await api.get('/hrm/daily-pay', { params }); return data; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});
// Employee fetches their own daily-pay entries (all months, stored separately)
export const fetchMyDailyPay = createAsyncThunk('hrm/fetchMyDailyPay', async (params = {}, { rejectWithValue }) => {
  try { const { data } = await api.get('/hrm/daily-pay/mine', { params }); return data; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});
export const upsertDailyPay = createAsyncThunk('hrm/upsertDailyPay', async (body, { rejectWithValue }) => {
  try { const { data } = await api.post('/hrm/daily-pay', body); return data; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});
export const deleteDailyPay = createAsyncThunk('hrm/deleteDailyPay', async (id, { rejectWithValue }) => {
  try { await api.delete(`/hrm/daily-pay/${id}`); return id; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

// ── Projects ──────────────────────────────────────────────────────────────────
export const fetchProjects = createAsyncThunk('hrm/fetchProjects', async (params = {}, { rejectWithValue }) => {
  try { const { data } = await api.get('/hrm/projects', { params }); return data; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});
export const createProject = createAsyncThunk('hrm/createProject', async (body, { rejectWithValue }) => {
  try { const { data } = await api.post('/hrm/projects', body); return data; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});
export const updateProject = createAsyncThunk('hrm/updateProject', async ({ id, ...body }, { rejectWithValue }) => {
  try { const { data } = await api.put(`/hrm/projects/${id}`, body); return data; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});
export const deleteProject = createAsyncThunk('hrm/deleteProject', async (id, { rejectWithValue }) => {
  try { await api.delete(`/hrm/projects/${id}`); return id; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

// ── Slice ─────────────────────────────────────────────────────────────────────
const hrmSlice = createSlice({
  name: 'hrm',
  initialState: {
    stats:             null,
    employees:         [],
    leaves:            [],
    payslips:          [],
    attendance:        [],
    attendanceSummary: null,
    dailyPay:          [],
    myDailyPay:        [],
    todayRecord:       null,
    projects:          [],
    loading:           false,
    error:             null,
  },
  reducers: {},
  extraReducers(builder) {
    const pending   = state => { state.loading = true;  state.error = null; };
    const rejected  = (state, { payload }) => { state.loading = false; state.error = payload; };

    builder
      // stats
      .addCase(fetchHRMStats.pending,   pending)
      .addCase(fetchHRMStats.fulfilled, (state, { payload }) => { state.loading = false; state.stats = payload; })
      .addCase(fetchHRMStats.rejected,  rejected)

      // employees
      .addCase(fetchEmployees.pending,   pending)
      .addCase(fetchEmployees.fulfilled, (state, { payload }) => { state.loading = false; state.employees = payload; })
      .addCase(fetchEmployees.rejected,  rejected)
      .addCase(createEmployee.fulfilled, (state, { payload }) => { state.employees.unshift(payload); })
      .addCase(updateEmployee.fulfilled, (state, { payload }) => {
        const i = state.employees.findIndex(e => e._id === payload._id);
        if (i !== -1) state.employees[i] = payload;
      })
      .addCase(deleteEmployee.fulfilled, (state, { payload }) => {
        state.employees = state.employees.filter(e => e._id !== payload);
      })

      // leaves
      .addCase(fetchLeaves.pending,   pending)
      .addCase(fetchLeaves.fulfilled, (state, { payload }) => { state.loading = false; state.leaves = payload; })
      .addCase(fetchLeaves.rejected,  rejected)
      .addCase(createLeave.fulfilled, (state, { payload }) => { state.leaves.unshift(payload); })
      .addCase(updateLeaveStatus.fulfilled, (state, { payload }) => {
        const i = state.leaves.findIndex(l => l._id === payload._id);
        if (i !== -1) state.leaves[i] = payload;
      })
      .addCase(deleteLeave.fulfilled, (state, { payload }) => {
        state.leaves = state.leaves.filter(l => l._id !== payload);
      })

      // payslips
      .addCase(fetchPayslips.pending,   pending)
      .addCase(fetchPayslips.fulfilled, (state, { payload }) => { state.loading = false; state.payslips = payload; })
      .addCase(fetchPayslips.rejected,  rejected)
      .addCase(generatePayslip.fulfilled, (state, { payload }) => { state.payslips.unshift(payload); })
      .addCase(updatePayslipStatus.fulfilled, (state, { payload }) => {
        const i = state.payslips.findIndex(p => p._id === payload._id);
        if (i !== -1) state.payslips[i] = payload;
      })
      .addCase(deletePayslip.fulfilled, (state, { payload }) => {
        state.payslips = state.payslips.filter(p => p._id !== payload);
      })

      // attendance
      .addCase(fetchAttendance.fulfilled,    (state, { payload }) => { state.loading = false; state.attendance = payload; })
      .addCase(fetchMyAttendance.fulfilled,  (state, { payload }) => { state.loading = false; state.attendance = payload; })
      .addCase(fetchTodayAttendance.fulfilled, (state, { payload }) => { state.loading = false; state.todayRecord = payload; })
      .addCase(clockIn.fulfilled,  (state, { payload }) => { state.todayRecord = payload; })
      .addCase(clockOut.fulfilled, (state, { payload }) => { state.todayRecord = payload; })
      .addCase(upsertAttendanceEntry.fulfilled, (state, { payload }) => {
        const idx = state.attendance.findIndex(r => r._id === payload._id);
        if (idx !== -1) state.attendance[idx] = payload;
        else state.attendance.push(payload);
      })
      .addCase(deleteAttendanceEntry.fulfilled, (state, { payload: id }) => {
        state.attendance = state.attendance.filter(r => r._id !== id);
      })
      .addCase(fetchAttendanceSummary.pending, pending)
      .addCase(fetchAttendanceSummary.fulfilled, (state, { payload }) => {
        state.loading = false; state.attendanceSummary = payload;
      })
      .addCase(fetchAttendanceSummary.rejected, rejected)

      // daily pay
      .addCase(fetchDailyPay.pending, pending)
      .addCase(fetchDailyPay.fulfilled, (state, { payload }) => { state.loading = false; state.dailyPay = payload; })
      .addCase(fetchDailyPay.rejected, rejected)
      .addCase(fetchMyDailyPay.fulfilled, (state, { payload }) => { state.myDailyPay = payload; })
      .addCase(upsertDailyPay.fulfilled, (state, { payload }) => {
        const idx = state.dailyPay.findIndex(r => r._id === payload._id);
        if (idx !== -1) state.dailyPay[idx] = payload;
        else state.dailyPay.push(payload);
        state.dailyPay.sort((a, b) => a.date.localeCompare(b.date));
      })
      .addCase(deleteDailyPay.fulfilled, (state, { payload: id }) => {
        state.dailyPay = state.dailyPay.filter(r => r._id !== id);
      })

      // projects
      .addCase(fetchProjects.pending,   pending)
      .addCase(fetchProjects.fulfilled, (state, { payload }) => { state.loading = false; state.projects = payload; })
      .addCase(fetchProjects.rejected,  rejected)
      .addCase(createProject.fulfilled, (state, { payload }) => { state.projects.unshift(payload); })
      .addCase(updateProject.fulfilled, (state, { payload }) => {
        const i = state.projects.findIndex(p => p._id === payload._id);
        if (i !== -1) state.projects[i] = payload;
      })
      .addCase(deleteProject.fulfilled, (state, { payload }) => {
        state.projects = state.projects.filter(p => p._id !== payload);
      });
  },
});

export default hrmSlice.reducer;
