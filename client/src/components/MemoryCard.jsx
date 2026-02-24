/**
 * 功能：记忆卡片组件 — 展示单条记忆，支持在线录音和编辑笔记
 * 输入：memory 对象（含 photo_url, audio_url, note, author_name 等）
 * 输出：一张精美的记忆卡片，支持添加/替换/删除语音
 * 运行方式：由 Timeline 页面引入
 * 依赖：api.js (getFileUrl, api), AudioRecorder
 * 项目作用：时间线的核心展示单元，支持自由创作
 * 最后修改：2026-02-25
 */

import { useState, useRef } from 'react';
import { getFileUrl, api } from '../utils/api';
import { showToast } from '../utils/toast';
import AudioRecorder from './AudioRecorder';

export default function MemoryCard({ memory, onDelete, onUpdate, index }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(memory.note || '');
  const [uploading, setUploading] = useState(false);
  const audioRef = useRef(null);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  // 添加/替换录音
  const handleRecorded = async (blob) => {
    if (!blob) {
      setShowRecorder(false);
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      const ext = blob.type.includes('webm') ? '.webm' : '.mp4';
      formData.append('audio', blob, `recording${ext}`);
      const data = await api.updateAudio(memory.id, formData);
      if (onUpdate) onUpdate(data.memory);
      showToast('录音已添加 🎙️', 'success');
      setShowRecorder(false);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  // 删除录音
  const handleDeleteAudio = async () => {
    if (!confirm('确定删除录音？')) return;
    try {
      const data = await api.deleteAudio(memory.id);
      if (onUpdate) onUpdate(data.memory);
      showToast('录音已删除', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // 保存笔记
  const handleSaveNote = async () => {
    try {
      const data = await api.updateNote(memory.id, noteText);
      if (onUpdate) onUpdate(data.memory);
      setEditingNote(false);
      showToast('笔记已保存', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays} 天前`;

    return d.toLocaleDateString('zh-CN', {
      month: 'long', day: 'numeric',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <>
      <div
        className="card animate-in"
        style={{
          animationDelay: `${0.05 + index * 0.08}s`,
          padding: 0,
          overflow: 'hidden'
        }}
      >
        {/* 照片 */}
        {memory.photo_url && (
          <div
            onClick={() => setShowFull(true)}
            style={{
              position: 'relative',
              paddingTop: '75%',
              background: 'var(--bg-surface)',
              cursor: 'pointer',
              overflow: 'hidden'
            }}
          >
            {!imageLoaded && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div className="spinner" />
              </div>
            )}
            <img
              src={getFileUrl(memory.thumbnail_url || memory.photo_url)}
              alt=""
              onLoad={() => setImageLoaded(true)}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: imageLoaded ? 1 : 0,
                transition: 'opacity 0.3s'
              }}
            />
          </div>
        )}

        {/* 内容区 */}
        <div style={{ padding: '16px' }}>
          {/* 笔记 —— 可编辑 */}
          {editingNote ? (
            <div style={{ marginBottom: '12px' }}>
              <textarea
                className="input"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                rows={3}
                autoFocus
                style={{ marginBottom: '8px', fontSize: '0.9rem' }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-primary btn-small"
                  onClick={handleSaveNote}
                  style={{ flex: 1 }}
                >
                  保存
                </button>
                <button
                  className="btn btn-secondary btn-small"
                  onClick={() => { setEditingNote(false); setNoteText(memory.note || ''); }}
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            memory.note && (
              <p
                onClick={() => setEditingNote(true)}
                style={{
                  fontSize: '0.95rem',
                  lineHeight: 1.7,
                  color: 'var(--text-primary)',
                  marginBottom: '12px',
                  whiteSpace: 'pre-wrap',
                  cursor: 'pointer'
                }}
                title="点击编辑"
              >
                {memory.note}
              </p>
            )
          )}

          {/* 录音区域 */}
          {memory.audio_url && !showRecorder && (
            <div style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <button
                onClick={toggleAudio}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 16px',
                  background: playing ? 'rgba(232, 101, 122, 0.15)' : 'var(--bg-input)',
                  border: '1px solid',
                  borderColor: playing ? 'rgba(232, 101, 122, 0.3)' : 'var(--border)',
                  borderRadius: '24px',
                  color: playing ? 'var(--primary)' : 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  flex: 1,
                  transition: 'all 0.3s',
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>{playing ? '⏸' : '▶️'}</span>
                {playing ? '正在播放...' : '播放语音'}
              </button>
              <button
                onClick={() => setShowRecorder(true)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '20px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                  fontSize: '0.75rem'
                }}
                title="重新录制"
              >
                🔄
              </button>
              <button
                onClick={handleDeleteAudio}
                style={{
                  padding: '8px 12px',
                  borderRadius: '20px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                  fontSize: '0.75rem'
                }}
                title="删除录音"
              >
                🗑
              </button>
            </div>
          )}

          {memory.audio_url && (
            <audio
              ref={audioRef}
              src={getFileUrl(memory.audio_url)}
              onEnded={() => setPlaying(false)}
              style={{ display: 'none' }}
            />
          )}

          {/* 添加录音 / 重新录制 */}
          {showRecorder && (
            <div style={{ marginBottom: '12px' }}>
              <AudioRecorder
                audioBlob={null}
                onRecorded={handleRecorded}
              />
              {uploading && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '8px',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem'
                }}>
                  <div className="spinner" style={{ width: '16px', height: '16px' }} />
                  上传中...
                </div>
              )}
              <button
                onClick={() => setShowRecorder(false)}
                style={{
                  marginTop: '8px',
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem',
                  padding: '4px 8px'
                }}
              >
                取消
              </button>
            </div>
          )}

          {/* 底部操作栏 */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8rem',
            color: 'var(--text-muted)'
          }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{
                background: 'var(--gradient-warm)',
                borderRadius: '8px',
                padding: '2px 8px',
                fontSize: '0.75rem',
                fontWeight: 500,
                color: 'white'
              }}>
                {memory.author_name}
              </span>
              {memory.location && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                  📍{memory.location}
                </span>
              )}
              <span>{formatDate(memory.memory_date || memory.created_at)}</span>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {/* 添加录音按钮（无录音时显示） */}
              {!memory.audio_url && !showRecorder && (
                <button
                  onClick={() => setShowRecorder(true)}
                  style={{ padding: '4px 8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}
                  title="添加语音"
                >
                  🎙️
                </button>
              )}
              {/* 编辑笔记按钮 */}
              {!editingNote && (
                <button
                  onClick={() => setEditingNote(true)}
                  style={{ padding: '4px 8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}
                  title="编辑笔记"
                >
                  ✏️
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => {
                    if (confirm('确定删除这条记忆吗？')) onDelete(memory.id);
                  }}
                  style={{ padding: '4px 8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}
                >
                  删除
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 全屏查看照片 */}
      {showFull && memory.photo_url && (
        <div
          onClick={() => setShowFull(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.95)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.2s ease',
            cursor: 'pointer'
          }}
        >
          <img
            src={getFileUrl(memory.photo_url)}
            alt=""
            style={{
              maxWidth: '95vw',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: '8px',
              animation: 'scaleIn 0.3s ease'
            }}
          />
        </div>
      )}
    </>
  );
}
