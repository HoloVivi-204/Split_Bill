function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function addBalance(balanceMap, userId, amount) {
  const currentBalance = balanceMap.get(userId) || 0;
  balanceMap.set(userId, roundMoney(currentBalance + Number(amount)));
}

function calculateBalanceMap(expenses, settlements) {
  const balanceMap = new Map();

  for (const expense of expenses) {
    addBalance(balanceMap, expense.paid_by, expense.amount);

    for (const split of expense.splits) {
      addBalance(balanceMap, split.user_id, -Number(split.amount));
    }
  }

  for (const settlement of settlements) {
    addBalance(balanceMap, settlement.from_user, settlement.amount);
    addBalance(balanceMap, settlement.to_user, -Number(settlement.amount));
  }

  return balanceMap;
}

function simplifyDebts(balanceMap) {
  const creditors = [];
  const debtors = [];

  for (const [userId, balance] of balanceMap.entries()) {
    if (balance > 0.01) {
      creditors.push({ userId, amount: roundMoney(balance) });
    } else if (balance < -0.01) {
      debtors.push({ userId, amount: roundMoney(-balance) });
    }
  }

  creditors.sort((left, right) => right.amount - left.amount);
  debtors.sort((left, right) => right.amount - left.amount);

  const suggestions = [];
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];
    const amount = roundMoney(Math.min(creditor.amount, debtor.amount));

    if (amount > 0.01) {
      suggestions.push({
        fromUserId: debtor.userId,
        toUserId: creditor.userId,
        amount
      });
    }

    creditor.amount = roundMoney(creditor.amount - amount);
    debtor.amount = roundMoney(debtor.amount - amount);

    if (creditor.amount <= 0.01) {
      creditorIndex += 1;
    }

    if (debtor.amount <= 0.01) {
      debtorIndex += 1;
    }
  }

  return suggestions;
}

module.exports = {
  calculateBalanceMap,
  simplifyDebts,
  roundMoney
};
