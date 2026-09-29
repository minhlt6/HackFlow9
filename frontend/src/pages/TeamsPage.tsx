import React from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';

export const TeamsPage: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Quản lý Đội thi</h1>
        <Button variant="primary">Tạo đội mới</Button>
      </div>
      <Card className="bg-white border-slate-200 shadow-sm">
        <p className="text-slate-700 font-medium">Quản lý và theo dõi danh sách các đội thi tham gia.</p>
      </Card>
    </div>
  );
};