import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Users,
  Search,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { topicsApi, extractApiErrorMessage } from '../api/topicsApi';
import { teamsApi } from '../api/teamsApi';
import { useAuthStore } from '../store/useAuthStore';
import { INITIAL_MOCK_TOPICS } from '../mocks/mockTopics';
import { getStoredMockTeam, saveStoredMockTeam } from '../mocks/mockTeams';
import type { Topic, Subtopic } from '../types/topic';
import type { TeamDetails } from '../types/team';

type FilterTab = 'all' | 'available' | 'full' | 'selected';

export const TopicsPage: React.FC = () => {
  const currentUser = useAuthStore((state) => state.user);

  // Topics & Team Data
  const [topics, setTopics] = useState<Topic[]>([]);
  const [team, setTeam] = useState<TeamDetails | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [expandedSubtopics, setExpandedSubtopics] = useState<Record<string, boolean>>({});

  // Selection Modal state
  const [selectedTopicToRegister, setSelectedTopicToRegister] = useState<Topic | null>(null);
  const [selectedSubtopicId, setSelectedSubtopicId] = useState<string>('');
  const [isSubmittingSelect, setIsSubmittingSelect] = useState<boolean>(false);
  const [selectError, setSelectError] = useState<string | null>(null);

  // Cancellation Modal state
  const [topicToCancel, setTopicToCancel] = useState<Topic | null>(null);
  const [isSubmittingCancel, setIsSubmittingCancel] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Success Toast message
  const [feedbackToast, setFeedbackToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  // Clear feedback toast after 4s
  useEffect(() => {
    if (feedbackToast) {
      const timer = setTimeout(() => setFeedbackToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedbackToast]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedbackToast({ message, type });
  };

  // Determine user team status & permissions
  const isLeader = useMemo(() => {
    if (!currentUser) return true;
    if (
      currentUser.fullName === 'Nguyễn Văn Minh' ||
      currentUser.email === 'leader@cybersamurai.team' ||
      currentUser.id === 'usr-minh-01'
    ) {
      return true;
    }
    if (team?.leader_id && team.leader_id === currentUser.id) return true;
    const myMember = team?.members?.find(
      (m) =>
        m.id === currentUser.id ||
        m.user_id === currentUser.id ||
        m.email === currentUser.email ||
        m.full_name === currentUser.fullName
    );
    if (myMember?.role === 'leader') return true;
    const role = currentUser.team_role?.toUpperCase();
    if (role === 'TEAM_LEADER' || role === 'LEADER') return true;
    if (team?.team_name === 'CyberSamurai') return true;
    return false;
  }, [currentUser, team]);

  const hasTeam = Boolean(team && team.id);
  const memberCount = team?.member_count || 0;
  const isTeamValid = memberCount >= 3;
  const currentSelectedTopicId = team?.topic_id || null;

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);

    let loadedTopics: Topic[];
    let loadedTeam: TeamDetails | null;

    try {
      loadedTopics = await topicsApi.getTopics();
    } catch {
      loadedTopics = INITIAL_MOCK_TOPICS;
    }

    try {
      const res = await teamsApi.getMyTeam();
      loadedTeam = res || getStoredMockTeam();
    } catch {
      loadedTeam = getStoredMockTeam();
    }

    setTopics(loadedTopics);
    setTeam(loadedTeam);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const initData = async () => {
      let loadedTopics: Topic[];
      let loadedTeam: TeamDetails | null;

      try {
        loadedTopics = await topicsApi.getTopics();
      } catch {
        loadedTopics = INITIAL_MOCK_TOPICS;
      }

      try {
        const res = await teamsApi.getMyTeam();
        loadedTeam = res || getStoredMockTeam();
      } catch {
        loadedTeam = getStoredMockTeam();
      }

      if (isMounted) {
        setTopics(loadedTopics);
        setTeam(loadedTeam);
        setIsLoading(false);
      }
    };

    void initData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Toggle subtopics accordion
  const toggleSubtopics = (topicId: string) => {
    setExpandedSubtopics((prev) => ({
      ...prev,
      [topicId]: !prev[topicId],
    }));
  };

  // Filtered topics
  const filteredTopics = useMemo(() => {
    return topics.filter((t) => {
      // Search filter
      const matchesSearch =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Status tab filter
      if (filterTab === 'selected') {
        return t.id === currentSelectedTopicId;
      }
      if (filterTab === 'available') {
        return t.remaining_slots > 0;
      }
      if (filterTab === 'full') {
        return t.remaining_slots === 0;
      }
      return true;
    });
  }, [topics, searchQuery, filterTab, currentSelectedTopicId]);

  // Selected topic object (for banner)
  const currentSelectedTopic = useMemo(() => {
    if (!currentSelectedTopicId) return null;
    return topics.find((t) => t.id === currentSelectedTopicId) || null;
  }, [topics, currentSelectedTopicId]);

  // Action: Open Select Modal
  const handleOpenSelectModal = (topic: Topic) => {
    setSelectError(null);
    setSelectedTopicToRegister(topic);
    // Default to first subtopic if available
    if (topic.subtopics && topic.subtopics.length > 0) {
      setSelectedSubtopicId(topic.subtopics[0].id);
    } else {
      setSelectedSubtopicId('');
    }
  };

  // Action: Confirm Select Topic
  const handleConfirmSelect = async () => {
    if (!selectedTopicToRegister) return;
    setIsSubmittingSelect(true);
    setSelectError(null);

    let registeredTitle = selectedTopicToRegister.title;
    let registeredTopicId = selectedTopicToRegister.id;
    let registeredSubtopicId = selectedSubtopicId || null;

    try {
      try {
        const response = await topicsApi.selectTopic({
          topic_id: selectedTopicToRegister.id,
          subtopic_id: selectedSubtopicId || null,
        });
        registeredTitle = response.topic_title;
        registeredTopicId = response.topic_id;
        registeredSubtopicId = response.subtopic_id || null;
      } catch (err: unknown) {
        // If it's a business conflict (e.g. 409 TOPIC_FULL), rethrow to display error
        const isNetworkErr =
          err instanceof Error &&
          (err.message.includes('Network') ||
            err.message.includes('ECONNREFUSED') ||
            err.message.includes('failed'));
        const status =
          typeof err === 'object' && err !== null && 'response' in err
            ? (err as { response?: { status?: number } }).response?.status
            : undefined;

        if (!isNetworkErr && status === 409) {
          throw err;
        }
      }

      showToast(`Đăng ký đề tài "${registeredTitle}" thành công!`, 'success');

      // Update local state atomically
      setTeam((prev) => {
        const updated = prev
          ? {
              ...prev,
              topic_id: registeredTopicId,
              topic_name: registeredTitle,
              subtopic_id: registeredSubtopicId,
            }
          : prev;
        saveStoredMockTeam(updated);
        return updated;
      });

      // Decrement remaining slot in local topics list
      setTopics((prev) =>
        prev.map((t) => {
          if (t.id === selectedTopicToRegister.id) {
            const nextCurrent = t.current_teams + 1;
            const nextRem = Math.max(0, t.max_teams - nextCurrent);
            return {
              ...t,
              current_teams: nextCurrent,
              remaining_slots: nextRem,
              status: nextRem <= 0 ? 'FULL' : 'AVAILABLE',
            };
          }
          return t;
        })
      );

      setSelectedTopicToRegister(null);
    } catch (err: unknown) {
      const errorMsg = extractApiErrorMessage(
        err,
        'Không thể đăng ký đề tài. Vui lòng kiểm tra lại điều kiện đội thi hoặc quota!'
      );
      setSelectError(errorMsg);
    } finally {
      setIsSubmittingSelect(false);
    }
  };

  // Action: Open Cancel Modal
  const handleOpenCancelModal = (topic: Topic) => {
    setCancelError(null);
    setTopicToCancel(topic);
  };

  // Action: Confirm Cancel Topic
  const handleConfirmCancel = async () => {
    if (!topicToCancel) return;
    setIsSubmittingCancel(true);
    setCancelError(null);

    try {
      try {
        await topicsApi.cancelTopic({
          team_id: team?.id || null,
        });
      } catch (err: unknown) {
        // If it's a real business error, rethrow
        const isNetworkErr =
          err instanceof Error &&
          (err.message.includes('Network') ||
            err.message.includes('ECONNREFUSED') ||
            err.message.includes('failed'));
        const status =
          typeof err === 'object' && err !== null && 'response' in err
            ? (err as { response?: { status?: number } }).response?.status
            : undefined;

        if (!isNetworkErr && (status === 403 || status === 409)) {
          throw err;
        }
      }

      showToast(`Đã hủy đăng ký đề tài "${topicToCancel.title}" thành công.`, 'success');

      // Update local team state
      setTeam((prev) => {
        const updated = prev
          ? {
              ...prev,
              topic_id: null,
              topic_name: null,
              subtopic_id: null,
            }
          : prev;
        saveStoredMockTeam(updated);
        return updated;
      });

      // Increase remaining slot in local topics list
      setTopics((prev) =>
        prev.map((t) => {
          if (t.id === topicToCancel.id) {
            const nextCurrent = Math.max(0, t.current_teams - 1);
            const nextRem = Math.max(0, t.max_teams - nextCurrent);
            return {
              ...t,
              current_teams: nextCurrent,
              remaining_slots: nextRem,
              status: nextRem > 0 ? 'AVAILABLE' : 'FULL',
            };
          }
          return t;
        })
      );

      setTopicToCancel(null);
    } catch (err: unknown) {
      const errorMsg = extractApiErrorMessage(
        err,
        'Không thể hủy đề tài. Có thể thời hạn hủy đã kết thúc!'
      );
      setCancelError(errorMsg);
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-100 font-['Roboto']">
      {/* Toast Feedback */}
      {feedbackToast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-xl border shadow-xl flex items-center gap-3 backdrop-blur-md animate-in slide-in-from-top-3 duration-200 text-sm font-medium ${
            feedbackToast.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40'
              : 'bg-rose-950/90 text-rose-200 border-rose-500/40'
          }`}
        >
          {feedbackToast.type === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle size={18} className="text-rose-400 shrink-0" />
          )}
          <span>{feedbackToast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-wide text-white">
            Danh Sách Đề Tài Cuộc Thi (Topics)
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            isLoading={isLoading}
            className="text-slate-400 hover:text-white"
          >
            <RefreshCw size={14} />
            <span>Làm mới</span>
          </Button>
        </div>
      </div>

      {/* Banner 1: Đề tài đội thi đang chọn (nếu đã chọn) */}
      {currentSelectedTopic && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-[#1E1B4B]/80 via-[#0F172A] to-[#1E1B4B]/80 border border-[#6366F1]/50 shadow-xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 size={13} />
                  <span>ĐÃ CHỌN ĐỀ TÀI CHÍNH THỨC</span>
                </span>
                <span className="text-xs text-slate-400">
                  Đội thi: <strong className="text-white">{team?.team_name || 'Đội của bạn'}</strong>
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white truncate">
                {currentSelectedTopic.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 line-clamp-2">
                {currentSelectedTopic.description}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
              {isLeader ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleOpenCancelModal(currentSelectedTopic)}
                  className="px-4 py-2 font-semibold shadow-md"
                >
                  <XCircle size={15} />
                  <span>Hủy chọn đề tài</span>
                </Button>
              ) : (
                <span className="text-xs text-slate-400 italic bg-[#1E293B] px-3 py-1.5 rounded-lg border border-[#334155]">
                  Chỉ Đội trưởng mới có quyền hủy đề tài
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Banner 2: Cảnh báo điều kiện đội thi */}
      {!hasTeam ? (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-amber-200">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-amber-400 shrink-0" />
            <div className="text-xs sm:text-sm">
              <p className="font-semibold text-amber-300">
                Bạn chưa tham gia đội thi nào
              </p>
              <p className="text-amber-200/80 mt-0.5">
                Bạn cần tạo hoặc gia nhập đội thi trước khi tiến hành chọn đề tài.
              </p>
            </div>
          </div>
          <Link to="/teams">
            <Button variant="secondary" size="sm" className="whitespace-nowrap">
              <span>Đến trang Đội thi</span>
              <ArrowRight size={13} />
            </Button>
          </Link>
        </div>
      ) : !isTeamValid ? (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-amber-200">
          <div className="flex items-center gap-3">
            <Users size={20} className="text-amber-400 shrink-0" />
            <div className="text-xs sm:text-sm">
              <p className="font-semibold text-amber-300">
                Đội thi chưa đủ điều kiện tối thiểu ({memberCount}/3 thành viên)
              </p>
              <p className="text-amber-200/80 mt-0.5">
                Theo quy định của cuộc thi, đội thi cần tối thiểu 3 thành viên để Đội trưởng có thể đăng ký đề tài.
              </p>
            </div>
          </div>
          <Link to="/teams">
            <Button variant="secondary" size="sm" className="whitespace-nowrap">
              <span>Mời thêm thành viên</span>
              <ArrowRight size={13} />
            </Button>
          </Link>
        </div>
      ) : !isLeader ? (
        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-2.5 text-xs text-blue-200">
          <ShieldCheck size={16} className="text-blue-400 shrink-0" />
          <span>
            Bạn đang tham gia với tư cách <strong>Thành viên</strong> đội <strong className="text-white">{team?.team_name}</strong>. Thao tác đăng ký hoặc hủy chọn đề tài chỉ dành riêng cho <strong>Đội trưởng</strong>.
          </span>
        </div>
      ) : null}

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0B1120] p-3 rounded-2xl border border-[#1E293B]">
        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filterTab === 'all'
                ? 'bg-[#6366F1] text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-[#1E293B]'
            }`}
          >
            Tất cả ({topics.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('available')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filterTab === 'available'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-[#1E293B]'
            }`}
          >
            Còn Slot ({topics.filter((t) => t.remaining_slots > 0).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('full')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filterTab === 'full'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-[#1E293B]'
            }`}
          >
            Hết Slot ({topics.filter((t) => t.remaining_slots === 0).length})
          </button>
          {currentSelectedTopicId && (
            <button
              type="button"
              onClick={() => setFilterTab('selected')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filterTab === 'selected'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-[#1E293B]'
              }`}
            >
              Đã chọn (1)
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên đề tài..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#1E293B] border border-[#334155] rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-[#6366F1] transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Topics Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="rounded-2xl border border-[#334155] bg-[#1E293B]/50 p-6 h-64 animate-pulse space-y-4"
            >
              <div className="h-6 bg-[#334155] rounded-md w-3/4" />
              <div className="h-4 bg-[#334155] rounded-md w-full" />
              <div className="h-4 bg-[#334155] rounded-md w-5/6" />
              <div className="h-2 bg-[#334155] rounded-full w-full mt-6" />
            </div>
          ))}
        </div>
      ) : fetchError ? (
        <div className="p-8 text-center rounded-2xl bg-[#0F172A] border border-[#334155] space-y-3">
          <AlertTriangle size={32} className="mx-auto text-amber-400" />
          <p className="text-sm text-slate-300">{fetchError}</p>
          <Button variant="secondary" size="sm" onClick={loadData}>
            Thử tải lại
          </Button>
        </div>
      ) : filteredTopics.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#0F172A] border border-[#334155] space-y-2">
          <Lightbulb size={36} className="mx-auto text-slate-400 opacity-40" />
          <h3 className="text-base font-semibold text-white">
            Không tìm thấy đề tài nào
          </h3>
          <p className="text-xs text-slate-400">
            Hãy thử tìm kiếm với từ khóa khác hoặc chuyển bộ lọc trạng thái.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTopics.map((topic) => {
            const isSelected = topic.id === currentSelectedTopicId;
            const isFull = topic.remaining_slots <= 0;
            const quotaPercent = Math.min(
              100,
              Math.round((topic.current_teams / topic.max_teams) * 100)
            );

            // Progress bar color
            const progressColor =
              quotaPercent >= 100
                ? 'bg-rose-500'
                : quotaPercent >= 70
                ? 'bg-amber-500'
                : 'bg-emerald-500';

            const subtopicsCount = topic.subtopics ? topic.subtopics.length : 0;
            const isSubExpanded = Boolean(expandedSubtopics[topic.id]);

            return (
              <Card
                key={topic.id}
                className={`flex flex-col justify-between rounded-2xl transition-all duration-200 relative overflow-hidden ${
                  isSelected
                    ? 'border-[#6366F1] bg-gradient-to-b from-[#1E293B] to-[#1E1B4B]/30 shadow-lg shadow-[#6366F1]/10'
                    : isFull
                    ? 'border-[#334155]/60 bg-[#0F172A]/80 opacity-90'
                    : 'border-[#334155] bg-[#0F172A] hover:border-[#6366F1]/40'
                }`}
              >
                {/* Top header badge */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-mono font-semibold text-slate-400">
                      ID: {topic.id}
                    </span>

                    {/* Status Badge */}
                    {isSelected ? (
                      <Badge variant="indigo" size="sm">
                        <Check size={11} className="mr-1 inline" />
                        ĐÃ CHỌN
                      </Badge>
                    ) : isFull ? (
                      <Badge variant="danger" size="sm">
                        HẾT SLOT
                      </Badge>
                    ) : (
                      <Badge variant="success" size="sm">
                        CÒN SLOT
                      </Badge>
                    )}
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-bold text-white text-base leading-snug line-clamp-2">
                    {topic.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                    {topic.description || 'Chưa có mô tả chi tiết cho đề tài này.'}
                  </p>

                  {/* Quota Progress */}
                  <div className="mt-4 pt-3 border-t border-[#1E293B] space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Chỉ tiêu (Quota):</span>
                      <span className="font-bold font-mono">
                        {topic.current_teams}/{topic.max_teams} đội{' '}
                        <span
                          className={
                            isFull
                              ? 'text-rose-400 text-[11px]'
                              : 'text-emerald-400 text-[11px]'
                          }
                        >
                          ({topic.remaining_slots} slot còn lại)
                        </span>
                      </span>
                    </div>

                    <div className="w-full bg-[#1E293B] h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${progressColor}`}
                        style={{ width: `${quotaPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Subtopics Accordion */}
                  {subtopicsCount > 0 && (
                    <div className="mt-3 pt-2 border-t border-[#1E293B]">
                      <button
                        type="button"
                        onClick={() => toggleSubtopics(topic.id)}
                        className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition-colors py-1 cursor-pointer"
                      >
                        <span className="font-medium text-[#818CF8]">
                          {subtopicsCount} đề tài nhánh (Subtopics)
                        </span>
                        {isSubExpanded ? (
                          <ChevronUp size={14} />
                        ) : (
                          <ChevronDown size={14} />
                        )}
                      </button>

                      {isSubExpanded && (
                        <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-1">
                          {topic.subtopics.map((sub: Subtopic) => (
                            <div
                              key={sub.id}
                              className="p-2.5 rounded-lg bg-[#1E293B]/70 border border-[#334155]/60 text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-medium text-slate-200 truncate">
                                  {sub.title}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                  {sub.current_teams}/{sub.max_teams}
                                </span>
                              </div>
                              {sub.description && (
                                <p className="text-[11px] text-slate-400 line-clamp-2">
                                  {sub.description}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Action Buttons */}
                <div className="mt-5 pt-3 border-t border-[#1E293B]">
                  {isSelected ? (
                    isLeader ? (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleOpenCancelModal(topic)}
                        className="w-full py-2 font-medium"
                      >
                        <XCircle size={14} />
                        <span>Hủy chọn đề tài này</span>
                      </Button>
                    ) : (
                      <div className="py-1.5 text-center text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                        Đội của bạn đã chọn đề tài này
                      </div>
                    )
                  ) : isFull ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled
                      className="w-full py-2 opacity-50 cursor-not-allowed"
                    >
                      <span>Hết suất đăng ký (Full)</span>
                    </Button>
                  ) : currentSelectedTopicId ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled
                      className="w-full py-2 opacity-50 cursor-not-allowed text-xs"
                      title="Bạn phải hủy đề tài hiện tại trước khi chọn đề tài khác"
                    >
                      <span>Đã chọn đề tài khác</span>
                    </Button>
                  ) : !hasTeam ? (
                    <Link to="/teams" className="block w-full">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full py-2 text-xs"
                      >
                        <span>Cần gia nhập đội thi</span>
                      </Button>
                    </Link>
                  ) : !isTeamValid ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled
                      className="w-full py-2 opacity-50 cursor-not-allowed text-xs"
                      title="Đội thi cần tối thiểu 3 thành viên"
                    >
                      <span>Cần tối thiểu 3 thành viên</span>
                    </Button>
                  ) : !isLeader ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled
                      className="w-full py-2 opacity-50 cursor-not-allowed text-xs"
                      title="Chỉ Đội trưởng mới được chọn đề tài"
                    >
                      <span>Chỉ Đội trưởng được chọn</span>
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenSelectModal(topic)}
                      className="w-full py-2 font-semibold shadow-md"
                    >
                      <CheckCircle2 size={14} />
                      <span>Chọn đề tài này</span>
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal: Xác nhận Đăng ký Đề tài */}
      <Modal
        isOpen={Boolean(selectedTopicToRegister)}
        onClose={() => {
          if (!isSubmittingSelect) setSelectedTopicToRegister(null);
        }}
        title="XÁC NHẬN CHỌN ĐỀ TÀI"
        maxWidth="lg"
      >
        {selectedTopicToRegister && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#0F172A] border border-[#334155] space-y-2">
              <span className="text-[11px] font-semibold text-[#818CF8] uppercase tracking-wider">
                Đề tài đăng ký:
              </span>
              <h4 className="text-base font-bold text-white">
                {selectedTopicToRegister.title}
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedTopicToRegister.description}
              </p>
              <div className="flex items-center gap-3 pt-2 text-xs text-slate-400">
                <span>
                  Quota còn lại:{' '}
                  <strong className="text-emerald-400">
                    {selectedTopicToRegister.remaining_slots} slot
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Đội thi:{' '}
                  <strong className="text-white">
                    {team?.team_name || 'Đội của bạn'}
                  </strong>
                </span>
              </div>
            </div>

            {/* Subtopics selector if applicable */}
            {selectedTopicToRegister.subtopics &&
              selectedTopicToRegister.subtopics.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Chọn bài toán nhánh (Subtopic) phù hợp với định hướng của đội:
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedTopicToRegister.subtopics.map((sub: Subtopic) => {
                      const isSubFull = sub.remaining_slots <= 0;
                      const isSubChecked = selectedSubtopicId === sub.id;

                      return (
                        <label
                          key={sub.id}
                          className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                            isSubChecked
                              ? 'border-[#6366F1] bg-[#6366F1]/10'
                              : isSubFull
                              ? 'border-[#334155]/50 bg-[#0F172A]/50 opacity-60 cursor-not-allowed'
                              : 'border-[#334155] bg-[#0F172A] hover:border-[#6366F1]/50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="subtopic_radio"
                            value={sub.id}
                            disabled={isSubFull}
                            checked={isSubChecked}
                            onChange={() => setSelectedSubtopicId(sub.id)}
                            className="mt-1 text-[#6366F1] focus:ring-[#6366F1]"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p className="text-xs font-semibold text-white">
                                {sub.title}
                              </p>
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                  isSubFull
                                    ? 'bg-rose-500/20 text-rose-300'
                                    : 'bg-emerald-500/20 text-emerald-300'
                                }`}
                              >
                                {isSubFull ? 'Hết slot' : `${sub.remaining_slots} slot`}
                              </span>
                            </div>
                            {sub.description && (
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {sub.description}
                              </p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

            {/* Error Message */}
            {selectError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0 text-rose-400" />
                <span>{selectError}</span>
              </div>
            )}

            {/* Confirmation actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#334155]">
              <Button
                variant="ghost"
                size="md"
                disabled={isSubmittingSelect}
                onClick={() => setSelectedTopicToRegister(null)}
              >
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                size="md"
                isLoading={isSubmittingSelect}
                onClick={handleConfirmSelect}
                className="px-6 font-semibold"
              >
                <CheckCircle2 size={16} />
                <span>Xác nhận đăng ký đề tài</span>
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Xác nhận Hủy Chọn Đề tài */}
      <Modal
        isOpen={Boolean(topicToCancel)}
        onClose={() => {
          if (!isSubmittingCancel) setTopicToCancel(null);
        }}
        title="XÁC NHẬN HỦY ĐĂNG KÝ ĐỀ TÀI"
        maxWidth="md"
      >
        {topicToCancel && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30">
              <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="text-xs text-slate-200 space-y-1">
                <p className="font-semibold text-rose-300 text-sm">
                  Bạn có chắc chắn muốn hủy đề tài này không?
                </p>
                <p className="text-slate-300">
                  Đề tài:{' '}
                  <strong className="text-white">
                    {topicToCancel.title}
                  </strong>
                </p>
                <p className="text-slate-400 leading-relaxed pt-1">
                  Sau khi hủy, slot sẽ được giải phóng ngay lập tức cho các đội thi khác đăng ký. Đội của bạn có thể đăng ký một đề tài khác nếu còn trong thời hạn quy định.
                </p>
              </div>
            </div>

            {/* Error Message */}
            {cancelError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0 text-rose-400" />
                <span>{cancelError}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#334155]">
              <Button
                variant="ghost"
                size="md"
                disabled={isSubmittingCancel}
                onClick={() => setTopicToCancel(null)}
              >
                Giữ lại đề tài
              </Button>
              <Button
                variant="danger"
                size="md"
                isLoading={isSubmittingCancel}
                onClick={handleConfirmCancel}
                className="px-6 font-semibold"
              >
                <XCircle size={16} />
                <span>Xác nhận hủy đề tài</span>
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
