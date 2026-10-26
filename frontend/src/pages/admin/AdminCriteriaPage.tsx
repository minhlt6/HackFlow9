import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
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
  RefreshCw,
  Loader2,
  Save,
  AlertCircle,
} from 'lucide-react';
import type { RubricCriteria } from '../../types';
import {
  evaluationService,
  type RubricConfigurePayload,
} from '../../services/evaluationService';

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

const rebalanceEqual = (criteria: RubricCriteria[]): RubricCriteria[] => {
  if (criteria.length === 0) return [];
  const base = Math.floor(100 / criteria.length);
  const remainder = 100 - base * criteria.length;
  return criteria.map((c, idx) => ({
    ...c,
    weight: idx < remainder ? base + 1 : base,
  }));
};

const rebalanceProportional = (criteria: RubricCriteria[]): RubricCriteria[] => {
  const currentSum = criteria.reduce((sum, c) => sum + c.weight, 0);
  if (currentSum === 0) return rebalanceEqual(criteria);
  const rawWeights = criteria.map((c) => (c.weight / currentSum) * 100);
  const floored = rawWeights.map((w) => Math.floor(w));
  const allocated = floored.reduce((a, b) => a + b, 0);
  const remainder = 100 - allocated;

  const fractions = rawWeights.map((w, idx) => ({ idx, fraction: w - floored[idx] }));
  fractions.sort((a, b) => b.fraction - a.fraction);

  const finalWeights = [...floored];
  for (let i = 0; i < remainder; i++) {
    finalWeights[fractions[i].idx] += 1;
  }
  return criteria.map((c, idx) => ({ ...c, weight: Math.max(1, finalWeights[idx]) }));
};

interface RawCriterion {
  id?: string;
  title?: string;
  name?: string;
  description?: string;
  max_score?: number;
  maxScore?: number;
  weight?: number;
  display_order?: number;
  displayOrder?: number;
}

export const AdminCriteriaPage: React.FC = () => {
  const mockCriteria = useMockStore((s) => s.rubricCriteria);

  const [criteriaList, setCriteriaList] = useState<RubricCriteria[]>(mockCriteria);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxScore, setMaxScore] = useState(10);
  const [weight, setWeight] = useState(20);
  const [rebalanceMode, setRebalanceMode] = useState<'proportional' | 'equal' | 'none'>('proportional');

  const [editingItem, setEditingItem] = useState<RubricCriteria | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showAlert = (message: string, type: 'success' | 'error' | 'info' = 'success', duration = 4000) => {
    setAlert({ type, message });
    setTimeout(() => {
      setAlert((curr) => (curr?.message === message ? null : curr));
    }, duration);
  };

  const totalWeight = criteriaList.reduce((sum, c) => sum + c.weight, 0);
  const isWeightValid = totalWeight === 100;
  const availableRemaining = Math.max(0, 100 - totalWeight);

  // Fetch rubrics from Backend API on mount
  const fetchCriteria = useCallback(async () => {
    try {
      const res = await evaluationService.getRubrics();
      const rawCriteria =
        res?.data?.criteria ||
        res?.criteria ||
        res?.data?.rubrics?.[0]?.criteria ||
        res?.rubrics?.[0]?.criteria;

      if (Array.isArray(rawCriteria) && rawCriteria.length > 0) {
        const mapped: RubricCriteria[] = (rawCriteria as RawCriterion[]).map((c, index: number) => ({
          id: String(c.id || `rc-${index}`),
          name: c.title || c.name || `Tiêu chí ${index + 1}`,
          description: c.description || '',
          maxScore: Number(c.max_score ?? c.maxScore ?? 10),
          weight: Number(c.weight) <= 1 ? Math.round(Number(c.weight) * 100) : Number(c.weight),
          displayOrder: c.display_order ?? c.displayOrder ?? index + 1,
        }));
        setCriteriaList(mapped);
        useMockStore.setState({ rubricCriteria: mapped });
      } else {
        setCriteriaList(useMockStore.getState().rubricCriteria);
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg =
          err.response?.data?.message ||
          (err.response?.status === 403
            ? 'Yêu cầu quyền Quản trị viên (Admin) để tải tiêu chí.'
            : 'Không thể tải danh sách tiêu chí từ máy chủ.');
        showAlert(msg, 'error');
      } else {
        setCriteriaList(useMockStore.getState().rubricCriteria);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    evaluationService
      .getRubrics()
      .then((res) => {
        if (ignore) return;
        const rawCriteria =
          res?.data?.criteria ||
          res?.criteria ||
          res?.data?.rubrics?.[0]?.criteria ||
          res?.rubrics?.[0]?.criteria;

        if (Array.isArray(rawCriteria) && rawCriteria.length > 0) {
          const mapped: RubricCriteria[] = (rawCriteria as RawCriterion[]).map((c, index: number) => ({
            id: String(c.id || `rc-${index}`),
            name: c.title || c.name || `Tiêu chí ${index + 1}`,
            description: c.description || '',
            maxScore: Number(c.max_score ?? c.maxScore ?? 10),
            weight: Number(c.weight) <= 1 ? Math.round(Number(c.weight) * 100) : Number(c.weight),
            displayOrder: c.display_order ?? c.displayOrder ?? index + 1,
          }));
          setCriteriaList(mapped);
          useMockStore.setState({ rubricCriteria: mapped });
        } else {
          setCriteriaList(useMockStore.getState().rubricCriteria);
        }
      })
      .catch((err: unknown) => {
        if (ignore) return;
        if (axios.isAxiosError(err)) {
          const msg =
            err.response?.data?.message ||
            (err.response?.status === 403
              ? 'Yêu cầu quyền Quản trị viên (Admin) để tải tiêu chí.'
              : 'Không thể tải danh sách tiêu chí từ máy chủ.');
          showAlert(msg, 'error');
        } else {
          setCriteriaList(useMockStore.getState().rubricCriteria);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  // Persist rubric configuration to Backend API
  const saveToBackend = async (newCriteria: RubricCriteria[], successMsg?: string) => {
    const sum = newCriteria.reduce((acc, c) => acc + c.weight, 0);
    if (sum !== 100) {
      showAlert(`Tổng trọng số hiện tại là ${sum}%. Hệ thống yêu cầu chính xác 100% để lưu.`, 'error');
      return false;
    }

    setSaving(true);
    try {
      const payload: RubricConfigurePayload = {
        name: 'HackFlow Final Rubric',
        criteria: newCriteria.map((c, idx) => ({
          id: c.id,
          title: c.name.trim(),
          description: c.description.trim() || undefined,
          max_score: Number(c.maxScore) > 0 ? Number(c.maxScore) : 10,
          weight: Math.round((c.weight / 100) * 10000) / 10000,
          is_required: true,
          is_active: true,
          display_order: idx + 1,
        })),
      };

      const res = await evaluationService.configureRubrics(payload);
      const rawReturned =
        res?.data?.criteria ||
        res?.criteria ||
        res?.data?.rubrics?.[0]?.criteria ||
        res?.rubrics?.[0]?.criteria;

      let savedList: RubricCriteria[] = newCriteria;
      if (Array.isArray(rawReturned) && rawReturned.length > 0) {
        savedList = (rawReturned as RawCriterion[]).map((c, index: number) => ({
          id: String(c.id || `rc-${index}`),
          name: c.title || c.name || `Tiêu chí ${index + 1}`,
          description: c.description || '',
          maxScore: Number(c.max_score ?? c.maxScore ?? 10),
          weight: Number(c.weight) <= 1 ? Math.round(Number(c.weight) * 100) : Number(c.weight),
          displayOrder: c.display_order ?? c.displayOrder ?? index + 1,
        }));
      }

      setCriteriaList(savedList);
      useMockStore.setState({ rubricCriteria: savedList });
      showAlert(successMsg || 'Đã cấu hình và lưu ma trận tiêu chí Rubric thành công lên hệ thống!', 'success');
      return true;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const errCode = err.response?.data?.error_code;
        const serverMsg = err.response?.data?.message;

        if (status === 409 || errCode === 'RUBRIC_LOCKED_BY_EVALUATIONS') {
          showAlert(
            'Không thể sửa đổi tiêu chí vì Giám khảo đã nộp bảng điểm chấm thi. Hệ thống đã khóa Rubric.',
            'error',
            6000
          );
        } else if (status === 400 || errCode === 'CRITERIA_WEIGHT_INVALID') {
          showAlert(serverMsg || 'Tổng trọng số các tiêu chí phải đạt chính xác 100% (1.00).', 'error');
        } else if (status === 403) {
          showAlert('Bạn không có quyền thay đổi tiêu chí đánh giá (yêu cầu quyền Admin).', 'error');
        } else {
          showAlert(serverMsg || 'Có lỗi xảy ra khi lưu tiêu chí Rubric.', 'error');
        }
      } else {
        showAlert('Đã xảy ra lỗi không xác định khi lưu tiêu chí.', 'error');
      }
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Live calculation for preview inside Add Modal
  const getPreviewWeights = () => {
    const inputWeight = Math.min(100, Math.max(1, weight));
    const newCriterionName = name.trim() || 'Tiêu chí mới';

    if (rebalanceMode === 'equal') {
      const allCount = criteriaList.length + 1;
      const base = Math.floor(100 / allCount);
      const remainder = 100 - base * allCount;
      const previewExisting = criteriaList.map((c, idx) => ({
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
            newWeight: criteriaList.length < remainder ? base + 1 : base,
            isNew: true,
          },
        ],
        total: 100,
      };
    }

    if (rebalanceMode === 'proportional' && criteriaList.length > 0) {
      const remainingTarget = Math.max(0, 100 - inputWeight);
      const currentSum = criteriaList.reduce((sum, c) => sum + c.weight, 0);

      if (currentSum === 0 || remainingTarget === 0) {
        return {
          items: [
            ...criteriaList.map((c) => ({ name: c.name, oldWeight: c.weight, newWeight: 0, isNew: false })),
            { name: newCriterionName, oldWeight: 0, newWeight: inputWeight, isNew: true },
          ],
          total: inputWeight,
        };
      }

      const rawWeights = criteriaList.map((c) => (c.weight / currentSum) * remainingTarget);
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

      const previewItems = criteriaList.map((c, idx) => ({
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
    const total = criteriaList.reduce((s, c) => s + c.weight, 0) + inputWeight;
    return {
      items: [
        ...criteriaList.map((c) => ({ name: c.name, oldWeight: c.weight, newWeight: c.weight, isNew: false })),
        { name: newCriterionName, oldWeight: 0, newWeight: inputWeight, isNew: true },
      ],
      total,
    };
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let updatedList: RubricCriteria[];
    const newCriterion: RubricCriteria = {
      id: `rc-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      maxScore,
      weight,
      displayOrder: criteriaList.length + 1,
    };

    if (rebalanceMode === 'equal') {
      updatedList = rebalanceEqual([...criteriaList, newCriterion]);
    } else if (rebalanceMode === 'proportional') {
      if (criteriaList.length === 0) {
        updatedList = [{ ...newCriterion, weight: 100 }];
      } else {
        const remainingTarget = Math.max(0, 100 - weight);
        const currentSum = criteriaList.reduce((sum, c) => sum + c.weight, 0);
        if (currentSum === 0 || remainingTarget === 0) {
          updatedList = [
            ...criteriaList.map((c) => ({ ...c, weight: 0 })),
            { ...newCriterion, weight },
          ];
        } else {
          const rawWeights = criteriaList.map((c) => (c.weight / currentSum) * remainingTarget);
          const floored = rawWeights.map((w) => Math.floor(w));
          const allocated = floored.reduce((a, b) => a + b, 0);
          const remainder = remainingTarget - allocated;

          const fractions = rawWeights.map((w, idx) => ({ idx, fraction: w - floored[idx] }));
          fractions.sort((a, b) => b.fraction - a.fraction);

          const finalWeights = [...floored];
          for (let i = 0; i < remainder; i++) {
            finalWeights[fractions[i].idx] += 1;
          }
          const adjustedExisting = criteriaList.map((c, idx) => ({
            ...c,
            weight: Math.max(1, finalWeights[idx]),
          }));
          updatedList = [...adjustedExisting, newCriterion];
        }
      }
    } else {
      updatedList = [...criteriaList, newCriterion];
    }

    setIsAddOpen(false);
    setName('');
    setDescription('');

    const newTotal = updatedList.reduce((sum, c) => sum + c.weight, 0);
    if (newTotal === 100) {
      await saveToBackend(updatedList, 'Đã thêm tiêu chí mới và lưu thành công lên máy chủ!');
    } else {
      setCriteriaList(updatedList);
      useMockStore.setState({ rubricCriteria: updatedList });
      showAlert(
        `Đã thêm tiêu chí mới. Tổng trọng số hiện là ${newTotal}%. Vui lòng bấm 'Cân Bằng Tỷ Lệ' để đưa về 100% trước khi áp dụng.`,
        'info',
        5000
      );
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const updatedList = criteriaList.map((c) => (c.id === editingItem.id ? editingItem : c));
    setEditingItem(null);

    const newTotal = updatedList.reduce((sum, c) => sum + c.weight, 0);
    if (newTotal === 100) {
      await saveToBackend(updatedList, 'Đã cập nhật tiêu chí và lưu thành công lên máy chủ!');
    } else {
      setCriteriaList(updatedList);
      useMockStore.setState({ rubricCriteria: updatedList });
      showAlert(
        `Đã cập nhật tiêu chí. Tổng trọng số hiện là ${newTotal}%. Vui lòng điều chỉnh về 100% để lưu lên hệ thống.`,
        'info',
        5000
      );
    }
  };

  const handleDelete = async (id: string, criterionName: string) => {
    if (window.confirm(`Xóa tiêu chí "${criterionName}"?`)) {
      const remaining = criteriaList.filter((c) => c.id !== id);
      if (remaining.length === 0) {
        showAlert('Ma trận đánh giá phải có ít nhất 1 tiêu chí!', 'error');
        return;
      }

      // Automatically rebalance remaining criteria proportionally
      const balanced = rebalanceProportional(remaining);
      await saveToBackend(balanced, `Đã xóa tiêu chí "${criterionName}" và tự động cân đối lại 100%!`);
    }
  };

  const handleQuickRebalance = async (mode: 'proportional' | 'equal') => {
    if (criteriaList.length === 0) return;
    const balanced = mode === 'proportional' ? rebalanceProportional(criteriaList) : rebalanceEqual(criteriaList);
    await saveToBackend(
      balanced,
      mode === 'proportional'
        ? 'Đã chuẩn hóa tỷ lệ tất cả tiêu chí về đúng 100% và lưu lên hệ thống!'
        : 'Đã chia đều trọng số cho toàn bộ tiêu chí về 100% và lưu lên hệ thống!'
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-semibold tracking-tight text-foreground text-2xl sm:text-3xl">
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
            onClick={() => {
              setLoading(true);
              void fetchCriteria();
            }}
            disabled={loading}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            title="Tải lại ma trận tiêu chí từ Backend"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickRebalance('proportional')}
            disabled={saving || criteriaList.length === 0}
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
            disabled={saving || criteriaList.length === 0}
            className="gap-1.5 text-xs text-sky-700 dark:text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
            title="Chia đều 100% cho toàn bộ tiêu chí"
          >
            <Sliders size={14} />
            <span>Chia Đều</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => saveToBackend(criteriaList)}
            disabled={saving || !isWeightValid || criteriaList.length === 0}
            className={`gap-1.5 text-xs font-semibold ${
              isWeightValid
                ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                : 'opacity-50 cursor-not-allowed'
            }`}
            title="Lưu cấu hình tiêu chí lên máy chủ Backend"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span>Lưu Lên Hệ Thống</span>
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
          {criteriaList.map((c, idx) => {
            const color = CRITERIA_COLORS[idx % CRITERIA_COLORS.length];
            return (
              <div
                key={c.id}
                style={{
                  width: `${Math.min(100, Math.max(2, (c.weight / Math.max(100, totalWeight)) * 100))}%`,
                  backgroundColor: color,
                }}
                className="h-full rounded-[6px] transition-all duration-300 relative group flex items-center justify-center text-[10px] font-bold text-white shadow-sm overflow-hidden"
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
          {criteriaList.map((c, idx) => {
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
              disabled={saving}
              className="px-3 py-1.5 rounded-full bg-[#6366F1] hover:bg-[#5558d9] text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
            >
              <Sparkles size={13} />
              <span>Chuẩn hóa 100% ngay</span>
            </button>
            <button
              onClick={() => handleQuickRebalance('equal')}
              disabled={saving}
              className="px-3 py-1.5 rounded-full bg-muted/60 hover:bg-accent border border-border text-foreground font-medium text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Sliders size={13} />
              <span>Chia đều</span>
            </button>
          </div>
        )}
      </div>

      {alert && (
        <div
          className={`p-3.5 rounded-[10px] border text-xs flex items-center gap-2 transition-all ${
            alert.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
              : alert.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
              : 'bg-sky-500/10 border-sky-500/30 text-sky-700 dark:text-sky-400'
          }`}
        >
          {alert.type === 'success' ? (
            <CheckCircle2 size={16} className="shrink-0" />
          ) : alert.type === 'error' ? (
            <AlertCircle size={16} className="shrink-0" />
          ) : (
            <Info size={16} className="shrink-0" />
          )}
          <span className="font-medium">{alert.message}</span>
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
              {loading && criteriaList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground text-xs">
                    <Loader2 className="mx-auto mb-2 animate-spin text-primary" size={28} />
                    Đang tải ma trận tiêu chí chấm điểm từ máy chủ...
                  </td>
                </tr>
              ) : criteriaList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground text-xs">
                    <Scale className="mx-auto mb-2 opacity-30 text-muted-foreground" size={32} />
                    Chưa có tiêu chí Rubric nào. Bấm "Thêm Tiêu Chí" để bắt đầu thiết lập ma trận chấm điểm.
                  </td>
                </tr>
              ) : (
                criteriaList.map((c, idx) => {
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
                            disabled={saving}
                            className="p-1.5 rounded-md hover:bg-accent text-primary hover:text-foreground transition-colors disabled:opacity-40"
                            title="Chỉnh sửa tiêu chí"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id, c.name)}
                            disabled={saving}
                            className="p-1.5 rounded-md hover:bg-accent text-rose-700 dark:text-rose-400 hover:text-rose-300 transition-colors disabled:opacity-40"
                            title="Xóa tiêu chí"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Criterion */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Thêm Tiêu Chí Đánh Giá Mới">
        <form onSubmit={handleAdd} className="space-y-4">
          <Input
            label="Tên tiêu chí *"
            placeholder="Ví dụ: Tính Sáng Tạo & Đột Phá"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-muted-foreground font-medium text-xs">Mô tả hướng dẫn chấm *</label>
            <textarea
              rows={3}
              placeholder="Mô tả cụ thể căn cứ để Ban Giám khảo chấm điểm bài thi..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="p-3 rounded-[10px] bg-muted/40 dark:bg-slate-900/60 border border-border text-foreground text-xs focus:border-[#6366F1] focus:outline-none placeholder:text-muted-foreground"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Điểm tối đa *"
              type="number"
              min={1}
              max={100}
              value={maxScore}
              onChange={(e) => setMaxScore(Number(e.target.value))}
              required
            />

            <Input
              label="Trọng số mong muốn (%) *"
              type="number"
              min={1}
              max={100}
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              required
            />
          </div>

          {/* Rebalance Mode Choice */}
          <div className="p-3.5 rounded-[12px] bg-muted/40 dark:bg-slate-900/60 border border-border space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Sliders size={14} className="text-primary" />
              <span>Chế độ tự động cân đối trọng số khi thêm:</span>
            </div>

            <div className="space-y-2 text-xs">
              <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded-[8px] hover:bg-card border border-transparent hover:border-border transition-colors">
                <input
                  type="radio"
                  name="rebalanceMode"
                  value="proportional"
                  checked={rebalanceMode === 'proportional'}
                  onChange={() => setRebalanceMode('proportional')}
                  className="mt-0.5 accent-[#6366F1]"
                />
                <div>
                  <div className="font-semibold text-foreground">Tự động co dãn tỷ lệ (Khuyên dùng)</div>
                  <div className="text-muted-foreground text-[11px]">
                    Giữ nguyên {weight}% cho tiêu chí mới, tự động co giảm các tiêu chí cũ theo đúng tỷ lệ ban đầu để
                    tổng luôn bằng 100%.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded-[8px] hover:bg-card border border-transparent hover:border-border transition-colors">
                <input
                  type="radio"
                  name="rebalanceMode"
                  value="equal"
                  checked={rebalanceMode === 'equal'}
                  onChange={() => setRebalanceMode('equal')}
                  className="mt-0.5 accent-[#6366F1]"
                />
                <div>
                  <div className="font-semibold text-foreground">Chia đều toàn bộ</div>
                  <div className="text-muted-foreground text-[11px]">
                    Tất cả các tiêu chí (cả mới và cũ) sẽ được chia đều trọng số sao cho tổng đạt đúng 100%.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded-[8px] hover:bg-card border border-transparent hover:border-border transition-colors">
                <input
                  type="radio"
                  name="rebalanceMode"
                  value="none"
                  checked={rebalanceMode === 'none'}
                  onChange={() => setRebalanceMode('none')}
                  className="mt-0.5 accent-[#6366F1]"
                />
                <div>
                  <div className="font-semibold text-foreground">Không cân bằng tự động (Tự căn chỉnh thủ công)</div>
                  <div className="text-muted-foreground text-[11px]">
                    Thêm trực tiếp {weight}%. Tổng trọng số có thể lệch 100% và bạn sẽ tự căn chỉnh sau.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Live Preview Bar inside modal */}
          {(() => {
            const preview = getPreviewWeights();
            const isValid = preview.total === 100;
            return (
              <div className="p-3 rounded-[10px] bg-muted/40 dark:bg-slate-900/60 border border-border space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground font-medium">Xem trước phân bổ:</span>
                  <span
                    className={`font-mono font-bold ${
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
                            <span className="text-muted-foreground line-through mr-1">{item.oldWeight}%</span>
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
      <Modal isOpen={Boolean(editingItem)} onClose={() => setEditingItem(null)} title="Chỉnh Sửa Tiêu Chí Chấm Điểm">
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
                min={1}
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
