import React from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';

export const TeamsPage: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Quản lý Đội thi</h1>
        <Button variant="primary">Tạo đội mới</Button>
      </div>
      <Card>
        <p className="text-slate-400">Danh sách các đội tham gia hackathon sẽ hiển thị tại đây theo chuẩn module.</p>
      </Card>
    </div>
  );
};