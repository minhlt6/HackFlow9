import React, { useState } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { CountdownTimer } from '../components/CountdownTimer';

export const UIPreviewPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shortTimerEndTime, setShortTimerEndTime] = useState<string>(() =>
    new Date(Date.now() + 15 * 1000).toISOString()
  );

  const [sampleTwoDaysEndTime] = useState<string>(() =>
    new Date(Date.now() + (2 * 24 * 3600 + 4 * 3600 + 12 * 60 + 59) * 1000).toISOString()
  );

  const handleResetShortTimer = () => {
    setShortTimerEndTime(new Date(Date.now() + 15 * 1000).toISOString());
  };

  return (
    <div className="min-h-screen bg-[#060911] text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Title */}
        <div className="border-b border-[#1E293B] pb-4">
          <h1
            className="text-2xl sm:text-3xl font-extrabold tracking-wide"
            style={{
              background: 'linear-gradient(90deg, #6366F1 0%, #EDEDED 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Preview UI Atoms
          </h1>
        </div>

        {/* 1. Đồng hồ đếm ngược */}
        <div className="p-5 bg-[#0F172A] rounded-xl border border-[#334155] shadow-lg space-y-4">
          <h2 className="text-base font-semibold text-white">Đồng hồ đếm ngược</h2>

          {/* Trường hợp nhiều ngày */}
          <div className="border border-[#334155]/60 bg-[#1E293B]/60 p-4 rounded-lg space-y-2">
            <p className="text-xs text-slate-300 font-medium">Thời gian còn lại nộp bài chặng 1:</p>
            <div>
              <CountdownTimer endTime={sampleTwoDaysEndTime} />
            </div>
          </div>

          {/* Trường hợp sắp hết giờ */}
          <div className="border border-[#334155]/60 bg-[#1E293B]/60 p-4 rounded-lg space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-300 font-medium">Đếm ngược thử nghiệm (15 giây):</p>
              <Button size="sm" variant="secondary" onClick={handleResetShortTimer}>
                Đếm lại 15s
              </Button>
            </div>
            <div>
              <CountdownTimer endTime={shortTimerEndTime} />
            </div>
          </div>

          {/* Trường hợp đã hết hạn */}
          <div className="border border-[#334155]/60 bg-[#1E293B]/60 p-4 rounded-lg space-y-2">
            <p className="text-xs text-slate-300 font-medium">Hạn chót đã qua:</p>
            <div>
              <CountdownTimer endTime="2020-01-01T00:00:00.000Z" />
            </div>
          </div>
        </div>

        {/* 2. Thao tác */}
        <div className="p-5 bg-[#0F172A] rounded-xl border border-[#334155] shadow-lg space-y-3">
          <h2 className="text-base font-semibold text-white">Thao tác</h2>
          <div className="flex gap-3 items-center flex-wrap">
            <Button variant="primary">Xác nhận</Button>
            <Button variant="secondary">Hủy bỏ</Button>
            <Button variant="danger">Xóa đội</Button>
            <Button
              variant="primary"
              isLoading={isLoading}
              onClick={() => {
                setIsLoading(true);
                setTimeout(() => setIsLoading(false), 2000);
              }}
            >
              Đang tải
            </Button>
          </div>
        </div>

        {/* 3. Nhập thông tin */}
        <div className="p-5 bg-[#0F172A] rounded-xl border border-[#334155] shadow-lg space-y-4">
          <h2 className="text-base font-semibold text-white">Nhập thông tin</h2>
          <Input label="Tên đội thi" placeholder="Nhập tên đội..." />
          <Input
            label="Mã mời"
            placeholder="Nhập mã mời tham gia đội..."
            helperText="Mã mời gồm 6 ký tự do đội trưởng cung cấp"
          />
        </div>

        {/* 4. Trạng thái */}
        <div className="p-5 bg-[#0F172A] rounded-xl border border-[#334155] shadow-lg space-y-3">
          <h2 className="text-base font-semibold text-white">Trạng thái</h2>
          <div className="flex gap-2.5 flex-wrap">
            <Badge variant="indigo">Đang diễn ra</Badge>
            <Badge variant="pending">Chờ duyệt</Badge>
            <Badge variant="approved">Đã duyệt</Badge>
            <Badge variant="danger">Đã kết thúc</Badge>
          </div>
        </div>

        {/* 5. Hộp thoại tương tác */}
        <div className="p-5 bg-[#0F172A] rounded-xl border border-[#334155] shadow-lg space-y-3">
          <h2 className="text-base font-semibold text-white">Hộp thoại tương tác</h2>
          <Button onClick={() => setIsModalOpen(true)}>Mở hộp thoại tạo đội thi</Button>
        </div>

        {/* Modal Component */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Tạo đội thi mới">
          <div className="space-y-4">
            <Input label="Tên đội" placeholder="Nhập tên đội của bạn..." />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                Hủy
              </Button>
              <Button variant="primary" onClick={() => setIsModalOpen(false)}>
                Xác nhận
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};