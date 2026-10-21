import React, { useState } from 'react';
import { useMockStore } from '../../store/useMockStore';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import {
  Scale,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Sparkles,
  Info,
} from 'lucide-react';
import type { RubricCriteria } from '../../types';

const CRITERIA_COLORS = [
  '#6366F1', // Indigo
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#EC4899', // Pink
  '#3B82F6', // Blue
  '#14B8A6', // Teal
];

export const AdminCriteriaPage: React.FC = () => {
  const {
    rubricCriteria,
    addRubricCriterion,
    updateRubricCriterion,
    deleteRubricCriterion,
    rebalanceRubricWeights,
  } = useMockStore();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxScore, setMaxScore] = useState(10);
  const [weight, setWeight] = useState(20);
  const [rebalanceMode, setRebalanceMode] = useState<'proportional' | 'equal' | 'none'>('proportional');

  const [editingItem, setEditingItem] = useState<RubricCriteria | null>(null);
  const [alert, setAlert] = useState<string | null>(null);

  const totalWeight = rubricCriteria.reduce((sum, c) => sum + c.weight, 0);
  const isWeightValid = totalWeight === 100;
  const availableRemaining = Math.max(0, 100 - totalWeight);

  // Live calculation for preview inside Add Modal
  const getPreviewWeights = () => {
    const inputWeight = Math.min(100, Math.max(1, weight));
    const newCriterionName = name.trim() || 'Tiêu chí mới';

    if (rebalanceMode === 'equal') {
      const allCount = rubricCriteria.length + 1;
      const base = Math.floor(100 / allCount);
      const remainder = 100 - base * allCount;
      const previewExisting = rubricCriteria.map((c, idx) => ({
        name: c.name,
        oldWeight: c.weight,
        newWeight: idx < remainder ? base + 1 : base,
        isNew: false,
      }));
      return {
        items: [
          ...previewExisting,
          {
            name: newCriterionName,
            oldWeight: 0,
            newWeight: rubricCriteria.length < remainder ? base + 1 : base,
            isNew: true,
          },
        ],
        total: 100,
      };
    }

    if (rebalanceMode === 'proportional' && rubricCriteria.length > 0) {
      const remainingTarget = Math.max(0, 100 - inputWeight);
      const currentSum = rubricCriteria.reduce((sum, c) => sum + c.weight, 0);

      if (currentSum === 0 || remainingTarget === 0) {
        return {
          items: [
            ...rubricCriteria.map((c) => ({ name: c.name, oldWeight: c.weight, newWeight: 0, isNew: false })),
            { name: newCriterionName, oldWeight: 0, newWeight: inputWeight, isNew: true },
          ],
          total: inputWeight,
        };
      }

      const rawWeights = rubricCriteria.map((c) => (c.weight / currentSum) * remainingTarget);
      const floored = rawWeights.map((w) => Math.floor(w));
      const allocated = floored.reduce((a, b) => a + b, 0);
      const remainder = remainingTarget - allocated;

      const fractions = rawWeights.map((w, idx) => ({
        idx,
        fraction: w - floored[idx],
      }));
      fractions.sort((a, b) => b.fraction - a.fraction);

      const finalWeights = [...floored];
      for (let i = 0; i < remainder; i++) {
        finalWeights[fractions[i].idx] += 1;
      }

      const previewItems = rubricCriteria.map((c, idx) => ({
        name: c.name,
        oldWeight: c.weight,
        newWeight: Math.max(1, finalWeights[idx]),
        isNew: false,
      }));

      const total = previewItems.reduce((s, it) => s + it.newWeight, 0) + inputWeight;

      return {
        items: [
          ...previewItems,
          { name: newCriterionName, oldWeight: 0, newWeight: inputWeight, isNew: true },
        ],
        total,
      };
    }

    // mode === 'none'
    const total = rubricCriteria.reduce((s, c) => s + c.weight, 0) + inputWeight;
    return {
      items: [
        ...rubricCriteria.map((c) => ({ name: c.name, oldWeight: c.weight, newWeight: c.weight, isNew: false })),
        { name: newCriterionName, oldWeight: 0, newWeight: inputWeight, isNew: true },
      ],
      total,
    };
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addRubricCriterion(name.trim(), description.trim(), maxScore, weight, rebalanceMode);
    setIsAddOpen(false);
    setName('');
    setDescription('');
    setAlert(
      rebalanceMode !== 'none'
        ? `Đã thêm tiêu chí mới và tự động cân bằng toàn bộ trọng số về đúng 100%!`
        : 'Đã thêm tiêu chí Rubric mới!'
    );
    setTimeout(() => setAlert(null), 3500);
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
      setAlert(`Đã xóa tiêu chí "${criterionName}".`);
      setTimeout(() => setAlert(null), 3000);
    }
  };

  const handleQuickRebalance = (mode: 'proportional' | 'equal') => {
    rebalanceRubricWeights(mode);
    setAlert(
      mode === 'proportional'
        ? 'Đã chuẩn hóa tỷ lệ tất cả tiêu chí về chính xác 100%!'
        : 'Đã chia đều trọng số cho toàn bộ tiêu chí về 100%!'
    );
    setTimeout(() => setAlert(null), 3500);
  };

  return (
    <div className="space-y-6 ">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="font-semibold tracking-tight text-foreground text-2xl sm:text-3xl tracking-wide"
          >
            Ma Trận Tiêu Chí Chấm Điểm
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Quy định thang điểm và trọng số cho Hội đồng Giám khảo đánh giá trong giao diện chấm thi song song.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickRebalance('proportional')}
            className="gap-1.5 text-xs text-primary border-[#6366F1]/30 hover:bg-[#6366F1]/10"
            title="Tự động chuẩn hóa co dãn các tiêu chí hiện có để đạt đúng 100%"
          >
            <Scale size={14} />
            <span>Cân Bằng Tỷ Lệ (100%)</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickRebalance('equal')}
            className="gap-1.5 text-xs text-sky-700 dark:text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
            title="Chia đều 100% cho toàn bộ tiêu chí"
          >
            <Sliders size={14} />
            <span>Chia Đều Trọng Số</span>
          </Button>

          <Button
            variant="primary"
            onClick={() => {
              if (availableRemaining > 0) {
                setWeight(availableRemaining);
              } else {
                setWeight(20);
              }
              setIsAddOpen(true);
            }}
            className="gap-2"
          >
            <Plus size={16} />
            <span>Thêm Tiêu Chí</span>
          </Button>
        </div>
      </div>

      {/* Visual Weight Allocation Bar */}
      <div className="rounded-[16px] border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Scale size={16} className="text-primary" />
            <span className="font-bold text-foreground uppercase tracking-wider text-[11px]">
              Phân Bổ Trọng Số Tổng Thể
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Hiện tại:</span>
            <span
              className={`font-mono text-sm font-bold ${
                isWeightValid
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : totalWeight > 100
                  ? 'text-rose-700 dark:text-rose-400'
                  : 'text-amber-700 dark:text-amber-400'
              }`}
            >
              {totalWeight}% / 100%
            </span>
          </div>
        </div>

        {/* Stacked Progress Bar */}
        <div className="h-7 w-full rounded-[10px] bg-muted/40 dark:bg-slate-900/60 border border-border p-1 flex overflow-hidden gap-1">
          {rubricCriteria.map((c, idx) => {
            const color = CRITERIA_COLORS[idx % CRITERIA_COLORS.length];
            return (
              <div
                key={c.id}
                style={{
                  width: `${Math.min(100, Math.max(2, (c.weight / Math.max(100, totalWeight)) * 100))}%`,
                  backgroundColor: color,
                }}
                className="h-full rounded-[6px] transition-all duration-300 relative group flex items-center justify-center text-[10px] font-bold text-foreground shadow-sm overflow-hidden"
                title={`${c.name}: ${c.weight}%`}
              >
                <span className="truncate px-1 opacity-90 drop-shadow-sm">
                  {c.weight >= 8 ? `${c.weight}%` : ''}
                </span>
              </div>
            );
          })}

          {totalWeight < 100 && (
            <div
              style={{ width: `${100 - totalWeight}%` }}
              className="h-full rounded-[6px] border border-dashed border-border bg-muted/60 flex items-center justify-center text-[10px] text-muted-foreground"
              title={`Còn trống: ${100 - totalWeight}%`}
            >
              <span className="truncate px-1 font-mono">
                {100 - totalWeight >= 10 ? `+${100 - totalWeight}% trống` : `+${100 - totalWeight}%`}
              </span>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-[11px]">
          {rubricCriteria.map((c, idx) => {
            const color = CRITERIA_COLORS[idx % CRITERIA_COLORS.length];
            return (
              <div key={c.id} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-muted-foreground truncate max-w-[150px]">{c.name}:</span>
                <span className="font-mono font-bold text-foreground">{c.weight}%</span>
              </div>
            );
          })}
          {totalWeight < 100 && (
            <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full border border-dashed border-amber-400" />
              <span>Chưa phân bổ:</span>
              <span className="font-mono font-bold">{100 - totalWeight}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Total Weight Validation Alert Banner */}
      <div
        className={`p-4 rounded-[14px] border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
          isWeightValid
            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-400'
            : totalWeight > 100
            ? 'bg-rose-500/10 border-rose-500/40 text-rose-700 dark:text-rose-400'
            : 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-400'
        }`}
      >
        <div className="flex items-center gap-2.5 font-semibold">
          {isWeightValid ? (
            <CheckCircle2 size={18} className="text-emerald-700 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle size={18} className="shrink-0" />
          )}
          <span>
            {isWeightValid
              ? 'Tổng trọng số hợp lệ: 100% — Toàn bộ tiêu chí đã được cân bằng chính xác, sẵn sàng chấm điểm.'
              : totalWeight > 100
              ? `Cảnh báo: Tổng trọng số hiện tại là ${totalWeight}% (vượt quá ${totalWeight - 100}%). Vui lòng cân bằng lại về đúng 100%.`
              : `Cảnh báo: Tổng trọng số hiện tại là ${totalWeight}% (còn thiếu ${100 - totalWeight}%). Vui lòng phân bổ đủ 100%.`}
          </span>
        </div>

        {!isWeightValid && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleQuickRebalance('proportional')}
              className="px-3 py-1.5 rounded-full bg-[#6366F1] hover:bg-[#5558d9] text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Sparkles size={13} />
              <span>Chuẩn hóa 100% ngay</span>
            </button>
            <button
              onClick={() => handleQuickRebalance('equal')}
              className="px-3 py-1.5 rounded-full bg-muted/60 hover:bg-accent border border-border text-foreground font-medium text-xs flex items-center gap-1.5 transition-colors"
            >
              <Sliders size={13} />
              <span>Chia đều</span>
            </button>
          </div>
        )}
      </div>

      {alert && (
        <div className="p-3.5 rounded-[10px] bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
          <CheckCircle2 size={15} />
          <span>{alert}</span>
        </div>
      )}

      {/* Criteria Table */}
      <div className="rounded-[16px] border border-border bg-card p-6 space-y-4">
        <div className="overflow-x-auto rounded-[12px] border border-border bg-muted/40 dark:bg-slate-900/60">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-card border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">#</th>
                <th className="py-3.5 px-4">Tên Tiêu Chí</th>
                <th className="py-3.5 px-4">Mô Tả Chi Tiết</th>
                <th className="py-3.5 px-4 text-center">Điểm Tối Đa</th>
                <th className="py-3.5 px-4 text-center">Trọng Số (%)</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {rubricCriteria.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground text-xs">
                    <Scale className="mx-auto mb-2 opacity-30 text-muted-foreground" size={32} />
                    Chưa có tiêu chí Rubric nào. Bấm "Thêm Tiêu Chí" để bắt đầu thiết lập ma trận chấm điểm.
                  </td>
                </tr>
              ) : (
                rubricCriteria.map((c, idx) => {
                const color = CRITERIA_COLORS[idx % CRITERIA_COLORS.length];
                return (
                  <tr key={c.id} className="hover:bg-accent transition-colors">
                    <td className="py-3.5 px-4 text-center font-mono text-muted-foreground">
                      <div className="flex items-center justify-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: color }}
                        />
                        <span>{idx + 1}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-foreground">{c.name}</td>
                    <td className="py-3.5 px-4 text-muted-foreground max-w-md leading-relaxed">
                      {c.description}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-foreground">
                      {c.maxScore}đ
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#6366F1]/15 text-primary border border-[#6366F1]/30">
                        {c.weight}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingItem({ ...c })}
                          className="p-1.5 rounded-md hover:bg-accent text-primary hover:text-foreground transition-colors"
                          title="Chỉnh sửa tiêu chí"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.name)}
                          className="p-1.5 rounded-md hover:bg-accent text-rose-700 dark:text-rose-400 hover:text-rose-300 transition-colors"
                          title="Xóa tiêu chí"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Criterion With Auto-Rebalance */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Thêm Tiêu Chí & Cân Bằng Trọng Số"
        maxWidth="lg"
      >
        <form onSubmit={handleAdd} className="space-y-5">
          <Input
            label="Tên tiêu chí mới *"
            placeholder="Ví dụ: Bảo mật hệ thống, Khả năng chịu tải, Trải nghiệm người dùng..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-muted-foreground font-medium text-xs">Mô tả hướng dẫn chấm *</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="p-3 rounded-[10px] bg-muted/40 dark:bg-slate-900/60 border border-border text-foreground text-xs focus:border-[#6366F1] focus:outline-none"
              placeholder="Tiêu chuẩn cần đạt để giám khảo cho điểm tối đa..."
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Điểm tối đa thang chấm *"
              type="number"
              min={5}
              max={100}
              value={maxScore}
              onChange={(e) => setMaxScore(Number(e.target.value))}
              required
            />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="text-muted-foreground font-medium">Trọng số mong muốn (%) *</label>
                {availableRemaining > 0 && (
                  <button
                    type="button"
                    onClick={() => setWeight(availableRemaining)}
                    className="text-[11px] text-primary hover:text-foreground underline font-mono"
                  >
                    Lấy phần trống: {availableRemaining}%
                  </button>
                )}
              </div>
              <Input
                type="number"
                min={1}
                max={100}
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                required
              />
            </div>
          </div>

          {/* Rebalance Mode Choice */}
          <div className="space-y-2.5 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles size={14} className="text-primary" />
                <span>Cơ chế cân bằng trọng số khi thêm:</span>
              </span>
              <span className="text-[11px] text-muted-foreground">
                Hiện tại có {rubricCriteria.length} tiêu chí
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Option 1: Proportional Scaling */}
              <div
                onClick={() => setRebalanceMode('proportional')}
                className={`p-3 rounded-[10px] border cursor-pointer transition-all ${
                  rebalanceMode === 'proportional'
                    ? 'bg-[#6366F1]/15 border-[#6366F1] text-foreground shadow-sm'
                    : 'bg-muted/40 dark:bg-slate-900/60 border-border text-muted-foreground hover:border-slate-500'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <span className="text-emerald-700 dark:text-emerald-400">🌟</span>
                  <span>Co dãn tỷ lệ</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                  Tiêu chí mới nhận đúng {weight}%. Các tiêu chí cũ tự động co dãn theo tỷ lệ để tổng = 100%.
                </p>
              </div>

              {/* Option 2: Equal Distribution */}
              <div
                onClick={() => setRebalanceMode('equal')}
                className={`p-3 rounded-[10px] border cursor-pointer transition-all ${
                  rebalanceMode === 'equal'
                    ? 'bg-[#6366F1]/15 border-[#6366F1] text-foreground shadow-sm'
                    : 'bg-muted/40 dark:bg-slate-900/60 border-border text-muted-foreground hover:border-slate-500'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <span className="text-sky-700 dark:text-cyan-400">⚖️</span>
                  <span>Chia đều tất cả</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                  Chia đều 100% cho {rubricCriteria.length + 1} tiêu chí (mỗi tiêu chí ~{Math.round(100 / (rubricCriteria.length + 1))}%)
                </p>
              </div>

              {/* Option 3: None / Manual */}
              <div
                onClick={() => setRebalanceMode('none')}
                className={`p-3 rounded-[10px] border cursor-pointer transition-all ${
                  rebalanceMode === 'none'
                    ? 'bg-[#6366F1]/15 border-[#6366F1] text-foreground shadow-sm'
                    : 'bg-muted/40 dark:bg-slate-900/60 border-border text-muted-foreground hover:border-slate-500'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <span className="text-amber-700 dark:text-amber-400">⚙️</span>
                  <span>Nhập thủ công</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                  Chỉ thêm {weight}% cho tiêu chí mới. Giữ nguyên các tiêu chí khác (tự sửa sau).
                </p>
              </div>
            </div>
          </div>

          {/* Live Weight Preview */}
          {(() => {
            const preview = getPreviewWeights();
            const isValid = preview.total === 100;
            return (
              <div className="p-3.5 rounded-[12px] bg-muted/40 dark:bg-slate-900/60 border border-border space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                    <Info size={14} className="text-primary" />
                    <span>Xem trước kết quả phân bổ sau khi lưu:</span>
                  </div>
                  <span
                    className={`font-mono font-bold text-xs ${
                      isValid ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    Tổng dự kiến: {preview.total}% {isValid ? '✅' : '⚠️'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 text-[11px]">
                  {preview.items.map((item, i) => (
                    <span
                      key={i}
                      className={`px-2.5 py-1 rounded-[6px] border flex items-center gap-1.5 font-mono ${
                        item.isNew
                          ? 'bg-[#6366F1]/20 border-[#6366F1] text-foreground font-bold'
                          : 'bg-card border-border text-muted-foreground'
                      }`}
                    >
                      <span className="truncate max-w-[120px] font-sans">{item.name}:</span>
                      {item.isNew ? (
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold">+{item.newWeight}%</span>
                      ) : (
                        <span>
                          {item.oldWeight !== item.newWeight && (
                            <span className="text-muted-foreground line-through mr-1">
                              {item.oldWeight}%
                            </span>
                          )}
                          <span className="text-primary font-bold">{item.newWeight}%</span>
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="ghost" type="button" onClick={() => setIsAddOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit" className="gap-2">
              <CheckCircle2 size={16} />
              <span>Xác Nhận & Lưu Tiêu Chí</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Criterion */}
      <Modal
        isOpen={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        title="Chỉnh Sửa Tiêu Chí Chấm Điểm"
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
              <label className="text-muted-foreground font-medium text-xs">Mô tả hướng dẫn chấm *</label>
              <textarea
                rows={3}
                value={editingItem.description}
                onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                className="p-3 rounded-[10px] bg-muted/40 dark:bg-slate-900/60 border border-border text-foreground text-xs focus:border-[#6366F1] focus:outline-none"
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
