import React, { useState } from 'react';
import { useMockStore } from '../../store/useMockStore';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { RaceConditionModal } from '../../components/common/RaceConditionModal';
import {
  Lightbulb,
  CheckCircle2,
  Users,
  GraduationCap,
  ShieldAlert,
  Zap,
  Lock,
  RotateCcw,
} from 'lucide-react';

export const CandidateTopicsPage: React.FC = () => {
  const { currentUser, teams, majorTopics, selectTopicForTeam, cancelTopicForTeam } =
    useMockStore();

  const [isRaceModalOpen, setIsRaceModalOpen] = useState(false);
  const [selectedSubTopicForModal, setSelectedSubTopicForModal] = useState<string | undefined>();
  const [actionAlert, setActionAlert] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const myTeam = teams.find((t) => t.id === currentUser.teamId);
  const isLeader = currentUser.teamRole === 'leader' || myTeam?.leaderId === currentUser.id;

  const handleSelectTopic = (subTopicId: string) => {
    if (!myTeam) {
      setActionAlert({ message: 'Bạn cần gia nhập hoặc tạo một đội trước khi đăng ký đề tài.', type: 'error' });
      return;
    }
    if (!isLeader) {
      setActionAlert({ message: 'Chỉ Đội Trưởng mới có quyền lựa chọn đề tài cho cả đội.', type: 'error' });
      return;
    }

    const res = selectTopicForTeam(myTeam.id, subTopicId);
    if (res.success) {
      setActionAlert({ message: res.message, type: 'success' });
    } else {
      setActionAlert({ message: res.message, type: 'error' });
    }
  };

  const handleCancelTopic = () => {
    if (!myTeam) return;
    if (window.confirm('Bạn có chắc chắn muốn hủy đăng ký đề tài hiện tại để chọn lại?')) {
      const res = cancelTopicForTeam(myTeam.id);
      setActionAlert({ message: res.message, type: 'success' });
    }
  };

  const openRaceCondition = (subTitle: string) => {
    setSelectedSubTopicForModal(subTitle);
    setIsRaceModalOpen(true);
  };

  return (
    <div className="space-y-6 ">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="font-semibold tracking-tight text-foreground text-2xl sm:text-3xl tracking-wide"
          >
            Đăng Ký & Lựa Chọn Đề Tài
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Mỗi đề tài nhánh có giới hạn số lượng đăng ký tối đa. Hệ thống áp dụng cơ chế khóa phân tán bảo vệ suất đăng ký theo thời gian thực.
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={() => openRaceCondition('Hệ thống AI Tự Động Phân Loại Bệnh Án')}
          className="gap-2 border-[#6366F1]/50 text-primary hover:bg-[#6366F1]/10"
        >
          <Zap size={16} />
          <span>Mô phỏng Tranh chấp Đề tài</span>
        </Button>
      </div>

      {actionAlert && (
        <div
          className={`p-3.5 rounded-[10px] text-xs font-medium border flex items-center justify-between ${
            actionAlert.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
          }`}
        >
          <span>{actionAlert.message}</span>
          <button onClick={() => setActionAlert(null)} className="text-muted-foreground hover:text-foreground">
            &times;
          </button>
        </div>
      )}

      {/* Current Team Selection Banner */}
      {myTeam && myTeam.subTopicId ? (
        <div className="rounded-[16px] border border-emerald-500/40 bg-emerald-500/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-semibold block">
                Đội của bạn đã đăng ký thành công đề tài:
              </span>
              <span className="text-base font-bold text-foreground">
                {majorTopics
                  .flatMap((m) => m.subTopics)
                  .find((s) => s.id === myTeam.subTopicId)?.title}
              </span>
            </div>
          </div>

          {isLeader && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelTopic}
              className="gap-1.5 border-rose-500/40 text-rose-700 dark:text-rose-400 hover:bg-rose-500/10"
            >
              <RotateCcw size={14} />
              <span>Hủy để chọn lại</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-[12px] border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2.5">
          <ShieldAlert size={18} className="shrink-0" />
          <span>
            {myTeam
              ? isLeader
                ? 'Đội của bạn chưa chọn đề tài. Hãy duyệt danh sách bên dưới và chọn 1 đề tài phù hợp trước thời hạn đóng cổng.'
                : 'Đội của bạn chưa chọn đề tài. Vui lòng liên hệ Đội Trưởng để đăng ký.'
              : 'Bạn chưa tham gia đội thi nào. Hãy vào mục "Đội thi của tôi" để lập đội trước khi đăng ký đề tài.'}
          </span>
        </div>
      )}

      {/* 4 Major Topics Container */}
      <div className="space-y-8">
        {majorTopics.map((major) => (
          <div key={major.id} className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6366F1]/20 text-primary font-bold text-sm">
                  <Lightbulb size={18} />
                </div>
                <div>
                  <h3 className="font-semibold tracking-tight text-foreground text-xl text-foreground tracking-wide">
                    {(major.name || major.title || '').replace(/\s*&\s*/g, ' và ')}
                  </h3>
                  <p className="text-xs text-muted-foreground">{major.description}</p>
                </div>
              </div>
              <Badge variant="indigo">{major.subTopics.length} đề tài nhánh</Badge>
            </div>

            {/* SubTopics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {major.subTopics.map((sub) => {
                const isSelectedByMyTeam = myTeam?.subTopicId === sub.id || myTeam?.topicId === sub.id;
                const registeredCount = sub.registeredTeamsCount ?? sub.currentTeams ?? 0;
                const quotaCount = sub.quota ?? sub.maxTeamsQuota ?? 3;
                const isFull = registeredCount >= quotaCount;
                const percentage = Math.round((registeredCount / quotaCount) * 100);

                return (
                  <div
                    key={sub.id}
                    className={`rounded-[14px] border p-5 transition-all flex flex-col justify-between ${
                      isSelectedByMyTeam
                        ? 'bg-card border-emerald-500 shadow-lg shadow-emerald-500/10'
                        : 'bg-card border-border hover:border-[#6366F1]/50'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-base text-foreground leading-snug">
                          {sub.title}
                        </h4>
                        {isSelectedByMyTeam && (
                          <Badge variant="success">Đã Đăng Ký</Badge>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {sub.description}
                      </p>

                      {/* Mentor badge */}
                      {sub.mentorName && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <GraduationCap size={14} className="text-primary" />
                          <span>Cố vấn chuyên môn:</span>
                          <span className="font-medium text-foreground">{sub.mentorName}</span>
                        </div>
                      )}
                    </div>

                    {/* Quota Progress Bar & Registration */}
                    <div className="mt-5 pt-4 border-t border-border space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Users size={13} />
                          <span>Số lượng đội đã đăng ký</span>
                        </span>
                        <span
                          className={`font-semibold ${
                            isFull ? 'text-rose-700 dark:text-rose-400' : 'text-foreground'
                          }`}
                        >
                          {registeredCount} / {quotaCount} đội {isFull && '(ĐÃ ĐẦY)'}
                        </span>
                      </div>

                      {/* Progress Track */}
                      <div className="h-1.5 w-full bg-muted/40 dark:bg-slate-900/60 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isFull
                              ? 'bg-rose-500'
                              : percentage >= 66
                              ? 'bg-amber-500'
                              : 'bg-[#6366F1]'
                          }`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>

                      {/* Action Button */}
                      <div className="pt-1">
                        {isSelectedByMyTeam ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled
                            className="w-full justify-center !bg-emerald-500/10 !border-emerald-500/30 !text-emerald-700 dark:text-emerald-400"
                          >
                            <CheckCircle2 size={15} />
                            <span>Đội của bạn đang giữ đề tài này</span>
                          </Button>
                        ) : (
                          <Button
                            variant={isFull ? 'secondary' : 'primary'}
                            size="sm"
                            disabled={isFull || !isLeader || Boolean(myTeam?.subTopicId)}
                            onClick={() => handleSelectTopic(sub.id)}
                            className="w-full justify-center"
                          >
                            {isFull ? (
                              <>
                                <Lock size={14} />
                                <span>Đã hết suất đăng ký</span>
                              </>
                            ) : myTeam?.subTopicId ? (
                              <span>Đã chọn đề tài khác</span>
                            ) : !isLeader ? (
                              <span>Chỉ Đội Trưởng mới được chọn</span>
                            ) : (
                              <span>Đăng ký đề tài này</span>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Race Condition Modal */}
      <RaceConditionModal
        isOpen={isRaceModalOpen}
        onClose={() => setIsRaceModalOpen(false)}
        subTopicTitle={selectedSubTopicForModal}
      />
    </div>
  );
};
