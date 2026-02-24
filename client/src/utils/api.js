/**
 * 功能：API 请求封装，包含 token 管理和 Toast 通知
 * 输入：各页面/组件的 API 调用
 * 输出：封装好的 fetch 请求，自动附带 JWT token
 * 运行方式：被各页面组件引入使用
 * 依赖：无外部依赖
 * 项目作用：统一管理 API 请求和认证状态
 * 最后修改：2026-02-25
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Token 管理
export function getToken() {
  return localStorage.getItem('mp_token');
}

export function setToken(token) {
  localStorage.setItem('mp_token', token);
}

export function removeToken() {
  localStorage.removeItem('mp_token');
}

export function getUser() {
  const raw = localStorage.getItem('mp_user');
  return raw ? JSON.parse(raw) : null;
}

export function setUser(user) {
  localStorage.setItem('mp_user', JSON.stringify(user));
}

export function removeUser() {
  localStorage.removeItem('mp_user');
}

export function logout() {
  removeToken();
  removeUser();
  window.location.href = '/login';
}

// 通用请求
async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 如果不是 FormData，设置 Content-Type
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await res.json();

  if (!res.ok) {
    if (res.status === 401) {
      logout();
    }
    throw new Error(data.error || '请求失败');
  }

  return data;
}

// API 方法
export const api = {
  // 认证
  register: (nickname, password) =>
    request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ nickname, password })
    }),

  login: (nickname, password) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ nickname, password })
    }),

  getMe: () => request('/api/auth/me'),

  // 相册
  createAlbum: (name, description) =>
    request('/api/albums/create', {
      method: 'POST',
      body: JSON.stringify({ name, description })
    }),

  joinAlbum: (inviteCode) =>
    request('/api/albums/join', {
      method: 'POST',
      body: JSON.stringify({ inviteCode })
    }),

  getAlbums: () => request('/api/albums'),

  getAlbum: (id) => request(`/api/albums/${id}`),

  // 记忆
  addMemory: (formData) =>
    request('/api/memories', {
      method: 'POST',
      body: formData
    }),

  getMemories: (albumId) => request(`/api/memories/${albumId}`),

  deleteMemory: (id) =>
    request(`/api/memories/${id}`, { method: 'DELETE' }),

  // 更新录音（上传后添加/替换录音）
  updateAudio: (memoryId, formData) =>
    request(`/api/memories/${memoryId}/audio`, {
      method: 'PATCH',
      body: formData
    }),

  // 删除录音
  deleteAudio: (memoryId) =>
    request(`/api/memories/${memoryId}/audio`, { method: 'DELETE' }),

  // 更新笔记
  updateNote: (memoryId, note) =>
    request(`/api/memories/${memoryId}/note`, {
      method: 'PATCH',
      body: JSON.stringify({ note })
    })
};

// 获取文件完整 URL
export function getFileUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path}`;
}
