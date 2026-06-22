const { buildSuccessResponse } = require("../../utils/apiResponse");
const expensesService = require("./expenses.service");

async function createExpense(request, response, next) {
  try {
    const data = await expensesService.createExpense(
      request.params.id,
      request.user.id,
      request.body,
      request.file,
      request.app.get("io")
    );
    response.status(201).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function listExpenses(request, response, next) {
  try {
    const { data, meta } = await expensesService.listExpenses(request.params.id, request.query);
    response.status(200).json(buildSuccessResponse(data, meta));
  } catch (error) {
    next(error);
  }
}

async function getExpenseDetail(request, response, next) {
  try {
    const data = await expensesService.getExpenseDetail(request.params.id, request.params.expId);
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function updateExpense(request, response, next) {
  try {
    const data = await expensesService.updateExpense(
      request.params.id,
      request.params.expId,
      request.user.id,
      request.groupMembership.role,
      request.body,
      request.file
    );
    response.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

async function deleteExpense(request, response, next) {
  try {
    await expensesService.deleteExpense(
      request.params.id,
      request.params.expId,
      request.user.id,
      request.groupMembership.role
    );
    response.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createExpense,
  listExpenses,
  getExpenseDetail,
  updateExpense,
  deleteExpense
};
