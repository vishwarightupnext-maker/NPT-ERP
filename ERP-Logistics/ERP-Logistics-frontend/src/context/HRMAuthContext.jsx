import { createContext, useContext, useState, useEffect } from 'react';
import hrmApi from '../api/hrmAxios';

const HRMAuthContext = createContext(null);

export const HRMAuthProvider = ({ children }) => {
  const [employee, setEmployee] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hrmEmployee')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('hrmToken');
    if (!token) { setLoading(false); return; }
    if (token === 'hrm-superadmin-static') { setLoading(false); return; }
    hrmApi.get('/hrm/auth/me', { _skipHRMRedirect: true })
      .then(({ data }) => setEmployee(data.employee))
      .catch(() => {
        if (!employee) {
          localStorage.removeItem('hrmToken');
          localStorage.removeItem('hrmEmployee');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = (token, emp) => {
    localStorage.setItem('hrmToken', token);
    localStorage.setItem('hrmEmployee', JSON.stringify(emp));
    setEmployee(emp);
  };

  const logout = () => {
    localStorage.removeItem('hrmToken');
    localStorage.removeItem('hrmEmployee');
    setEmployee(null);
  };

  return (
    <HRMAuthContext.Provider value={{ employee, loading, login, logout }}>
      {children}
    </HRMAuthContext.Provider>
  );
};

export const useHRMAuth = () => useContext(HRMAuthContext);
