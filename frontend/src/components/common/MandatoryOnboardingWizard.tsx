import React, { useState, useEffect } from 'react';
import { useMockStore } from '../../store/useMockStore';
import { Button } from '../Button';
import { Badge } from '../Badge';
import {
  CheckCircle2,
  AlertCircle,
  Users,
  Lightbulb,
  FileCheck,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  Lock,
  Scale,
  Settings,
  EyeOff,
  Check,
  GraduationCap,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const MandatoryOnboardingWizard: React.FC = () => {
  const {
    currentUser,
    updateCurrentUserProfile,
    teams,
    createTeam,
    joinTeamWithCode,
    majorTopics,
    selectTopicForTeam,
    rubricCriteria,
    rebalanceRubricWeights,
    config,
    updateConfig,
    toggleBlindJudging,
    isWizardOpen,
    setWizardOpen,
    wizardStep,
    openWizardAtStep,
    onboardingCompletedUsers,
    pledgedUsers,
    finishUserOnboarding,
    setUserPledge,
  } = useMockStore();

  const navigate = useNavigate();

  // Find candidate's team if any
  const myTeam = teams.find((t) => t.id === currentUser.teamId);
  const isLeader = myTeam?.leaderId === currentUser.id;

  // Local state for candidate forms
  const [profileForm, setProfileForm] = useState({
    fullName: currentUser.fullName || '',
    studentId: currentUser.studentId || '',
    school: currentUser.school || currentUser.university || 'Đại học Bách Khoa Hà Nội',
    phone: currentUser.phone || '',
    skills: (currentUser.skills || ['Python', 'React', 'Docker']).join(', '),
  });

  const [teamMode, setTeamMode] = useState<'join' | 'create'>('join');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [createTeamForm, setCreateTeamForm] = useState({
    name: '',
    description: '',
  });

  const [selectedSubTopicId, setSelectedSubTopicId] = useState<string>(
    myTeam?.topicId || myTeam?.subTopicId || ''
  );

  const [pledgeChecked, setPledgeChecked] = useState(!!pledgedUsers[currentUser.id]);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Sync profile when currentUser changes
  useEffect(() => {
    setProfileForm({
      fullName: currentUser.fullName || '',
      studentId: currentUser.studentId || '',
      school: currentUser.school || currentUser.university || 'Đại học Bách Khoa Hà Nội',
      phone: currentUser.phone || '',
      skills: (currentUser.skills || ['Python', 'React', 'Docker']).join(', '),
    });
    if (myTeam?.topicId || myTeam?.subTopicId) {
      setSelectedSubTopicId(myTeam.topicId || myTeam.subTopicId || '');
    }
  }, [currentUser, myTeam]);

  // Candidate step completions
  const [topicSkipped, setTopicSkipped] = useState(false);
  const isCandidateStep1Done = Boolean(
    currentUser.studentId && currentUser.school && currentUser.phone
  );
  const isCandidateStep2Done = Boolean(currentUser.teamId && myTeam);
  const isCandidateStep3Done = Boolean(myTeam?.topicId || myTeam?.subTopicId || topicSkipped);
  const isCandidateStep4Done = Boolean(pledgedUsers[currentUser.id]);

  // Overall check
  const isCompleted = !!onboardingCompletedUsers[currentUser.id];

  // Calculate current active step for Candidate (1 to 4)
  const calculateCandidateNextStep = () => {
    if (!isCandidateStep1Done) return 1;
    if (!isCandidateStep2Done) return 2;
    if (!isCandidateStep3Done && !topicSkipped) return 3;
    if (!isCandidateStep4Done) return 4;
    return 4;
  };

  const handleNextStep = () => {
    setFeedbackMsg(null);
    if (wizardStep < 4) {
      openWizardAtStep(wizardStep + 1);
    }
  };

  const handlePrevStep = () => {
    setFeedbackMsg(null);
    if (wizardStep > 1) {
      openWizardAtStep(wizardStep - 1);
    }
  };

  // Step 1: Save Profile
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.studentId.trim() || !profileForm.school.trim() || !profileForm.phone.trim()) {
      setFeedbackMsg({ text: 'Vui lòng điền đầy đủ Mã số sinh viên, Trường học và Số điện thoại.', type: 'error' });
      return;
    }
    const skillList = profileForm.skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    updateCurrentUserProfile({
      fullName: profileForm.fullName,
      studentId: profileForm.studentId,
      school: profileForm.school,
      university: profileForm.school,
      phone: profileForm.phone,
      skills: skillList,
    });

    setFeedbackMsg({ text: 'Đã lưu thông tin hồ sơ sinh viên thành công!', type: 'success' });
    setTimeout(() => {
      setFeedbackMsg(null);
      openWizardAtStep(2);
    }, 600);
  };

  // Step 2: Join or Create Team
  const handleJoinTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCodeInput.trim()) {
      setFeedbackMsg({ text: 'Vui lòng nhập mã mời đội thi.', type: 'error' });
      return;
    }
    const res = joinTeamWithCode(inviteCodeInput.trim());
    if (res.success) {
      setFeedbackMsg({ text: res.message, type: 'success' });
      setTimeout(() => {
        setFeedbackMsg(null);
        openWizardAtStep(3);
      }, 700);
    } else {
      setFeedbackMsg({ text: res.message, type: 'error' });
    }
  };

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTeamForm.name.trim()) {
      setFeedbackMsg({ text: 'Vui lòng nhập tên đội thi.', type: 'error' });
      return;
    }
    const res = createTeam(createTeamForm.name.trim(), createTeamForm.description.trim());
    if (res.success) {
      setFeedbackMsg({ text: res.message, type: 'success' });
      setTimeout(() => {
        setFeedbackMsg(null);
        openWizardAtStep(3);
      }, 700);
    } else {
      setFeedbackMsg({ text: res.message, type: 'error' });
    }
  };

  // Step 3: Select Topic
  const handleSelectTopic = (subTopicId: string) => {
    if (!myTeam) return;
    const res = selectTopicForTeam(myTeam.id, subTopicId);
    if (res.success) {
      setSelectedSubTopicId(subTopicId);
      setFeedbackMsg({ text: res.message, type: 'success' });
      setTimeout(() => {
        setFeedbackMsg(null);
        openWizardAtStep(4);
      }, 700);
    } else {
      setFeedbackMsg({ text: res.message, type: 'error' });
    }
  };

  // Step 4: Pledge & Finish
  const handleFinishOnboarding = () => {
    if (!pledgeChecked) {
      setFeedbackMsg({ text: 'Bạn cần tích chọn xác nhận cam kết quy chế thi đấu.', type: 'error' });
      return;
    }
    setUserPledge(currentUser.id, true);
    finishUserOnboarding(currentUser.id);
    setFeedbackMsg({ text: '🎉 Chúc mừng! Bạn đã hoàn thành toàn bộ thiết lập ban đầu!', type: 'success' });
    setTimeout(() => {
      setWizardOpen(false);
      navigate('/dashboard');
    }, 1200);
  };

  // Don't render modal if closed
  if (!isWizardOpen) {
    return null;
  }

  // Define steps per role
  const candidateSteps = [
    { num: 1, title: 'Hồ sơ sinh viên', isDone: isCandidateStep1Done, icon: UserCheck },
    { num: 2, title: 'Ghép đội thi', isDone: isCandidateStep2Done, icon: Users },
    { num: 3, title: 'Đăng ký đề tài', isDone: isCandidateStep3Done, icon: Lightbulb },
    { num: 4, title: 'Cam kết thi đấu', isDone: isCandidateStep4Done, icon: FileCheck },
  ];

  const adminSteps = [
    { num: 1, title: 'Cấu hình giải đấu', isDone: true, icon: Settings },
    { num: 2, title: 'Cân bằng tiêu chí', isDone: true, icon: Scale },
    { num: 3, title: 'Bảo mật & Ẩn danh', isDone: true, icon: EyeOff },
  ];

  const judgeSteps = [
    { num: 1, title: 'Hồ sơ chuyên gia', isDone: true, icon: GraduationCap },
    { num: 2, title: 'Cam kết độc lập (NDA)', isDone: true, icon: ShieldAlert },
    { num: 3, title: 'Nắm vững Rubric', isDone: true, icon: FileCheck },
  ];

  const mentorSteps = [
    { num: 1, title: 'Lĩnh vực cố vấn', isDone: true, icon: GraduationCap },
    { num: 2, title: 'Quy tắc hỗ trợ (SLA)', isDone: true, icon: HelpCircle },
  ];

  const currentRoleSteps =
    currentUser.role === 'admin'
      ? adminSteps
      : currentUser.role === 'judge'
      ? judgeSteps
      : currentUser.role === 'mentor'
      ? mentorSteps
      : candidateSteps;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-['Roboto'] overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-[18px] border border-[#334155] bg-[#1E293B] shadow-2xl overflow-hidden my-8">
        {/* Glow accent */}
        <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#6366F1]/15 blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-[#334155] flex items-center justify-between bg-[#141E33]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#818CF8]">
                Bắt Buộc Khi Đăng Nhập Lần Đầu
              </span>
              <span className="text-slate-500">•</span>
              <Badge variant="indigo">
                {currentUser.role === 'candidate'
                  ? 'Thí Sinh'
                  : currentUser.role === 'admin'
                  ? 'Ban Quản Trị'
                  : currentUser.role === 'judge'
                  ? 'Ban Giám Khảo'
                  : 'Cố Vấn'}
              </Badge>
            </div>
            <h2
              className="font-['Righteous'] text-xl sm:text-2xl tracking-wide text-white mt-0.5"
              style={{
                background: 'linear-gradient(90deg, #6366F1 0%, #FAFBFF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Lộ Trình Thiết Lập Ban Đầu
            </h2>
          </div>

          <button
            onClick={() => setWizardOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E293B] transition-colors"
            title="Đóng (sẽ nhắc lại khi cần)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="px-6 pt-5 pb-3 bg-[#0F172A] border-b border-[#334155]">
          <div className="flex items-center justify-between">
            {currentRoleSteps.map((st, idx) => {
              const IconComp = st.icon;
              const isActive = wizardStep === st.num;
              const isDone = st.isDone;

              return (
                <React.Fragment key={st.num}>
                  <button
                    onClick={() => openWizardAtStep(st.num)}
                    className="flex flex-col items-center gap-1.5 focus:outline-none group text-left"
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all ${
                        isDone
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : isActive
                          ? 'bg-[#6366F1] text-white ring-4 ring-[#6366F1]/20 shadow-lg shadow-[#6366F1]/30'
                          : 'bg-[#1E293B] text-slate-400 border border-[#334155]'
                      }`}
                    >
                      {isDone ? <Check size={16} /> : st.num}
                    </div>
                    <span
                      className={`text-[11px] font-medium hidden sm:block ${
                        isActive ? 'text-white font-bold' : isDone ? 'text-emerald-400' : 'text-slate-400'
                      }`}
                    >
                      {st.title}
                    </span>
                  </button>

                  {idx < currentRoleSteps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 rounded ${
                        st.isDone ? 'bg-emerald-500/50' : 'bg-[#334155]'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Notification Feedback Toast */}
        {feedbackMsg && (
          <div
            className={`mx-6 mt-4 p-3 rounded-[10px] text-xs font-medium flex items-center gap-2 border animate-in fade-in ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
            }`}
          >
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 size={16} className="shrink-0" />
            ) : (
              <AlertCircle size={16} className="shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Step Body */}
        <div className="p-6">
          {/* ========================================================
              CANDIDATE ROLE STEPS
             ======================================================== */}
          {currentUser.role === 'candidate' && (
            <>
              {/* STEP 1: Candidate Profile */}
              {wizardStep === 1 && (
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-['Righteous'] text-lg text-white">
                      Bước 1: Hoàn Thiện Hồ Sơ Sinh Viên
                    </h3>
                    <p className="text-xs text-slate-300">
                      Thông tin này được dùng để xác minh tư cách sinh viên tham dự giải đấu và trao giải.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-slate-300 font-medium">Họ và tên đầy đủ *</label>
                      <input
                        type="text"
                        value={profileForm.fullName}
                        onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                        required
                        className="w-full px-3 py-2 rounded-[8px] bg-[#0F172A] border border-[#334155] text-white focus:border-[#6366F1] focus:outline-none"
                        placeholder="Nguyễn Văn A"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-300 font-medium">Mã số sinh viên (MSSV) *</label>
                      <input
                        type="text"
                        value={profileForm.studentId}
                        onChange={(e) => setProfileForm({ ...profileForm, studentId: e.target.value })}
                        required
                        className="w-full px-3 py-2 rounded-[8px] bg-[#0F172A] border border-[#334155] text-white focus:border-[#6366F1] focus:outline-none"
                        placeholder="Ví dụ: 20210001"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-300 font-medium">Số điện thoại liên hệ *</label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        required
                        className="w-full px-3 py-2 rounded-[8px] bg-[#0F172A] border border-[#334155] text-white focus:border-[#6366F1] focus:outline-none"
                        placeholder="0912345678"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-slate-300 font-medium">Trường đại học / Học viện *</label>
                      <input
                        type="text"
                        value={profileForm.school}
                        onChange={(e) => setProfileForm({ ...profileForm, school: e.target.value })}
                        required
                        className="w-full px-3 py-2 rounded-[8px] bg-[#0F172A] border border-[#334155] text-white focus:border-[#6366F1] focus:outline-none"
                        placeholder="Đại học Bách Khoa Hà Nội"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-slate-300 font-medium">Kỹ năng chuyên môn (cách nhau bởi dấu phẩy)</label>
                      <input
                        type="text"
                        value={profileForm.skills}
                        onChange={(e) => setProfileForm({ ...profileForm, skills: e.target.value })}
                        className="w-full px-3 py-2 rounded-[8px] bg-[#0F172A] border border-[#334155] text-white focus:border-[#6366F1] focus:outline-none"
                        placeholder="React, TypeScript, Python, Docker..."
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#334155] flex justify-end">
                    <Button type="submit" variant="primary" className="gap-2">
                      <span>Lưu Hồ Sơ & Tiếp Tục</span>
                      <ArrowRight size={16} />
                    </Button>
                  </div>
                </form>
              )}

              {/* STEP 2: Candidate Team (Join or Create) */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-['Righteous'] text-lg text-white">
                      Bước 2: Ghép Đội Thi Đấu (Bắt Buộc)
                    </h3>
                    <p className="text-xs text-slate-300">
                      Mỗi thí sinh bắt buộc phải thuộc một đội thi (từ 3 đến 5 thành viên) để được cấp quyền nộp bài các chặng.
                    </p>
                  </div>

                  {/* If user is already in a team */}
                  {myTeam ? (
                    <div className="rounded-[12px] bg-[#0F172A] border border-emerald-500/30 p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={20} className="text-emerald-400" />
                          <span className="font-['Righteous'] text-base text-white">{myTeam.name}</span>
                        </div>
                        <Badge variant="success">Đã gia nhập đội</Badge>
                      </div>
                      <p className="text-xs text-slate-300">{myTeam.description || 'Đội thi công nghệ HackFlow 2026'}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-400 pt-2 border-t border-[#334155]">
                        <span>Thành viên: <strong className="text-white">{myTeam.members.length}/4</strong></span>
                        <span>Mã mời đội: <strong className="font-mono text-[#818CF8]">{myTeam.inviteCode}</strong></span>
                        <span>Vai trò: <strong className="text-emerald-300">{isLeader ? 'Đội trưởng' : 'Thành viên'}</strong></span>
                      </div>
                    </div>
                  ) : (
                    /* User not in team: choose Join or Create */
                    <div className="space-y-4">
                      {/* Sub-tabs */}
                      <div className="flex border-b border-[#334155]">
                        <button
                          type="button"
                          onClick={() => setTeamMode('join')}
                          className={`flex-1 py-2 text-xs font-bold border-b-2 transition-colors ${
                            teamMode === 'join'
                              ? 'border-[#6366F1] text-white'
                              : 'border-transparent text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Nhập Mã Mời Vào Đội
                        </button>
                        <button
                          type="button"
                          onClick={() => setTeamMode('create')}
                          className={`flex-1 py-2 text-xs font-bold border-b-2 transition-colors ${
                            teamMode === 'create'
                              ? 'border-[#6366F1] text-white'
                              : 'border-transparent text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Tạo Đội Thi Mới (Làm Đội Trưởng)
                        </button>
                      </div>

                      {teamMode === 'join' ? (
                        <form onSubmit={handleJoinTeam} className="space-y-3 text-xs">
                          <div className="space-y-1.5">
                            <label className="text-slate-300 font-medium">Nhập mã mời do Đội trưởng cung cấp *</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={inviteCodeInput}
                                onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                                placeholder="Ví dụ: HF2026"
                                className="flex-1 px-3 py-2 rounded-[8px] bg-[#0F172A] border border-[#334155] text-white font-mono uppercase focus:border-[#6366F1] focus:outline-none"
                              />
                              <Button type="submit" variant="primary">
                                Gia Nhập Đội
                              </Button>
                            </div>
                          </div>

                          <div className="p-3 rounded-[8px] bg-[#0B1120] border border-[#334155] flex items-center justify-between">
                            <span className="text-slate-400">Bạn muốn thử nghiệm ngay?</span>
                            <button
                              type="button"
                              onClick={() => setInviteCodeInput('HF2026')}
                              className="text-[#818CF8] hover:underline font-semibold"
                            >
                              Dùng mã mẫu: HF2026 (TechTitans)
                            </button>
                          </div>
                        </form>
                      ) : (
                        <form onSubmit={handleCreateTeam} className="space-y-3 text-xs">
                          <div className="space-y-1.5">
                            <label className="text-slate-300 font-medium">Tên đội thi của bạn *</label>
                            <input
                              type="text"
                              value={createTeamForm.name}
                              onChange={(e) => setCreateTeamForm({ ...createTeamForm, name: e.target.value })}
                              placeholder="Ví dụ: CyberGuardians"
                              className="w-full px-3 py-2 rounded-[8px] bg-[#0F172A] border border-[#334155] text-white focus:border-[#6366F1] focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-slate-300 font-medium">Mô tả ý tưởng định hướng</label>
                            <textarea
                              rows={2}
                              value={createTeamForm.description}
                              onChange={(e) => setCreateTeamForm({ ...createTeamForm, description: e.target.value })}
                              placeholder="Ý tưởng dự án bạn dự định triển khai..."
                              className="w-full px-3 py-2 rounded-[8px] bg-[#0F172A] border border-[#334155] text-white focus:border-[#6366F1] focus:outline-none"
                            />
                          </div>

                          <Button type="submit" variant="primary" className="w-full">
                            Tạo Đội Thi & Nhận Mã Mời
                          </Button>
                        </form>
                      )}
                    </div>
                  )}

                  <div className="pt-3 border-t border-[#334155] flex justify-between">
                    <Button variant="secondary" onClick={handlePrevStep} className="gap-2">
                      <ArrowLeft size={16} />
                      <span>Quay lại</span>
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleNextStep}
                      disabled={!myTeam}
                      className="gap-2 disabled:opacity-40"
                    >
                      <span>Tiếp tục Bước 3</span>
                      <ArrowRight size={16} />
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 3: Topic Selection */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-['Righteous'] text-lg text-white">
                        Bước 3: Lựa Chọn Đề Tài Thi Đấu
                      </h3>
                      <Badge variant="neutral" className="text-[10px]">Có thể chọn sau</Badge>
                    </div>
                    <p className="text-xs text-slate-300">
                      Mỗi đề tài có giới hạn hạn ngạch tối đa 10 đội. Đội của bạn có thể thảo luận và đăng ký sau tại trang Đề tài trước hạn chót.
                    </p>
                  </div>

                  {/* Quick skip notice banner */}
                  <div className="p-3 rounded-[10px] bg-indigo-500/10 border border-indigo-500/30 flex flex-wrap items-center justify-between gap-2 text-xs text-indigo-200">
                    <div className="flex items-center gap-2">
                      <span className="text-base">💡</span>
                      <span>Chưa quyết định ngay? Đội bạn có thể bỏ qua bước này và đăng ký sau.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTopicSkipped(true);
                        handleNextStep();
                      }}
                      className="text-xs text-[#818CF8] hover:text-white font-bold underline cursor-pointer shrink-0"
                    >
                      Bỏ qua bước này &rarr;
                    </button>
                  </div>

                  {!myTeam ? (
                    <div className="p-4 rounded-[10px] bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                      Bạn chưa tham gia đội thi. Vui lòng quay lại Bước 2 để tạo hoặc vào đội trước!
                    </div>
                  ) : !isLeader && myTeam ? (
                    <div className="space-y-3">
                      <div className="rounded-[10px] bg-[#0F172A] border border-[#334155] p-4 text-xs space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Trạng thái đăng ký đề tài của đội:</span>
                          <Badge variant={selectedSubTopicId ? 'success' : 'warning'}>
                            {selectedSubTopicId ? 'Đội trưởng đã chọn đề tài' : 'Chờ Đội trưởng chọn đề tài'}
                          </Badge>
                        </div>
                        <p className="text-slate-300">
                          {selectedSubTopicId
                            ? 'Đội của bạn đã có đề tài chính thức. Bạn có thể tiếp tục sang bước ký cam kết thi đấu.'
                            : 'Đội trưởng của bạn hiện chưa chọn đề tài thi đấu. Bạn vẫn có thể tạm thời tiếp tục sang bước 4.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Leader view: subtopics list */
                    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                      {majorTopics.map((major) =>
                        major.subTopics.map((sub) => {
                          const isSelected = selectedSubTopicId === sub.id;
                          const curCount = sub.currentTeams ?? sub.registeredTeamsCount ?? 0;
                          const maxCount = sub.maxTeamsQuota ?? sub.quota ?? 10;
                          const isFull = curCount >= maxCount && !isSelected;

                          return (
                            <div
                              key={sub.id}
                              onClick={() => {
                                if (!isFull) handleSelectTopic(sub.id);
                              }}
                              className={`rounded-[10px] p-3 text-xs border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-[#6366F1]/15 border-[#6366F1] shadow-md shadow-[#6366F1]/20'
                                  : isFull
                                  ? 'bg-[#0B1120] border-[#334155] opacity-50 cursor-not-allowed'
                                  : 'bg-[#0F172A] border-[#334155] hover:border-slate-400'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                      isSelected
                                        ? 'border-[#6366F1] bg-[#6366F1]'
                                        : 'border-slate-500'
                                    }`}
                                  >
                                    {isSelected && <Check size={10} className="text-white" />}
                                  </div>
                                  <span className="font-semibold text-white">{sub.title}</span>
                                </div>
                                <span
                                  className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                                    isFull
                                      ? 'bg-rose-500/20 text-rose-300'
                                      : 'bg-emerald-500/20 text-emerald-300'
                                  }`}
                                >
                                  {curCount}/{maxCount} đội
                                </span>
                              </div>
                              <p className="text-slate-400 mt-1 pl-5.5 leading-relaxed">
                                {sub.description}
                              </p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  <div className="pt-3 border-t border-[#334155] flex flex-wrap items-center justify-between gap-3">
                    <Button variant="secondary" onClick={handlePrevStep} className="gap-2">
                      <ArrowLeft size={16} />
                      <span>Quay lại</span>
                    </Button>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setTopicSkipped(true);
                          handleNextStep();
                        }}
                        className="px-3.5 py-2 rounded-[8px] border border-[#334155] bg-[#0F172A] hover:bg-[#1E293B] text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Bỏ qua bước này (Chọn sau)
                      </button>
                      <Button
                        variant="primary"
                        onClick={() => {
                          if (!selectedSubTopicId) {
                            setTopicSkipped(true);
                          }
                          handleNextStep();
                        }}
                        className="gap-2"
                      >
                        <span>{selectedSubTopicId ? 'Tiếp tục Bước 4' : 'Bỏ qua & Sang Bước 4'}</span>
                        <ArrowRight size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: Candidate Academic Integrity Pledge */}
              {wizardStep === 4 && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-['Righteous'] text-lg text-white">
                      Bước 4: Quy Chế & Cam Kết Liêm Chính Học Thuật
                    </h3>
                    <p className="text-xs text-slate-300">
                      Đảm bảo môi trường thi đấu công bằng, văn minh và an toàn bảo mật.
                    </p>
                  </div>

                  <div className="rounded-[12px] bg-[#0F172A] border border-[#334155] p-4 text-xs space-y-2 text-slate-300 max-h-48 overflow-y-auto">
                    <p>
                      <strong>1. Tính nguyên bản:</strong> Toàn bộ mã nguồn phát triển phải do các thành viên trong đội trực tiếp xây dựng trong thời gian diễn ra cuộc thi. Nghiêm cấm sao chép nguyên mẫu từ các kho mã nguồn thương mại hoặc bài thi đã nộp ở cuộc thi khác.
                    </p>
                    <p>
                      <strong>2. Đóng băng commit SHA:</strong> Hệ thống tự động ghi nhận commit SHA tại thời điểm hạn chót của từng chặng. Các thay đổi sau thời hạn sẽ không được chấm điểm.
                    </p>
                    <p>
                      <strong>3. Chế độ chấm ẩn danh:</strong> Ban Giám khảo chấm thi hoàn toàn độc lập mà không nhìn thấy thông tin trường học hay danh tính cá nhân của thí sinh.
                    </p>
                    <p>
                      <strong>4. An toàn dữ liệu:</strong> Mọi tập dữ liệu mẫu được BTC cung cấp đã được xử lý ẩn danh hóa và chỉ được sử dụng cho mục đích nghiên cứu tại cuộc thi.
                    </p>
                  </div>

                  <label className="flex items-start gap-3 p-3 rounded-[10px] bg-[#0B1120] border border-[#334155] cursor-pointer hover:border-slate-400 transition-colors">
                    <input
                      type="checkbox"
                      checked={pledgeChecked}
                      onChange={(e) => setPledgeChecked(e.target.checked)}
                      className="mt-0.5 rounded border-[#334155] bg-[#0F172A] text-[#6366F1] focus:ring-0"
                    />
                    <span className="text-xs text-white leading-relaxed">
                      Tôi xác nhận đã đọc, hiểu rõ và <strong>cam kết tuân thủ 100%</strong> các điều khoản, quy chế của HackFlow AI Hackathon 2026.
                    </span>
                  </label>

                  <div className="pt-3 border-t border-[#334155] flex justify-between items-center">
                    <Button variant="secondary" onClick={handlePrevStep} className="gap-2">
                      <ArrowLeft size={16} />
                      <span>Quay lại</span>
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleFinishOnboarding}
                      disabled={!pledgeChecked}
                      className="gap-2 shadow-lg shadow-[#6366F1]/30 disabled:opacity-40"
                    >
                      <Sparkles size={16} />
                      <span>Hoàn Tất & Bắt Đầu Thi Đấu!</span>
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ========================================================
              ADMIN ROLE STEPS
             ======================================================== */}
          {currentUser.role === 'admin' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="font-['Righteous'] text-lg text-white">
                  Thiết Lập Vận Hành Hệ Thống Quản Trị
                </h3>
                <p className="text-xs text-slate-300">
                  Xác nhận các thông số cấu hình cốt lõi trước khi mở cổng nhận bài thi đấu.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-[10px] bg-[#0F172A] border border-[#334155] space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">1. Cấu hình Cuộc thi:</span>
                    <Badge variant="indigo">Đã kích hoạt</Badge>
                  </div>
                  <p className="text-white font-semibold">{config.name}</p>
                  <p className="text-slate-400">Giai đoạn: {config.currentPhase}</p>
                </div>

                <div className="p-3.5 rounded-[10px] bg-[#0F172A] border border-[#334155] space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">2. Cân bằng Trọng số Tiêu chí Rubric:</span>
                    <span className="font-mono text-emerald-400 font-bold">Tổng: 100%</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {rubricCriteria.map((c) => (
                      <div key={c.id} className="p-2 rounded bg-[#0B1120] border border-[#334155] flex justify-between">
                        <span className="truncate text-slate-300">{c.name}</span>
                        <strong className="text-indigo-400 ml-1">{c.weight}%</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 rounded-[10px] bg-[#0F172A] border border-[#334155] flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">3. Chế độ Chấm ẩn danh (Blind Judging)</div>
                    <div className="text-[11px] text-slate-400">Ẩn tên trường và danh tính thí sinh khi Giám khảo chấm điểm</div>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={toggleBlindJudging}
                    className={`!py-1 !px-3 text-xs ${
                      config.blindJudgingMode
                        ? 'border-amber-500/50 text-amber-300 bg-amber-500/10'
                        : 'text-slate-200'
                    }`}
                  >
                    {config.blindJudgingMode ? 'ĐANG BẬT' : 'BẬT NGAY'}
                  </Button>
                </div>
              </div>

              <div className="pt-3 border-t border-[#334155] flex justify-end">
                <Button
                  variant="primary"
                  onClick={() => {
                    finishUserOnboarding(currentUser.id);
                    setWizardOpen(false);
                    navigate('/admin/dashboard');
                  }}
                  className="gap-2"
                >
                  <CheckCircle2 size={16} />
                  <span>Xác Nhận & Bắt Đầu Vận Hành</span>
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================
              JUDGE ROLE STEPS
             ======================================================== */}
          {currentUser.role === 'judge' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="font-['Righteous'] text-lg text-white">
                  Cam Kết Độc Lập & Liêm Chính Chấm Thi
                </h3>
                <p className="text-xs text-slate-300">
                  Hội đồng Ban Giám Khảo cam kết bảo mật ý tưởng dự án và chấm điểm khách quan.
                </p>
              </div>

              <div className="rounded-[10px] bg-[#0F172A] border border-[#334155] p-4 text-xs space-y-2 text-slate-300">
                <p>• <strong>Bảo mật bản quyền:</strong> Không sao chép hay tiết lộ mã nguồn, kiến trúc của các đội thi cho bên thứ ba.</p>
                <p>• <strong>Tránh xung đột lợi ích:</strong> Từ chối chấm điểm các đội có thành viên là sinh viên do mình trực tiếp giảng dạy hoặc hướng dẫn đề tài.</p>
                <p>• <strong>Tuân thủ Rubric:</strong> Chấm điểm dựa trên 4 tiêu chí cốt lõi: Tính Sáng tạo (25%), Kiến trúc Kỹ thuật (35%), Tính Khả thi (25%) và Trình bày (15%).</p>
              </div>

              <label className="flex items-start gap-3 p-3 rounded-[10px] bg-[#0B1120] border border-[#334155] cursor-pointer hover:border-slate-400 transition-colors">
                <input
                  type="checkbox"
                  checked={pledgeChecked}
                  onChange={(e) => setPledgeChecked(e.target.checked)}
                  className="mt-0.5 rounded border-[#334155] bg-[#0F172A] text-[#6366F1] focus:ring-0"
                />
                <span className="text-xs text-white leading-relaxed">
                  Tôi là <strong>{currentUser.fullName}</strong>, xác nhận cam kết thực hiện đúng chuẩn mực đạo đức chấm thi độc lập của HackFlow 2026.
                </span>
              </label>

              <div className="pt-3 border-t border-[#334155] flex justify-end">
                <Button
                  variant="primary"
                  disabled={!pledgeChecked}
                  onClick={() => {
                    setUserPledge(currentUser.id, true);
                    finishUserOnboarding(currentUser.id);
                    setWizardOpen(false);
                    navigate('/judge/dashboard');
                  }}
                  className="gap-2 disabled:opacity-40"
                >
                  <CheckCircle2 size={16} />
                  <span>Ký Cam Kết & Vào Khu Vực Chấm Thi</span>
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================
              MENTOR ROLE STEPS
             ======================================================== */}
          {currentUser.role === 'mentor' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="font-['Righteous'] text-lg text-white">
                  Cam Kết Hỗ Trợ Chuyên Môn Kỹ Thuật
                </h3>
                <p className="text-xs text-slate-300">
                  Cố vấn đồng hành cùng thí sinh, định hướng giải pháp và giải đáp vướng mắc công nghệ.
                </p>
              </div>

              <div className="rounded-[10px] bg-[#0F172A] border border-[#334155] p-4 text-xs space-y-2 text-slate-300">
                <p>• <strong>Cam kết phản hồi (SLA):</strong> Tiếp nhận và phản hồi các yêu cầu hỗ trợ (Support Tickets) trong vòng 30 - 60 phút.</p>
                <p>• <strong>Nguyên tắc định hướng:</strong> Cung cấp tài liệu, gợi ý hướng tiếp cận giải pháp; không trực tiếp viết mã hay can thiệp vào bài nộp của thí sinh.</p>
                <p>• <strong>Lĩnh vực phụ trách:</strong> {currentUser.specialty || 'Trí tuệ Nhân tạo & Hệ thống Nhúng'}.</p>
              </div>

              <div className="pt-3 border-t border-[#334155] flex justify-end">
                <Button
                  variant="primary"
                  onClick={() => {
                    finishUserOnboarding(currentUser.id);
                    setWizardOpen(false);
                    navigate('/mentor/dashboard');
                  }}
                  className="gap-2"
                >
                  <CheckCircle2 size={16} />
                  <span>Xác Nhận & Mở Hàng Đợi Hỗ Trợ</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
