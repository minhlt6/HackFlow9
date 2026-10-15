import React, { useState } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { Badge } from '../Badge';
import { ShieldAlert, Zap, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

interface RaceConditionModalProps {
  isOpen: boolean;
  onClose: () => void;
  subTopicTitle?: string;
  quota?: number;
  currentRegistered?: number;
}

export const RaceConditionModal: React.FC<RaceConditionModalProps> = ({
  isOpen,
  onClose,
  subTopicTitle = 'Hệ thống AI Tự Động Phân Loại Bệnh Án (Quota: 3 đội)',
  quota = 3,
  currentRegistered = 2,
}) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [logs, setLogs] = useState<
    Array<{
      time: string;
      team: string;
      action: string;
      status: 'pending' | 'success' | 'conflict';
      detail: string;
    }>
  >([]);
  const [simulated, setSimulated] = useState(false);

  const runSimulation = () => {
    setIsSimulating(true);
    setLogs([]);
    setSimulated(false);

    const initialLogs = [
      {
        time: '14:02:00.102',
        team: 'CyberSentinels',
        action: 'POST /api/v1/teams/topics/register (SubTopic #1)',
        status: 'pending' as const,
        detail: 'Đang mở transaction với PostgreSQL SELECT FOR UPDATE row-level lock...',
      },
      {
        time: '14:02:00.104',
        team: 'EcoPulse',
        action: 'POST /api/v1/teams/topics/register (SubTopic #1)',
        status: 'pending' as const,
        detail: 'Đang chờ hàng đợi khoá (Queueing behind row lock #1)...',
      },
    ];

    setLogs(initialLogs);

    setTimeout(() => {
      setLogs((prev) => [
        ...prev,
        {
          time: '14:02:00.135',
          team: 'CyberSentinels',
          action: 'COMMIT Transaction (200 OK)',
          status: 'success' as const,
          detail: 'Giành slot thành công! Suất tăng từ 2/3 lên 3/3 (ĐÃ ĐẦY). Khóa transaction giải phóng.',
        },
      ]);

      setTimeout(() => {
        setLogs((prev) => [
          ...prev,
          {
            time: '14:02:00.142',
            team: 'EcoPulse',
            action: 'ROLLBACK Transaction (409 Conflict)',
            status: 'conflict' as const,
            detail: 'Thất bại! Đề tài vừa hết suất đăng ký (Current: 3/3 >= Quota: 3). Giao dịch bị hủy an toàn.',
          },
        ]);
        setIsSimulating(false);
        setSimulated(true);
      }, 700);
    }, 800);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mô phỏng Xử lý Tranh chấp Đề tài"
      maxWidth="2xl"
    >
      <div className="space-y-4">
        <div className="rounded-[10px] bg-[#0F172A] border border-[#334155] p-4 text-xs text-slate-300 space-y-2">
          <div className="flex items-center gap-2 text-[#818CF8] font-semibold text-sm">
            <ShieldAlert size={18} />
            <span>Cơ chế bảo vệ dữ liệu theo tài liệu kỹ thuật HackFlow</span>
          </div>
          <p>
            Khi chỉ còn đúng <strong>1 suất cuối cùng ({quota - currentRegistered}/{quota})</strong> và có nhiều đội cùng lúc bấm nút Đăng ký, hệ thống sử dụng khoá bi quan <code>SELECT ... FOR UPDATE</code> tại tầng cơ sở dữ liệu để chống overbooking tuyệt đối.
          </p>
        </div>

        <div className="rounded-[10px] bg-[#1E293B] border border-[#334155] p-3 text-sm">
          <span className="text-slate-400">Đề tài đang tranh chấp:</span>{' '}
          <span className="text-white font-semibold">{subTopicTitle}</span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Nhật ký giao dịch thời gian thực
            </span>
            {logs.length > 0 && (
              <Badge variant={simulated ? 'success' : 'warning'}>
                {simulatingMessage(isSimulating, simulated)}
              </Badge>
            )}
          </div>

          <div className="h-56 overflow-y-auto rounded-[10px] bg-[#0B1120] border border-[#334155] p-3 font-mono text-xs space-y-2.5">
            {logs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 italic">
                Nhấn &quot;Bắt đầu mô phỏng&quot; để gửi đồng thời 2 yêu cầu đăng ký...
              </div>
            ) : (
              logs.map((log, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded border ${
                    log.status === 'success'
                      ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                      : log.status === 'conflict'
                      ? 'bg-rose-950/40 border-rose-800/60 text-rose-200'
                      : 'bg-indigo-950/40 border-indigo-800/60 text-indigo-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>
                      [{log.time}] {log.team}
                    </span>
                    <span className="flex items-center gap-1 text-[11px]">
                      {log.status === 'success' && <CheckCircle2 size={13} className="text-emerald-400" />}
                      {log.status === 'conflict' && <XCircle size={13} className="text-rose-400" />}
                      {log.status === 'pending' && <RefreshCw size={13} className="animate-spin text-indigo-400" />}
                      {log.action}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] opacity-90">{log.detail}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" onClick={onClose}>
            Đóng
          </Button>

          <Button
            variant="primary"
            disabled={isSimulating}
            onClick={runSimulation}
            className="gap-2"
          >
            {isSimulating ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Đang gửi 2 transaction...</span>
              </>
            ) : (
              <>
                <Zap size={16} />
                <span>{simulated ? 'Chạy lại mô phỏng' : 'Bắt đầu mô phỏng'}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

function simulatingMessage(isSimulating: boolean, simulated: boolean) {
  if (isSimulating) return 'Đang xử lý khóa DB';
  if (simulated) return 'Đã bảo vệ an toàn 100%';
  return 'Sẵn sàng';
}
