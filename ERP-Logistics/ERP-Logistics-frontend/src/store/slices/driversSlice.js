import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

export const fetchDrivers = createAsyncThunk('drivers/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/drivers');
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load drivers.');
  }
});

export const fetchComplianceAlerts = createAsyncThunk('drivers/complianceAlerts', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/drivers/compliance/alerts');
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load compliance alerts.');
  }
});

export const fetchOtpLogs = createAsyncThunk('drivers/otpLogs', async (params, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/drivers/otp/logs', { params });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load OTP logs.');
  }
});

export const fetchDriverOverview = createAsyncThunk('drivers/overview', async (id, { rejectWithValue }) => {
  try {
    const { data } = await api.get(`/drivers/${id}/overview`);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load driver overview.');
  }
});

export const createDriver = createAsyncThunk('drivers/create', async (formData, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/drivers', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to add driver.');
  }
});

export const updateDriver = createAsyncThunk('drivers/update', async ({ id, ...body }, { rejectWithValue }) => {
  try {
    const { data } = await api.patch(`/drivers/${id}`, body);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update driver.');
  }
});

export const uploadDriverDocument = createAsyncThunk('drivers/uploadDocument', async ({ id, formData }, { rejectWithValue }) => {
  try {
    const { data } = await api.patch(`/drivers/${id}/documents`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to upload document.');
  }
});

export const updateDriverStatus = createAsyncThunk('drivers/updateStatus', async ({ id, status }, { rejectWithValue }) => {
  try {
    const { data } = await api.patch(`/drivers/${id}/status`, { status });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed.');
  }
});

export const updateDriverOperationalStatus = createAsyncThunk('drivers/updateOperationalStatus', async ({ id, driverStatus }, { rejectWithValue }) => {
  try {
    const { data } = await api.patch(`/drivers/${id}/operational-status`, { driverStatus });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed.');
  }
});

export const sendDriverOtp = createAsyncThunk('drivers/sendOtp', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/drivers/otp/send', payload);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to send OTP.');
  }
});

export const verifyDriverOtp = createAsyncThunk('drivers/verifyOtp', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/drivers/otp/verify', payload);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Invalid or expired OTP.');
  }
});

const driversSlice = createSlice({
  name: 'drivers',
  initialState: { list: [], complianceAlerts: [], otpLogs: [], overview: null, loading: false, error: null },
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchDrivers.pending, state => { state.loading = true; state.error = null; })
      .addCase(fetchDrivers.fulfilled, (state, { payload }) => { state.loading = false; state.list = payload; })
      .addCase(fetchDrivers.rejected, (state, { payload }) => { state.loading = false; state.error = payload; })
      .addCase(fetchComplianceAlerts.fulfilled, (state, { payload }) => { state.complianceAlerts = payload; })
      .addCase(fetchOtpLogs.fulfilled, (state, { payload }) => { state.otpLogs = payload; })
      .addCase(fetchDriverOverview.fulfilled, (state, { payload }) => { state.overview = payload; })
      .addCase(updateDriver.fulfilled, (state, { payload }) => {
        const i = state.list.findIndex(d => d._id === payload._id);
        if (i !== -1) state.list[i] = payload;
      })
      .addCase(uploadDriverDocument.fulfilled, (state, { payload }) => {
        const i = state.list.findIndex(d => d._id === payload._id);
        if (i !== -1) state.list[i] = payload;
      })
      .addCase(updateDriverStatus.fulfilled, (state, { payload }) => {
        const i = state.list.findIndex(d => d._id === payload._id);
        if (i !== -1) state.list[i] = payload;
      })
      .addCase(updateDriverOperationalStatus.fulfilled, (state, { payload }) => {
        const i = state.list.findIndex(d => d._id === payload._id);
        if (i !== -1) state.list[i] = payload;
      });
  },
});

export default driversSlice.reducer;
