import React, { useState } from 'react';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import {
  GraduationCap,
  Scale,
  Plus,
  Mail,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

export const AdminMentorsJudgesPage: React.FC = () => {

  const [activeTab, setActiveTab] = useState<'judges' | 'mentors'>('judges');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [specialization, setSpecialization] = useState('Computer Vision & LLMs');
  const [alert, setAlert] = useState<string | null>(null);

  const [judges, setJudges] = useState<Array<{
    id: string;
    name: string;
    email: string;
    specialization: string;
    assignedCount: number;
    avatar: string;
  }>>([
    {
      id: 'judge-1',
      name: 'PGS. TS. Trần Giám Khảo',
      email: 'judge.tech@hackathon.org',
      specialization: 'AI Architecture & Production Readiness (Trưởng ban)',
      assignedCount: 3,
      avatar: 'T',
    },
    {
      id: 'judge-2',
      name: 'GS. TS. Alan Vance',
      email: 'alan.vance@techuniv.edu.vn',
      specialization: 'Trí tuệ nhân tạo & Khoa học dữ liệu',
      assignedCount: 3,
      avatar: 'A',
    },
    {
      id: 'judge-3',
      name: 'Dr. Sarah Connor',
      email: 'sarah.connor@mit.edu',
      specialization: 'Cybersecurity & Ethical AI',
      assignedCount: 3,
      avatar: 'S',
    },
  ]);

  const [mentors, setMentors] = useState<Array<{
    id: string;
    name: string;
    email: string;
    topic: string;
    openTickets: number;
    avatar: string;
  }>>([
    {
      id: 'mentor-1',
      name: 'TS. Nguyễn Văn Hướng Dẫn',
      email: 'mentor.ai@ailab.org.vn',
      topic: 'AI trong Y tế và LLM RAG',
      openTickets: 1,
      avatar: 'N',
    },
    {
      id: 'mentor-2',
      name: 'ThS. Trần Thị Thông Minh',
      email: 'thongminh.tran@iotlab.org',
      topic: 'Đô thị Thông minh và IoT Xanh',
      openTickets: 1,
      avatar: 'T',
    },
    {
      id: 'mentor-3',
      name: 'Kỹ sư Lê Bảo Mật',
      email: 'baomat.le@fintech.io',
      topic: 'Công nghệ Tài chính và Blockchain',
      openTickets: 0,
      avatar: 'L',
    },
    {
      id: 'mentor-4',
      name: 'Bác sĩ Vũ Trí Tuệ',
      email: 'tritue.vu@medtech.vn',
      topic: 'Y tế và Chăm sóc Sức khỏe',
      openTickets: 0,
      avatar: 'V',
    },
  ]);

  const handleDeleteJudge = (id: string, judgeName: string) => {
    if (window.confirm(`Xác nhận xóa giám khảo "${judgeName}"?`)) {
      setJudges((prev) => prev.filter((j) => j.id !== id));
      setAlert(`Đã xóa giám khảo ${judgeName}`);
      setTimeout(() => setAlert(null), 3000);
    }
  };

  const handleDeleteMentor = (id: string, mentorName: string) => {
    if (window.confirm(`Xác nhận xóa cố vấn "${mentorName}"?`)) {
      setMentors((prev) => prev.filter((m) => m.id !== id));
      setAlert(`Đã xóa cố vấn ${mentorName}`);
      setTimeout(() => setAlert(null), 3000);
    }
  };

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
          assignedCount: 0,
          avatar: name.trim().charAt(0).toUpperCase(),
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
          avatar: name.trim().charAt(0).toUpperCase(),
        },
      ]);
      setAlert(`Đã gửi thư mời Cố vấn chuyên môn tới ${email}!`);
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
            Quản Lý Hội Đồng Giám Khảo và Cố Vấn
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Phân bổ chuyên gia chấm thi độc lập và cố vấn chuyên môn hỗ trợ giải đáp kỹ thuật.
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

      {/* Empty States */}
      {activeTab === 'judges' && judges.length === 0 && (
        <div className="rounded-[16px] border border-dashed border-[#334155] p-12 text-center bg-[#1E293B]/40">
          <Scale size={40} className="mx-auto text-slate-500 mb-3" />
          <h3 className="font-['Righteous'] text-lg text-white mb-1">Chưa Có Giám Khảo</h3>
          <p className="text-slate-400 text-xs max-w-sm mx-auto mb-4">
            Hội đồng giám khảo hiện chưa có thành viên. Hãy mời các chuyên gia chấm thi để bắt đầu đánh giá bài nộp.
          </p>
          <Button variant="primary" size="sm" onClick={() => setIsInviteOpen(true)} className="gap-1.5">
            <Plus size={14} />
            <span>Mời Giám Khảo Mới</span>
          </Button>
        </div>
      )}

      {activeTab === 'mentors' && mentors.length === 0 && (
        <div className="rounded-[16px] border border-dashed border-[#334155] p-12 text-center bg-[#1E293B]/40">
          <GraduationCap size={40} className="mx-auto text-slate-500 mb-3" />
          <h3 className="font-['Righteous'] text-lg text-white mb-1">Chưa Có Cố Vấn Chuyên Môn</h3>
          <p className="text-slate-400 text-xs max-w-sm mx-auto mb-4">
            Chưa có cố vấn nào trong danh sách. Hãy mời các cố vấn theo từng chuyên môn để hỗ trợ thí sinh.
          </p>
          <Button variant="primary" size="sm" onClick={() => setIsInviteOpen(true)} className="gap-1.5">
            <Plus size={14} />
            <span>Mời Cố Vấn Mới</span>
          </Button>
        </div>
      )}

      {/* Roster Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {activeTab === 'judges'
          ? judges.map((j) => (
              <div
                key={j.id}
                className="rounded-[16px] border border-[#334155] bg-[#1E293B] p-5 space-y-4 relative group"
              >
                <div className="flex items-center justify-between">
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
                  <button
                    type="button"
                    onClick={() => handleDeleteJudge(j.id, j.name)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Xóa giám khảo"
                  >
                    <Trash2 size={16} />
                  </button>
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
                className="rounded-[16px] border border-[#334155] bg-[#1E293B] p-5 space-y-4 relative group"
              >
                <div className="flex items-center justify-between">
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
                  <button
                    type="button"
                    onClick={() => handleDeleteMentor(m.id, m.name)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Xóa cố vấn"
                  >
                    <Trash2 size={16} />
                  </button>
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
        title={activeTab === 'judges' ? 'Mời Giám Khảo Mới' : 'Mời Cố Vấn Chuyên Môn Mới'}
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
