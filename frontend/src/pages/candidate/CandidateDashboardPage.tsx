import React from 'react';
import { useMockStore } from '../../store/useMockStore';
import { CountdownTimer } from '../../components/common/CountdownTimer';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Lightbulb,
  CheckSquare,
  HelpCircle,
  ArrowRight,
  Send,
  Sparkles,
  GitBranch,
  ShieldCheck,
  Megaphone,
} from 'lucide-react';

export const CandidateDashboardPage: React.FC = () => {
  const { currentUser, teams, majorTopics, checkpoints, submissions, config, announcements } =
    useMockStore();
  const navigate = useNavigate();

  // Find candidate's team
  const myTeam = teams.find((t) => t.id === currentUser.teamId);

  // Find selected topic details
  let selectedTopicTitle = 'Chưa đăng ký đề tài';
  let majorTopicName = 'Chưa chọn';
  if (myTeam?.subTopicId) {
    for (const mt of majorTopics) {
      const sub = mt.subTopics.find((s) => s.id === myTeam.subTopicId);
      if (sub) {
        selectedTopicTitle = sub.title;
        majorTopicName = mt.name;
        break;
      }
    }
  }

  // Count submissions
  const teamSubmissions = submissions.filter((s) => s.teamId === myTeam?.id);

  // Next active checkpoint
  const nextCheckpoint = checkpoints.find((cp) => {
    const isSubmitted = teamSubmissions.some((s) => s.checkpointId === cp.id);
    return !isSubmitted;
  }) || checkpoints[checkpoints.length - 1];

  return (
    <div className="space-y-6 font-['Roboto']">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-[16px] border border-[#334155] bg-[#1E293B] p-6 lg:p-8">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#6366F1]/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#818CF8]">
                {config.name}
              </span>
              <span className="text-slate-500">•</span>
              <Badge variant="indigo">
                {currentUser.teamRole === 'leader' ? 'Đội Trưởng (Leader)' : 'Thành Viên (Member)'}
              </Badge>
            </div>
            <h1
              className="font-['Righteous'] text-2xl sm:text-3xl lg:text-4xl tracking-wide"
              style={{
                background: 'linear-gradient(90deg, #6366F1 0%, #FAFBFF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Xin chào, {currentUser.fullName}!
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Bạn đang tham gia cùng đội{' '}
              <strong className="text-white font-semibold">{myTeam ? myTeam.name : 'Chưa có đội'}</strong>.
              Hiện tại cuộc thi đang ở{' '}
              <span className="text-[#818CF8] font-medium">{config.currentPhase}</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              onClick={() => navigate('/checkpoints')}
              className="gap-2 shadow-lg shadow-[#6366F1]/25"
            >
              <CheckSquare size={16} />
              <span>Nộp Checkpoint</span>
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate('/tickets')}
              className="gap-2"
            >
              <HelpCircle size={16} />
              <span>Yêu cầu Mentor</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Countdown Timer Component */}
      <CountdownTimer
        targetDate={config.finalSubmissionDeadline}
        title="Đếm ngược đến Hạn Chót Nộp Bài Chung Cuộc"
        subtitle={`Thời hạn đóng cổng: ${new Date(config.finalSubmissionDeadline).toLocaleString('vi-VN')}`}
      />

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Đội thi của bạn"
          value={myTeam ? myTeam.name : 'Chưa có'}
          subtitle={
            myTeam
              ? `${myTeam.members.length}/4 thành viên • Mã: ${myTeam.inviteCode}`
              : 'Hãy tạo hoặc tham gia đội'
          }
          icon={<Users size={24} />}
          iconColor="indigo"
          onClick={() => navigate('/teams')}
        />

        <StatCard
          title="Đề tài nghiên cứu"
          value={myTeam?.subTopicId ? 'Đã đăng ký' : 'Chưa đăng ký'}
          subtitle={selectedTopicTitle}
          icon={<Lightbulb size={24} />}
          iconColor="emerald"
          onClick={() => navigate('/topics')}
        />

        <StatCard
          title="Tiến độ Checkpoints"
          value={`${teamSubmissions.length}/${checkpoints.length}`}
          subtitle={`Kế tiếp: ${nextCheckpoint?.title.slice(0, 24)}...`}
          icon={<CheckSquare size={24} />}
          iconColor="amber"
          onClick={() => navigate('/checkpoints')}
        />

        <StatCard
          title="Trạng thái Đội thi"
          value={myTeam?.status === 'approved' ? 'Hợp lệ' : 'Đang duyệt'}
          subtitle="Được phép dự thi và nộp mã nguồn"
          icon={<ShieldCheck size={24} />}
          iconColor="purple"
          onClick={() => navigate('/teams')}
        />
      </div>

      {/* Grid: Selected Topic & Checkpoint Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Topic & Team quick view */}
        <div className="lg:col-span-2 space-y-6">
          {/* Selected Topic Card */}
          <div className="rounded-[14px] border border-[#334155] bg-[#1E293B] p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
              <div className="flex items-center gap-2">
                <Lightbulb size={20} className="text-[#818CF8]" />
                <h3 className="font-['Righteous'] text-lg text-white">
                  Đề Tài Nghiên Cứu Đã Chọn
                </h3>
              </div>
              <Badge variant="indigo">{majorTopicName}</Badge>
            </div>

            <div className="space-y-2">
              <h4 className="text-base font-bold text-white">{selectedTopicTitle}</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Đề tài áp dụng các thuật toán Deep Learning / Generative AI để giải quyết bài toán thực tế. Đội thi cần nộp mã nguồn và tài liệu qua từng Checkpoint.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between pt-2 text-xs text-slate-400 border-t border-[#334155]/60 gap-3">
              <div className="flex items-center gap-2">
                <span>Cố vấn phụ trách lĩnh vực:</span>
                <span className="font-semibold text-white">Dr. Lê Quang (VinUni AI Lab)</span>
              </div>
              <button
                onClick={() => navigate('/topics')}
                className="text-[#818CF8] hover:text-white font-medium flex items-center gap-1"
              >
                <span>Xem thông tin chi tiết đề tài</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Checkpoint Milestones Progress Bar */}
          <div className="rounded-[14px] border border-[#334155] bg-[#1E293B] p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
              <div className="flex items-center gap-2">
                <CheckSquare size={20} className="text-amber-400" />
                <h3 className="font-['Righteous'] text-lg text-white">
                  Các Mốc Checkpoint Bắt Buộc
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                Đã hoàn thành {teamSubmissions.length} trên {checkpoints.length}
              </span>
            </div>

            <div className="space-y-3">
              {checkpoints.map((cp, idx) => {
                const isSubmitted = teamSubmissions.some((s) => s.checkpointId === cp.id);
                const sub = teamSubmissions.find((s) => s.checkpointId === cp.id);

                return (
                  <div
                    key={cp.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-[10px] bg-[#0F172A] border border-[#334155]"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          isSubmitted
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{cp.title}</p>
                        <p className="text-xs text-slate-400">
                          Hạn chót: {new Date(cp.deadline).toLocaleDateString('vi-VN')} • Trọng số: {cp.weight}%
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isSubmitted ? (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                          <GitBranch size={13} />
                          <span>SHA: {sub?.commitSha.slice(0, 7)}</span>
                        </div>
                      ) : (
                        <Badge variant="warning">Chưa nộp</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Announcements & Quick Info */}
        <div className="space-y-6">
          {/* Announcements Card */}
          <div className="rounded-[14px] border border-[#334155] bg-[#1E293B] p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
              <div className="flex items-center gap-2">
                <Megaphone size={18} className="text-[#818CF8]" />
                <h3 className="font-['Righteous'] text-lg text-white">
                  Thông Báo Cuộc Thi
                </h3>
              </div>
              <Badge variant="indigo">{announcements.length}</Badge>
            </div>

            <div className="space-y-3">
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  className="rounded-[10px] bg-[#0F172A] border border-[#334155] p-3 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{ann.title}</span>
                    <span className="text-[10px] text-slate-400">{ann.createdAt}</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{ann.content}</p>
                  <span className="text-[10px] text-[#818CF8] font-medium block">
                    {ann.sender}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Help Card */}
          <div className="rounded-[14px] border border-[#334155] bg-[#1E293B] p-6 space-y-3">
            <h4 className="font-['Righteous'] text-base text-white">Cần Hỗ Trợ Kỹ Thuật?</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Bạn có thể tạo Ticket gửi trực tiếp tới các Cố vấn (Mentor) thuộc lĩnh vực của bạn để được hỗ trợ giải đáp thắc mắc về dữ liệu, API hoặc tiêu chí.
            </p>
            <Button
              variant="outline"
              onClick={() => navigate('/tickets')}
              className="w-full text-xs justify-center"
            >
              Gửi Ticket Yêu Cầu Hỗ Trợ
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
