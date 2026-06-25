import { Link } from 'react-router-dom';

import { EmptyState } from '../../components/common/EmptyState';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import { formatCurrency } from '../../utils/formatCurrency';

export function GroupFundPaymentsWorkspace({
  banks,
  confirmableContributions,
  formatDate,
  handleCopyWebhookValue,
  handleSubmitManualConfirm,
  handleSubmitQr,
  id,
  isSecretary,
  isSubmittingManualConfirm,
  isSubmittingQr,
  manualFormState,
  operatorContributions,
  qrFormState,
  qrPrivacyAcknowledged,
  qrPrivacyError,
  resetQrForm,
  selectedCampaignId,
  selectedContributionRecord,
  setManualFormState,
  setQrFormState,
  setQrPrivacyAcknowledged,
  setQrPrivacyError,
  statusLabel,
  statusTone,
  webhookSetup,
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="grid gap-6">
        {isSecretary ? (
          <>
            <SurfaceCard
              title="Hướng dẫn kết nối SePay"
              description="Mở trang hướng dẫn riêng để xem ảnh minh họa PNG và các bước cấu hình webhook trước khi lưu tài khoản nhận quỹ."
            >
              <div className="rounded-2xl border border-[#d1fadf] bg-[#f7fdf9] p-5">
                <p className="text-sm leading-7 text-slate-700">
                  Hãy kiểm tra tài khoản nhận quỹ trong SePay, tạo webhook tiền vào và bật
                  HMAC-SHA256 trước khi lưu cấu hình bên dưới.
                </p>
                <Link
                  to={`/groups/${id}/fund/sepay-guide`}
                  className="mt-4 inline-flex rounded-xl app-button-primary"
                >
                  Mở hướng dẫn SePay
                </Link>
              </div>
            </SurfaceCard>

            <SurfaceCard
              title="Tài khoản nhận quỹ"
              description="Thư ký thay đổi tài khoản nhận quỹ của nhóm bằng cách lưu cấu hình mới. Mã QR động sẽ được tạo tự động."
            >
              <form className="grid gap-4" onSubmit={handleSubmitQr}>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    Ngân hàng
                    <select
                      aria-label="fund-qr-bank-id"
                      value={qrFormState.bankId}
                      onChange={(event) => {
                        const selectedBank = banks.find((bank) => bank.bank_id === event.target.value);
                        setQrFormState((current) => ({
                          ...current,
                          bankId: event.target.value,
                          bankName: selectedBank?.bank_name ?? '',
                        }));
                      }}
                      className="rounded-xl app-input"
                    >
                      <option value="">Chọn ngân hàng</option>
                      {banks.map((bank) => (
                        <option key={bank.bank_id} value={bank.bank_id}>
                          {bank.bank_name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    Số tài khoản
                    <input
                      aria-label="fund-qr-account-number"
                      type="text"
                      value={qrFormState.accountNumber}
                      onChange={(event) => {
                        setQrFormState((current) => ({
                          ...current,
                          accountNumber: event.target.value,
                        }));
                      }}
                      className="rounded-xl border border-[#d1fadf] bg-white px-4 py-3 font-mono outline-none transition focus:border-[#0b7443]"
                      placeholder="0123456789"
                    />
                  </label>
                </div>

                <div className="rounded-xl border border-[#d1fadf] bg-[#f7fdf9] p-4 text-sm leading-7 text-slate-700">
                  SplitBill chỉ xử lý giao dịch có mã quỹ đúng định dạng. Giao dịch cá nhân hoặc giao
                  dịch không có mã quỹ sẽ bị bỏ qua, hệ thống không đọc hoặc lưu số dư tài khoản.
                  Nên dùng một tài khoản riêng để nhận quỹ nhóm.
                </div>

                <label className="flex items-start gap-3 rounded-xl border border-[#d1fadf] bg-white p-4 text-sm leading-6 text-slate-700">
                  <input
                    type="checkbox"
                    checked={qrPrivacyAcknowledged}
                    onChange={(event) => {
                      setQrPrivacyAcknowledged(event.target.checked);
                      if (event.target.checked) {
                        setQrPrivacyError('');
                      }
                    }}
                    aria-describedby={qrPrivacyError ? 'qr-privacy-error' : undefined}
                    className="mt-1 h-4 w-4 rounded border-[#d1fadf] text-[#0b7443] focus:ring-[#0b7443]"
                  />
                  <span>Tôi đã đọc hướng dẫn và hiểu SplitBill chỉ xử lý giao dịch có mã quỹ.</span>
                </label>

                {qrPrivacyError ? (
                  <p id="qr-privacy-error" className="text-sm font-medium text-rose-600">
                    {qrPrivacyError}
                  </p>
                ) : null}

                {webhookSetup?.webhook_url && webhookSetup?.webhook_secret ? (
                  <div className="grid gap-3 rounded-xl border border-[#0b7443] bg-white p-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Thông tin dán vào SePay</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Secret Key chỉ hiển thị đầy đủ ngay sau khi lưu cấu hình này. Nếu làm lộ hoặc
                        mất mã, hãy lưu lại tài khoản nhận quỹ để tạo mã mới.
                      </p>
                    </div>
                    <div className="grid gap-3">
                      <div className="grid gap-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          URL nhận webhook
                        </span>
                        <div className="flex flex-col gap-2 rounded-xl bg-[#f7fdf9] p-3 md:flex-row md:items-center">
                          <code className="min-w-0 flex-1 break-all font-mono text-sm text-slate-900">
                            {webhookSetup.webhook_url}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopyWebhookValue(webhookSetup.webhook_url, 'URL webhook')}
                            className="rounded-lg border border-[#d1fadf] bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-[#f7fdf9]"
                          >
                            Sao chép
                          </button>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Secret Key HMAC-SHA256
                        </span>
                        <div className="flex flex-col gap-2 rounded-xl bg-[#f7fdf9] p-3 md:flex-row md:items-center">
                          <code className="min-w-0 flex-1 break-all font-mono text-sm text-slate-900">
                            {webhookSetup.webhook_secret}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopyWebhookValue(webhookSetup.webhook_secret, 'Secret Key')}
                            className="rounded-lg border border-[#d1fadf] bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-[#f7fdf9]"
                          >
                            Sao chép
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-[#d1fadf] bg-white p-4 text-sm leading-7 text-slate-600">
                    Sau khi lưu tài khoản nhận quỹ, SplitBill sẽ hiển thị URL webhook và Secret Key riêng
                    của nhóm để thư ký dán vào SePay.
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={
                      isSubmittingQr ||
                      !qrFormState.bankId.trim() ||
                      !/^[0-9]{4,32}$/.test(qrFormState.accountNumber.trim())
                    }
                    className="rounded-xl app-button-primary"
                  >
                    {isSubmittingQr ? 'Đang lưu...' : 'Lưu tài khoản nhận quỹ'}
                  </button>
                  <button
                    type="button"
                    onClick={resetQrForm}
                    className="rounded-xl border border-[#d1fadf] bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-[#f7fdf9]"
                  >
                    Xóa form
                  </button>
                </div>
              </form>
            </SurfaceCard>
          </>
        ) : null}

        <SurfaceCard
          title="Danh sách đóng quỹ thành viên"
          description="Ban điều hành theo dõi trạng thái, đối soát mã chuyển khoản và xác nhận đóng quỹ cho từng thành viên."
        >
          {!selectedCampaignId ? (
            <EmptyState
              title="Chưa chọn đợt thu quỹ"
              description="Vui lòng chọn đợt thu quỹ ở bảng bên cạnh để xem danh sách đóng quỹ."
            />
          ) : !operatorContributions?.contributions?.length ? (
            <EmptyState
              title="Chưa có dữ liệu đóng quỹ"
              description="Đợt thu này hiện chưa có dữ liệu đóng quỹ của thành viên."
            />
          ) : (
            <div className="grid gap-3">
              {operatorContributions.contributions.map((item) => (
                <article
                  key={item.user_id}
                  className="rounded-xl border border-[#d1fadf] bg-[#f7fdf9] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{item.display_name || item.user_id}</p>
                      <p className="mt-1 font-mono text-xs tracking-[0.14em] text-slate-500">
                        {item.transfer_code}
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                        statusTone[item.status] ?? statusTone.pending
                      }`}
                    >
                      {statusLabel[item.status] ?? item.status}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                    <span>Cần đóng: {formatCurrency(item.amount_required)}</span>
                    <span>Đã đóng: {formatCurrency(item.amount_paid)}</span>
                  </div>
                  {isSecretary &&
                  confirmableContributions.some((candidate) => candidate.user_id === item.user_id) ? (
                    <button
                      type="button"
                      onClick={() =>
                        setManualFormState({
                          userId: item.user_id,
                          amount: String(Math.max(0, item.amount_required - item.amount_paid)),
                          note: '',
                        })
                      }
                      className="mt-4 rounded-xl app-button-secondary"
                    >
                      Xác nhận thủ công
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </SurfaceCard>
      </div>

      <div className="grid gap-6">
        {isSecretary ? (
          <SurfaceCard
            title="Xác nhận đóng quỹ thủ công"
            description="Thư ký chọn thành viên từ danh sách đóng quỹ, điền số tiền thực tế nhận được và ghi chú đối soát."
          >
            <form className="grid gap-4" onSubmit={handleSubmitManualConfirm}>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Thành viên đóng quỹ
                <select
                  value={manualFormState.userId}
                  onChange={(event) =>
                    setManualFormState((current) => ({ ...current, userId: event.target.value }))
                  }
                  className="rounded-xl app-input"
                >
                  <option value="">Chọn thành viên</option>
                  {confirmableContributions.map((item) => (
                    <option key={item.user_id} value={item.user_id}>
                      {item.display_name || item.user_id}
                    </option>
                  ))}
                </select>
              </label>

              {!confirmableContributions.length ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700">
                  Không còn thành viên nào cần xác nhận thủ công trong đợt thu này.
                </div>
              ) : null}

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Số tiền xác nhận
                <input
                  type="number"
                  min="1"
                  value={manualFormState.amount}
                  onChange={(event) =>
                    setManualFormState((current) => ({ ...current, amount: event.target.value }))
                  }
                  className="rounded-xl app-input"
                />
              </label>

              {selectedContributionRecord ? (
                <div className="rounded-xl border border-[#d1fadf] bg-[#f7fdf9] px-4 py-4 text-sm leading-7 text-slate-700">
                  Còn phải đóng:{' '}
                  {formatCurrency(
                    Math.max(
                      0,
                      selectedContributionRecord.amount_required -
                        selectedContributionRecord.amount_paid,
                    ),
                  )}
                </div>
              ) : null}

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Ghi chú xác nhận
                <textarea
                  value={manualFormState.note}
                  onChange={(event) =>
                    setManualFormState((current) => ({ ...current, note: event.target.value }))
                  }
                  className="min-h-24 rounded-xl app-input"
                  placeholder="Ví dụ: Đóng tiền mặt trực tiếp"
                />
              </label>

              <button
                type="submit"
                disabled={isSubmittingManualConfirm || !selectedContributionRecord}
                className="rounded-xl app-button-primary"
              >
                {isSubmittingManualConfirm ? 'Đang xác nhận...' : 'Xác nhận đóng quỹ'}
              </button>
            </form>
          </SurfaceCard>
        ) : null}
      </div>
    </div>
  );
}
