'use client';

import { useState, useEffect } from 'react';
import { X, Send, Trash2, MessageCircle, User, Calendar, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import {
  getCommentsByProjectAndMember,
  createComment,
  deleteComment,
  markProjectCommentsAsRead,
  type PerformanceCommentWithRelations,
} from '@/lib/api';
import { formatDistanceToNow, format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface PerformanceCommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  memberId: string;
  memberName: string;
}

export default function PerformanceCommentModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  memberId,
  memberName,
}: PerformanceCommentModalProps) {
  const { member: currentUser } = useAuthStore();
  const isManager = currentUser?.role === 'admin' || currentUser?.role === 'manager';
  const isOwnComments = currentUser?.id === memberId;

  const [comments, setComments] = useState<PerformanceCommentWithRelations[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // 코멘트 로드
  useEffect(() => {
    if (isOpen) {
      loadComments();
    }
  }, [isOpen, projectId, memberId]);

  const loadComments = async () => {
    try {
      setIsLoading(true);
      const data = await getCommentsByProjectAndMember(projectId, memberId);
      setComments(data);

      // 본인이 대상인 경우 읽음 처리
      if (isOwnComments && currentUser?.id) {
        await markProjectCommentsAsRead(projectId, currentUser.id);
      }
    } catch (error) {
      console.error('코멘트 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 코멘트 작성
  const handleSubmit = async () => {
    if (!newComment.trim() || !currentUser?.id || !currentUser?.org_id) return;

    setIsSending(true);
    try {
      const comment = await createComment({
        org_id: currentUser.org_id,
        project_id: projectId,
        member_id: memberId,
        author_id: currentUser.id,
        content: newComment.trim(),
      });
      setComments((prev) => [comment, ...prev]);
      setNewComment('');
    } catch (error) {
      console.error('코멘트 작성 실패:', error);
      alert('코멘트 작성에 실패했습니다.');
    } finally {
      setIsSending(false);
    }
  };

  // 코멘트 삭제
  const handleDelete = async (commentId: string) => {
    if (!confirm('이 피드백을 삭제하시겠습니까?')) return;

    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (error) {
      console.error('코멘트 삭제 실패:', error);
      alert('코멘트 삭제에 실패했습니다.');
    }
  };

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Enter 키로 전송 (Shift+Enter는 줄바꿈)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* 헤더 - 그라데이션 배경 */}
        <div className="relative bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 px-6 py-5">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-all z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative pr-10">
            <div className="flex items-center gap-2 text-blue-100 text-sm mb-1">
              <Sparkles className="w-4 h-4" />
              <span>성과 피드백</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-1">{projectName}</h2>
            <div className="flex items-center gap-2 text-blue-100">
              <User className="w-4 h-4" />
              <span>{memberName}</span>
            </div>
          </div>
        </div>

        {/* 코멘트 목록 */}
        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-blue-200 rounded-full"></div>
                <div className="absolute top-0 left-0 w-12 h-12 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
              </div>
              <p className="mt-4 text-gray-500">피드백을 불러오는 중...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-4">
                <MessageCircle className="w-10 h-10 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">아직 피드백이 없습니다</h3>
              <p className="text-gray-500 text-center text-sm">
                {isManager && !isOwnComments
                  ? '첫 번째 피드백을 남겨 팀원의 성과를 격려해주세요!'
                  : '관리자가 피드백을 남기면 여기에 표시됩니다.'}
              </p>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {comments.map((comment, index) => (
                <div
                  key={comment.id}
                  className="group relative bg-gradient-to-br from-gray-50 to-white border border-gray-100 rounded-xl p-5 hover:shadow-md transition-all duration-200"
                >
                  {/* 삭제 버튼 */}
                  {(comment.author_id === currentUser?.id || currentUser?.role === 'admin') && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* 작성자 정보 */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold shadow-lg shadow-blue-500/30">
                      {comment.author?.name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {comment.author?.name}
                        <span className="ml-2 text-xs font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                          관리자
                        </span>
                      </p>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        <span>{format(new Date(comment.created_at), 'yyyy년 M월 d일 HH:mm', { locale: ko })}</span>
                        <span className="text-gray-300 mx-1">|</span>
                        <span>{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ko })}</span>
                      </div>
                    </div>
                  </div>

                  {/* 코멘트 내용 */}
                  <div className="pl-13">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 코멘트 입력 - 관리자만 (본인에게는 작성 불가) */}
        {isManager && !isOwnComments && (
          <div className="border-t border-gray-100 bg-gray-50/50 p-5">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold shadow-lg shadow-blue-500/30 flex-shrink-0">
                {currentUser?.name?.charAt(0) || '?'}
              </div>
              <div className="flex-1 relative">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="피드백을 입력하세요... (Enter로 전송, Shift+Enter로 줄바꿈)"
                  rows={3}
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white shadow-sm"
                />
                <button
                  onClick={handleSubmit}
                  disabled={!newComment.trim() || isSending}
                  className="absolute bottom-3 right-3 p-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/30 disabled:shadow-none"
                >
                  {isSending ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2 ml-13">
              피드백은 {memberName}님에게만 표시됩니다
            </p>
          </div>
        )}

        {/* 일반 직원용 하단 */}
        {!isManager && comments.length > 0 && (
          <div className="border-t border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4">
            <p className="text-sm text-blue-700 text-center">
              총 <span className="font-bold">{comments.length}개</span>의 피드백이 있습니다
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
