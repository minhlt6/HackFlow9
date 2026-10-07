import React, { useState } from 'react';
import { useMockStore } from '../../store/useMockStore';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import {
  GraduationCap,
  Scale,
  Plus,
  Mail,
  Shield,
  CheckCircle2,
} from 'lucide-react';

export const AdminMentorsJudgesPage: React.FC = () => {
  const { majorTopics } = useMockStore();

  const [activeTab, setActiveTab] = useState<'judges' | 'mentors'>('judges');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [specialization, setSpecialization] = useState('Computer Vision & LLMs');
  const [alert, setAlert] = useState<string | null>(null);

  const [judges, setJudges] = useState([
    {
      id: 'judge-1',
      name: 'Dr. Alan Vance',
      email: 'alan.vance@vinuni.edu.vn',
      specialization: 'AI & Data Science (Head Judge)',
      assignedCount: 6,
      avatar: 'A',
    },
    {
      id: 'judge-2',
      name: 'GS. TS. Trần Đức',
      email: 'tran.duc@hust.edu.vn',
      specialization: 'Software Architecture & Cloud Native',
      assignedCount: 6,
      avatar: 'T',
    },
    {
      id: 'judge-3',
      name: 'Dr. Sarah Connor',
      email: 'sarah.connor@mit.edu',
      specialization: 'Cybersecurity & Ethical AI',
      assignedCount: 6,
      avatar: 'S',
    },
  ]);

  const [mentors, setMentors] = useState([
    {
      id: 'mentor-1',
      name: 'Dr. Lê Quang',
      email: 'le.quang@vinuni.edu.vn',
      topic: 'AI trong Y tế & Chẩn đoán bệnh án',
      openTickets: 2,
      avatar: 'L',
    },
    {
      id: 'mentor-2',
      name: 'ThS. Nguyễn Văn Bình',
      email: 'binh.nv@greentech.org',
      topic: 'Công nghệ Xanh & Năng lượng tái tạo',
      openTickets: 1,
      avatar: 'B',
    },
    {
      id: 'mentor-3',
      name: 'Dr. Maya Patel',
      email: 'maya.patel@edtech.io',
      topic: 'Trí tuệ nhân tạo trong Giáo dục',
      openTickets: 0,
      avatar: 'M',
    },
  ]);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    if (activeTab === 'judges') {
      setJudges((prev) => [
        ...prev,
        {
          id: `judge-${Date.now()}`,
          name: name.trim(),
          email: email.trim(),
          specialization: specialization.trim(),
          assignedCount: 6,
          avatar: name.charAt(0).toUpperCase(),
        },
      ]);
      setAlert(`Đã gửi thư mời Ban Giám Khảo tới ${email}!`);
    } else {
      setMentors((prev) => [
        ...prev,
        {
          id: `mentor-${Date.now()}`,
          name: name.trim(),
          email: email.trim(),
          topic: specialization.trim(),
          openTickets: 0,
          avatar: name.charAt(0).toUpperCase(),
        },
      ]);
      setAlert(`Đã gửi thư mời Cố vấn (Mentor) tới ${email}!`);
    }

    setIsInviteOpen(false);
    setName('');
    setEmail('');
    setTimeout(() => setAlert(null), 3000);
  };

  return (
    <div className="space-y-6 font-['Roboto']">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="font-['Righteous'] text-2xl sm:text-3xl tracking-wide"
            style={{
              background: 'linear-gradient(90deg, #6366F1 0%, #FAFBFF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Quản Lý Hội Đồng Giám Khảo & Cố Vấn
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Phân bổ chuyên gia chấm thi độc lập (Judges) và cố vấn chuyên môn hỗ trợ giải đáp kỹ thuật (Mentors).
          </p>
        </div>

        <Button variant="primary" onClick={() => setIsInviteOpen(true)} className="gap-2">
          <Plus size={16} />
          <span>Mời Chuyên Gia Mới</span>
        </Button>
      </div>

      {alert && (
        <div className="p-3.5 rounded-[10px] bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 size={15} />
          <span>{alert}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#334155] gap-4">
        <button
          onClick={() => setActiveTab('judges')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'judges'
              ? 'border-[#6366F1] text-[#818CF8]'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Scale size={16} />
          <span>Hội Đồng Giám Khảo ({judges.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('mentors')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'mentors'
              ? 'border-[#6366F1] text-[#818CF8]'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <GraduationCap size={16} />
          <span>Cố Vấn Chuyên Môn ({mentors.length})</span>
        </button>
      </div>

      {/* Roster Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {activeTab === 'judges'
          ? judges.map((j) => (
              <div
                key={j.id}
                className="rounded-[16px] border border-[#334155] bg-[#1E293B] p-5 space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/20 text-blue-300 font-['Righteous'] text-lg border border-blue-500/30">
                    {j.avatar}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">{j.name}</h4>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Mail size={12} />
                      <span>{j.email}</span>
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-[10px] bg-[#0F172A] border border-[#334155] text-xs space-y-1">
                  <span className="text-slate-400 block">Chuyên môn:</span>
                  <span className="text-slate-200 font-medium">{j.specialization}</span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-[#334155]/60">
                  <span className="text-slate-400">Đội thi được phân công:</span>
                  <Badge variant="indigo">{j.assignedCount} đội</Badge>
                </div>
              </div>
            ))
          : mentors.map((m) => (
              <div
                key={m.id}
                className="rounded-[16px] border border-[#334155] bg-[#1E293B] p-5 space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/20 text-purple-300 font-['Righteous'] text-lg border border-purple-500/30">
                    {m.avatar}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">{m.name}</h4>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Mail size={12} />
                      <span>{m.email}</span>
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-[10px] bg-[#0F172A] border border-[#334155] text-xs space-y-1">
                  <span className="text-slate-400 block">Lĩnh vực phụ trách:</span>
                  <span className="text-purple-300 font-medium">{m.topic}</span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-[#334155]/60">
                  <span className="text-slate-400">Tickets cần hỗ trợ:</span>
                  <Badge variant={m.openTickets > 0 ? 'warning' : 'success'}>
                    {m.openTickets} tickets
                  </Badge>
                </div>
              </div>
            ))}
      </div>

      {/* Invite Modal */}
      <Modal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title={activeTab === 'judges' ? 'Mời Giám Khảo Mới' : 'Mời Cố Vấn (Mentor) Mới'}
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <Input
            label="Họ và tên chuyên gia *"
            placeholder="Ví dụ: GS. TS. Nguyễn Văn A..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Địa chỉ Email *"
            type="email"
            placeholder="expert@university.edu.vn"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label={activeTab === 'judges' ? 'Chuyên môn đánh giá' : 'Lĩnh vực đề tài hỗ trợ'}
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            required
          />

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="ghost" type="button" onClick={() => setIsInviteOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit">
              Gửi thư mời
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
