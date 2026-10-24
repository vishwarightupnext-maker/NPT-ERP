import { configureStore } from '@reduxjs/toolkit';
import authReducer      from './slices/authSlice';
import usersReducer     from './slices/usersSlice';
import driversReducer   from './slices/driversSlice';
import driverHRReducer  from './slices/driverHRSlice';
import customersReducer from './slices/customersSlice';
import vehiclesReducer  from './slices/vehiclesSlice';
import dispatchReducer  from './slices/dispatchSlice';
import lrReducer        from './slices/lrSlice';
import invoiceReducer   from './slices/invoiceSlice';
import routesReducer    from './slices/routeSlice';
import hrmReducer       from './slices/hrmSlice';
import vendorReducer    from './slices/vendorSlice';
import tripExpenseReducer from './slices/tripExpenseSlice';
import officeExpenseReducer from './slices/officeExpenseSlice';
import vendorTripReducer from './slices/vendorTripSlice';
import vendorVehicleReducer from './slices/vendorVehicleSlice';
import reportsReducer from './slices/reportsSlice';

export const store = configureStore({
  reducer: {
    auth:       authReducer,
    users:      usersReducer,
    drivers:    driversReducer,
    driverHR:   driverHRReducer,
    customers:  customersReducer,
    vehicles:   vehiclesReducer,
    dispatches: dispatchReducer,
    lr:         lrReducer,
    invoices:   invoiceReducer,
    routes:     routesReducer,
    hrm:        hrmReducer,
    vendor:     vendorReducer,
    tripExpense: tripExpenseReducer,
    officeExpense: officeExpenseReducer,
    vendorTrip: vendorTripReducer,
    vendorVehicle: vendorVehicleReducer,
    reports:    reportsReducer,
  },
});
