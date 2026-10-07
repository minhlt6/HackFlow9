import React, { useState } from 'react';
import { useMockStore } from '../../store/useMockStore';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Badge } from '../../components/Badge';
import {
  Settings,
  Save,
  CheckCircle2,
  EyeOff,
  Eye,
  Calendar,
  Users,
  Trophy,
} from 'lucide-react';

export const AdminConfigPage: React.FC = () => {
  const { config, updateConfig, toggleBlindJudging, toggleResultsPublished } = useMockStore();

  const [name, setName] = useState(config.name);
  const [currentPhase, setCurrentPhase] = useState(config.currentPhase);
  const [maxTeamMembers, setMaxTeamMembers] = useState(config.maxTeamMembers);
  const [finalDeadline, setFinalDeadline] = useState(
    config.finalSubmissionDeadline.slice(0, 16),
  );
  const [alert, setAlert] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig({
      name,
      currentPhase,
      maxTeamMembers,
      finalSubmissionDeadline: new Date(finalDeadline).toISOString(),
    });
    setAlert('Đã cập nhật cấu hình hệ thống Hackathon thành công!');
    setTimeout(() => setAlert(null), 3000);
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
          Cấu Hình Hệ Thống Hackathon (Hackathon Settings)
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Thiết lập thông số vận hành toàn diện: tên cuộc thi, số lượng thành viên, các mốc thời gian và chế độ chấm thi.
        </p>
      </div>

      {alert && (
        <div className="p-3.5 rounded-[10px] bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 size={15} />
          <span>{alert}</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="rounded-[16px] border border-[#334155] bg-[#1E293B] p-6 lg:p-8 space-y-6">
        <div className="space-y-4">
          <h3 className="font-['Righteous'] text-lg text-white">Thông Tin Chung</h3>

          <Input
            label="Tên Cuộc Thi *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-slate-300 font-medium text-xs">Giai đoạn hiện tại *</label>
              <select
                value={currentPhase}
                onChange={(e) => setCurrentPhase(e.target.value)}
                className="p-2.5 rounded-[10px] bg-[#0F172A] border border-[#334155] text-slate-100 text-xs focus:border-[#6366F1] focus:outline-none"
              >
                <option value="Đăng ký tài khoản & Lập đội">Giai đoạn 1: Đăng ký & Lập đội</option>
                <option value="Lựa chọn đề tài & Khóa Quota">Giai đoạn 2: Chọn đề tài & Quota</option>
                <option value="Thực thi dự án & Nộp Checkpoints">Giai đoạn 3: Thực thi & Nộp Checkpoints</option>
                <option value="Hội đồng chấm thi độc lập (Blind Judging)">Giai đoạn 4: Chấm thi (Blind Judging)</option>
                <option value="Bế mạc & Công bố kết quả">Giai đoạn 5: Bế mạc & Bảng xếp hạng</option>
              </select>
            </div>

            <Input
              label="Số lượng thành viên tối đa mỗi đội *"
              type="number"
              min={2}
              max={6}
              value={maxTeamMembers}
              onChange={(e) => setMaxTeamMembers(Number(e.target.value))}
              required
            />
          </div>

          <Input
            label="Hạn chót Nộp Bài Chung Cuộc (Final Submission Deadline) *"
            type="datetime-local"
            value={finalDeadline}
            onChange={(e) => setFinalDeadline(e.target.value)}
            required
          />
        </div>

        {/* Feature Toggles */}
        <div className="pt-4 border-t border-[#334155] space-y-4">
          <h3 className="font-['Righteous'] text-lg text-white">Chế Độ Chấm Thi & Bảng Điểm</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-[12px] bg-[#0F172A] border border-[#334155] flex items-center justify-between">
              <div className="space-y-1">
                <span className="font-bold text-white text-xs block">Chế Độ Chấm Mù (Blind Mode)</span>
                <span className="text-[11px] text-slate-400">
                  Ẩn tên đội và trường học khỏi Giám khảo
                </span>
              </div>
              <button
                type="button"
                onClick={toggleBlindJudging}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                  config.blindJudgingMode
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-700 text-slate-400 border-slate-600'
                }`}
              >
                {config.blindJudgingMode ? 'BẬT' : 'TẮT'}
              </button>
            </div>

            <div className="p-4 rounded-[12px] bg-[#0F172A] border border-[#334155] flex items-center justify-between">
              <div className="space-y-1">
                <span className="font-bold text-white text-xs block">Công Bố Bảng Xếp Hạng</span>
                <span className="text-[11px] text-slate-400">
                  Mở công khai điểm số cho Thí sinh
                </span>
              </div>
              <button
                type="button"
                onClick={toggleResultsPublished}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                  config.resultsPublished
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-700 text-slate-400 border-slate-600'
                }`}
              >
                {config.resultsPublished ? 'CÔNG BỐ' : 'ẨN'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-[#334155]">
          <Button variant="primary" type="submit" size="lg" className="gap-2 px-8">
            <Save size={18} />
            <span>Lưu Cấu Hình Hackathon</span>
          </Button>
        </div>
      </form>
    </div>
  );
};
