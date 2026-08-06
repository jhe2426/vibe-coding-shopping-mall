import { Navigate, Route, Routes } from "react-router-dom";

import LoginPage from "./pages/LoginPage.jsx";
import MainPage from "./pages/MainPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import AdminBrandManagementPage from "./pages/AdminBrandManagementPage.jsx";
import AdminProductCreatePage from "./pages/AdminProductCreatePage.jsx";
import AdminProductsPage from "./pages/AdminProductsPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/admin/products" element={<AdminProductsPage />} />
      <Route path="/admin/products/new" element={<AdminProductCreatePage />} />
      <Route path="/admin/products/:id/edit" element={<AdminProductCreatePage />} />
      <Route path="/admin/brands" element={<AdminBrandManagementPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
