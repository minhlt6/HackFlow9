import React, { useState } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';

export const UIPreviewPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6 bg-slate-50 min-h-screen">
      <h1 className="text-2xl font-bold text-slate-800">Preview UI Atoms [HF-13]</h1>

      {/* 1. Buttons */}
      <div className="p-4 bg-white rounded-xl shadow-sm space-y-3">
        <h2 className="font-semibold text-slate-700">Buttons</h2>
        <div className="flex gap-3 items-center flex-wrap">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="danger">Danger</Button>
          <Button 
            variant="primary" 
            isLoading={isLoading} 
            onClick={() => {
              setIsLoading(true);
              setTimeout(() => setIsLoading(false), 2000);
            }}
          >
            Click to Load
          </Button>
        </div>
      </div>

      {/* 2. Inputs */}
      <div className="p-4 bg-white rounded-xl shadow-sm space-y-3">
        <h2 className="font-semibold text-slate-700">Inputs</h2>
        <Input label="Tên đội thi" placeholder="Nhập tên đội..." />
        <Input label="Mã mời" error="Mã mời không chính xác hoặc đã hết hạn!" />
      </div>

      {/* 3. Badges */}
      <div className="p-4 bg-white rounded-xl shadow-sm space-y-3">
        <h2 className="font-semibold text-slate-700">Badges</h2>
        <div className="flex gap-2">
          <Badge variant="pending">Còn slot (Pending)</Badge>
          <Badge variant="approved">Đã duyệt (Approved)</Badge>
          <Badge variant="danger">Hết slot (Danger)</Badge>
        </div>
      </div>

      {/* 4. Modal Trigger */}
      <div className="p-4 bg-white rounded-xl shadow-sm space-y-3">
        <h2 className="font-semibold text-slate-700">Modal</h2>
        <Button onClick={() => setIsModalOpen(true)}>Mở Modal Tạo Đội</Button>
      </div>

      {/* Modal Component */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Tạo đội thi mới">
        <div className="space-y-4">
          <Input label="Tên đội" placeholder="Nhập tên đội của bạn..." />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button variant="primary" onClick={() => setIsModalOpen(false)}>Xác nhận</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};