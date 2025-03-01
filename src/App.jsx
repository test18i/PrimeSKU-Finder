import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './Pages/loginPage';
import ManageSKU from './Pages/manageSKU';
import SkuFinder from './Pages/skuFinder';
import ManageUsers from './Pages/ManageUsers'; // <-- Import your ManageUsers component

// ProtectedRoute component checks if the user role stored in localStorage is "admin"
function ProtectedRoute({ children }) {
  const userRole = localStorage.getItem('userRole');
  if (userRole !== 'admin') {
    return <Navigate to="/" />;
  }
  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/SKUfinder" element={<SkuFinder />} />

        {/* Admin-only routes */}
        <Route
          path="/ManageSKU"
          element={
            <ProtectedRoute>
              <ManageSKU />
            </ProtectedRoute>
          }
        />
        <Route
  path="/users"
  element={
    <ProtectedRoute>
      <ManageUsers />
    </ProtectedRoute>
  }
        />
      </Routes>
    </Router>
  );
}

export default App;
