const prisma = require('../../config/prisma');
const { calculateBalanceMap, roundMoney } = require('../../utils/debtSettlement');

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function endOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function addUtcDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function getWeekStart(date) {
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return startOfUtcDay(addUtcDays(startOfUtcDay(date), diff));
}

function getMonthStart(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function resolvePeriodWindow(query) {
  if (query.period === 'custom') {
    const from = startOfUtcDay(new Date(`${query.from}T00:00:00.000Z`));
    const to = endOfUtcDay(new Date(`${query.to}T00:00:00.000Z`));

    return {
      period: query.period,
      from,
      to,
      previousFrom: startOfUtcDay(addUtcDays(from, -Math.max(1, Math.round((to.getTime() - from.getTime()) / DAY_MS) + 1))),
      previousTo: endOfUtcDay(addUtcDays(from, -1))
    };
  }

  const now = new Date();
  const today = startOfUtcDay(now);
  const days = query.period === '7d' ? 7 : query.period === '90d' ? 90 : 30;
  const from = startOfUtcDay(addUtcDays(today, -(days - 1)));
  const to = endOfUtcDay(today);
  const previousFrom = startOfUtcDay(addUtcDays(from, -days));
  const previousTo = endOfUtcDay(addUtcDays(from, -1));

  return {
    period: query.period,
    from,
    to,
    previousFrom,
    previousTo
  };
}

function filterExpensesByWindow(expenses, from, to) {
  return expenses.filter((expense) => expense.date >= from && expense.date <= to);
}

async function loadGroupFinancialSnapshot(groupId) {
  const [members, expenses, settlements] = await Promise.all([
    prisma.groupMember.findMany({
      where: {
        group_id: groupId
      },
      include: {
        user: {
          select: {
            display_name: true,
            avatar_url: true
          }
        }
      },
      orderBy: {
        joined_at: 'asc'
      }
    }),
    prisma.expense.findMany({
      where: {
        group_id: groupId
      },
      include: {
        splits: true
      }
    }),
    prisma.settlement.findMany({
      where: {
        group_id: groupId
      }
    })
  ]);

  return {
    members,
    expenses: expenses.map((expense) => ({
      ...expense,
      amount: Number(expense.amount),
      date: new Date(expense.date),
      splits: expense.splits.map((split) => ({
        ...split,
        amount: Number(split.amount)
      }))
    })),
    settlements: settlements.map((settlement) => ({
      ...settlement,
      amount: Number(settlement.amount)
    }))
  };
}

async function getGroupOverview(groupId, query) {
  const { expenses } = await loadGroupFinancialSnapshot(groupId);
  const { period, from, to, previousFrom, previousTo } = resolvePeriodWindow(query);
  const currentExpenses = filterExpensesByWindow(expenses, from, to);
  const previousExpenses = filterExpensesByWindow(expenses, previousFrom, previousTo);
  const totalSpending = roundMoney(currentExpenses.reduce((sum, expense) => sum + expense.amount, 0));
  const previousTotal = roundMoney(previousExpenses.reduce((sum, expense) => sum + expense.amount, 0));
  const changePercent = previousTotal === 0
    ? (totalSpending > 0 ? 100 : 0)
    : roundMoney(((totalSpending - previousTotal) / previousTotal) * 100);

  return {
    total_spending: totalSpending,
    period,
    from: formatDate(from),
    to: formatDate(to),
    vs_previous_period: {
      total: previousTotal,
      change_percent: changePercent
    },
    expense_count: currentExpenses.length
  };
}

async function getStatsByCategory(groupId, query) {
  const { expenses } = await loadGroupFinancialSnapshot(groupId);
  const { from, to } = resolvePeriodWindow(query);
  const filteredExpenses = filterExpensesByWindow(expenses, from, to);
  const total = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const categoryMap = new Map();

  for (const expense of filteredExpenses) {
    const current = categoryMap.get(expense.category) || { total: 0, count: 0 };
    current.total += expense.amount;
    current.count += 1;
    categoryMap.set(expense.category, current);
  }

  return Array.from(categoryMap.entries())
    .map(([category, value]) => ({
      category,
      total: roundMoney(value.total),
      count: value.count,
      percentage: total === 0 ? 0 : roundMoney((value.total / total) * 100)
    }))
    .sort((left, right) => right.total - left.total);
}

async function getStatsByMember(groupId, query) {
  const { members, expenses, settlements } = await loadGroupFinancialSnapshot(groupId);
  const { from, to } = resolvePeriodWindow(query);
  const filteredExpenses = filterExpensesByWindow(expenses, from, to);
  const paidMap = new Map();

  for (const expense of filteredExpenses) {
    paidMap.set(expense.paid_by, roundMoney((paidMap.get(expense.paid_by) || 0) + expense.amount));
  }

  const balanceMap = calculateBalanceMap(filteredExpenses, settlements);

  return members.map((member) => {
    const net = roundMoney(balanceMap.get(member.user_id) || 0);

    return {
      user_id: member.user_id,
      display_name: member.user.display_name || null,
      total_paid: roundMoney(paidMap.get(member.user_id) || 0),
      total_owed: net >= 0 ? roundMoney((paidMap.get(member.user_id) || 0) - net) : roundMoney((paidMap.get(member.user_id) || 0) + Math.abs(net)),
      net
    };
  });
}

function buildTimelineBucketDate(date, granularity) {
  if (granularity === 'month') {
    return getMonthStart(date);
  }

  if (granularity === 'week') {
    return getWeekStart(date);
  }

  return startOfUtcDay(date);
}

async function getStatsTimeline(groupId, query) {
  const { expenses } = await loadGroupFinancialSnapshot(groupId);
  const { from, to } = resolvePeriodWindow(query);
  const filteredExpenses = filterExpensesByWindow(expenses, from, to);
  const bucketMap = new Map();

  for (const expense of filteredExpenses) {
    const bucketDate = buildTimelineBucketDate(expense.date, query.granularity);
    const key = formatDate(bucketDate);
    bucketMap.set(key, roundMoney((bucketMap.get(key) || 0) + expense.amount));
  }

  return Array.from(bucketMap.entries())
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([date, total]) => ({
      date,
      total
    }));
}

module.exports = {
  getGroupOverview,
  getStatsByCategory,
  getStatsByMember,
  getStatsTimeline
};
