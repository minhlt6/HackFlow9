import { teamsApi } from '../../api/teamsApi';
import { profileApi } from '../../api/profileApi';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMockStore } from '../../store/useMockStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../Button';
import { Badge } from '../Badge';
import {
  CheckCircle2,
  AlertCircle,
  Users,
  FileCheck,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  Scale,
  Settings,
  EyeOff,
  Check,
  GraduationCap,
  HelpCircle,
  ExternalLink,
  BookOpen,
} from 'lucide-react';

export const MandatoryOnboardingWizard: React.FC = () => {
  const { isWizardOpen, currentUser } = useMockStore();
  if (!isWizardOpen) {
    return null;
  }
  return <MandatoryOnboardingWizardContent key={currentUser.id} />;
};

const MandatoryOnboardingWizardContent: React.FC = () => {
  const {
    currentUser,
    updateCurrentUserProfile,
    teams,
    majorTopics,
    rubricCriteria,
    config,
    updateConfig,
    toggleBlindJudging,
    setWizardOpen,
    wizardStep,
    openWizardAtStep,
    pledgedUsers,
    finishUserOnboarding,
    setUserPledge,
  } = useMockStore();

  const navigate = useNavigate();
  const authUser = useAuthStore((s) => s.user);
  const effectiveRole = authUser?.role || currentUser.role;

  const myTeam = teams.find((t) => t.id === currentUser.teamId);
  const isLeader = myTeam?.leaderId === currentUser.id;

  const [profileForm, setProfileForm] = useState({
    fullName: currentUser.fullName || '',
    studentId: currentUser.studentId || '',
    school: currentUser.school || currentUser.university || 'Đại học Bách Khoa Hà Nội',
    phone: currentUser.phone || '',
    skills: (currentUser.skills || ['Python', 'React', 'Docker']).join(', '),
    bio: currentUser.bio || '',
  });

  const [adminConfigForm, setAdminConfigForm] = useState({
    name: config.name || 'HackFlow AI và DeepTech Hackathon 2026',
    currentPhase: config.currentPhase || 'Giai đoạn 3: Thực thi dự án và Nộp bài các chặng',
    maxTeamMembers: config.maxTeamMembers || 5,
  });

  const [teamMode, setTeamMode] = useState<'join' | 'create'>('join');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [createTeamForm, setCreateTeamForm] = useState({
    name: '',
    description: '',
  });

  const [pledgeChecked, setPledgeChecked] = useState(Boolean(pledgedUsers[currentUser.id]));
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const isCandidateStep1Done = Boolean(
    currentUser.studentId && (currentUser.school || currentUser.university) && currentUser.phone,
  );
  const isCandidateStep2Done = Boolean(myTeam);
  const isCandidateStep3Done = Boolean(pledgedUsers[currentUser.id]);

  const totalRubricWeight = rubricCriteria.reduce((sum, c) => sum + c.weight, 0);
  const isWeightBalanced = Math.abs(totalRubricWeight - 100) < 0.1;
  const isJudgePledged = Boolean(pledgedUsers[currentUser.id]);

  const candidateSteps = [
    { num: 1, title: 'Hồ sơ sinh viên', isDone: isCandidateStep1Done, icon: UserCheck },
    { num: 2, title: 'Ghép đội thi đấu', isDone: isCandidateStep2Done, icon: Users },
    { num: 3, title: 'Cam kết liêm chính', isDone: isCandidateStep3Done, icon: FileCheck },
  ];

  const adminSteps = [
    { num: 1, title: 'Cấu hình cuộc thi', isDone: true, icon: Settings },
    { num: 2, title: 'Cân bằng tiêu chí', isDone: isWeightBalanced, icon: Scale },
    { num: 3, title: 'Bảo mật & Ẩn danh', isDone: true, icon: EyeOff },
  ];

  const judgeSteps = [
    { num: 1, title: 'Hồ sơ chuyên gia', isDone: true, icon: GraduationCap },
    { num: 2, title: 'Cam kết độc lập (NDA)', isDone: isJudgePledged, icon: ShieldAlert },
    { num: 3, title: 'Khung chấm Rubric', isDone: true, icon: BookOpen },
  ];

  const mentorSteps = [
    { num: 1, title: 'Lĩnh vực cố vấn', isDone: true, icon: GraduationCap },
    { num: 2, title: 'Quy tắc phản hồi (SLA)', isDone: true, icon: HelpCircle },
  ];

  const currentRoleSteps =
    effectiveRole === 'admin'
      ? adminSteps
      : effectiveRole === 'judge'
        ? judgeSteps
        : effectiveRole === 'mentor'
          ? mentorSteps
          : candidateSteps;

  const maxStep = currentRoleSteps.length;
  const activeStep = Math.min(Math.max(1, wizardStep), maxStep);

  const handleNextStep = () => {
    setFeedbackMsg(null);
    if (activeStep < maxStep) {
      openWizardAtStep(activeStep + 1);
    }
  };

  const handlePrevStep = () => {
    setFeedbackMsg(null);
    if (activeStep > 1) {
      openWizardAtStep(activeStep - 1);
    }
  };

  const handleNavigateAndClose = (path: string) => {
    setWizardOpen(false);
    navigate(path);
  };

  const handleSaveCandidateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.studentId.trim() || !profileForm.school.trim() || !profileForm.phone.trim()) {
      setFeedbackMsg({
        text: 'Vui lòng điền đầy đủ Mã số sinh viên, Trường đại học và Số điện thoại.',
        type: 'error',
      });
      return;
    }
    const skillList = profileForm.skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      await profileApi.submit({
        full_name: profileForm.fullName.trim() || currentUser.fullName,
        student_id: profileForm.studentId.trim(), school: profileForm.school.trim(),
        phone: profileForm.phone.trim(), skills: skillList, bio: profileForm.bio.trim(),
      });
    } catch (error) {
      setFeedbackMsg({ text: error instanceof Error ? error.message : 'Không thể lưu hồ sơ.', type: 'error' });
      return;
    }
    updateCurrentUserProfile({
      fullName: profileForm.fullName.trim(),
      studentId: profileForm.studentId.trim(),
      school: profileForm.school.trim(),
      university: profileForm.school.trim(),
      phone: profileForm.phone.trim(),
      skills: skillList,
    }, true);

    setFeedbackMsg({ text: 'Đã đồng bộ thông tin hồ sơ sinh viên lên máy chủ!', type: 'success' });
    setTimeout(() => {
      setFeedbackMsg(null);
      openWizardAtStep(2);
    }, 600);
  };

  const handleSaveExpertProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const skillList = profileForm.skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      await profileApi.submit({
        full_name: profileForm.fullName.trim() || currentUser.fullName,
        student_id: profileForm.studentId.trim(), school: profileForm.school.trim(),
        phone: profileForm.phone.trim(), skills: skillList, bio: profileForm.bio.trim(),
      });
    } catch (error) {
      setFeedbackMsg({ text: error instanceof Error ? error.message : 'Không thể lưu hồ sơ.', type: 'error' });
      return;
    }
    updateCurrentUserProfile({
      fullName: profileForm.fullName.trim() || currentUser.fullName,
      school: profileForm.school.trim(),
      university: profileForm.school.trim(),
      phone: profileForm.phone.trim() || undefined,
      skills: skillList,
      bio: profileForm.bio.trim() || undefined,
    }, true);

    setFeedbackMsg({ text: 'Đã lưu thông tin chuyên gia thành công!', type: 'success' });
    setTimeout(() => {
      setFeedbackMsg(null);
      openWizardAtStep(2);
    }, 600);
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await teamsApi.joinTeam({ invite_code: inviteCodeInput.trim() });
      await useMockStore.getState().syncFromBackend?.();
      setFeedbackMsg({ text: 'Đã gia nhập đội thi.', type: 'success' });
      openWizardAtStep(3);
    } catch (error) {
      setFeedbackMsg({ text: error instanceof Error ? error.message : 'Không thể gia nhập đội.', type: 'error' });
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await teamsApi.createTeam({ team_name: createTeamForm.name.trim(), description: createTeamForm.description.trim() });
      await useMockStore.getState().syncFromBackend?.();
      setFeedbackMsg({ text: 'Đã tạo đội thi.', type: 'success' });
      openWizardAtStep(3);
    } catch (error) {
      setFeedbackMsg({ text: error instanceof Error ? error.message : 'Không thể tạo đội.', type: 'error' });
    }
  };

  const handleFinishCandidateOnboarding = () => {
    if (!pledgeChecked) {
      setFeedbackMsg({
        text: 'Bạn cần tích chọn xác nhận cam kết quy chế thi đấu trước khi hoàn tất.',
        type: 'error',
      });
      return;
    }
    setUserPledge(currentUser.id, true);
    finishUserOnboarding(currentUser.id);
    setFeedbackMsg({
      text: 'Đã lưu cam kết liêm chính và hoàn tất lộ trình thiết lập!',
      type: 'success',
    });
    setTimeout(() => {
      setWizardOpen(false);
    }, 700);
  };

  const handleSaveAdminStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateConfig({
        name: adminConfigForm.name.trim(),
        currentPhase: adminConfigForm.currentPhase.trim(),
        maxTeamMembers: Number(adminConfigForm.maxTeamMembers) || 5,
      });
      setFeedbackMsg({ text: 'Đã lưu cấu hình cuộc thi lên máy chủ!', type: 'success' });
      setTimeout(() => {
        setFeedbackMsg(null);
        openWizardAtStep(2);
      }, 600);
    } catch {
      setFeedbackMsg({ text: 'Không thể lưu cấu hình cuộc thi.', type: 'error' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-xl border border-border bg-card text-foreground shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                Hướng Dẫn Nghiệp Vụ Theo Vai Trò
              </span>
              <span className="text-muted-foreground">•</span>
              <Badge variant="indigo">
                {effectiveRole === 'candidate'
                  ? 'Thí Sinh'
                  : effectiveRole === 'admin'
                    ? 'Ban Quản Trị'
                    : effectiveRole === 'judge'
                      ? 'Ban Giám Khảo'
                      : 'Cố Vấn Chuyên Môn'}
              </Badge>
            </div>
            <h2 className="font-semibold text-lg sm:text-xl text-foreground mt-0.5">
              {effectiveRole === 'admin'
                ? 'Nhiệm Vụ Khởi Tạo & Vận Hành Cuộc Thi'
                : effectiveRole === 'judge'
                  ? 'Hướng Dẫn Nghiệp Vụ Ban Giám Khảo'
                  : effectiveRole === 'mentor'
                    ? 'Hướng Dẫn Dành Cho Cố Vấn Chuyên Môn'
                    : 'Lộ Trình Nhiệm Vụ Bắt Buộc Cho Thí Sinh'}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setWizardOpen(false)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
            title="Đóng cửa sổ hướng dẫn"
          >
            <X size={20} />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="px-6 pt-4 pb-3 bg-muted/20 border-b border-border">
          <div className="flex items-center justify-between">
            {currentRoleSteps.map((st, idx) => {
              const isActive = activeStep === st.num;
              const isDone = st.isDone;

              return (
                <React.Fragment key={st.num}>
                  <button
                    type="button"
                    onClick={() => {
                      setFeedbackMsg(null);
                      openWizardAtStep(st.num);
                    }}
                    className="flex flex-col items-center gap-1.5 focus:outline-none group text-left cursor-pointer"
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-sm'
                          : isDone
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40'
                            : 'bg-muted text-muted-foreground border border-border'
                      }`}
                    >
                      {isDone && !isActive ? <Check size={15} /> : st.num}
                    </div>
                    <span
                      className={`text-[11px] font-medium hidden sm:block ${
                        isActive
                          ? 'text-foreground font-semibold'
                          : isDone
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {st.title}
                    </span>
                  </button>

                  {idx < currentRoleSteps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-3 rounded ${
                        st.isDone ? 'bg-emerald-500/50' : 'bg-border'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div
            className={`mx-6 mt-4 p-3 rounded-lg text-xs font-medium flex items-center gap-2 border ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
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

        {/* Step Content */}
        <div className="p-6">
          {/* ========================================================
              CANDIDATE ROLE (3 STEPS)
             ======================================================== */}
          {effectiveRole === 'candidate' && (
            <>
              {activeStep === 1 && (
                <form onSubmit={handleSaveCandidateProfile} className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-base text-foreground">
                        Bước 1: Cập Nhật Hồ Sơ Sinh Viên
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Bổ sung mã số sinh viên, trường đại học và kỹ năng chuyên môn để đồng bộ với hồ sơ dự thi.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleNavigateAndClose('/profile')}
                      className="gap-1.5 shrink-0"
                    >
                      <span>Mở trang Hồ sơ</span>
                      <ExternalLink size={13} />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-foreground font-medium">Họ và tên đầy đủ *</label>
                      <input
                        type="text"
                        value={profileForm.fullName}
                        onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                        required
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground focus:border-primary focus:outline-none"
                        placeholder="Nguyễn Văn Minh"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-foreground font-medium">Mã số sinh viên (MSSV) *</label>
                      <input
                        type="text"
                        value={profileForm.studentId}
                        onChange={(e) => setProfileForm({ ...profileForm, studentId: e.target.value })}
                        required
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground focus:border-primary focus:outline-none"
                        placeholder="Ví dụ: 20210001"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-foreground font-medium">Số điện thoại liên hệ *</label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        required
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground focus:border-primary focus:outline-none"
                        placeholder="0912345678"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-foreground font-medium">Trường đại học / Học viện *</label>
                      <input
                        type="text"
                        value={profileForm.school}
                        onChange={(e) => setProfileForm({ ...profileForm, school: e.target.value })}
                        required
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground focus:border-primary focus:outline-none"
                        placeholder="Đại học Bách Khoa Hà Nội"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-foreground font-medium">
                        Kỹ năng chuyên môn (cách nhau bởi dấu phẩy)
                      </label>
                      <input
                        type="text"
                        value={profileForm.skills}
                        onChange={(e) => setProfileForm({ ...profileForm, skills: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground focus:border-primary focus:outline-none"
                        placeholder="React, TypeScript, Python, Docker..."
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border flex justify-end">
                    <Button type="submit" variant="primary" className="gap-2">
                      <span>Lưu Hồ Sơ & Sang Bước 2</span>
                      <ArrowRight size={15} />
                    </Button>
                  </div>
                </form>
              )}

              {activeStep === 2 && (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-base text-foreground">
                        Bước 2: Ghép Đội Thi Đấu (Bắt Buộc)
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Tạo đội thi mới hoặc nhập mã mời từ Đội trưởng để tham gia thi đấu và nộp bài các chặng.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleNavigateAndClose('/teams')}
                      className="gap-1.5 shrink-0"
                    >
                      <span>Mở trang Đội thi</span>
                      <ExternalLink size={13} />
                    </Button>
                  </div>

                  {myTeam ? (
                    <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/30 p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
                          <span className="font-semibold text-sm text-foreground">{myTeam.name}</span>
                        </div>
                        <Badge variant="success">Đã gia nhập đội</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {myTeam.description || 'Đội thi công nghệ HackFlow 2026'}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border">
                        <span>
                          Thành viên: <strong className="text-foreground">{myTeam.members.length}/5</strong>
                        </span>
                        <span>
                          Mã mời đội: <strong className="font-mono text-primary">{myTeam.inviteCode}</strong>
                        </span>
                        <span>
                          Vai trò:{' '}
                          <strong className="text-emerald-600 dark:text-emerald-400">
                            {isLeader ? 'Đội trưởng' : 'Thành viên'}
                          </strong>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex border-b border-border">
                        <button
                          type="button"
                          onClick={() => setTeamMode('join')}
                          className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                            teamMode === 'join'
                              ? 'border-primary text-primary'
                              : 'border-transparent text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Nhập Mã Mời Vào Đội
                        </button>
                        <button
                          type="button"
                          onClick={() => setTeamMode('create')}
                          className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                            teamMode === 'create'
                              ? 'border-primary text-primary'
                              : 'border-transparent text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Tạo Đội Thi Mới (Làm Đội Trưởng)
                        </button>
                      </div>

                      {teamMode === 'join' ? (
                        <form onSubmit={handleJoinTeam} className="space-y-3 text-xs">
                          <div className="space-y-1.5">
                            <label className="text-foreground font-medium">
                              Nhập mã mời 6 ký tự do Đội trưởng cung cấp *
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={inviteCodeInput}
                                onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                                placeholder="Ví dụ: HF2026"
                                className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground font-mono uppercase focus:border-primary focus:outline-none"
                              />
                              <Button type="submit" variant="primary">
                                Gia Nhập Đội
                              </Button>
                            </div>
                          </div>
                        </form>
                      ) : (
                        <form onSubmit={handleCreateTeam} className="space-y-3 text-xs">
                          <div className="space-y-1.5">
                            <label className="text-foreground font-medium">Tên đội thi của bạn *</label>
                            <input
                              type="text"
                              value={createTeamForm.name}
                              onChange={(e) =>
                                setCreateTeamForm({ ...createTeamForm, name: e.target.value })
                              }
                              placeholder="Ví dụ: CyberSamurai"
                              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground focus:border-primary focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-foreground font-medium">Mô tả ý tưởng định hướng</label>
                            <textarea
                              rows={2}
                              value={createTeamForm.description}
                              onChange={(e) =>
                                setCreateTeamForm({ ...createTeamForm, description: e.target.value })
                              }
                              placeholder="Ý tưởng dự án đội bạn dự định triển khai..."
                              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground focus:border-primary focus:outline-none"
                            />
                          </div>

                          <Button type="submit" variant="primary" className="w-full">
                            Tạo Đội Thi & Nhận Mã Mời
                          </Button>
                        </form>
                      )}
                    </div>
                  )}

                  <div className="pt-3 border-t border-border flex justify-between">
                    <Button variant="secondary" onClick={handlePrevStep} className="gap-2">
                      <ArrowLeft size={15} />
                      <span>Quay lại</span>
                    </Button>
                    <Button variant="primary" onClick={handleNextStep} className="gap-2">
                      <span>Tiếp tục Bước 3</span>
                      <ArrowRight size={15} />
                    </Button>
                  </div>
                </div>
              )}

              {activeStep === 3 && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-base text-foreground">
                      Bước 3: Quy Chế & Ký Cam Kết Liêm Chính Học Thuật
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Đọc thể lệ cuộc thi, cam kết bản quyền mã nguồn và chấp thuận quy trình chấm ẩn danh.
                    </p>
                  </div>

                  <div className="rounded-xl bg-muted/40 border border-border p-4 text-xs space-y-2 text-muted-foreground max-h-48 overflow-y-auto">
                    <p>
                      <strong className="text-foreground">1. Tính nguyên bản:</strong> Toàn bộ mã nguồn phát triển phải do các thành viên trong đội trực tiếp xây dựng trong thời gian diễn ra cuộc thi.
                    </p>
                    <p>
                      <strong className="text-foreground">2. Đóng băng commit SHA:</strong> Hệ thống tự động ghi nhận commit SHA tại thời điểm hạn chót của từng chặng.
                    </p>
                    <p>
                      <strong className="text-foreground">3. Chế độ chấm ẩn danh:</strong> Ban Giám khảo chấm thi hoàn toàn độc lập mà không nhìn thấy thông tin trường học hay danh tính cá nhân của thí sinh.
                    </p>
                    <p>
                      <strong className="text-foreground">4. An toàn dữ liệu:</strong> Mọi tập dữ liệu mẫu chỉ được sử dụng cho mục đích nghiên cứu tại cuộc thi.
                    </p>
                  </div>

                  <label className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border cursor-pointer hover:border-primary/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={pledgeChecked}
                      onChange={(e) => setPledgeChecked(e.target.checked)}
                      className="mt-0.5 rounded border-border text-primary focus:ring-0"
                    />
                    <span className="text-xs text-foreground leading-relaxed">
                      Tôi xác nhận đã đọc, hiểu rõ và <strong>cam kết tuân thủ 100%</strong> các điều khoản, quy chế liêm chính học thuật của cuộc thi.
                    </span>
                  </label>

                  <div className="pt-3 border-t border-border flex justify-between items-center">
                    <Button variant="secondary" onClick={handlePrevStep} className="gap-2">
                      <ArrowLeft size={15} />
                      <span>Quay lại</span>
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleFinishCandidateOnboarding}
                      disabled={!pledgeChecked}
                      className="gap-2 disabled:opacity-40"
                    >
                      <Sparkles size={15} />
                      <span>Ký Cam Kết & Hoàn Tất!</span>
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ========================================================
              ADMIN ROLE (3 STEPS)
             ======================================================== */}
          {effectiveRole === 'admin' && (
            <>
              {activeStep === 1 && (
                <form onSubmit={handleSaveAdminStep1} className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-base text-foreground">
                        Bước 1: Cấu Hình Thông Tin Cuộc Thi & Mốc Thời Gian
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Kiểm tra và cập nhật tên cuộc thi, giai đoạn vận hành hiện tại và số lượng thành viên tối đa mỗi đội.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleNavigateAndClose('/admin/config')}
                      className="gap-1.5 shrink-0"
                    >
                      <span>Mở trang Cấu hình</span>
                      <ExternalLink size={13} />
                    </Button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="space-y-1.5">
                      <label className="text-foreground font-medium">Tên sự kiện Hackathon *</label>
                      <input
                        type="text"
                        value={adminConfigForm.name}
                        onChange={(e) =>
                          setAdminConfigForm({ ...adminConfigForm, name: e.target.value })
                        }
                        required
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-foreground font-medium">Giai đoạn hiện tại</label>
                        <input
                          type="text"
                          value={adminConfigForm.currentPhase}
                          onChange={(e) =>
                            setAdminConfigForm({
                              ...adminConfigForm,
                              currentPhase: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-foreground font-medium">Số thành viên tối đa / đội</label>
                        <input
                          type="number"
                          min={2}
                          max={10}
                          value={adminConfigForm.maxTeamMembers}
                          onChange={(e) =>
                            setAdminConfigForm({
                              ...adminConfigForm,
                              maxTeamMembers: Number(e.target.value) || 5,
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border flex justify-end gap-2">
                    <Button type="submit" variant="primary" className="gap-2">
                      <span>Lưu Cấu Hình & Sang Bước 2</span>
                      <ArrowRight size={15} />
                    </Button>
                  </div>
                </form>
              )}

              {activeStep === 2 && (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-base text-foreground">
                        Bước 2: Cân Bằng Trọng Số Tiêu Chí Chấm Điểm (Rubric)
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Đảm bảo tổng trọng số các tiêu chí đạt chính xác 100% trước khi Hội đồng Giám khảo chấm điểm.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleNavigateAndClose('/admin/criteria')}
                      className="gap-1.5 shrink-0"
                    >
                      <span>Mở trang Tiêu chí</span>
                      <ExternalLink size={13} />
                    </Button>
                  </div>

                  <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">Tổng trọng số hiện tại:</span>
                      <Badge variant={isWeightBalanced ? 'success' : 'warning'}>
                        {totalRubricWeight.toFixed(1)}% / 100%
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {rubricCriteria.map((c) => (
                        <div
                          key={c.id}
                          className="p-2.5 rounded-lg bg-card border border-border flex items-center justify-between"
                        >
                          <span className="truncate text-foreground font-medium">{c.name}</span>
                          <strong className="text-primary font-mono ml-2">{c.weight}%</strong>
                        </div>
                      ))}
                    </div>

                    {!isWeightBalanced && (
                      <div className="pt-2 flex justify-end">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            handleNavigateAndClose('/admin/criteria');
                          }}
                        >
                          Mở ma trận để cân bằng trọng số
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-border flex justify-between">
                    <Button variant="secondary" onClick={handlePrevStep} className="gap-2">
                      <ArrowLeft size={15} />
                      <span>Quay lại</span>
                    </Button>
                    <Button variant="primary" onClick={handleNextStep} className="gap-2">
                      <span>Tiếp tục Bước 3</span>
                      <ArrowRight size={15} />
                    </Button>
                  </div>
                </div>
              )}

              {activeStep === 3 && (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-base text-foreground">
                        Bước 3: Chính Sách Bảo Mật & Chế Độ Chấm Ẩn Danh
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Kích hoạt chế độ ẩn danh tính và tên trường của thí sinh khi Ban Giám khảo chấm bài.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleNavigateAndClose('/admin/config')}
                      className="gap-1.5 shrink-0"
                    >
                      <span>Mở trang Cấu hình</span>
                      <ExternalLink size={13} />
                    </Button>
                  </div>

                  <div className="p-4 rounded-xl bg-muted/30 border border-border flex items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold text-sm text-foreground">
                        Chế độ Chấm ẩn danh (Blind Judging)
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Ẩn thông tin trường đại học và danh tính thí sinh trên giao diện chấm điểm của Giám khảo.
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant={config.blindJudgingMode ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => {
                        void toggleBlindJudging().catch(() => setFeedbackMsg({ text: 'Không thể lưu chế độ chấm thi.', type: 'error' }));
                        setFeedbackMsg({
                          text: `Đã ${!config.blindJudgingMode ? 'bật' : 'tắt'} chế độ chấm ẩn danh trên máy chủ!`,
                          type: 'success',
                        });
                      }}
                    >
                      {config.blindJudgingMode ? 'ĐANG BẬT' : 'BẬT NGAY'}
                    </Button>
                  </div>

                  <div className="pt-3 border-t border-border flex justify-between">
                    <Button variant="secondary" onClick={handlePrevStep} className="gap-2">
                      <ArrowLeft size={15} />
                      <span>Quay lại</span>
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => {
                        finishUserOnboarding(currentUser.id);
                        setWizardOpen(false);
                      }}
                      className="gap-2"
                    >
                      <CheckCircle2 size={15} />
                      <span>Xác Nhận & Hoàn Tất Thiết Lập</span>
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ========================================================
              JUDGE ROLE (3 STEPS)
             ======================================================== */}
          {effectiveRole === 'judge' && (
            <>
              {activeStep === 1 && (
                <form onSubmit={handleSaveExpertProfile} className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-base text-foreground">
                        Bước 1: Xác Nhận Hồ Sơ Chuyên Gia & Đơn Vị Công Tác
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Kiểm tra thông tin học hàm, học vị, đơn vị công tác và lĩnh vực chuyên môn của Giám khảo.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleNavigateAndClose('/profile')}
                      className="gap-1.5 shrink-0"
                    >
                      <span>Mở trang Hồ sơ</span>
                      <ExternalLink size={13} />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                    <div className="space-y-1.5">
                      <label className="text-foreground font-medium">Họ tên & Học hàm / Học vị *</label>
                      <input
                        type="text"
                        value={profileForm.fullName}
                        onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                        required
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-foreground font-medium">Đơn vị công tác / Viện nghiên cứu *</label>
                      <input
                        type="text"
                        value={profileForm.school}
                        onChange={(e) => setProfileForm({ ...profileForm, school: e.target.value })}
                        required
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-foreground font-medium">Lĩnh vực chuyên môn chấm thi</label>
                      <input
                        type="text"
                        value={profileForm.skills}
                        onChange={(e) => setProfileForm({ ...profileForm, skills: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border flex justify-end">
                    <Button type="submit" variant="primary" className="gap-2">
                      <span>Lưu Hồ Sơ & Sang Bước 2</span>
                      <ArrowRight size={15} />
                    </Button>
                  </div>
                </form>
              )}

              {activeStep === 2 && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-base text-foreground">
                      Bước 2: Ký Cam Kết Liêm Chính & Tránh Xung Đột Lợi Ích (NDA)
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Hội đồng Giám khảo cam kết bảo mật ý tưởng dự án và đánh giá độc lập, khách quan.
                    </p>
                  </div>

                  <div className="rounded-xl bg-muted/30 border border-border p-4 text-xs space-y-2 text-muted-foreground">
                    <p>
                      • <strong className="text-foreground">Bảo mật bản quyền:</strong> Không sao chép hay tiết lộ mã nguồn, kiến trúc của các đội thi cho bên thứ ba.
                    </p>
                    <p>
                      • <strong className="text-foreground">Tránh xung đột lợi ích:</strong> Từ chối chấm điểm các đội có thành viên là sinh viên do mình trực tiếp hướng dẫn.
                    </p>
                    <p>
                      • <strong className="text-foreground">Chấm điểm độc lập:</strong> Đánh giá công tâm theo khung tiêu chí Rubric chuẩn hóa của Ban Tổ Chức.
                    </p>
                  </div>

                  <label className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border cursor-pointer hover:border-primary/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={pledgeChecked}
                      onChange={(e) => setPledgeChecked(e.target.checked)}
                      className="mt-0.5 rounded border-border text-primary focus:ring-0"
                    />
                    <span className="text-xs text-foreground leading-relaxed">
                      Tôi là <strong>{currentUser.fullName}</strong>, xác nhận cam kết thực hiện đúng chuẩn mực đạo đức chấm thi độc lập của HackFlow 2026.
                    </span>
                  </label>

                  <div className="pt-3 border-t border-border flex justify-between">
                    <Button variant="secondary" onClick={handlePrevStep} className="gap-2">
                      <ArrowLeft size={15} />
                      <span>Quay lại</span>
                    </Button>
                    <Button
                      variant="primary"
                      disabled={!pledgeChecked}
                      onClick={() => {
                        setUserPledge(currentUser.id, true);
                        setFeedbackMsg({
                          text: 'Đã lưu cam kết bảo mật & liêm chính chấm thi lên máy chủ!',
                          type: 'success',
                        });
                        setTimeout(() => {
                          setFeedbackMsg(null);
                          openWizardAtStep(3);
                        }, 500);
                      }}
                      className="gap-2 disabled:opacity-40"
                    >
                      <span>Ký Cam Kết & Sang Bước 3</span>
                      <ArrowRight size={15} />
                    </Button>
                  </div>
                </div>
              )}

              {activeStep === 3 && (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-base text-foreground">
                        Bước 3: Nắm Vững Khung Tiêu Chí Rubric & Giao Diện Chấm 2 Màn Hình
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Làm quen với khung tiêu chí chấm điểm và không gian đối chiếu mã nguồn GitHub / Demo song song.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleNavigateAndClose('/judge/split-screen')}
                      className="gap-1.5 shrink-0"
                    >
                      <span>Mở Chấm song song</span>
                      <ExternalLink size={13} />
                    </Button>
                  </div>

                  <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-2.5 text-xs">
                    <div className="font-semibold text-foreground">
                      Khung tiêu chí chấm điểm hiện hành ({rubricCriteria.length} tiêu chí):
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {rubricCriteria.map((c) => (
                        <div
                          key={c.id}
                          className="p-2.5 rounded-lg bg-card border border-border flex items-center justify-between"
                        >
                          <span className="truncate text-foreground font-medium">{c.name}</span>
                          <Badge variant="indigo">{c.weight}%</Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border flex justify-between">
                    <Button variant="secondary" onClick={handlePrevStep} className="gap-2">
                      <ArrowLeft size={15} />
                      <span>Quay lại</span>
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => {
                        setUserPledge(currentUser.id, true);
                        finishUserOnboarding(currentUser.id);
                        setWizardOpen(false);
                        navigate('/judge/split-screen');
                      }}
                      className="gap-2"
                    >
                      <CheckCircle2 size={15} />
                      <span>Hoàn Tất & Vào Chấm Thi</span>
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ========================================================
              MENTOR ROLE (2 STEPS)
             ======================================================== */}
          {effectiveRole === 'mentor' && (
            <>
              {activeStep === 1 && (
                <form onSubmit={handleSaveExpertProfile} className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-base text-foreground">
                        Bước 1: Xác Nhận Lĩnh Vực Công Nghệ Cố Vấn
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Kiểm tra lĩnh vực chuyên môn hỗ trợ và danh sách các chủ đề đề tài thuộc phạm vi phụ trách.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleNavigateAndClose('/mentor/teams')}
                      className="gap-1.5 shrink-0"
                    >
                      <span>Xem Đội phụ trách</span>
                      <ExternalLink size={13} />
                    </Button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="space-y-1.5">
                      <label className="text-foreground font-medium">Chuyên môn công nghệ hỗ trợ *</label>
                      <input
                        type="text"
                        value={profileForm.skills}
                        onChange={(e) => setProfileForm({ ...profileForm, skills: e.target.value })}
                        required
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div className="p-3.5 rounded-xl bg-muted/30 border border-border space-y-2">
                      <span className="font-semibold text-foreground block">
                        Các lĩnh vực đề tài đang mở trên hệ thống ({majorTopics.length}):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {majorTopics.map((topic) => (
                          <div
                            key={topic.id}
                            className="p-2 rounded-lg bg-card border border-border flex items-center justify-between"
                          >
                            <span className="truncate font-medium text-foreground">{topic.title}</span>
                            <Badge variant="purple">{topic.subTopics.length} nhánh</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border flex justify-end">
                    <Button type="submit" variant="primary" className="gap-2">
                      <span>Xác Nhận Lĩnh Vực & Sang Bước 2</span>
                      <ArrowRight size={15} />
                    </Button>
                  </div>
                </form>
              )}

              {activeStep === 2 && (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-base text-foreground">
                        Bước 2: Quy Tắc Ứng Xử & Cam Kết Thời Gian Phản Hồi (SLA)
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Đồng hành cùng các đội thi và giải đáp yêu cầu hỗ trợ kỹ thuật nhanh chóng, đúng định hướng.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleNavigateAndClose('/mentor/tickets')}
                      className="gap-1.5 shrink-0"
                    >
                      <span>Mở Hàng đợi Tickets</span>
                      <ExternalLink size={13} />
                    </Button>
                  </div>

                  <div className="rounded-xl bg-muted/30 border border-border p-4 text-xs space-y-2 text-muted-foreground">
                    <p>
                      • <strong className="text-foreground">Cam kết phản hồi (SLA):</strong> Tiếp nhận và phản hồi các yêu cầu hỗ trợ (Support Tickets) trong vòng 30 phút.
                    </p>
                    <p>
                      • <strong className="text-foreground">Nguyên tắc định hướng:</strong> Cung cấp tài liệu, kiến trúc tham khảo và hướng gỡ lỗi; không trực tiếp viết hộ mã nguồn dự thi.
                    </p>
                    <p>
                      • <strong className="text-foreground">Lĩnh vực phụ trách:</strong>{' '}
                      {currentUser.specialty || profileForm.skills || 'Trí tuệ Nhân tạo & Hệ thống Phần mềm'}.
                    </p>
                  </div>

                  <div className="pt-3 border-t border-border flex justify-between">
                    <Button variant="secondary" onClick={handlePrevStep} className="gap-2">
                      <ArrowLeft size={15} />
                      <span>Quay lại</span>
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => {
                        setUserPledge(currentUser.id, true);
                        finishUserOnboarding(currentUser.id);
                        setWizardOpen(false);
                        navigate('/mentor/tickets');
                      }}
                      className="gap-2"
                    >
                      <CheckCircle2 size={15} />
                      <span>Xác Nhận & Mở Hàng Đợi Hỗ Trợ</span>
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
