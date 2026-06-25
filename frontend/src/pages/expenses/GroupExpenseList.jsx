import { EmptyState } from '../../components/common/EmptyState';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import { formatCurrency } from '../../utils/formatCurrency';

export function GroupExpenseList({
  buildParticipantSummary,
  categories,
  expenses,
  formatDate,
  handleDeleteExpense,
  handleEditExpense,
}) {
  return (
    <SurfaceCard
      title="Các khoản chi"
      description="Khoản mới nằm trên cùng. Người tạo hoặc Trưởng nhóm có thể sửa, xóa khi cần."
    >
      {expenses.length === 0 ? (
        <EmptyState
          title="Chưa có khoản chi nào"
          description="Ghi khoản đầu tiên để SplitBill bắt đầu tính số dư cho nhóm."
        />
      ) : (
        <div className="grid gap-3">
          {expenses.map((expense) => (
            <article
              key={expense.id}
              className="rounded-xl border border-[#d1fadf] bg-[#f7fdf9] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0b7443]">
                    {categories.find((category) => category.value === expense.category)?.label ||
                      expense.category}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900">{expense.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {expense.paid_by.display_name} - {formatDate(expense.date)}
                  </p>
                  {buildParticipantSummary(expense.splits) ? (
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      Chia cho: {buildParticipantSummary(expense.splits)}
                    </p>
                  ) : null}
                </div>
                <p className="text-xl font-semibold text-slate-900">
                  {formatCurrency(expense.amount)}
                </p>
              </div>

              {expense.note ? (
                <p className="mt-3 text-sm leading-7 text-slate-700">{expense.note}</p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleEditExpense(expense.id)}
                  className="rounded-xl app-button-secondary"
                >
                  Sửa
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteExpense(expense.id)}
                  className="rounded-xl app-button-danger"
                >
                  Xóa
                </button>
                {expense.receipt_url ? (
                  <a
                    href={expense.receipt_url}
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
  );
}
