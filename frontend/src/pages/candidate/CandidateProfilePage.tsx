import React, { useEffect, useState } from 'react';
import { useMockStore } from '../../store/useMockStore';
import { useAuthStore } from '../../store/useAuthStore';
import { apiClient } from '../../api/axiosClient';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Badge } from '../../components/Badge';
import { GithubIcon } from '../../components/common/Icons';
import {
  Mail,
  Save,
  CheckCircle2,
  Users,
} from 'lucide-react';

import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';
import { UnsavedChangesDialog } from '../../components/common/UnsavedChangesDialog';

const DEFAULT_BIO =
  'Sinh viên năm 4 đam mê Computer Vision và Generative AI. Đã có kinh nghiệm tham gia 2 kỳ Hackathon.';

export const CandidateProfilePage: React.FC = () => {
  const { currentUser, teams, updateCurrentUserProfile, syncFromBackend } = useMockStore();
  const authUser = useAuthStore((s) => s.user);
  const updateAuthUser = useAuthStore((s) => s.updateUser);

  const myTeam = teams.find((t) => t.id === currentUser.teamId);

  const resolvedName = authUser?.fullName || currentUser.fullName;
  const resolvedUniversity =
    authUser?.university ||
    authUser?.school ||
    currentUser.university ||
    currentUser.school ||
    'Đại học Bách Khoa Hà Nội';
  const resolvedStudentId = authUser?.studentId || currentUser.studentId || '2023-CS-0842';
  const resolvedPhone = authUser?.phone ?? currentUser.phone ?? '';
  const resolvedSkillsArray =
    Array.isArray(authUser?.skills) && authUser.skills.length > 0
      ? authUser.skills
      : Array.isArray(currentUser.skills) && currentUser.skills.length > 0
      ? currentUser.skills
      : ['React', 'TypeScript', 'Python', 'FastAPI'];
  const resolvedBio = authUser?.bio || currentUser.bio || DEFAULT_BIO;

  const [fullName, setFullName] = useState(resolvedName);
  const [university, setUniversity] = useState(resolvedUniversity);
  const [studentId, setStudentId] = useState(resolvedStudentId);
  const [phone, setPhone] = useState(resolvedPhone);
  const [skillsInput, setSkillsInput] = useState(resolvedSkillsArray.join(', '));
  const [bio, setBio] = useState(resolvedBio);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    let mounted = true;
    void syncFromBackend?.().then(() => {
      if (!mounted) return;
      const u = useMockStore.getState().currentUser;
      const au = useAuthStore.getState().user;
      setFullName(au?.fullName || u.fullName);
      setUniversity(
        au?.university || au?.school || u.university || u.school || 'Đại học Bách Khoa Hà Nội',
      );
      setStudentId(au?.studentId || u.studentId || '2023-CS-0842');
      const nextPhone = au?.phone ?? u.phone;
      if (nextPhone !== undefined) setPhone(nextPhone);
      const nextSkills =
        Array.isArray(au?.skills) && au.skills.length > 0
          ? au.skills
          : Array.isArray(u.skills) && u.skills.length > 0
          ? u.skills
          : null;
      if (nextSkills) {
        setSkillsInput(nextSkills.join(', '));
      }
      const nextBio = au?.bio || u.bio;
      if (nextBio) setBio(nextBio);
    });
    return () => {
      mounted = false;
    };
  }, [syncFromBackend]);

  const isDirty =
    fullName !== resolvedName ||
    university !== resolvedUniversity ||
    studentId !== resolvedStudentId ||
    phone !== resolvedPhone ||
    bio !== resolvedBio;

  const blocker = useUnsavedChangesWarning(isDirty);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const parsedSkills = skillsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      await apiClient.post('/users/profile', {
        full_name: fullName.trim(),
        student_id: studentId.trim(),
        school: university.trim(),
        phone: phone.trim(),
        skills: parsedSkills,
        bio: bio.trim(),
      });
    } catch {
      // Fallback to local store persistence if offline
    }

    const profileUpdates = {
      fullName: fullName.trim(),
      university: university.trim(),
      school: university.trim(),
      studentId: studentId.trim(),
      phone: phone.trim(),
      skills: parsedSkills,
      bio: bio.trim(),
    };
    updateCurrentUserProfile(profileUpdates, true);
    updateAuthUser(profileUpdates);
    setIsSaving(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="space-y-6  max-w-4xl">
      {/* Top Header */}
      <div>
        <h1
          className="font-semibold tracking-tight text-foreground text-2xl sm:text-3xl tracking-wide"
        >
          Hồ Sơ Cá Nhân
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Thông tin thí sinh được đồng bộ hóa từ tài khoản đã xác thực của cuộc thi.
        </p>
      </div>

      {isSaved && (
        <div className="p-3.5 rounded-[10px] bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>Cập nhật thông tin hồ sơ thành công!</span>
        </div>
      )}

      {/* Main Profile Card */}
      <div className="rounded-[16px] border border-border bg-card p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-5 pb-6 border-b border-border">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#6366F1] text-white text-3xl font-bold tracking-tight shadow-lg shadow-[#6366F1]/30">
            {resolvedName ? resolvedName.charAt(0).toUpperCase() : 'U'}
          </div>

          <div className="space-y-1.5 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <h2 className="text-xl font-bold text-foreground">{resolvedName}</h2>
              <Badge variant="indigo">
                {currentUser.teamRole === 'leader' || currentUser.roleInTeam === 'leader' ? 'Đội Trưởng' : 'Thành Viên'}
              </Badge>
              <Badge variant="success">Tài Khoản Đã Xác Thực</Badge>
            </div>
            <p className="text-xs text-muted-foreground flex items-center justify-center sm:justify-start gap-2">
              <span className="flex items-center gap-1">
                <GithubIcon size={13} />
                <span>@{authUser?.githubUsername || currentUser.githubUsername || 'github_user'}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Mail size={13} />
                <span>{authUser?.email || currentUser.email}</span>
              </span>
            </p>
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Họ và tên *"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

            <Input
              label="Mã số sinh viên"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            />

            <Input
              label="Trường đại học / Học viện"
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
            />

            <Input
              label="Tài khoản GitHub"
              value={`@${currentUser.githubUsername || 'github_user'}`}
              disabled
              helperText="Đã liên kết OAuth2 vĩnh viễn"
            />

            <Input
              label="Số điện thoại liên hệ"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0901234567"
            />

            <Input
              label="Kỹ năng chuyên môn (cách nhau bởi dấu phẩy)"
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
              placeholder="React, Python, PyTorch, Docker..."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-muted-foreground font-medium text-sm">
              Giới thiệu bản thân & Chuyên môn kỹ thuật
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="p-3 rounded-[10px] bg-muted/40 dark:bg-slate-900/60 border border-border text-foreground placeholder:text-muted-foreground text-sm focus:border-[#6366F1] focus:outline-none"
            />
          </div>

          {/* Team membership card */}
          {myTeam && (
            <div className="p-4 rounded-[12px] bg-muted/40 dark:bg-slate-900/60 border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6366F1]/20 text-primary">
                  <Users size={20} />
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground block">
                    Đội thi hiện tại
                  </span>
                  <span className="font-bold text-foreground text-sm">{myTeam.name}</span>
                </div>
              </div>
              <Badge variant="indigo">Mã mời: {myTeam.inviteCode}</Badge>
            </div>
          )}

          <div className="flex justify-end pt-3">
            <Button variant="primary" type="submit" isLoading={isSaving} className="gap-2 px-6">
              <Save size={16} />
              <span>Lưu thông tin</span>
            </Button>
          </div>
        </form>
      </div>

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        isOpen={blocker.state === 'blocked'}
        onStay={() => {
          if (blocker.reset) blocker.reset();
        }}
        onLeave={() => {
          if (blocker.proceed) blocker.proceed();
        }}
        title="Xác Nhận Rời Khỏi Hồ Sơ"
        message="Bạn đang có các thông tin hồ sơ vừa chỉnh sửa chưa được lưu. Nếu rời đi bây giờ, thay đổi sẽ bị mất."
      />
    </div>
  );
};
