import React, { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Shuffle } from 'lucide-react';
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
import {
  adminTeamFormSchema,
  type AdminTeamFormValues,
} from '../../hooks/useAdminTeams';
import type { EnrichedAdminTeam } from '../../mocks/adminTeamsMockData';
import type { MajorTopic } from '../../types';

export interface TeamFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTeam: EnrichedAdminTeam | null;
  majorTopics: MajorTopic[];
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
  isSubmitting,
  onSubmitForm,
}) => {
  const defaultMajor = majorTopics[0]?.id || 'major-ai';
  const defaultSub =
    majorTopics[0]?.subTopics[0]?.id || 'sub-ai-01';

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
      leaderName: '',
      leaderEmail: '',
      university: '',
      majorTopicId: defaultMajor,
      subTopicId: defaultSub,
      memberCount: 3,
      repoUrl: '',
      description: '',
    },
  });

  const selectedMajorId = useWatch({ control, name: 'majorTopicId' });
  const descriptionValue = useWatch({ control, name: 'description' }) || '';

  const availableSubTopics =
    majorTopics.find((m) => m.id === selectedMajorId)?.subTopics ||
    majorTopics.flatMap((m) => m.subTopics);

  useEffect(() => {
    if (!open) return;

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

      reset({
        name: editingTeam.name || '',
        inviteCode: editingTeam.inviteCode || 'HF2026',
        leaderName: editingTeam.leaderName || 'Đội trưởng',
        leaderEmail: editingTeam.leaderEmail || 'leader@hackflow.dev',
        university: editingTeam.university || 'ĐH Bách Khoa Hà Nội (HUST)',
        majorTopicId: resolvedMajorId,
        subTopicId: resolvedSubId,
        memberCount: Math.min(
          5,
          Math.max(3, editingTeam.memberCount ?? editingTeam.members.length ?? 3),
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
        leaderName: '',
        leaderEmail: '',
        university: '',
        majorTopicId: defaultMajor,
        subTopicId: defaultSub,
        memberCount: 3,
        repoUrl: '',
        description: '',
      });
    }
  }, [open, editingTeam, majorTopics, defaultMajor, defaultSub, reset]);

  const onFormValid = async (values: AdminTeamFormValues) => {
    const ok = await onSubmitForm(values);
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
              : 'Đăng ký Đội thi Mới (Quản trị viên)'}
          </DialogTitle>
          <DialogDescription>
            {editingTeam
              ? 'Cập nhật thông tin định danh, đề tài đăng ký và quy mô thành viên của đội thi.'
              : 'Khởi tạo đội thi hợp lệ vào hệ thống kèm mã mời bảo mật 6 ký tự và phân bổ đề tài.'}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onFormValid)}
          noValidate
          className="flex flex-col flex-1 min-h-0 overflow-hidden"
        >
          <DialogBody className="space-y-4">
            {/* Row 1: Team Name & Invite Code */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-8 space-y-1.5">
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
                    <span>Tạo mã</span>
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

            {/* Row 2: Leader Name & Leader Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="team-form-leader-name" requiredIndicator>
                  Họ và tên Đội trưởng
                </Label>
                <Input
                  id="team-form-leader-name"
                  placeholder="Nguyễn Văn Minh"
                  hasError={Boolean(errors.leaderName)}
                  disabled={isSubmitting}
                  {...register('leaderName')}
                />
                {errors.leaderName && (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    {errors.leaderName.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="team-form-leader-email" requiredIndicator>
                  Email Đội trưởng (Tài khoản OAuth)
                </Label>
                <Input
                  id="team-form-leader-email"
                  type="email"
                  placeholder="leader@sis.hust.edu.vn"
                  hasError={Boolean(errors.leaderEmail)}
                  disabled={isSubmitting}
                  {...register('leaderEmail')}
                />
                {errors.leaderEmail && (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    {errors.leaderEmail.message}
                  </p>
                )}
              </div>
            </div>

            {/* Row 3: University & Member Count */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-8 space-y-1.5">
                <Label htmlFor="team-form-university" requiredIndicator>
                  Trường Đại học / Đơn vị đào tạo
                </Label>
                <Input
                  id="team-form-university"
                  placeholder="ĐH Bách Khoa Hà Nội (HUST)"
                  hasError={Boolean(errors.university)}
                  disabled={isSubmitting}
                  {...register('university')}
                />
                {errors.university && (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    {errors.university.message}
                  </p>
                )}
              </div>

              <div className="sm:col-span-4 space-y-1.5">
                <Label htmlFor="team-form-members" requiredIndicator>
                  Quy mô (3–5 người)
                </Label>
                <Input
                  id="team-form-members"
                  type="number"
                  min={3}
                  max={5}
                  step={1}
                  hasError={Boolean(errors.memberCount)}
                  disabled={isSubmitting}
                  {...register('memberCount', {
                    valueAsNumber: true,
                    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                      const raw = Number(e.target.value);
                      if (!Number.isNaN(raw) && e.target.value !== '') {
                        if (raw > 5) {
                          e.target.value = '5';
                          setValue('memberCount', 5, { shouldValidate: true });
                        } else if (raw < 3 && raw >= 0) {
                          e.target.value = '3';
                          setValue('memberCount', 3, { shouldValidate: true });
                        }
                      }
                    },
                  })}
                />
                {errors.memberCount && (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    {errors.memberCount.message}
                  </p>
                )}
              </div>
            </div>

            {/* Row 4: Major Topic & Sub-Topic */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="team-form-major-topic" requiredIndicator>
                  Lĩnh vực thi đấu (Track)
                </Label>
                <Select
                  id="team-form-major-topic"
                  hasError={Boolean(errors.majorTopicId)}
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
                  {...register('subTopicId')}
                >
                  {availableSubTopics.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.title} (Slot: {sub.currentTeams ?? 0}/{sub.quota ?? 3})
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
                rows={3}
                placeholder="Mô tả bài toán, kiến trúc kỹ thuật và công nghệ cốt lõi của đội thi (tối thiểu 20 ký tự)..."
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
              loadingText="Đang lưu hồ sơ..."
            >
              {editingTeam ? 'Lưu cập nhật' : 'Tạo đội thi'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
