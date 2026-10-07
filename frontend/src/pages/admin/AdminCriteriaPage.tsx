import React, { useState } from 'react';
import { useMockStore } from '../../store/useMockStore';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import {
  Scale,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import type { RubricCriteria } from '../../types';

export const AdminCriteriaPage: React.FC = () => {
  const { rubricCriteria, addRubricCriterion, updateRubricCriterion, deleteRubricCriterion } =
    useMockStore();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxScore, setMaxScore] = useState(20);
  const [weight, setWeight] = useState(20);
  const [editingItem, setEditingItem] = useState<RubricCriteria | null>(null);
  const [alert, setAlert] = useState<string | null>(null);

  const totalWeight = rubricCriteria.reduce((sum, c) => sum + c.weight, 0);
  const isWeightValid = totalWeight === 100;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addRubricCriterion(name.trim(), description.trim(), maxScore, weight);
    setIsAddOpen(false);
    setName('');
    setDescription('');
    setAlert('Đã thêm tiêu chí Rubric mới!');
    setTimeout(() => setAlert(null), 3000);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    updateRubricCriterion(editingItem.id, {
      name: editingItem.name,
      description: editingItem.description,
      maxScore: editingItem.maxScore,
      weight: editingItem.weight,
    });

    setEditingItem(null);
    setAlert('Đã cập nhật tiêu chí thành công!');
    setTimeout(() => setAlert(null), 3000);
  };

  const handleDelete = (id: string, criterionName: string) => {
    if (window.confirm(`Xóa tiêu chí "${criterionName}"?`)) {
      deleteRubricCriterion(id);
    }
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
            Ma Trận Tiêu Chí Chấm Điểm (Rubric Criteria)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Quy định thang điểm và trọng số cho Hội đồng Giám khảo đánh giá trong giao diện 2 màn hình (Split-Screen).
          </p>
        </div>

        <Button variant="primary" onClick={() => setIsAddOpen(true)} className="gap-2">
          <Plus size={16} />
          <span>Thêm Tiêu Chí</span>
        </Button>
      </div>

      {/* Total Weight Validation Banner */}
      <div
        className={`p-4 rounded-[14px] border flex items-center justify-between gap-3 text-xs ${
          isWeightValid
            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
            : 'bg-amber-950/30 border-amber-500/40 text-amber-300'
        }`}
      >
        <div className="flex items-center gap-2 font-semibold">
          {isWeightValid ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>
            {isWeightValid
              ? 'Tổng trọng số hợp lệ: 100% (Sẵn sàng chấm điểm)'
              : `Cảnh báo: Tổng trọng số hiện tại là ${totalWeight}%. Vui lòng cân bằng lại cho đúng 100%.`}
          </span>
        </div>
        <span className="font-mono text-sm font-bold">{totalWeight}% / 100%</span>
      </div>

      {alert && (
        <div className="p-3.5 rounded-[10px] bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 size={15} />
          <span>{alert}</span>
        </div>
      )}

      {/* Criteria Table */}
      <div className="rounded-[16px] border border-[#334155] bg-[#1E293B] p-6 space-y-4">
        <div className="overflow-x-auto rounded-[12px] border border-[#334155] bg-[#0F172A]">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#1E293B]/70 border-b border-[#334155] text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">#</th>
                <th className="py-3.5 px-4">Tên Tiêu Chí</th>
                <th className="py-3.5 px-4">Mô Tả Chi Tiết</th>
                <th className="py-3.5 px-4 text-center">Điểm Tối Đa</th>
                <th className="py-3.5 px-4 text-center">Trọng Số (%)</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]/60 text-slate-200">
              {rubricCriteria.map((c, idx) => (
                <tr key={c.id} className="hover:bg-[#1E293B]/40 transition-colors">
                  <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                    {idx + 1}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-white">{c.name}</td>
                  <td className="py-3.5 px-4 text-slate-300 max-w-md">{c.description}</td>
                  <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-200">
                    {c.maxScore}đ
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-bold text-[#818CF8]">
                    {c.weight}%
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingItem({ ...c })}
                        className="p-1.5 rounded-md hover:bg-[#334155] text-[#818CF8] hover:text-white transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id, c.name)}
                        className="p-1.5 rounded-md hover:bg-[#334155] text-rose-400 hover:text-rose-300 transition-colors"
                        title="Xóa tiêu chí"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Criterion */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Thêm Tiêu Chí Rubric">
        <form onSubmit={handleAdd} className="space-y-4">
          <Input
            label="Tên tiêu chí *"
            placeholder="Ví dụ: Tính sáng tạo, Kiến trúc hệ thống..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-slate-300 font-medium text-xs">Mô tả hướng dẫn chấm *</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="p-3 rounded-[10px] bg-[#0F172A] border border-[#334155] text-slate-100 text-xs focus:border-[#6366F1] focus:outline-none"
              placeholder="Tiêu chuẩn đạt điểm tối đa..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Điểm tối đa *"
              type="number"
              min={5}
              max={100}
              value={maxScore}
              onChange={(e) => setMaxScore(Number(e.target.value))}
              required
            />

            <Input
              label="Trọng số % *"
              type="number"
              min={1}
              max={100}
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="ghost" type="button" onClick={() => setIsAddOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit">
              Lưu tiêu chí
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Criterion */}
      <Modal
        isOpen={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        title="Chỉnh Sửa Tiêu Chí Rubric"
      >
        {editingItem && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <Input
              label="Tên tiêu chí *"
              value={editingItem.name}
              onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
              required
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-slate-300 font-medium text-xs">Mô tả hướng dẫn chấm *</label>
              <textarea
                rows={3}
                value={editingItem.description}
                onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                className="p-3 rounded-[10px] bg-[#0F172A] border border-[#334155] text-slate-100 text-xs focus:border-[#6366F1] focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Điểm tối đa *"
                type="number"
                min={5}
                max={100}
                value={editingItem.maxScore}
                onChange={(e) => setEditingItem({ ...editingItem, maxScore: Number(e.target.value) })}
                required
              />

              <Input
                label="Trọng số % *"
                type="number"
                min={1}
                max={100}
                value={editingItem.weight}
                onChange={(e) => setEditingItem({ ...editingItem, weight: Number(e.target.value) })}
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <Button variant="ghost" type="button" onClick={() => setEditingItem(null)}>
                Hủy
              </Button>
              <Button variant="primary" type="submit">
                Cập nhật
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
