import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  getGroupDetail,
  getGroupStats,
  getGroupStatsByCategory,
  getGroupStatsByMember,
  getGroupStatsTimeline,
} from '../../api/groups';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { KpiTile } from '../../components/common/KpiTile';
import { PageContainer } from '../../components/common/PageContainer';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import { formatCurrency } from '../../utils/formatCurrency';

const periodOptions = [
  { value: '7d', label: '7 ngày' },
  { value: '30d', label: '30 ngày' },
  { value: '90d', label: '90 ngày' },
];

function formatPercent(value) {
  return `${Number(value).toFixed(value % 1 === 0 ? 0 : 2)}%`;
}

export function GroupStatsPage() {
  const { id = '' } = useParams();
  const [period, setPeriod] = useState('30d');
  const [group, setGroup] = useState(null);
  const [overview, setOverview] = useState(null);
  const [byCategory, setByCategory] = useState([]);
  const [byMember, setByMember] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      try {
        setIsLoading(true);
        setLoadError('');

        const [groupData, overviewData, categoryData, memberData, timelineData] = await Promise.all([
          getGroupDetail(id),
          getGroupStats(id, { period }),
          getGroupStatsByCategory(id, { period }),
          getGroupStatsByMember(id, { period }),
          getGroupStatsTimeline(id, { period, granularity: period === '90d' ? 'month' : 'week' }),
        ]);

        if (cancelled) {
          return;
        }

        setGroup(groupData);
        setOverview(overviewData);
        setByCategory(categoryData);
        setByMember(memberData);
        setTimeline(timelineData);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error.response?.data?.error?.message ?? 'Không thể tải thống kê nhóm.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadPage();

    return () => {
      cancelled = true;
    };
  }, [id, period, reloadToken]);

  const topPayer = useMemo(() => byMember[0] ?? null, [byMember]);

  return (
    <PageContainer
      eyebrow="Thống kê"
      title="Toàn cảnh chi tiêu của nhóm"
      description="Nhìn nhanh xu hướng, cơ cấu danh mục và thành viên đang chi nhiều nhất trong giai đoạn đã chọn."
      variant="finance"
      actions={
        <div className="flex flex-wrap gap-3">
          {periodOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPeriod(option.value)}
              className={[
                'rounded-xl px-4 py-3 text-sm font-semibold transition',
                period === option.value
                  ? 'bg-[#0b7443] text-white'
                  : 'border border-[#d1fadf] bg-white text-slate-900 hover:border-[#61bc76] hover:bg-[#f7fdf9]',
              ].join(' ')}
            >
              {option.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="flex flex-wrap gap-3">
        <Link
          to={`/groups/${id}`}
          className="rounded-xl app-button-secondary"
        >
          Về tổng quan nhóm
        </Link>
        <Link
          to={`/groups/${id}/expenses`}
          className="rounded-xl border border-[#c7e0f8] bg-[#eef6ff] px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-[#61bc76] hover:bg-white"
        >
          Mở chi tiêu nhóm
        </Link>
      </div>

      {isLoading ? (
        <SurfaceCard title="Đang tải thống kê" tone="mint">
          <div className="grid gap-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-24 animate-shimmer rounded-xl" />
            ))}
          </div>
        </SurfaceCard>
      ) : loadError ? (
        <SurfaceCard title="Không thể tải thống kê">
          <ErrorState
            message={loadError}
            onRetry={() => setReloadToken((value) => value + 1)}
            actionLabel="Tải lại"
          />
        </SurfaceCard>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiTile
              label="Tổng chi tiêu"
              value={formatCurrency(overview?.total_spending ?? 0)}
              hint={group?.name || 'Nhóm hiện tại'}
            />
            <KpiTile
              label="Số khoản chi"
              value={String(overview?.expense_count ?? 0)}
              hint={`${overview?.from ?? ''} → ${overview?.to ?? ''}`}
            />
            <KpiTile
              label="Ky truoc"
              value={formatCurrency(overview?.vs_previous_period?.total ?? 0)}
              hint="So với nhịp chi của giai đoạn trước"
            />
            <KpiTile
              label="Thay doi"
              value={formatPercent(overview?.vs_previous_period?.change_percent ?? 0)}
              hint="So với kỳ trước"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <SurfaceCard
              title="Cơ cấu danh mục"
              description="Những danh mục đang chiếm tỷ trọng lớn nhất trong giai đoạn đã chọn."
            >
              {byCategory.length === 0 ? (
                <EmptyState
                  title="Chưa có dữ liệu danh mục"
                  description="Thống kê sẽ xuất hiện ngay khi nhóm có khoản chi trong giai đoạn này."
                />
              ) : (
                <div className="grid gap-3">
                  {byCategory.map((item) => (
                    <article
                      key={item.category}
                      className="rounded-xl border border-[#d1fadf] bg-[radial-gradient(circle_at_top_left,_rgba(225,253,234,0.92),_rgba(255,255,255,0.98)_64%)] p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0b7443]">
                            {item.category}
                          </p>
                          <p className="mt-2 text-lg font-semibold text-slate-900">
                            {formatCurrency(item.total)}
                          </p>
                        </div>
                        <div className="text-right text-sm text-slate-600">
                          <p>{formatPercent(item.percentage)}</p>
                          <p>{item.count} khoản chi</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </SurfaceCard>

            <SurfaceCard
              title="Xếp hạng thành viên"
              description="Ai đang chi nhiều nhất, ai còn phải chia nhiều nhất và vị thế ròng hiện tại."
            >
              {byMember.length === 0 ? (
                <EmptyState
                  title="Chưa có dữ liệu thành viên"
                  description="Cần có khoản chi trong nhóm để bảng xếp hạng xuất hiện."
                />
              ) : (
                <div className="grid gap-3">
                  {byMember.map((item, index) => (
                    <article key={item.user_id} className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            #{index + 1}
                          </p>
                          <p className="mt-2 text-lg font-semibold text-slate-900">{item.display_name}</p>
                        </div>
                        {topPayer?.user_id === item.user_id ? (
                          <span className="app-badge app-badge--fern">
                            Chi nhiều nhất
                          </span>
                        ) : null}
                      </div>
                      <dl className="mt-4 grid gap-2 text-sm text-slate-600">
                        <div className="flex items-center justify-between gap-3">
                          <dt>Đã trả</dt>
                          <dd className="font-semibold text-slate-900">{formatCurrency(item.total_paid)}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <dt>Phần phải chia</dt>
                          <dd className="font-semibold text-slate-900">{formatCurrency(item.total_owed)}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <dt>Net</dt>
                          <dd className={item.net >= 0 ? 'font-semibold text-[#0b7443]' : 'font-semibold text-rose-700'}>
                            {formatCurrency(item.net)}
                          </dd>
                        </div>
                      </dl>
                    </article>
                  ))}
                </div>
              )}
            </SurfaceCard>
          </div>

          <SurfaceCard
            title="Diễn biến theo thời gian"
            description="Mức chi tiêu thay đổi ra sao qua từng mốc trong giai đoạn đã chọn."
          >
            {timeline.length === 0 ? (
              <EmptyState
                title="Chưa có timeline"
                description="Không có khoản chi nào trong giai đoạn đã chọn."
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {timeline.map((item) => (
                  <article key={item.date} className="rounded-xl border border-[#c7e0f8] bg-[#eef6ff] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {item.date}
                    </p>
                    <p className="mt-3 text-xl font-semibold text-slate-900">{formatCurrency(item.total)}</p>
                  </article>
                ))}
              </div>
            )}
          </SurfaceCard>
        </>
      )}
    </PageContainer>
  );
}
