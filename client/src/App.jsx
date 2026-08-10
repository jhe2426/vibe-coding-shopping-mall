import { Navigate, Route, Routes } from "react-router-dom";

import LoginPage from "./pages/LoginPage.jsx";
import MainPage from "./pages/MainPage.jsx";
import ProductDetailPage from "./pages/ProductDetailPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import AdminBrandManagementPage from "./pages/AdminBrandManagementPage.jsx";
import CartPage from "./pages/CartPage.jsx";
import CheckoutPage from "./pages/CheckoutPage.jsx";
import OrderCompletePage from "./pages/OrderCompletePage.jsx";
import AdminProductCreatePage from "./pages/AdminProductCreatePage.jsx";
import AdminProductsPage from "./pages/AdminProductsPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import WishlistPage from "./pages/WishlistPage.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainPage />} />
      <Route path="/products/:id" element={<ProductDetailPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/wishlist" element={<WishlistPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/order-complete" element={<OrderCompletePage />} />
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
