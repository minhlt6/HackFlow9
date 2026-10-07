import React, { useState } from 'react';
import { useMockStore } from '../../store/useMockStore';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Badge } from '../../components/Badge';
import { GithubIcon } from '../../components/common/Icons';
import {
  User,
  Mail,
  School,
  Save,
  CheckCircle2,
  Users,
  ShieldCheck,
} from 'lucide-react';

export const CandidateProfilePage: React.FC = () => {
  const { currentUser, teams, updateCurrentUserProfile } = useMockStore();

  const myTeam = teams.find((t) => t.id === currentUser.teamId);

  const [fullName, setFullName] = useState(currentUser.fullName);
  const [university, setUniversity] = useState(currentUser.university || 'Đại học Bách Khoa Hà Nội');
  const [studentId, setStudentId] = useState(currentUser.studentId || '2023-CS-0842');
  const [bio, setBio] = useState(
    'Sinh viên năm 4 đam mê Computer Vision và Generative AI. Đã có kinh nghiệm tham gia 2 kỳ Hackathon.',
  );
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateCurrentUserProfile({ fullName, university, studentId });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="space-y-6 font-['Roboto'] max-w-4xl">
      {/* Top Header */}
      <div>
        <h1
          className="font-['Righteous'] text-2xl sm:text-3xl tracking-wide"
          style={{
            background: 'linear-gradient(90deg, #6366F1 0%, #FAFBFF 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Hồ Sơ Cá Nhân
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Thông tin thí sinh được đồng bộ hóa từ tài khoản đã xác thực của cuộc thi.
        </p>
      </div>

      {isSaved && (
        <div className="p-3.5 rounded-[10px] bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>Cập nhật thông tin hồ sơ thành công!</span>
        </div>
      )}

      {/* Main Profile Card */}
      <div className="rounded-[16px] border border-[#334155] bg-[#1E293B] p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-5 pb-6 border-b border-[#334155]">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#6366F1] text-white text-3xl font-bold font-['Righteous'] shadow-lg shadow-[#6366F1]/30">
            {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
          </div>

          <div className="space-y-1.5 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <h2 className="text-xl font-bold text-white">{currentUser.fullName}</h2>
              <Badge variant="indigo">
                {currentUser.teamRole === 'leader' ? 'Đội Trưởng' : 'Thành Viên'}
              </Badge>
              <Badge variant="success">Tài Khoản Đã Xác Thực</Badge>
            </div>
            <p className="text-xs text-slate-400 flex items-center justify-center sm:justify-start gap-2">
              <span className="flex items-center gap-1">
                <GithubIcon size={13} />
                <span>@{currentUser.githubUsername || 'github_user'}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Mail size={13} />
                <span>{currentUser.email}</span>
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
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-slate-300 font-medium text-sm">
              Giới thiệu bản thân & Chuyên môn kỹ thuật
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="p-3 rounded-[10px] bg-[#0F172A] border border-[#334155] text-slate-100 placeholder-slate-400 text-sm focus:border-[#6366F1] focus:outline-none"
            />
          </div>

          {/* Team membership card */}
          {myTeam && (
            <div className="p-4 rounded-[12px] bg-[#0F172A] border border-[#334155] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6366F1]/20 text-[#818CF8]">
                  <Users size={20} />
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 block">
                    Đội thi hiện tại
                  </span>
                  <span className="font-bold text-white text-sm">{myTeam.name}</span>
                </div>
              </div>
              <Badge variant="indigo">Mã mời: {myTeam.inviteCode}</Badge>
            </div>
          )}

          <div className="flex justify-end pt-3">
            <Button variant="primary" type="submit" className="gap-2 px-6">
              <Save size={16} />
              <span>Lưu thông tin</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
