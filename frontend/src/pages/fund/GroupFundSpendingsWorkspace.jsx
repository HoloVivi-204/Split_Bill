import { EmptyState } from '../../components/common/EmptyState';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import { formatCurrency } from '../../utils/formatCurrency';

export function GroupFundSpendingsWorkspace({
  editingSpendingId,
  formatDate,
  handleDeleteSpending,
  handleEditSpending,
  handleSubmitSpending,
  isLeader,
  isSubmittingSpending,
  resetSpendingForm,
  setSpendingFormState,
  spendingFormState,
  spendings,
}) {
  return (
    <>
      <SurfaceCard
        title={editingSpendingId ? 'Cập nhật khoản chi quỹ' : 'Ghi khoản chi quỹ'}
        description="Trưởng nhóm và Thư ký ghi nhận các khoản chi tiêu thực tế từ quỹ chung."
      >
        <form className="grid gap-4" onSubmit={handleSubmitSpending}>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Tiêu đề khoản chi
            <input
              type="text"
              value={spendingFormState.title}
              onChange={(event) =>
                setSpendingFormState((current) => ({ ...current, title: event.target.value }))
              }
              className="rounded-xl app-input"
              placeholder="Ví dụ: Mua nước ngọt, Đặt cọc phòng..."
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Số tiền chi
              <input
                type="number"
                min="1"
                value={spendingFormState.amount}
                onChange={(event) =>
                  setSpendingFormState((current) => ({ ...current, amount: event.target.value }))
                }
                className="rounded-xl app-input"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Ngày chi
              <input
                type="date"
                value={spendingFormState.spentAt}
                onChange={(event) =>
                  setSpendingFormState((current) => ({ ...current, spentAt: event.target.value }))
                }
                className="rounded-xl app-input"
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Ghi chú chi tiết
            <textarea
              value={spendingFormState.note}
              onChange={(event) =>
                setSpendingFormState((current) => ({ ...current, note: event.target.value }))
              }
              className="min-h-24 rounded-xl app-input"
              placeholder="Nhập thông tin chi tiết về khoản chi này..."
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Ảnh hóa đơn / Chứng từ chi quỹ
            <input
              type="file"
              accept="image/*"
              onChange={(event) =>
                setSpendingFormState((current) => ({
                  ...current,
                  receipt: event.target.files?.[0] ?? null,
                }))
              }
              className="rounded-xl border border-dashed border-[#d1fadf] bg-[#f7fdf9] px-4 py-3 text-sm text-slate-600"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSubmittingSpending}
              className="rounded-xl app-button-primary"
            >
              {isSubmittingSpending
                ? 'Đang lưu...'
                : editingSpendingId
                  ? 'Cập nhật khoản chi'
                  : 'Ghi khoản chi'}
            </button>
            {editingSpendingId ? (
              <button
                type="button"
                onClick={resetSpendingForm}
                className="rounded-xl border border-[#d1fadf] bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-[#f7fdf9]"
              >
                Hủy sửa
              </button>
            ) : null}
          </div>
        </form>
      </SurfaceCard>

      <SurfaceCard
        title="Sổ chi quỹ nhóm"
        description="Danh sách các khoản chi tiêu minh bạch từ quỹ chung của cả nhóm."
      >
        {spendings.length === 0 ? (
          <EmptyState
            title="Chưa có khoản chi quỹ nào"
            description="Ngay khi ban điều hành ghi nhận khoản chi quỹ đầu tiên, thông tin sẽ hiển thị tại đây."
          />
        ) : (
          <div className="grid gap-3">
            {spendings.map((spending) => (
              <article
                key={spending.id}
                className="rounded-xl border border-[#d1fadf] bg-[#f7fdf9] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{spending.title}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {formatDate(spending.spent_at)} - ghi bởi {spending.recorded_by.display_name}
                    </p>
                  </div>
                  <p className="text-lg font-semibold text-slate-900">
                    {formatCurrency(spending.amount)}
                  </p>
                </div>
                {spending.note ? (
                  <p className="mt-3 text-sm leading-7 text-slate-700">{spending.note}</p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleEditSpending(spending)}
                    className="rounded-xl app-button-secondary"
                  >
                    Sửa
                  </button>
                  {isLeader ? (
                    <button
                      type="button"
                      onClick={() => handleDeleteSpending(spending.id)}
                      className="rounded-xl app-button-danger"
                    >
                      Xóa
                    </button>
                  ) : null}
                  {spending.receipt_url ? (
                    <a
                      href={spending.receipt_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-[#c7e0f8] bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-[#eef6ff]"
                    >
                      Xem hóa đơn
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </SurfaceCard>
    </>
  );
}
