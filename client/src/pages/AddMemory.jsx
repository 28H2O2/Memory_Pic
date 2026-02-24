/**
 * 功能：添加记忆页面 — 支持批量上传照片（最多9张）、录音、笔记
 * 输入：用户选择照片（1~9张）/录制语音/输入笔记/选择日期
 * 输出：提交到后端创建记忆
 * 运行方式：路由组件，路径 /album/:id/add
 * 依赖：api.js, AudioRecorder组件
 * 项目作用：共创的核心交互页面，支持批量上传
 * 最后修改：2026-02-25
 */

import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { showToast } from '../utils/toast';
import AudioRecorder from '../components/AudioRecorder';

const MAX_PHOTOS = 9;

export default function AddMemory() {
  const { id: albumId } = useParams();
  const [photos, setPhotos] = useState([]); // [{file, preview}]
  const [audioBlob, setAudioBlob] = useState(null);
  const [note, setNote] = useState('');
  const [memoryDate, setMemoryDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handlePhotoSelect = (e) => {
    const newFiles = Array.from(e.target.files);
    if (newFiles.length === 0) return;

    const total = photos.length + newFiles.length;
    if (total > MAX_PHOTOS) {
      showToast(`最多选择 ${MAX_PHOTOS} 张照片，当前已选 ${photos.length} 张`, 'error');
      return;
    }

    const newPhotos = newFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));

    setPhotos(prev => [...prev, ...newPhotos]);
    // 重置 input 以便重复选择
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (index) => {
    setPhotos(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (photos.length === 0 && !audioBlob && !note.trim()) {
      showToast('至少添加一张照片、一段语音或一段文字', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('album_id', albumId);
      if (memoryDate) formData.append('memory_date', memoryDate);
      formData.append('note', note.trim());

      // 批量照片用 'photos' field
      for (const p of photos) {
        formData.append('photos', p.file);
      }

      if (audioBlob) {
        const ext = audioBlob.type.includes('webm') ? '.webm' : '.mp4';
        formData.append('audio', audioBlob, `recording${ext}`);
      }

      await api.addMemory(formData);
      const count = photos.length || 1;
      showToast(`已添加 ${count > 1 ? count + ' 条' : ''}记忆 ✨`, 'success');
      navigate(`/album/${albumId}`, { replace: true });
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const hasContent = photos.length > 0 || audioBlob || note.trim();

  return (
    <div className="page">
      <div className="page-header animate-in">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1>添加记忆</h1>
      </div>

      <form onSubmit={handleSubmit}>
        {/* 照片上传 */}
        <div className="animate-in" style={{ marginBottom: '20px', animationDelay: '0.05s' }}>
          <label style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            marginBottom: '8px'
          }}>
            <span>📸 照片</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              {photos.length}/{MAX_PHOTOS}
            </span>
          </label>

          {photos.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              marginBottom: '12px'
            }}>
              {photos.map((p, i) => (
                <div key={i} style={{
                  position: 'relative',
                  paddingTop: '100%',
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden',
                  animation: 'scaleIn 0.3s ease'
                }}>
                  <img
                    src={p.preview}
                    alt=""
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.6)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem'
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}

              {/* 添加更多按钮 */}
              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    paddingTop: '100%',
                    position: 'relative',
                    background: 'var(--bg-input)',
                    border: '2px dashed var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    color: 'var(--text-muted)'
                  }}>
                    +
                  </span>
                </button>
              )}
            </div>
          )}

          {photos.length === 0 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '100%',
                padding: '40px 20px',
                background: 'var(--bg-input)',
                border: '2px dashed var(--border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-muted)',
                fontSize: '0.95rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.3s'
              }}
            >
              <span style={{ fontSize: '2rem' }}>📷</span>
              点击选择照片（最多 {MAX_PHOTOS} 张）
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoSelect}
            style={{ display: 'none' }}
          />

          <p style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            marginTop: '6px'
          }}>
            💡 会自动读取照片的拍摄日期作为记忆时间
          </p>
        </div>

        {/* 录音 */}
        <div className="animate-in" style={{ marginBottom: '20px', animationDelay: '0.1s' }}>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            marginBottom: '8px'
          }}>🎙️ 语音</label>
          <AudioRecorder
            audioBlob={audioBlob}
            onRecorded={setAudioBlob}
          />
        </div>

        {/* 笔记 */}
        <div className="input-group animate-in" style={{ animationDelay: '0.15s' }}>
          <label>📝 笔记</label>
          <textarea
            className="input"
            placeholder="写下这一刻的心情..."
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
          />
        </div>

        {/* 日期（可选覆盖 EXIF 日期） */}
        <div className="input-group animate-in" style={{ animationDelay: '0.2s' }}>
          <label>📅 日期（可选，留空则自动读取照片拍摄时间）</label>
          <input
            className="input"
            type="date"
            value={memoryDate}
            onChange={e => setMemoryDate(e.target.value)}
            style={{ colorScheme: 'dark' }}
          />
        </div>

        {/* 提交 */}
        <button
          type="submit"
          className="btn btn-primary btn-full animate-in"
          disabled={submitting || !hasContent}
          style={{ animationDelay: '0.25s', marginTop: '8px' }}
        >
          {submitting ? <span className="spinner" /> : `💫 保存${photos.length > 1 ? ` ${photos.length} 条` : ''}记忆`}
        </button>
      </form>
    </div>
  );
}
