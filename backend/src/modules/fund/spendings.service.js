const prisma = require('../../config/prisma');
const { AppError } = require('../../utils/appError');
const { uploadImage } = require('../../utils/cloudinary');

function toIsoDate(value) {
  return value.toISOString().slice(0, 10);
}

function buildDateValue(value) {
  const parsedDate = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new AppError({
      statusCode: 422,
      code: 'VALIDATION_ERROR',
      message: 'Ngày chi quỹ không hợp lệ'
    });
  }

  return parsedDate;
}

async function readFundTotals(groupId) {
  const [collected, spent, campaignsCount, spendingsCount] = await Promise.all([
    prisma.fundContributionPayment.aggregate({
      where: {
        contribution: {
          campaign: {
            group_id: groupId
          }
        }
      },
      _sum: {
        amount: true
      }
    }),
    prisma.fundSpending.aggregate({
      where: {
        group_id: groupId
      },
      _sum: {
        amount: true
      }
    }),
    prisma.fundCampaign.count({
      where: {
        group_id: groupId
      }
    }),
    prisma.fundSpending.count({
      where: {
        group_id: groupId
      }
    })
  ]);

  const totalCollected = Number(collected?._sum?.amount || 0);
  const totalSpent = Number(spent?._sum?.amount || 0);

  return {
    totalCollected,
    totalSpent,
    currentBalance: totalCollected - totalSpent,
    campaignsCount,
    spendingsCount
  };
}

async function createSpending(groupId, actorUserId, input, receiptFile) {
  const totals = await readFundTotals(groupId);
  let receiptUrl = null;

  if (totals.currentBalance - Number(input.amount) < 0) {
    throw new AppError({
      statusCode: 409,
      code: 'FUND_BALANCE_NEGATIVE',
      message: 'Số tiền chi vượt quỹ hiện có'
    });
  }

  if (receiptFile) {
    try {
      const uploadResult = await uploadImage(receiptFile.buffer, 'splitbill/fund-spendings');
      receiptUrl = uploadResult.secure_url;
    } catch {
      throw new AppError({
        statusCode: 500,
        code: 'UPLOAD_FAILED',
        message: 'Lỗi tải lên hóa đơn'
      });
    }
  }

  const spending = await prisma.fundSpending.create({
    data: {
      group_id: groupId,
      title: input.title,
      amount: Number(input.amount),
      spent_at: buildDateValue(input.spent_at),
      note: input.note?.trim() || null,
      receipt_url: receiptUrl,
      recorded_by: actorUserId
    },
    include: {
      recorder: {
        select: {
          id: true,
          display_name: true
        }
      }
    }
  });

  return {
    id: spending.id,
    title: spending.title,
    amount: Number(spending.amount),
    spent_at: toIsoDate(spending.spent_at),
    note: spending.note,
    receipt_url: spending.receipt_url,
    recorded_by: {
      user_id: spending.recorder.id,
      display_name: spending.recorder.display_name || null
    },
    created_at: spending.created_at
  };
}

function buildSpendingResponse(spending) {
  return {
    id: spending.id,
    title: spending.title,
    amount: Number(spending.amount),
    spent_at: toIsoDate(spending.spent_at),
    note: spending.note,
    receipt_url: spending.receipt_url,
    recorded_by: {
      user_id: spending.recorder.id,
      display_name: spending.recorder.display_name || null
    },
    ...(spending.created_at ? { created_at: spending.created_at } : {})
  };
}

function assertSpendingExists(spending, groupId) {
  if (!spending || spending.group_id !== groupId) {
    throw new AppError({
      statusCode: 404,
      code: 'FUND_SPENDING_NOT_FOUND',
      message: 'Khoản chi quỹ không tồn tại'
    });
  }
}

async function listSpendings(groupId) {
  const spendings = await prisma.fundSpending.findMany({
    where: {
      group_id: groupId
    },
    orderBy: [{ spent_at: 'desc' }, { created_at: 'desc' }],
    include: {
      recorder: {
        select: {
          id: true,
          display_name: true
        }
      }
    }
  });

  return spendings.map(buildSpendingResponse);
}

async function getFundBalance(groupId) {
  const totals = await readFundTotals(groupId);

  return {
    total_collected: totals.totalCollected,
    total_spent: totals.totalSpent,
    remaining: totals.currentBalance,
    breakdown: {
      campaigns_count: totals.campaignsCount,
      spendings_count: totals.spendingsCount
    }
  };
}

async function updateSpending(groupId, spendingId, input, receiptFile) {
  const existingSpending = await prisma.fundSpending.findUnique({
    where: {
      id: spendingId
    },
    include: {
      recorder: {
        select: {
          id: true,
          display_name: true
        }
      }
    }
  });
  assertSpendingExists(existingSpending, groupId);

  const totals = await readFundTotals(groupId);
  const currentAmount = Number(existingSpending.amount);
  const nextAmount = Number(input.amount ?? currentAmount);
  const availableBalance = totals.currentBalance + currentAmount;

  if (availableBalance - nextAmount < 0) {
    throw new AppError({
      statusCode: 409,
      code: 'FUND_BALANCE_NEGATIVE',
      message: 'Số tiền chi vượt quỹ hiện có'
    });
  }

  let receiptUrl;

  if (receiptFile) {
    try {
      const uploadResult = await uploadImage(receiptFile.buffer, 'splitbill/fund-spendings');
      receiptUrl = uploadResult.secure_url;
    } catch {
      throw new AppError({
        statusCode: 500,
        code: 'UPLOAD_FAILED',
        message: 'Lỗi tải lên hóa đơn'
      });
    }
  }

  const updatedSpending = await prisma.fundSpending.update({
    where: {
      id: spendingId
    },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.amount !== undefined ? { amount: Number(input.amount) } : {}),
      ...(input.spent_at !== undefined ? { spent_at: buildDateValue(input.spent_at) } : {}),
      ...(input.note !== undefined ? { note: input.note?.trim() || null } : {}),
      ...(receiptUrl ? { receipt_url: receiptUrl } : {})
    },
    include: {
      recorder: {
        select: {
          id: true,
          display_name: true
        }
      }
    }
  });

  return buildSpendingResponse(updatedSpending);
}

async function deleteSpending(groupId, spendingId) {
  const existingSpending = await prisma.fundSpending.findUnique({
    where: {
      id: spendingId
    }
  });
  assertSpendingExists(existingSpending, groupId);

  await prisma.fundSpending.delete({
    where: {
      id: spendingId
    }
  });
}

module.exports = {
  createSpending,
  listSpendings,
  getFundBalance,
  updateSpending,
  deleteSpending
};
