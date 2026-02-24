/**
 * 功能：Memory Pic 主应用入口，路由配置
 * 输入：无
 * 输出：根据 URL 渲染对应的页面组件
 * 运行方式：被 main.jsx 渲染
 * 依赖：react-router-dom, 各页面组件
 * 项目作用：应用路由和认证守卫
 * 最后修改：2026-02-25
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getToken } from './utils/api';
import Login from './pages/Login';
import Albums from './pages/Albums';
import Timeline from './pages/Timeline';
import AddMemory from './pages/AddMemory';

// 认证守卫
function ProtectedRoute({ children }) {
  return getToken() ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/albums" element={
          <ProtectedRoute><Albums /></ProtectedRoute>
        } />
        <Route path="/album/:id" element={
          <ProtectedRoute><Timeline /></ProtectedRoute>
        } />
        <Route path="/album/:id/add" element={
          <ProtectedRoute><AddMemory /></ProtectedRoute>
        } />
        <Route path="*" element={
          <Navigate to={getToken() ? '/albums' : '/login'} replace />
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
