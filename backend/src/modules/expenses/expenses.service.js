const crypto = require('crypto');

const prisma = require("../../config/prisma");
const { AppError } = require("../../utils/appError");
const { createNotification, emitNotifications } = require("../../utils/notification");
const { createSystemMessage } = require("../../utils/systemMessage");
const { uploadImage } = require('../../utils/cloudinary');

const PERCENTAGE_TOLERANCE = 0.01;
const AMOUNT_TOLERANCE = 1;

function throwExpenseError(code, message) {
  throw new AppError({
    statusCode: 422,
    code,
    message
  });
}

function toIsoDate(value) {
  return value.toISOString().slice(0, 10);
}

function buildExpenseDate(value) {
  const parsedDate = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsedDate.getTime())) {
    throwExpenseError("VALIDATION_ERROR", "Ngày chi tiêu không hợp lệ");
  }

  return parsedDate;
}

function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizePercentage(number) {
  return Math.round((number + Number.EPSILON) * 100) / 100;
}

function assertPositiveAmount(amount) {
  if (amount <= 0) {
    throwExpenseError("AMOUNT_MUST_BE_POSITIVE", "Số tiền phải lớn hơn 0");
  }
}

function assertUniqueSplitUsers(splits) {
  const userIds = new Set();

  for (const split of splits) {
    if (userIds.has(split.user_id)) {
      throwExpenseError("INVALID_SPLIT_USER", "Không được lặp người dùng trong danh sách chia tiền");
    }

    userIds.add(split.user_id);
  }
}

function buildEqualSplits(amount, activeMembers) {
  const baseAmount = Math.floor(amount / activeMembers.length);
  const remainder = amount - baseAmount * activeMembers.length;

  return activeMembers.map((member, index) => ({
    user_id: member.user_id,
    amount: baseAmount + (index < remainder ? 1 : 0)
  }));
}

function selectSplitMembers(splits, memberMap) {
  if (!Array.isArray(splits)) {
    return null;
  }

  if (splits.length === 0) {
    throwExpenseError("VALIDATION_ERROR", "Phải chọn ít nhất một thành viên chia tiền");
  }

  assertUniqueSplitUsers(splits);

  return splits.map((split) => {
    const member = memberMap.get(split.user_id);

    if (!member) {
      throwExpenseError("INVALID_SPLIT_USER", "Có người dùng trong splits không phải thành viên đang hoạt động");
    }

    return member;
  });
}

function buildCustomSplits(amount, splits) {
  const normalizedSplits = splits.map((split) => ({
    user_id: split.user_id,
    amount: roundCurrency(split.amount ?? 0)
  }));
  const totalAmount = normalizedSplits.reduce((sum, split) => sum + split.amount, 0);

  if (Math.abs(totalAmount - amount) > AMOUNT_TOLERANCE) {
    throwExpenseError("SPLIT_AMOUNT_MISMATCH", "Tổng số tiền chia không khớp với amount");
  }

  return normalizedSplits;
}

function buildPercentageSplits(amount, splits) {
  const normalizedSplits = splits.map((split, index) => ({
    user_id: split.user_id,
    percentage: normalizePercentage(split.percentage ?? 0),
    order: index
  }));
  const totalPercentage = roundCurrency(
    normalizedSplits.reduce((sum, split) => sum + split.percentage, 0)
  );

  if (Math.abs(totalPercentage - 100) > PERCENTAGE_TOLERANCE) {
    throwExpenseError("PERCENTAGE_MISMATCH", "Tổng phần trăm chia không bằng 100");
  }

  const rawSplits = normalizedSplits.map((split) => {
    const rawAmount = (amount * split.percentage) / 100;
    const flooredAmount = Math.floor(rawAmount);

    return {
      user_id: split.user_id,
      amount: flooredAmount,
      fraction: rawAmount - flooredAmount,
      order: split.order
    };
  });

  const distributedAmount = rawSplits.reduce((sum, split) => sum + split.amount, 0);
  let remainder = Math.round(amount - distributedAmount);

  rawSplits
    .slice()
    .sort((left, right) => {
      if (right.fraction !== left.fraction) {
        return right.fraction - left.fraction;
      }

      return left.order - right.order;
    })
    .forEach((split) => {
      if (remainder <= 0) {
        return;
      }

      const targetSplit = rawSplits.find((item) => item.user_id === split.user_id);
      targetSplit.amount += 1;
      remainder -= 1;
    });

  return rawSplits.map((split) => ({
    user_id: split.user_id,
    amount: split.amount
  }));
}

function normalizeExpenseSplits(splitType, amount, splits, activeMembers) {
  const memberMap = new Map(activeMembers.map((member) => [member.user_id, member]));

  if (splitType === "equal") {
    const selectedMembers = selectSplitMembers(splits, memberMap);

    return buildEqualSplits(amount, selectedMembers || activeMembers);
  }

  if (!Array.isArray(splits) || splits.length === 0) {
    throwExpenseError("VALIDATION_ERROR", "Danh sách chia tiền là bắt buộc");
  }

  assertUniqueSplitUsers(splits);

  if (splitType === "custom") {
    return buildCustomSplits(amount, splits);
  }

  return buildPercentageSplits(amount, splits);
}

function assertPayerIsActiveMember(paidBy, memberMap) {
  if (!memberMap.has(paidBy)) {
    throwExpenseError("INVALID_PAYER", "Người trả tiền phải là thành viên đang hoạt động của nhóm");
  }
}

function assertSplitUsersAreActiveMembers(splits, memberMap) {
  for (const split of splits) {
    if (!memberMap.has(split.user_id)) {
      throwExpenseError("INVALID_SPLIT_USER", "Có người dùng trong splits không phải thành viên đang hoạt động");
    }
  }
}

function assertPayerIsIncludedInSplits(paidBy, splits) {
  if (!splits.some((split) => split.user_id === paidBy)) {
    throwExpenseError("INVALID_PAYER", "Người trả tiền phải nằm trong danh sách chia tiền");
  }
}

function buildExpenseResponse(expense, splitOrderMap) {
  return {
    id: expense.id,
    group_id: expense.group_id,
    title: expense.title,
    amount: Number(expense.amount),
    paid_by: {
      user_id: expense.payer.id,
      display_name: expense.payer.display_name || null
    },
    category: expense.category,
    date: toIsoDate(expense.date),
    note: expense.note,
    receipt_url: expense.receipt_url,
    splits: expense.splits
      .slice()
      .sort((left, right) => {
        const leftOrder = splitOrderMap.get(left.user_id) ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = splitOrderMap.get(right.user_id) ?? Number.MAX_SAFE_INTEGER;

        return leftOrder - rightOrder;
      })
      .map((split) => ({
        user_id: split.user_id,
        display_name: split.user?.display_name || null,
        amount: Number(split.amount)
      })),
    created_by: expense.created_by,
    created_at: expense.created_at
  };
}

function buildExpenseListItemResponse(expense) {
  return {
    id: expense.id,
    title: expense.title,
    amount: Number(expense.amount),
    paid_by: {
      user_id: expense.payer.id,
      display_name: expense.payer.display_name || null,
      avatar_url: expense.payer.avatar_url,
      animal_avatar: expense.payer.group_members[0]?.animal_avatar || null
    },
    category: expense.category,
    date: toIsoDate(expense.date),
    note: expense.note,
    receipt_url: expense.receipt_url,
    splits: expense.splits.map((split) => ({
      user_id: split.user_id,
      display_name: split.user?.display_name || null,
      amount: Number(split.amount)
    })),
    created_at: expense.created_at
  };
}

function buildExpenseDetailResponse(expense) {
  return {
    id: expense.id,
    title: expense.title,
    amount: Number(expense.amount),
    paid_by: {
      user_id: expense.payer.id,
      display_name: expense.payer.display_name || null
    },
    category: expense.category,
    date: toIsoDate(expense.date),
    note: expense.note,
    receipt_url: expense.receipt_url,
    splits: expense.splits.map((split) => ({
      user_id: split.user_id,
      display_name: split.user?.display_name || null,
      amount: Number(split.amount)
    })),
    created_by: {
      user_id: expense.creator.id,
      display_name: expense.creator.display_name || null
    },
    created_at: expense.created_at
  };
}

function buildExpenseListFilters(groupId, query) {
  const filters = {
    group_id: groupId
  };

  if (query.category) {
    filters.category = query.category;
  }

  if (query.paid_by) {
    filters.paid_by = query.paid_by;
  }

  if (query.from || query.to) {
    filters.date = {};
  }

  if (query.from) {
    filters.date.gte = buildExpenseDate(query.from);
  }

  if (query.to) {
    filters.date.lte = buildExpenseDate(query.to);
  }

  return filters;
}

function buildUpdateNote(note) {
  if (note === undefined) {
    return undefined;
  }

  const normalizedNote = note.trim();
  return normalizedNote || null;
}

function assertExpenseExistsInGroup(expense, groupId) {
  if (!expense || expense.group_id !== groupId) {
    throw new AppError({
      statusCode: 404,
      code: "EXPENSE_NOT_FOUND",
      message: "Khoản chi không tồn tại"
    });
  }
}

function assertCanMutateExpense(expense, actorUserId, actorRole, action) {
  if (actorRole === "leader" || expense.created_by === actorUserId) {
    return;
  }

  const code = action === "delete" ? "CANNOT_DELETE_EXPENSE" : "CANNOT_EDIT_EXPENSE";
  const message =
    action === "delete"
      ? "Bạn không có quyền xóa khoản chi này"
      : "Bạn không có quyền chỉnh sửa khoản chi này";

  throw new AppError({
    statusCode: 403,
    code,
    message
  });
}

function inferSplitTypeFromInput(input) {
  if (input.split_type) {
    return input.split_type;
  }

  if (!Array.isArray(input.splits) || input.splits.length === 0) {
    return null;
  }

  const hasAmountsOnly = input.splits.every(
    (split) => split.amount !== undefined && split.percentage === undefined
  );
  const hasPercentagesOnly = input.splits.every(
    (split) => split.percentage !== undefined && split.amount === undefined
  );

  if (hasAmountsOnly) {
    return "custom";
  }

  if (hasPercentagesOnly) {
    return "percentage";
  }

  throwExpenseError("VALIDATION_ERROR", "Không thể xác định kiểu chia tiền");
}

function buildExistingSplits(expense) {
  return expense.splits.map((split) => ({
    user_id: split.user_id,
    amount: Number(split.amount)
  }));
}

function normalizeUpdatedSplits(expense, input, amount, activeMembers) {
  const splitType = inferSplitTypeFromInput(input);
  const hasAmountChange = input.amount !== undefined;

  if (!splitType) {
    if (hasAmountChange) {
      throwExpenseError(
        "VALIDATION_ERROR",
        "Danh sách chia tiền là bắt buộc khi thay đổi amount"
      );
    }

    return buildExistingSplits(expense);
  }

  return normalizeExpenseSplits(splitType, amount, input.splits, activeMembers);
}

async function createExpense(groupId, actorUserId, input, receiptFile, io) {
  assertPositiveAmount(input.amount);
  let splitOrderMap = new Map();
  const expenseId = crypto.randomUUID();
  let receiptUrl = null;
  let notifications = [];

  if (receiptFile) {
    try {
      const uploadResult = await uploadImage(receiptFile.buffer, 'splitbill/expenses', expenseId);
      receiptUrl = uploadResult.secure_url;
    } catch {
      throw new AppError({
        statusCode: 500,
        code: 'UPLOAD_FAILED',
        message: 'Lỗi upload receipt'
      });
    }
  }

  const expense = await prisma.$transaction(async (tx) => {
    const activeMembers = await tx.groupMember.findMany({
      where: {
        group_id: groupId,
        status: "active"
      },
      include: {
        user: {
          select: {
            display_name: true
          }
        }
      },
      orderBy: {
        joined_at: "asc"
      }
    });
    const memberMap = new Map(activeMembers.map((member) => [member.user_id, member]));

    assertPayerIsActiveMember(input.paid_by, memberMap);

    const normalizedSplits = normalizeExpenseSplits(
      input.split_type,
      roundCurrency(input.amount),
      input.splits,
      activeMembers
    );
    splitOrderMap = new Map(normalizedSplits.map((split, index) => [split.user_id, index]));

    assertSplitUsersAreActiveMembers(normalizedSplits, memberMap);
    assertPayerIsIncludedInSplits(input.paid_by, normalizedSplits);

    const createdExpense = await tx.expense.create({
      data: {
        id: expenseId,
        group_id: groupId,
        title: input.title,
        amount: roundCurrency(input.amount),
        paid_by: input.paid_by,
        category: input.category,
        date: buildExpenseDate(input.date),
        note: input.note?.trim() || null,
        receipt_url: receiptUrl,
        created_by: actorUserId,
        splits: {
          create: normalizedSplits
        }
      },
      include: {
        payer: {
          select: {
            id: true,
            display_name: true
          }
        },
        splits: {
          include: {
            user: {
              select: {
                display_name: true
              }
            }
          }
        }
      }
    });

    await createSystemMessage(
      tx,
      groupId,
      `${createdExpense.payer.display_name || "Thành viên"} vừa thêm khoản chi: ${createdExpense.title}`
    );

    notifications = (
      await Promise.all(
        activeMembers
          .filter((member) => member.user_id !== actorUserId)
          .map((member) =>
            createNotification(tx, {
              user_id: member.user_id,
              group_id: groupId,
              type: "expense_added",
              title: "Khoản chi mới",
              body: `${createdExpense.payer.display_name || "Thành viên"} vừa thêm ${createdExpense.title}`
            })
          )
      )
    ).filter(Boolean);

    return createdExpense;
  });

  emitNotifications(io, notifications);

  return buildExpenseResponse(expense, splitOrderMap);
}

async function listExpenses(groupId, query) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const where = buildExpenseListFilters(groupId, query);

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: [{ date: "desc" }, { created_at: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        payer: {
          select: {
            id: true,
            display_name: true,
            avatar_url: true,
            group_members: {
              where: {
                group_id: groupId
              },
              select: {
                animal_avatar: true
              },
              take: 1
            }
          }
        },
        splits: {
          include: {
            user: {
              select: {
                display_name: true
              }
            }
          }
        }
      }
    }),
    prisma.expense.count({ where })
  ]);

  return {
    data: expenses.map(buildExpenseListItemResponse),
    meta: {
      page,
      limit,
      total,
      has_more: page * limit < total
    }
  };
}

async function getExpenseDetail(groupId, expenseId) {
  const expense = await prisma.expense.findUnique({
    where: {
      id: expenseId
    },
    include: {
      payer: {
        select: {
          id: true,
          display_name: true
        }
      },
      creator: {
        select: {
          id: true,
          display_name: true
        }
      },
      splits: {
        include: {
          user: {
            select: {
              display_name: true
            }
          }
        }
      }
    }
  });

  assertExpenseExistsInGroup(expense, groupId);

  return buildExpenseDetailResponse(expense);
}

async function updateExpense(groupId, expenseId, actorUserId, actorRole, input, receiptFile) {
  let receiptUrl;

  if (receiptFile) {
    try {
      const uploadResult = await uploadImage(receiptFile.buffer, 'splitbill/expenses', expenseId);
      receiptUrl = uploadResult.secure_url;
    } catch {
      throw new AppError({
        statusCode: 500,
        code: 'UPLOAD_FAILED',
        message: 'Lỗi upload receipt'
      });
    }
  }

  const updatedExpense = await prisma.$transaction(async (tx) => {
    const currentExpense = await tx.expense.findUnique({
      where: {
        id: expenseId
      },
      include: {
        splits: true
      }
    });

    assertExpenseExistsInGroup(currentExpense, groupId);
    assertCanMutateExpense(currentExpense, actorUserId, actorRole, "edit");

    const effectiveAmount = roundCurrency(input.amount ?? Number(currentExpense.amount));
    assertPositiveAmount(effectiveAmount);

    let normalizedSplits = buildExistingSplits(currentExpense);
    const shouldValidateMembers =
      input.paid_by !== undefined ||
      input.amount !== undefined ||
      input.split_type !== undefined ||
      input.splits !== undefined;

    if (shouldValidateMembers) {
      const activeMembers = await tx.groupMember.findMany({
        where: {
          group_id: groupId,
          status: "active"
        },
        include: {
          user: {
            select: {
              display_name: true
            }
          }
        },
        orderBy: {
          joined_at: "asc"
        }
      });
      const memberMap = new Map(activeMembers.map((member) => [member.user_id, member]));
      const effectivePaidBy = currentExpense.paid_by;

      assertPayerIsActiveMember(effectivePaidBy, memberMap);
      normalizedSplits = normalizeUpdatedSplits(
        currentExpense,
        input,
        effectiveAmount,
        activeMembers
      );
      assertSplitUsersAreActiveMembers(normalizedSplits, memberMap);
      assertPayerIsIncludedInSplits(effectivePaidBy, normalizedSplits);
    }

    return tx.expense.update({
      where: {
        id: expenseId
      },
      data: {
        title: input.title ?? currentExpense.title,
        amount: effectiveAmount,
        paid_by: currentExpense.paid_by,
        category: input.category ?? currentExpense.category,
        date: input.date ? buildExpenseDate(input.date) : currentExpense.date,
        note: input.note !== undefined ? buildUpdateNote(input.note) : currentExpense.note,
        ...(receiptUrl ? { receipt_url: receiptUrl } : {}),
        splits: {
          deleteMany: {},
          create: normalizedSplits
        }
      },
      include: {
        payer: {
          select: {
            id: true,
            display_name: true
          }
        },
        creator: {
          select: {
            id: true,
            display_name: true
          }
        },
        splits: {
          include: {
            user: {
              select: {
                display_name: true
              }
            }
          }
        }
      }
    });
  });

  return buildExpenseDetailResponse(updatedExpense);
}

async function deleteExpense(groupId, expenseId, actorUserId, actorRole) {
  await prisma.$transaction(async (tx) => {
    const currentExpense = await tx.expense.findUnique({
      where: {
        id: expenseId
      }
    });

    assertExpenseExistsInGroup(currentExpense, groupId);
    assertCanMutateExpense(currentExpense, actorUserId, actorRole, "delete");

    await tx.expenseSplit.deleteMany({
      where: {
        expense_id: expenseId
      }
    });

    await tx.expense.delete({
      where: {
        id: expenseId
      }
    });
  });
}

module.exports = {
  createExpense,
  listExpenses,
  getExpenseDetail,
  updateExpense,
  deleteExpense
};
