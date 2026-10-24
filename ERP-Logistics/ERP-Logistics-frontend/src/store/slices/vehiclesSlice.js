import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

export const fetchVehicles = createAsyncThunk('vehicles/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/vehicles');
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load vehicles.');
  }
});

export const fetchComplianceAlerts = createAsyncThunk('vehicles/complianceAlerts', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/vehicles/compliance/alerts');
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load compliance alerts.');
  }
});

export const fetchFleetAvailability = createAsyncThunk('vehicles/fleetAvailability', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/vehicles/availability');
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load fleet availability.');
  }
});

export const fetchVehicleOverview = createAsyncThunk('vehicles/overview', async (id, { rejectWithValue }) => {
  try {
    const { data } = await api.get(`/vehicles/${id}/overview`);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load vehicle overview.');
  }
});

export const createVehicle = createAsyncThunk('vehicles/create', async (formData, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/vehicles', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to add vehicle.');
  }
});

export const updateVehicle = createAsyncThunk('vehicles/update', async ({ id, ...body }, { rejectWithValue }) => {
  try {
    const { data } = await api.patch(`/vehicles/${id}`, body);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update vehicle.');
  }
});

export const deleteVehicle = createAsyncThunk('vehicles/delete', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/vehicles/${id}`);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete vehicle.');
  }
});

export const uploadVehicleDocument = createAsyncThunk('vehicles/uploadDocument', async ({ id, formData }, { rejectWithValue }) => {
  try {
    const { data } = await api.patch(`/vehicles/${id}/documents`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to upload document.');
  }
});

export const addVehicleService = createAsyncThunk('vehicles/addService', async ({ id, ...payload }, { rejectWithValue }) => {
  try {
    const { data } = await api.post(`/vehicles/${id}/service`, payload);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to add service entry.');
  }
});

export const updateVehicleApproval = createAsyncThunk('vehicles/updateApproval', async ({ id, status }, { rejectWithValue }) => {
  try {
    await api.patch(`/vehicles/${id}/status`, { status });
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed.');
  }
});

export const updateVehicleSlot = createAsyncThunk('vehicles/updateSlot', async ({ id, slot }, { rejectWithValue }) => {
  try {
    await api.patch(`/vehicles/${id}/slot`, slot);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to save slot.');
  }
});

export const updateVehicleOrderStatus = createAsyncThunk('vehicles/updateOrderStatus', async ({ id, status }, { rejectWithValue }) => {
  try {
    const { data } = await api.patch(`/vehicles/${id}/order-status`, { status });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed.');
  }
});

export const assignDriver = createAsyncThunk('vehicles/assignDriver', async ({ id, driverId, driverName }, { rejectWithValue }) => {
  try {
    const { data } = await api.patch(`/vehicles/${id}/driver-assignment`, { driverId, driverName });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to assign driver.');
  }
});

export const approveDriver = createAsyncThunk('vehicles/approveDriver', async ({ id, status }, { rejectWithValue }) => {
  try {
    const { data } = await api.patch(`/vehicles/${id}/driver-assignment/approve`, { status });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed.');
  }
});

const vehiclesSlice = createSlice({
  name: 'vehicles',
  initialState: { list: [], complianceAlerts: [], fleetAvailability: [], overview: null, loading: false, error: null },
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchVehicles.pending, state => { state.loading = true; state.error = null; })
      .addCase(fetchVehicles.fulfilled, (state, { payload }) => { state.loading = false; state.list = payload; })
      .addCase(fetchVehicles.rejected, (state, { payload }) => { state.loading = false; state.error = payload; })
      .addCase(fetchComplianceAlerts.fulfilled, (state, { payload }) => { state.complianceAlerts = payload; })
      .addCase(fetchFleetAvailability.fulfilled, (state, { payload }) => { state.fleetAvailability = payload; })
      .addCase(fetchVehicleOverview.fulfilled, (state, { payload }) => { state.overview = payload; })
      .addCase(updateVehicle.fulfilled, (state, { payload }) => {
        const idx = state.list.findIndex(v => v._id === payload._id);
        if (idx !== -1) state.list[idx] = payload;
      })
      .addCase(deleteVehicle.fulfilled, (state, { payload }) => {
        state.list = state.list.filter(v => v._id !== payload);
      })
      .addCase(uploadVehicleDocument.fulfilled, (state, { payload }) => {
        const idx = state.list.findIndex(v => v._id === payload._id);
        if (idx !== -1) state.list[idx] = payload;
      })
      .addCase(addVehicleService.fulfilled, (state, { payload }) => {
        const idx = state.list.findIndex(v => v._id === payload._id);
        if (idx !== -1) state.list[idx] = payload;
      })
      .addCase(updateVehicleOrderStatus.fulfilled, (state, { payload }) => {
        const idx = state.list.findIndex(v => v._id === payload._id);
        if (idx !== -1) state.list[idx] = payload;
      })
      .addCase(assignDriver.fulfilled, (state, { payload }) => {
        const idx = state.list.findIndex(v => v._id === payload._id);
        if (idx !== -1) state.list[idx] = payload;
      })
      .addCase(approveDriver.fulfilled, (state, { payload }) => {
        const idx = state.list.findIndex(v => v._id === payload._id);
        if (idx !== -1) state.list[idx] = payload;
      });
  },
});

export default vehiclesSlice.reducer;
