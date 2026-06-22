const express = require('express');

const { authMiddleware } = require('../../middlewares/auth');
const { validate } = require('../../middlewares/validate');
const banksController = require('./banks.controller');
const { accountLookupSchema } = require('./banks.schema');

const router = express.Router();

router.get('/', authMiddleware, banksController.listBanks);
router.post(
  '/account-lookup',
  authMiddleware,
  validate(accountLookupSchema),
  banksController.lookupBankAccount
);

module.exports = router;
