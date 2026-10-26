import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CheckCircle2,
  Mail,
  Plus,
  Shuffle,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import type {
  CandidateDirectoryEntry,
  EnrichedAdminTeam,
} from '../../api/adminTeamsApi';
import {
  adminTeamFormSchema,
  type AdminTeamFormValues,
} from '../../hooks/useAdminTeams';
import type { MajorTopic } from '../../types';
import { useMockStore } from '../../store/useMockStore';

export interface TeamFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTeam: EnrichedAdminTeam | null;
  majorTopics: MajorTopic[];
  candidatesDirectory?: CandidateDirectoryEntry[];
  isSubmitting: boolean;
  onSubmitForm: (values: AdminTeamFormValues) => Promise<boolean>;
}

const generateRandomInviteCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'HF';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const TeamFormDialog: React.FC<TeamFormDialogProps> = ({
  open,
  onOpenChange,
  editingTeam,
  majorTopics,
  candidatesDirectory = [],
  isSubmitting,
  onSubmitForm,
}) => {
  const defaultMajor = majorTopics[0]?.id || 'major-ai';
  const defaultSub = majorTopics[0]?.subTopics[0]?.id || 'sub-ai-01';

  const [pendingMemberEmail, setPendingMemberEmail] = useState('');
  const [memberInputError, setMemberInputError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<AdminTeamFormValues>({
    resolver: zodResolver(adminTeamFormSchema),
    defaultValues: {
      name: '',
      inviteCode: 'HF2026',
      leaderEmail: '',
      leaderName: '',
      university: '',
      memberEmails: [],
      majorTopicId: defaultMajor,
      subTopicId: defaultSub,
      memberCount: 3,
      repoUrl: '',
      description: '',
    },
  });

  const config = useMockStore((s) => s.config);
  const minTeamSize = Math.max(1, Number(config?.minTeamMembers ?? config?.minTeamSize ?? 3));
  const maxTeamSize = Math.max(minTeamSize, Number(config?.maxTeamMembers ?? config?.maxTeamSize ?? 5));
  const maxMemberEmails = Math.max(1, maxTeamSize - 1);

  const selectedMajorId = useWatch({ control, name: 'majorTopicId' });
  const memberCountValue = Number(useWatch({ control, name: 'memberCount' }) || minTeamSize);
  const leaderEmailValue = (useWatch({ control, name: 'leaderEmail' }) || '')
    .trim()
    .toLowerCase();
  const memberEmailsValue = useWatch({ control, name: 'memberEmails' }) || [];
  const descriptionValue = useWatch({ control, name: 'description' }) || '';

  const availableSubTopics =
    majorTopics.find((m) => m.id === selectedMajorId)?.subTopics ||
    majorTopics.flatMap((m) => m.subTopics);

  // Map email -> candidate profile from database
  const candidateByEmail = useMemo(() => {
    const map = new Map<string, CandidateDirectoryEntry>();
    for (const c of candidatesDirectory) {
      if (c.email) {
        map.set(c.email.trim().toLowerCase(), c);
      }
    }
    return map;
  }, [candidatesDirectory]);

  const unassignedPool = useMemo(
    () =>
      candidatesDirectory.filter(
        (c) => !c.hasTeam && c.approval_status === 'approved',
      ),
    [candidatesDirectory],
  );

  const matchedLeaderProfile = useMemo(
    () => (leaderEmailValue ? candidateByEmail.get(leaderEmailValue) : undefined),
    [candidateByEmail, leaderEmailValue],
  );

  // Auto-fill leaderName & university from DB whenever leaderEmail matches a known candidate
  useEffect(() => {
    if (!matchedLeaderProfile) return;
    setValue('leaderName', matchedLeaderProfile.fullName, {
      shouldValidate: false,
    });
    setValue(
      'university',
      matchedLeaderProfile.school || matchedLeaderProfile.university,
      { shouldValidate: false },
    );
  }, [matchedLeaderProfile, setValue]);

  // Guard reset so it ONLY fires when dialog opens or editingTeam.id changes (Fixes BUG-09)
  const wasOpenRef = useRef(false);
  const lastEditingIdRef = useRef<string | null>(null);

  useEffect(() => {
    const currentEditingId = editingTeam?.id ?? null;
    const justOpened = open && !wasOpenRef.current;
    const teamSwitchedWhileOpen =
      open && wasOpenRef.current && currentEditingId !== lastEditingIdRef.current;

    wasOpenRef.current = open;
    lastEditingIdRef.current = currentEditingId;

    if (!justOpened && !teamSwitchedWhileOpen) {
      return;
    }

    setPendingMemberEmail('');
    setMemberInputError(null);

    if (editingTeam) {
      const matchedMajorBySub = majorTopics.find((m) =>
        m.subTopics.some((s) => s.id === editingTeam.subTopicId),
      );
      const validMajor =
        majorTopics.find((m) => m.id === editingTeam.majorTopicId) ||
        matchedMajorBySub ||
        majorTopics[0];
      const resolvedMajorId = validMajor?.id || defaultMajor;
      const validSub =
        validMajor?.subTopics.find((s) => s.id === editingTeam.subTopicId) ||
        validMajor?.subTopics[0];
      const resolvedSubId =
        validSub?.id || editingTeam.subTopicId || defaultSub;

      const leaderEm = (editingTeam.leaderEmail || '').trim().toLowerCase();
      const existingMemberEmails = editingTeam.members
        .map((m) => (m.email || '').trim().toLowerCase())
        .filter((em) => em && em !== leaderEm);

      reset({
        name: editingTeam.name || '',
        inviteCode: editingTeam.inviteCode || 'HF2026',
        leaderEmail: editingTeam.leaderEmail || '',
        leaderName: editingTeam.leaderName || '',
        university: editingTeam.university || '',
        memberEmails: existingMemberEmails,
        majorTopicId: resolvedMajorId,
        subTopicId: resolvedSubId,
        memberCount: Math.min(
          maxTeamSize,
          Math.max(
            minTeamSize,
            editingTeam.memberCount || editingTeam.members.length || 1 + existingMemberEmails.length,
          ),
        ),
        repoUrl: editingTeam.repoUrl || '',
        description:
          editingTeam.description ||
          `Giải pháp kỹ thuật do đội thi ${editingTeam.name} phát triển tại Hackathon.`,
      });
    } else {
      reset({
        name: '',
        inviteCode: generateRandomInviteCode(),
        leaderEmail: '',
        leaderName: '',
        university: '',
        memberEmails: [],
        majorTopicId: defaultMajor,
        subTopicId: defaultSub,
        memberCount: 3,
        repoUrl: '',
        description: '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingTeam?.id]);

  // If majorTopics arrives asynchronously after dialog opens and topic fields are still fallback IDs, sync once without resetting user inputs
  useEffect(() => {
    if (!open || majorTopics.length === 0) return;
    const isValidMajor = majorTopics.some((m) => m.id === selectedMajorId);
    if (!isValidMajor) {
      const firstMajor = majorTopics[0];
      setValue('majorTopicId', firstMajor.id, { shouldValidate: false });
      if (firstMajor.subTopics[0]) {
        setValue('subTopicId', firstMajor.subTopics[0].id, {
          shouldValidate: false,
        });
      }
    }
  }, [open, majorTopics, selectedMajorId, setValue]);

  const handleAddMemberEmail = (rawEmail?: string) => {
    const emailToAdd = (rawEmail ?? pendingMemberEmail).trim().toLowerCase();
    setMemberInputError(null);

    if (!emailToAdd) {
      setMemberInputError('Vui lòng nhập hoặc chọn một địa chỉ email thành viên.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToAdd)) {
      setMemberInputError('Địa chỉ email không đúng định dạng hợp lệ.');
      return;
    }
    if (emailToAdd === leaderEmailValue) {
      setMemberInputError('Email này đã được chọn làm Đội trưởng.');
      return;
    }
    if (memberEmailsValue.some((e) => e.toLowerCase() === emailToAdd)) {
      setMemberInputError('Email thành viên này đã có trong danh sách đội.');
      return;
    }
    if (memberEmailsValue.length >= maxMemberEmails) {
      setMemberInputError(
        `Mỗi đội chỉ được tối đa ${maxTeamSize} người (1 Đội trưởng + ${maxMemberEmails} Thành viên).`,
      );
      return;
    }

    const updated = [...memberEmailsValue, emailToAdd];
    setValue('memberEmails', updated, { shouldValidate: true });
    if (1 + updated.length > memberCountValue) {
      setValue('memberCount', Math.min(maxTeamSize, 1 + updated.length), {
        shouldValidate: true,
      });
    }
    if (!rawEmail) {
      setPendingMemberEmail('');
    }
  };

  const handleRemoveMemberEmail = (emailToRemove: string) => {
    const updated = memberEmailsValue.filter(
      (e) => e.toLowerCase() !== emailToRemove.toLowerCase(),
    );
    setValue('memberEmails', updated, { shouldValidate: true });
    setMemberInputError(null);
  };

  const handleQuickFillFromUnassigned = () => {
    setMemberInputError(null);
    const available = unassignedPool.filter(
      (c) =>
        c.email.toLowerCase() !== leaderEmailValue &&
        !memberEmailsValue.some((m) => m.toLowerCase() === c.email.toLowerCase()),
    );
    if (available.length === 0) {
      setMemberInputError('Không còn thí sinh lẻ nào chưa được chọn.');
      return;
    }

    let nextLeader = leaderEmailValue;
    const pool = [...available];
    if (!nextLeader && pool.length > 0) {
      const pickedLeader = pool.shift()!;
      nextLeader = pickedLeader.email.toLowerCase();
      setValue('leaderEmail', nextLeader, { shouldValidate: true });
      setValue('leaderName', pickedLeader.fullName, { shouldValidate: false });
      setValue('university', pickedLeader.school || pickedLeader.university, {
        shouldValidate: false,
      });
    }

    const targetExtraMembers = Math.max(minTeamSize - 1, memberCountValue - 1);
    const slotsNeeded = Math.max(0, targetExtraMembers - memberEmailsValue.length);
    const toAdd = pool
      .slice(0, Math.min(slotsNeeded || 1, maxMemberEmails - memberEmailsValue.length))
      .map((c) => c.email.toLowerCase());

    if (toAdd.length > 0) {
      const updated = [...memberEmailsValue, ...toAdd];
      setValue('memberEmails', updated, { shouldValidate: true });
      setValue(
        'memberCount',
        Math.min(maxTeamSize, Math.max(memberCountValue, 1 + updated.length)),
        { shouldValidate: true },
      );
    }
  };

  const totalMembersCount = Math.max(
    memberCountValue,
    1 + memberEmailsValue.length,
  );
  const isSizeValid =
    totalMembersCount >= minTeamSize && totalMembersCount <= maxTeamSize;

  const onFormValid = async (values: AdminTeamFormValues) => {
    const resolvedLeader = candidateByEmail.get(
      values.leaderEmail.trim().toLowerCase(),
    );
    const effectiveCount = Math.min(
      maxTeamSize,
      Math.max(Number(values.memberCount) || minTeamSize, 1 + values.memberEmails.length),
    );
    const finalValues: AdminTeamFormValues = {
      ...values,
      leaderName:
        values.leaderName?.trim() ||
        resolvedLeader?.fullName ||
        values.leaderEmail.split('@')[0],
      university:
        values.university?.trim() ||
        resolvedLeader?.school ||
        resolvedLeader?.university ||
        'ĐH Bách Khoa Hà Nội (HUST)',
      memberCount: effectiveCount,
    };
    const ok = await onSubmitForm(finalValues);
    if (ok) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editingTeam
              ? `Chỉnh sửa Hồ sơ Đội thi: ${editingTeam.name}`
              : 'Tạo Đội thi Mới theo Email (Hỗ trợ sau đóng cổng)'}
          </DialogTitle>
          <DialogDescription>
            Chỉ cần chọn hoặc nhập <strong>Email Đội trưởng</strong> và{' '}
            <strong>2–4 Email Thành viên</strong>. Hệ thống tự động đồng bộ Họ tên,
            Trường đại học, MSSV và Kỹ năng từ cơ sở dữ liệu thí sinh.
          </DialogDescription>
        </DialogHeader>

        <datalist id="candidate-email-datalist">
          {candidatesDirectory.map((c) => (
            <option
              key={c.id}
              value={c.email}
              label={`${c.fullName} — ${c.school} (${c.hasTeam ? `Đội: ${c.teamName}` : 'Chưa có đội'})`}
            />
          ))}
        </datalist>

        <form
          onSubmit={handleSubmit(onFormValid)}
          noValidate
          className="flex flex-col flex-1 min-h-0 overflow-hidden"
        >
          <DialogBody className="space-y-4">
            {/* Row 1: Team Name, Target Team Size (BUG-05) & Invite Code */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-5 space-y-1.5">
                <Label htmlFor="team-form-name" requiredIndicator>
                  Tên đội thi
                </Label>
                <Input
                  id="team-form-name"
                  placeholder="VD: CyberSamurai, NeuralCrafters..."
                  hasError={Boolean(errors.name)}
                  disabled={isSubmitting}
                  {...register('name')}
                />
                {errors.name && (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="sm:col-span-4 space-y-1.5">
                <Label htmlFor="team-form-member-count" requiredIndicator>
                  Quy mô đội thi ({minTeamSize}–{maxTeamSize} TV)
                </Label>
                <Select
                  id="team-form-member-count"
                  value={String(memberCountValue)}
                  disabled={isSubmitting}
                  onChange={(e) => {
                    const nextVal = Number(e.target.value);
                    if (nextVal >= minTeamSize && nextVal <= maxTeamSize) {
                      setValue('memberCount', nextVal, { shouldValidate: true });
                    }
                  }}
                >
                  {Array.from({ length: maxTeamSize }, (_, i) => i + 1).map((cnt) => {
                    const isBelowMin = cnt < minTeamSize;
                    return (
                      <option key={cnt} value={cnt} disabled={isBelowMin}>
                        {cnt} thành viên{' '}
                        {isBelowMin
                          ? `(Dưới tối thiểu ${minTeamSize} TV - Không đủ ĐK chọn đề tài)`
                          : cnt === minTeamSize
                          ? '(Tối thiểu đủ ĐK chọn đề tài)'
                          : cnt === maxTeamSize
                          ? '(Tối đa cho phép)'
                          : '(Hợp lệ)'}
                      </option>
                    );
                  })}
                </Select>
                {errors.memberCount && (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    {errors.memberCount.message}
                  </p>
                )}
              </div>

              <div className="sm:col-span-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="team-form-code" requiredIndicator>
                    Mã mời (6 ký tự)
                  </Label>
                  <button
                    type="button"
                    onClick={() =>
                      setValue('inviteCode', generateRandomInviteCode(), {
                        shouldValidate: true,
                      })
                    }
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline cursor-pointer"
                  >
                    <Shuffle size={11} />
                    <span>Đổi mã</span>
                  </button>
                </div>
                <Input
                  id="team-form-code"
                  placeholder="HF2026"
                  maxLength={6}
                  className="font-mono uppercase"
                  hasError={Boolean(errors.inviteCode)}
                  disabled={isSubmitting}
                  {...register('inviteCode')}
                />
                {errors.inviteCode && (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    {errors.inviteCode.message}
                  </p>
                )}
              </div>
            </div>

            {/* Row 2: Leader Email Lookup + Auto-Resolved Profile Card */}
            <div className="rounded-lg border border-border bg-muted/20 p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="team-form-leader-email" requiredIndicator>
                  1. Email Đội trưởng (Tự động tra cứu hồ sơ từ CSDL)
                </Label>
                {unassignedPool.length > 0 && (
                  <button
                    type="button"
                    onClick={handleQuickFillFromUnassigned}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
                  >
                    <Sparkles size={13} />
                    <span>
                      Điền nhanh từ {unassignedPool.length} thí sinh chưa có đội
                    </span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-7">
                  <Input
                    id="team-form-leader-email"
                    type="email"
                    list="candidate-email-datalist"
                    placeholder="Nhập hoặc chọn email đội trưởng (VD: duc.pham@hust.edu.vn)"
                    hasError={Boolean(errors.leaderEmail)}
                    disabled={isSubmitting}
                    {...register('leaderEmail')}
                  />
                </div>
                <div className="sm:col-span-5">
                  <Select
                    aria-label="Chọn nhanh Đội trưởng từ danh sách chưa có đội"
                    value=""
                    disabled={isSubmitting || unassignedPool.length === 0}
                    onChange={(e) => {
                      const pickedEmail = e.target.value;
                      if (!pickedEmail) return;
                      setValue('leaderEmail', pickedEmail, {
                        shouldValidate: true,
                      });
                      // Also remove from memberEmails if present
                      if (
                        memberEmailsValue.some(
                          (m) => m.toLowerCase() === pickedEmail.toLowerCase(),
                        )
                      ) {
                        handleRemoveMemberEmail(pickedEmail);
                      }
                    }}
                  >
                    <option value="">
                      -- Chọn nhanh thí sinh lẻ ({unassignedPool.length}) --
                    </option>
                    {unassignedPool.map((c) => (
                      <option key={c.id} value={c.email}>
                        {c.fullName} ({c.email})
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {errors.leaderEmail && (
                <p role="alert" className="text-xs font-medium text-destructive">
                  {errors.leaderEmail.message}
                </p>
              )}

              {/* Resolved Leader Info Preview */}
              {matchedLeaderProfile ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <UserCheck size={15} className="text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-semibold text-foreground">
                        {matchedLeaderProfile.fullName}
                      </span>{' '}
                      <span className="text-muted-foreground">
                        • MSSV: {matchedLeaderProfile.studentId} •{' '}
                        {matchedLeaderProfile.school}
                      </span>
                    </div>
                  </div>
                  <Badge variant="success" size="sm">
                    Đã đồng bộ từ CSDL
                  </Badge>
                </div>
              ) : leaderEmailValue ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div className="space-y-1">
                    <Label htmlFor="team-form-leader-name" className="text-xs">
                      Họ tên Đội trưởng (Tùy chọn nếu email mới)
                    </Label>
                    <Input
                      id="team-form-leader-name"
                      placeholder="Tự động suy luận nếu để trống"
                      disabled={isSubmitting}
                      {...register('leaderName')}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="team-form-university" className="text-xs">
                      Trường / Đơn vị (Tùy chọn)
                    </Label>
                    <Input
                      id="team-form-university"
                      placeholder="VD: ĐH Bách Khoa Hà Nội (HUST)"
                      disabled={isSubmitting}
                      {...register('university')}
                    />
                  </div>
                </div>
              ) : null}
            </div>

            {/* Row 3: Member Emails List (2 to 4 members -> Total 3 to 5) */}
            <div className="rounded-lg border border-border bg-muted/20 p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Users size={15} className="text-primary" />
                  <Label requiredIndicator>
                    2. Danh sách Email Thành viên (Thêm 2–4 thành viên)
                  </Label>
                </div>
                <Badge
                  variant={isSizeValid ? 'success' : 'warning'}
                  size="sm"
                >
                  Quy mô đội: {totalMembersCount}/5 người (1 Đội trưởng +{' '}
                  {memberEmailsValue.length} Thành viên)
                </Badge>
              </div>

              {/* Add member email bar */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
                  <Input
                    type="email"
                    list="candidate-email-datalist"
                    value={pendingMemberEmail}
                    onChange={(e) => {
                      setPendingMemberEmail(e.target.value);
                      setMemberInputError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddMemberEmail();
                      }
                    }}
                    placeholder="Nhập email thành viên rồi nhấn Enter hoặc nút Thêm..."
                    disabled={isSubmitting || memberEmailsValue.length >= 4}
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  disabled={isSubmitting || memberEmailsValue.length >= 4}
                  onClick={() => handleAddMemberEmail()}
                >
                  <Plus size={14} />
                  <span>Thêm email</span>
                </Button>
              </div>

              {/* Quick-pick chips for unassigned candidates */}
              {unassignedPool.length > 0 && memberEmailsValue.length < 4 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Chọn nhanh thí sinh đã đăng nhập nhưng chưa có đội (nhấn để thêm):
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {unassignedPool
                      .filter(
                        (c) =>
                          c.email.toLowerCase() !== leaderEmailValue &&
                          !memberEmailsValue.some(
                            (m) => m.toLowerCase() === c.email.toLowerCase(),
                          ),
                      )
                      .map((cand) => (
                        <button
                          key={cand.id}
                          type="button"
                          onClick={() => handleAddMemberEmail(cand.email)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-foreground hover:border-primary hover:bg-primary/10 transition-colors cursor-pointer"
                        >
                          <Plus size={11} className="text-primary" />
                          <span className="font-medium">{cand.fullName}</span>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            ({cand.email})
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {(memberInputError || errors.memberEmails) && (
                <p role="alert" className="text-xs font-medium text-destructive">
                  {memberInputError || errors.memberEmails?.message}
                </p>
              )}

              {/* Current Added Member Emails List */}
              {memberEmailsValue.length === 0 ? (
                <div className="rounded-md border border-dashed border-border px-3 py-3 text-center text-xs text-muted-foreground">
                  Chưa có thành viên nào được thêm. Vui lòng chọn hoặc nhập ít nhất{' '}
                  <strong>2 email thành viên</strong> để đủ điều kiện 3–5 người/đội.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {memberEmailsValue.map((em, idx) => {
                    const prof = candidateByEmail.get(em.toLowerCase());
                    return (
                      <div
                        key={em}
                        className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-[11px] font-semibold text-primary">
                            #{idx + 2}
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-semibold text-foreground">
                                {prof ? prof.fullName : em.split('@')[0]}
                              </span>
                              <span className="font-mono text-muted-foreground">
                                &lt;{em}&gt;
                              </span>
                              {prof && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                                  <CheckCircle2 size={11} />
                                  {prof.school} • MSSV: {prof.studentId}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveMemberEmail(em)}
                          className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                          title="Xóa thành viên này"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Row 4: Major Topic & Sub-Topic (Requires minTeamSize <= totalMembersCount <= maxTeamSize) */}
            <div className="rounded-lg border border-border bg-muted/15 p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-foreground">
                  3. Đăng ký Đề tài thi đấu (Yêu cầu đội có từ {minTeamSize} đến {maxTeamSize} thành viên)
                </span>
                <Badge variant={isSizeValid ? 'success' : 'warning'} size="sm">
                  {isSizeValid
                    ? `Đủ điều kiện chọn đề tài (${totalMembersCount}/${maxTeamSize} TV)`
                    : `Chưa đủ điều kiện (${totalMembersCount}/${minTeamSize} TV tối thiểu)`}
                </Badge>
              </div>
              {!isSizeValid && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Đội thi phải đạt tối thiểu {minTeamSize} thành viên và tối đa {maxTeamSize} thành viên mới được phép đăng ký đề tài.
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="team-form-major-topic" requiredIndicator>
                  Lĩnh vực thi đấu (Track)
                </Label>
                <Select
                  id="team-form-major-topic"
                  hasError={Boolean(errors.majorTopicId)}
                  disabled={isSubmitting || !isSizeValid}
                  {...register('majorTopicId', {
                    onChange: (e) => {
                      const nextMajor = majorTopics.find(
                        (m) => m.id === e.target.value,
                      );
                      if (nextMajor?.subTopics[0]) {
                        setValue('subTopicId', nextMajor.subTopics[0].id, {
                          shouldValidate: true,
                        });
                      }
                    },
                  })}
                >
                  {majorTopics.map((major) => (
                    <option key={major.id} value={major.id}>
                      {major.title || major.name}
                    </option>
                  ))}
                </Select>
                {errors.majorTopicId && (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    {errors.majorTopicId.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="team-form-sub-topic" requiredIndicator>
                  Đề tài nhánh đăng ký
                </Label>
                <Select
                  id="team-form-sub-topic"
                  hasError={Boolean(errors.subTopicId)}
                  disabled={isSubmitting || !isSizeValid}
                  {...register('subTopicId')}
                >
                  {availableSubTopics.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.title} (Slot: {sub.currentTeams ?? 0}/{sub.quota ?? 5})
                    </option>
                  ))}
                </Select>
                {errors.subTopicId && (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    {errors.subTopicId.message}
                  </p>
                )}
              </div>
              </div>
            </div>

            {/* Row 5: Repository URL */}
            <div className="space-y-1.5">
              <Label htmlFor="team-form-repo">
                Kho mã nguồn GitHub (Tùy chọn)
              </Label>
              <Input
                id="team-form-repo"
                type="url"
                placeholder="https://github.com/organization/project-repo"
                className="font-mono text-xs"
                hasError={Boolean(errors.repoUrl)}
                disabled={isSubmitting}
                {...register('repoUrl')}
              />
              {errors.repoUrl ? (
                <p role="alert" className="text-xs font-medium text-destructive">
                  {errors.repoUrl.message}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Hệ thống sẽ dùng kho mã nguồn này để đóng băng Commit SHA ở chặng cuối.
                </p>
              )}
            </div>

            {/* Row 6: Technical Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="team-form-description" requiredIndicator>
                  Tóm tắt đề xuất kỹ thuật & Giải pháp
                </Label>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {descriptionValue.trim().length}/500
                </span>
              </div>
              <Textarea
                id="team-form-description"
                rows={2}
                placeholder="Mô tả bài toán, kiến trúc kỹ thuật và công nghệ cốt lõi của đội thi..."
                hasError={Boolean(errors.description)}
                disabled={isSubmitting}
                {...register('description')}
              />
              {errors.description && (
                <p role="alert" className="text-xs font-medium text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              loadingText="Đang lưu vào CSDL..."
            >
              <Mail size={15} />
              <span>
                {editingTeam
                  ? `Lưu cập nhật (${totalMembersCount} thành viên)`
                  : `Tạo đội thi (${totalMembersCount} thành viên)`}
              </span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
