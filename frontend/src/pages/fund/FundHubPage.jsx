import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { listGroups } from '../../api/groups';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { PageContainer } from '../../components/common/PageContainer';
import { SurfaceCard } from '../../components/common/SurfaceCard';

const roleLabels = {
  leader: 'Trưởng nhóm',
  secretary: 'Thư ký',
  member: 'Thành viên',
};

export function FundHubPage() {
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadGroups() {
      try {
        setIsLoading(true);
        setLoadError('');
        const data = await listGroups();

        if (!cancelled) {
          setGroups(data);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error.response?.data?.error?.message ?? 'Không thể tải danh sách nhóm.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadGroups();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  return (
    <PageContainer
      eyebrow="Quỹ nhóm"
      title="Chọn nhóm để theo dõi quỹ"
      description="Mở đợt thu đang hoạt động, mã chuyển khoản, QR và lịch sử đóng quỹ của từng nhóm."
      variant="finance"
    >
      <SurfaceCard
        title="Danh sách nhóm có quỹ"
        description="Bạn có thể mở từng nhóm để xem đợt thu hiện tại, mã chuyển khoản và lịch sử đóng tiền."
        tone="mint"
      >
        {isLoading ? (
          <div className="grid gap-3" aria-label="Đang tải danh sách quỹ nhóm">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-24 animate-shimmer rounded-xl"
              />
            ))}
          </div>
        ) : loadError ? (
          <ErrorState
            message={loadError}
            onRetry={() => setReloadToken((value) => value + 1)}
            actionLabel="Tải lại"
          />
        ) : groups.length === 0 ? (
          <EmptyState
            title="Chưa có nhóm nào để theo dõi quỹ"
            description="Hãy tạo nhóm mới hoặc tham gia bằng lời mời trước khi theo dõi đợt thu và đóng quỹ."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {groups.map((group) => (
              <article
                key={group.id}
                className="rounded-xl border border-[#d1fadf] bg-[radial-gradient(circle_at_top_left,_rgba(225,253,234,0.92),_rgba(255,255,255,0.98)_64%)] p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0b7443]">
                      {roleLabels[group.my_role] ?? group.my_role}
                    </p>
                    <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-900">
                      {group.name}
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {group.description || 'Theo dõi đợt thu, lịch sử đóng quỹ và sổ chi trong một màn hình riêng.'}
                    </p>
                  </div>
                  <span className="app-badge app-badge--neutral">
                    {group.member_count} thành viên
                  </span>
                </div>

                <Link
                  to={`/groups/${group.id}/fund`}
                  className="mt-5 inline-flex rounded-xl app-button-primary"
                >
                  Mở quỹ nhóm
                </Link>
              </article>
            ))}
          </div>
        )}
      </SurfaceCard>
    </PageContainer>
  );
}
