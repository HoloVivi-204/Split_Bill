import { EmptyState } from '../../components/common/EmptyState';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import { formatCurrency } from '../../utils/formatCurrency';

export function GroupFundOverviewWorkspace({
  campaignListEmptyDescription,
  contributionState,
  currentQrInfo,
  formatDate,
  historyState,
  renderCampaignList,
  selectedCampaign,
  statusLabel,
  statusTone,
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <SurfaceCard
        title="Đợt thu quỹ"
        description="Chọn đợt thu quỹ phía dưới để xem thông tin chi tiết và mã định danh đóng quỹ của bạn."
      >
        {renderCampaignList(campaignListEmptyDescription)}
      </SurfaceCard>

      <div className="grid gap-6">
        {selectedCampaign && contributionState ? (
          <>
            <SurfaceCard
              title="Thông tin đóng quỹ của bạn"
              description="Quét mã QR động bên cạnh hoặc copy mã chuyển khoản để thực hiện thanh toán."
            >
              <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
                <div className="grid gap-4">
                  <div className="rounded-xl border border-[#0b7443] bg-[linear-gradient(135deg,_rgba(11,116,67,0.12),_rgba(209,250,223,0.65))] p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0b7443]">
                      Mã chuyển khoản (Nội dung CK)
                    </p>
                    <p className="mt-4 break-all rounded-xl bg-slate-950 px-4 py-4 font-mono text-lg font-semibold tracking-[0.12em] text-[#d1fadf]">
                      {contributionState.my_contribution.transfer_code}
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl bg-[#eceff4] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Tài khoản nhận
                      </p>
                      {currentQrInfo ? (
                        <>
                          <p className="mt-3 text-sm font-semibold text-slate-900">
                            {currentQrInfo.bank_name}
                          </p>
                          {currentQrInfo.account_name ? (
                            <p className="mt-1 text-sm text-slate-700">{currentQrInfo.account_name}</p>
                          ) : null}
                          <p className="mt-1 font-mono text-sm text-slate-900">
                            {currentQrInfo.account_number}
                          </p>
                        </>
                      ) : (
                        <p className="mt-3 text-sm leading-7 text-slate-700">
                          Thư ký chưa cấu hình tài khoản nhận quỹ cho đợt thu này.
                        </p>
                      )}
                    </div>
                    <div className="rounded-xl bg-[#fee9d1] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#715039]">
                        Trạng thái đóng quỹ
                      </p>
                      <span
                        className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                          statusTone[contributionState.my_contribution.status] ?? statusTone.pending
                        }`}
                      >
                        {statusLabel[contributionState.my_contribution.status] ??
                          contributionState.my_contribution.status}
                      </span>
                      <p className="mt-3 text-sm text-[#715039]">
                        Còn phải đóng: {formatCurrency(contributionState.my_contribution.remaining)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-[#d1fadf] bg-white p-4">
                  {currentQrInfo ? (
                    <img
                      src={currentQrInfo.qr_url}
                      alt={`QR cho ${selectedCampaign.title}`}
                      className="h-full w-full rounded-xl border border-[#d1fadf] bg-[#f7fdf9] object-cover"
                    />
                  ) : (
                    <div className="flex h-full min-h-64 items-center justify-center rounded-xl border border-dashed border-[#d1fadf] bg-[#f7fdf9] p-6 text-center text-sm leading-7 text-slate-600">
                      Mã QR chuyển khoản sẽ hiển thị tại đây khi Thư ký cấu hình tài khoản.
                    </div>
                  )}
                </div>
              </div>
            </SurfaceCard>

            <SurfaceCard
              title="Lịch sử đóng quỹ"
              description="Danh sách ghi nhận từng lần đóng quỹ tự động hoặc thủ công của cả nhóm."
            >
              {historyState?.history?.length ? (
                <div className="grid gap-3">
                  {historyState.history.map((item, index) => (
                    <article
                      key={`${item.user_name}-${item.paid_at}-${index}`}
                      className="rounded-xl border border-[#d1fadf] bg-[#f7fdf9] p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{item.user_name}</p>
                          <p className="mt-1 text-sm text-slate-600">
                            {formatDate(item.paid_at)} -{' '}
                            {item.method === 'manual'
                              ? 'Thư ký xác nhận thủ công'
                              : 'Chuyển khoản tự động'}
                          </p>
                        </div>
                        <p className="text-lg font-semibold text-[#0b7443]">
                          {formatCurrency(item.amount)}
                        </p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                        <span>Lũy kế: {formatCurrency(item.cumulative_paid)}</span>
                        <span>Nghĩa vụ: {formatCurrency(item.amount_required)}</span>
                        {item.confirmed_by_name ? (
                          <span>Thư ký xác nhận: {item.confirmed_by_name}</span>
                        ) : null}
                      </div>
                      {item.note ? (
                        <p className="mt-3 text-sm leading-7 text-slate-700">{item.note}</p>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Chưa có lịch sử đóng quỹ"
                  description="Khi các thành viên đóng quỹ, lịch sử nộp tiền sẽ hiển thị đầy đủ tại đây."
                />
              )}
            </SurfaceCard>
          </>
        ) : (
          <SurfaceCard title="Chi tiết đợt thu quỹ">
            <EmptyState
              title="Chọn đợt thu để xem mã chuyển khoản"
              description="Nếu nhóm có đợt thu quỹ đang hoạt động, chi tiết thanh toán của bạn sẽ hiển thị tại đây."
            />
          </SurfaceCard>
        )}
      </div>
    </div>
  );
}
