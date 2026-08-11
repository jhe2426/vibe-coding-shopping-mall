import { Navigate, Route, Routes } from "react-router-dom";

import LoginPage from "./pages/LoginPage.jsx";
import MainPage from "./pages/MainPage.jsx";
import MyPage from "./pages/MyPage.jsx";
import ProductDetailPage from "./pages/ProductDetailPage.jsx";
import AdminPage from "./pages/admin/AdminPage.jsx";
import AdminBrandManagementPage from "./pages/admin/AdminBrandManagementPage.jsx";
import AdminMemberManagementPage from "./pages/admin/AdminMemberManagementPage.jsx";
import AdminOrderDetailPage from "./pages/admin/AdminOrderDetailPage.jsx";
import AdminOrderManagementPage from "./pages/admin/AdminOrderManagementPage.jsx";
import CartPage from "./pages/CartPage.jsx";
import CheckoutPage from "./pages/CheckoutPage.jsx";
import OrderCompletePage from "./pages/OrderCompletePage.jsx";
import OrderHistoryPage from "./pages/OrderHistoryPage.jsx";
import AdminProductCreatePage from "./pages/admin/AdminProductCreatePage.jsx";
import AdminProductsPage from "./pages/admin/AdminProductsPage.jsx";
import AdminLowStockPage from "./pages/admin/AdminLowStockPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import WishlistPage from "./pages/WishlistPage.jsx";
import AdminRoute from "./components/AdminRoute.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainPage />} />
      <Route path="/mypage" element={<MyPage />} />
      <Route path="/products/:id" element={<ProductDetailPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/wishlist" element={<WishlistPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/order-complete" element={<OrderCompletePage />} />
      <Route path="/orders" element={<OrderHistoryPage />} />
      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/members" element={<AdminMemberManagementPage />} />
        <Route path="/admin/orders" element={<AdminOrderManagementPage />} />
        <Route path="/admin/orders/:orderId" element={<AdminOrderDetailPage />} />
        <Route path="/admin/products" element={<AdminProductsPage />} />
        <Route path="/admin/products/low-stock" element={<AdminLowStockPage />} />
        <Route path="/admin/products/new" element={<AdminProductCreatePage />} />
        <Route path="/admin/products/:id/edit" element={<AdminProductCreatePage />} />
        <Route path="/admin/brands" element={<AdminBrandManagementPage />} />
      </Route>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
