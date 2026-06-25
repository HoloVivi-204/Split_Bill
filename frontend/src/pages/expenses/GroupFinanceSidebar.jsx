import { EmptyState } from '../../components/common/EmptyState';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import { UserAvatar } from '../../components/common/UserAvatar';
import { formatCurrency } from '../../utils/formatCurrency';

export function GroupFinanceSidebar({
  activeMembers,
  balances,
  banks,
  canCurrentUserRecordSettlementFrom,
  formatDate,
  groupId,
  handleDeleteSettlementBankInfo,
  handleSubmitSettlement,
  handleSubmitSettlementBankInfo,
  isDeletingSettlementBankInfo,
  isGroupLeader,
  isSavingSettlement,
  isSavingSettlementBankInfo,
  isSettlementReady,
  setSettlementBankInfoFormState,
  setSettlementFormState,
  settlementBankInfo,
  settlementBankInfoFormState,
  settlementFormState,
  settlements,
  suggestions,
}) {
  return (
    <div className="grid gap-6">
      <SurfaceCard
        title="Ai đang nợ ai"
        description="Số dương là được nhận lại, số âm là cần trả thêm."
      >
        {balances?.balances?.length ? (
          <div className="grid gap-3">
            {balances.balances.map((member) => (
              <article
                key={member.user_id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      avatarUrl={member.avatar_url}
                      userId={member.user_id}
                      groupId={groupId}
                      displayName={member.display_name || member.user_id || 'Thành viên'}
                      size="sm"
                    />
                    <div>
                      <p className="font-semibold text-slate-900">
                        {member.display_name || member.user_id}
                      </p>
                      <p className="text-sm text-slate-500">Số dư</p>
                    </div>
                  </div>
                  <p
                    className={`text-lg font-semibold ${
                      member.balance > 0
                        ? 'text-[#0b7443]'
                        : member.balance < 0
                          ? 'text-rose-700'
                          : 'text-slate-700'
                    }`}
                  >
                    {formatCurrency(member.balance)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </SurfaceCard>

      <SurfaceCard
        title="Tài khoản nhận chuyển khoản"
        description="Thông tin này chỉ dùng trong nhóm hiện tại để người khác chuyển tiền khi chốt bill."
      >
        <form className="grid gap-4" onSubmit={handleSubmitSettlementBankInfo}>
          <div className="rounded-xl border border-[#d1fadf] bg-[#f7fdf9] px-4 py-3 text-sm text-slate-700">
            {settlementBankInfo
              ? 'Đã có tài khoản nhận tiền cho nhóm này. Bạn có thể cập nhật hoặc xóa bất cứ lúc nào.'
              : 'Chưa có tài khoản nhận tiền cho nhóm này.'}
          </div>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Ngân hàng
            <select
              aria-label="settlement-bank-id"
              required
              value={settlementBankInfoFormState.bankId}
              onChange={(event) => {
                const selectedBank = banks.find((bank) => bank.bank_id === event.target.value);
                setSettlementBankInfoFormState((current) => ({
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
              aria-label="settlement-account-number"
              type="text"
              required
              value={settlementBankInfoFormState.accountNumber}
              onChange={(event) => {
                setSettlementBankInfoFormState((current) => ({
                  ...current,
                  accountNumber: event.target.value,
                }));
              }}
              className="rounded-xl app-input font-mono"
              placeholder="Ví dụ: 123456789"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={
                isSavingSettlementBankInfo ||
                !settlementBankInfoFormState.bankId.trim() ||
                !/^[0-9]{4,32}$/.test(settlementBankInfoFormState.accountNumber.trim())
              }
              className="rounded-xl app-button-primary"
            >
              {isSavingSettlementBankInfo ? 'Đang lưu...' : 'Lưu tài khoản nhận tiền'}
            </button>
            <button
              type="button"
              disabled={!settlementBankInfo || isDeletingSettlementBankInfo}
              onClick={handleDeleteSettlementBankInfo}
              className="rounded-xl app-button-danger"
            >
              {isDeletingSettlementBankInfo
                ? 'Đang xóa...'
                : 'Xóa tài khoản khỏi nhóm này'}
            </button>
          </div>
        </form>
      </SurfaceCard>

      <SurfaceCard
        title="Gợi ý chuyển khoản"
        description="SplitBill gom nợ thành ít giao dịch nhất có thể."
      >
        {suggestions.length === 0 ? (
          <EmptyState
            title="Không cần chuyển thêm"
            description="Số dư của nhóm đang cân bằng."
          />
        ) : (
          <div className="grid gap-3">
            {suggestions.map((suggestion, index) => {
              const recipientBankInfo = suggestion.to.settlement_bank_info;

              return (
                <article
                  key={`${suggestion.from.user_id}-${suggestion.to.user_id}-${index}`}
                  className="rounded-xl border border-[#d1fadf] bg-[#f7fdf9] p-4"
                >
                  <p className="text-sm leading-7 text-slate-700">
                    <span className="font-semibold text-slate-900">{suggestion.from.display_name}</span>{' '}
                    chuyển cho{' '}
                    <span className="font-semibold text-slate-900">{suggestion.to.display_name}</span>
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[#0b7443]">
                    {formatCurrency(suggestion.amount)}
                  </p>

                  {recipientBankInfo && suggestion.to.qr_url ? (
                    <div className="mt-4 grid gap-3 rounded-xl border border-white bg-white p-3">
                      <img
                        src={suggestion.to.qr_url}
                        alt={`QR chuyển khoản cho ${suggestion.to.display_name}`}
                        className="mx-auto size-44 rounded-xl border border-[#d1fadf] bg-white object-contain"
                      />
                      <div className="grid gap-1 rounded-xl bg-[#f7fdf9] px-3 py-2 text-sm">
                        <p className="font-semibold text-slate-900">{recipientBankInfo.bank_name}</p>
                        <p className="font-mono text-slate-700">{recipientBankInfo.account_number}</p>
                        {recipientBankInfo.account_name ? (
                          <p className="font-semibold text-slate-700">{recipientBankInfo.account_name}</p>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 rounded-xl border border-dashed border-[#d1fadf] bg-white px-3 py-2 text-sm text-slate-600">
                      Người nhận chưa nhập thông tin ngân hàng cho nhóm này.
                    </p>
                  )}

                  <button
                    type="button"
                    disabled={!canCurrentUserRecordSettlementFrom(suggestion.from.user_id)}
                    onClick={() => {
                      if (!canCurrentUserRecordSettlementFrom(suggestion.from.user_id)) {
                        return;
                      }

                      setSettlementFormState({
                        fromUser: suggestion.from.user_id,
                        toUser: suggestion.to.user_id,
                        amount: String(suggestion.amount),
                        note: '',
                      });
                    }}
                    className="mt-3 rounded-xl app-button-secondary"
                  >
                    {canCurrentUserRecordSettlementFrom(suggestion.from.user_id)
                      ? 'Điền vào form thanh toán'
                      : 'Chỉ người trả nợ mới được ghi nhận'}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </SurfaceCard>

      <SurfaceCard
        title="Xác nhận đã trả"
        description="Chỉ ghi khi tiền đã được chuyển hoặc nhận thật. Bản ghi này không sửa sau khi lưu."
      >
        <form className="grid gap-4" onSubmit={handleSubmitSettlement}>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Người trả nợ
            <select
              aria-label="settlement-from-user"
              value={settlementFormState.fromUser}
              disabled={!isGroupLeader}
              onChange={(event) =>
                setSettlementFormState((current) => ({
                  ...current,
                  fromUser: event.target.value,
                }))
              }
              className="rounded-xl app-input"
            >
              <option value="">Chọn người trả nợ</option>
              {activeMembers.map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {member.display_name || member.user_id}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Người nhận thanh toán
            <select
              aria-label="settlement-to-user"
              value={settlementFormState.toUser}
              onChange={(event) =>
                setSettlementFormState((current) => ({
                  ...current,
                  toUser: event.target.value,
                }))
              }
              className="rounded-xl app-input"
            >
              <option value="">Chọn người nhận thanh toán</option>
              {activeMembers.map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {member.display_name || member.user_id}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Số tiền thanh toán
            <input
              aria-label="settlement-amount"
              type="number"
              min="1"
              value={settlementFormState.amount}
              onChange={(event) =>
                setSettlementFormState((current) => ({
                  ...current,
                  amount: event.target.value,
                }))
              }
              className="rounded-xl app-input"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Ghi chú
            <textarea
              value={settlementFormState.note}
              onChange={(event) =>
                setSettlementFormState((current) => ({
                  ...current,
                  note: event.target.value,
                }))
              }
              className="min-h-24 rounded-xl app-input"
              placeholder="Ví dụ: Đã chuyển khoản qua ngân hàng"
            />
          </label>

          <button
            type="submit"
            disabled={isSavingSettlement || !isSettlementReady}
            className="rounded-xl app-button-primary"
          >
            {isSavingSettlement ? 'Đang ghi nhận...' : 'Xác nhận thanh toán'}
          </button>
        </form>
      </SurfaceCard>

      <SurfaceCard
        title="Lịch sử trả nợ"
        description="Các lần thành viên đã xác nhận thanh toán cho nhau."
      >
        {settlements.length === 0 ? (
          <EmptyState
            title="Chưa có lần trả nợ nào"
            description="Khi có người xác nhận đã trả, lịch sử sẽ xuất hiện ở đây."
          />
        ) : (
          <div className="grid gap-3">
            {settlements.map((settlement) => (
              <article
                key={settlement.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <p className="font-semibold text-slate-900">
                  {settlement.from_user.display_name}
                  {' -> '}
                  {settlement.to_user.display_name}
                </p>
                <p className="mt-2 text-lg font-semibold text-[#0b7443]">
                  {formatCurrency(settlement.amount)}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {formatDate(settlement.settled_at)} - ghi bởi {settlement.recorded_by.display_name}
                </p>
                {settlement.note ? (
                  <p className="mt-2 text-sm leading-7 text-slate-700">{settlement.note}</p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}
