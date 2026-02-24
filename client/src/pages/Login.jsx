/**
 * 功能：登录/注册页面
 * 输入：用户输入的昵称和密码
 * 输出：成功后跳转到相册列表页
 * 运行方式：作为路由组件，路径 /login
 * 依赖：api.js, toast.js
 * 项目作用：用户入口页面
 * 最后修改：2026-02-25
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken, setUser } from '../utils/api';
import { showToast } from '../utils/toast';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nickname.trim() || !password) return;

    setLoading(true);
    try {
      const data = isRegister
        ? await api.register(nickname.trim(), password)
        : await api.login(nickname.trim(), password);

      setToken(data.token);
      setUser(data.user);
      showToast(isRegister ? '注册成功 🎉' : '欢迎回来 ✨', 'success');
      navigate('/albums', { replace: true });
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ justifyContent: 'center', paddingBottom: '80px' }}>
      {/* Logo */}
      <div className="animate-in" style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div style={{
          fontSize: '4rem',
          marginBottom: '16px',
          animation: 'float 3s ease-in-out infinite'
        }}>
          📸
        </div>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 700,
          background: 'var(--gradient-primary)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '8px'
        }}>
          Memory Pic
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          一起记录，让回忆动起来
        </p>
      </div>

      {/* 表单 */}
      <form onSubmit={handleSubmit} className="animate-in" style={{ animationDelay: '0.1s' }}>
        <div className="input-group">
          <label>昵称</label>
          <input
            className="input"
            type="text"
            placeholder="给自己取个好听的名字"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            maxLength={20}
            autoComplete="username"
          />
        </div>

        <div className="input-group">
          <label>密码</label>
          <input
            className="input"
            type="password"
            placeholder="设置一个密码"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-full"
          disabled={loading || !nickname.trim() || !password}
          style={{ marginTop: '8px' }}
        >
          {loading ? <span className="spinner" /> : (isRegister ? '注册' : '登录')}
        </button>
      </form>

      {/* 切换登录/注册 */}
      <div className="animate-in" style={{
        textAlign: 'center',
        marginTop: '24px',
        animationDelay: '0.2s'
      }}>
        <button
          onClick={() => setIsRegister(!isRegister)}
          style={{
            color: 'var(--text-secondary)',
            fontSize: '0.9rem',
            padding: '8px 16px'
          }}
        >
          {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
        </button>
      </div>
    </div>
  );
}
