const prisma = require('../../config/prisma');
const { AppError } = require('../../utils/appError');
const {
  calculateBalanceMap,
  simplifyDebts,
  roundMoney
} = require('../../utils/debtSettlement');
const { generateVietQRUrl } = require('../../utils/vietqr');
const { resolveBankAccount } = require('../banks/banks.service');

function throwSettlementError(code, message) {
  throw new AppError({
    statusCode: 422,
    code,
    message
  });
}

function assertPositiveAmount(amount) {
  if (amount <= 0) {
    throwSettlementError('AMOUNT_MUST_BE_POSITIVE', 'Số tiền phải lớn hơn 0');
  }
}

async function loadFinancialSnapshot(groupId) {
  const [members, expenses, settlements] = await Promise.all([
    prisma.groupMember.findMany({
      where: {
        group_id: groupId
      },
      select: {
        user_id: true,
        animal_avatar: true,
        settlement_bank_id: true,
        settlement_bank_name: true,
        settlement_account_number: true,
        settlement_account_name: true,
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

  return { members, expenses, settlements };
}

function buildSettlementBankInfo(member) {
  if (
    !member?.settlement_bank_id ||
    !member?.settlement_bank_name ||
    !member?.settlement_account_number
  ) {
    return null;
  }

  return {
    bank_id: member.settlement_bank_id,
    bank_name: member.settlement_bank_name,
    account_number: member.settlement_account_number,
    account_name: member.settlement_account_name
  };
}

function buildSettlementQrUrl(bankInfo) {
  if (!bankInfo) {
    return null;
  }

  return generateVietQRUrl(
    bankInfo.bank_id,
    bankInfo.account_number,
    bankInfo.account_name
  );
}

function buildBalanceResponse(members, balanceMap, expenses) {
  const balances = members.map((member) => ({
    user_id: member.user_id,
    display_name: member.user.display_name || null,
    avatar_url: member.user.avatar_url,
    animal_avatar: member.animal_avatar,
    balance: roundMoney(balanceMap.get(member.user_id) || 0)
  }));
  const totalExpenses = roundMoney(
    expenses.reduce((sum, expense) => sum + Number(expense.amount), 0)
  );
  const isSettled = balances.every((member) => Math.abs(member.balance) <= 0.01);

  return {
    balances,
    total_expenses: totalExpenses,
    is_settled: isSettled
  };
}

async function getGroupBalances(groupId) {
  const { members, expenses, settlements } = await loadFinancialSnapshot(groupId);
  const balanceMap = calculateBalanceMap(expenses, settlements);

  return buildBalanceResponse(members, balanceMap, expenses);
}

async function getSettlementSuggestions(groupId) {
  const { members, expenses, settlements } = await loadFinancialSnapshot(groupId);
  const balanceMap = calculateBalanceMap(expenses, settlements);
  const memberMap = new Map(
    members.map((member) => [
      member.user_id,
      {
        display_name: member.user.display_name || null,
        settlement_bank_info: buildSettlementBankInfo(member)
      }
    ])
  );
  const suggestions = simplifyDebts(balanceMap).map((suggestion) => {
    const receiver = memberMap.get(suggestion.toUserId);
    const settlementBankInfo = receiver?.settlement_bank_info || null;
    const to = {
      user_id: suggestion.toUserId,
      display_name: receiver?.display_name || null,
      settlement_bank_info: settlementBankInfo
    };

    if (settlementBankInfo) {
      to.qr_url = buildSettlementQrUrl(settlementBankInfo);
    }

    return {
      from: {
        user_id: suggestion.fromUserId,
        display_name: memberMap.get(suggestion.fromUserId)?.display_name || null
      },
      to,
      amount: suggestion.amount
    };
  });

  return {
    suggestions,
    total_transactions: suggestions.length
  };
}

function getMySettlementBankInfo(membership) {
  return buildSettlementBankInfo(membership);
}

async function updateMySettlementBankInfo(groupId, userId, input) {
  const bankInfo = await resolveBankAccount({
    bankId: input.bank_id,
    accountNumber: input.account_number
  });

  const updatedMembership = await prisma.groupMember.update({
    where: {
      group_id_user_id: {
        group_id: groupId,
        user_id: userId
      }
    },
    data: {
      settlement_bank_id: bankInfo.bank_id,
      settlement_bank_name: bankInfo.bank_name,
      settlement_account_number: bankInfo.account_number,
      settlement_account_name: bankInfo.account_name
    },
    select: {
      settlement_bank_id: true,
      settlement_bank_name: true,
      settlement_account_number: true,
      settlement_account_name: true
    }
  });

  return buildSettlementBankInfo(updatedMembership);
}

async function clearMySettlementBankInfo(groupId, userId) {
  await prisma.groupMember.update({
    where: {
      group_id_user_id: {
        group_id: groupId,
        user_id: userId
      }
    },
    data: {
      settlement_bank_id: null,
      settlement_bank_name: null,
      settlement_account_number: null,
      settlement_account_name: null
    },
    select: {
      id: true
    }
  });

  return {
    bank_info: null,
    message: 'Đã xoá thông tin ngân hàng nhận tiền'
  };
}

function validateSettlementMembers(input, memberMap) {
  if (!memberMap.has(input.from_user) || !memberMap.has(input.to_user)) {
    throwSettlementError(
      'INVALID_SETTLEMENT_USER',
      'Người thanh toán hoặc người nhận không hợp lệ'
    );
  }

  if (input.from_user === input.to_user) {
    throwSettlementError('INVALID_SETTLEMENT_USER', 'Không thể tự thanh toán cho chính mình');
  }
}

function assertCanRecordSettlement(actorMembership, input) {
  if (actorMembership.role === 'leader' || input.from_user === actorMembership.user_id) {
    return;
  }

  throw new AppError({
    statusCode: 403,
    code: 'INSUFFICIENT_ROLE',
    message: 'Bạn không có quyền ghi nhận khoản thanh toán này'
  });
}

async function createSettlement(groupId, actorMembership, input) {
  assertPositiveAmount(input.amount);
  const actorUserId = actorMembership.user_id;

  const settlement = await prisma.$transaction(async (tx) => {
    const members = await tx.groupMember.findMany({
      where: {
        group_id: groupId,
        status: 'active'
      },
      include: {
        user: {
          select: {
            display_name: true,
            avatar_url: true
          }
        }
      }
    });
    const memberMap = new Map(members.map((member) => [member.user_id, member]));

    validateSettlementMembers(input, memberMap);
    assertCanRecordSettlement(actorMembership, input);

    return tx.settlement.create({
      data: {
        group_id: groupId,
        from_user: input.from_user,
        to_user: input.to_user,
        amount: roundMoney(input.amount),
        note: input.note?.trim() || null,
        recorded_by: actorUserId
      },
      include: {
        from: {
          select: {
            id: true,
            display_name: true
          }
        },
        to: {
          select: {
            id: true,
            display_name: true
          }
        },
        recorder: {
          select: {
            id: true,
            display_name: true
          }
        }
      }
    });
  });

  return {
    id: settlement.id,
    from_user: {
      user_id: settlement.from.id,
      display_name: settlement.from.display_name || null
    },
    to_user: {
      user_id: settlement.to.id,
      display_name: settlement.to.display_name || null
    },
    amount: Number(settlement.amount),
    note: settlement.note,
    settled_at: settlement.settled_at,
    recorded_by: actorUserId
  };
}

async function listSettlements(groupId) {
  const settlements = await prisma.settlement.findMany({
    where: {
      group_id: groupId
    },
    orderBy: {
      settled_at: 'desc'
    },
    include: {
      from: {
        select: {
          id: true,
          display_name: true
        }
      },
      to: {
        select: {
          id: true,
          display_name: true
        }
      },
      recorder: {
        select: {
          id: true,
          display_name: true
        }
      }
    }
  });

  return settlements.map((settlement) => ({
    id: settlement.id,
    from_user: {
      user_id: settlement.from.id,
      display_name: settlement.from.display_name || null
    },
    to_user: {
      user_id: settlement.to.id,
      display_name: settlement.to.display_name || null
    },
    amount: Number(settlement.amount),
    note: settlement.note,
    settled_at: settlement.settled_at,
    recorded_by: {
      user_id: settlement.recorder.id,
      display_name: settlement.recorder.display_name || null
    }
  }));
}

module.exports = {
  getGroupBalances,
  getSettlementSuggestions,
  getMySettlementBankInfo,
  updateMySettlementBankInfo,
  clearMySettlementBankInfo,
  createSettlement,
  listSettlements
};
