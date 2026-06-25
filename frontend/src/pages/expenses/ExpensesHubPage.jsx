import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { listGroups } from '../../api/group-core';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { PageContainer } from '../../components/common/PageContainer';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import { getRoleLabel } from '../../constants/groupRoles';
import { getApiErrorMessage } from '../../utils/apiError';
import { formatCurrency } from '../../utils/formatCurrency';

export function ExpensesHubPage() {
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
          setLoadError(getApiErrorMessage(error, 'Không thể tải danh sách nhóm.'));
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
      eyebrow="Chi tiêu"
      title="Chọn nhóm để quản lý chi tiêu"
      description="Mỗi nhóm có một không gian riêng để theo dõi khoản chi, số dư và lịch sử thanh toán."
      variant="finance"
    >
      <SurfaceCard
        title="Danh sách nhóm của bạn"
        description="Chỉ hiển thị những nhóm mà bạn đang là thành viên hoạt động."
        tone="mint"
      >
        {isLoading ? (
          <div className="grid gap-3" aria-label="Đang tải danh sách nhóm">
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
            title="Bạn chưa có nhóm nào để quản lý chi tiêu"
            description="Hãy tạo nhóm mới hoặc tham gia bằng lời mời trước khi bắt đầu ghi khoản chi."
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
                      {getRoleLabel(group.my_role)}
                    </p>
                    <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-900">
                      {group.name}
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {group.description || 'Nhóm này chưa có mô tả.'}
                    </p>
                  </div>
                  <span className="app-badge app-badge--neutral">
                    {group.member_count} thành viên
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-700">
                  <span>{group.currency}</span>
                  <span>{formatCurrency(group.my_balance ?? 0)}</span>
                </div>

                <Link
                  to={`/groups/${group.id}/expenses`}
                  className="mt-5 inline-flex rounded-xl app-button-primary"
                >
                  Mở không gian chi tiêu
                </Link>
              </article>
            ))}
          </div>
        )}
      </SurfaceCard>
    </PageContainer>
  );
}
