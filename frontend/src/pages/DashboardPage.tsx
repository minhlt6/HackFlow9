import React from 'react';
import { Users, FileText, CheckSquare, Award } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Tổng quan hệ thống Hackathon</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">Tổng số đội thi</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">24</h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
            <Users size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">Đề tài đăng ký</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">18</h3>
          </div>
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
            <FileText size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">Checkpoint hoàn thành</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">5/7</h3>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
            <CheckSquare size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">Điểm trung bình</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">86.5</h3>
          </div>
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
            <Award size={24} />
          </div>
        </div>
      </div>
    </div>
  );
};