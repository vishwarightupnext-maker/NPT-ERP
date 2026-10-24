import { createContext, useContext, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setCredentials, logoutUser, fetchCurrentUser } from '../store/slices/authSlice';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const { user, loading } = useSelector(s => s.auth);
  const dispatch = useDispatch();

  useEffect(() => {
    const token = localStorage.getItem('token');
    // SuperAdmin session is validated locally — skip backend call
    if (token && token !== 'superadmin-static') {
      dispatch(fetchCurrentUser());
    }
  }, [dispatch]);

  const login = (token, userData) => {
    dispatch(setCredentials({ token, user: userData }));
  };

  const logout = () => {
    dispatch(logoutUser());
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
