/* global afterEach, beforeEach, describe, expect, test */

require("../../test/env");

const originalFetch = global.fetch;

describe("banks service", () => {
  beforeEach(() => {
    jest.resetModules();
    global.fetch = jest.fn();
    process.env.VIETQR_API_BASE_URL = "https://api.vietqr.test";
    process.env.VIETQR_LOOKUP_TIMEOUT_MS = "1000";
    process.env.VIETQR_CLIENT_ID = "client-id";
    process.env.VIETQR_API_KEY = "api-key";
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test("listBanks normalizes provider metadata", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        code: "00",
        data: [
          {
            bin: "970436",
            code: "VCB",
            shortName: "Vietcombank",
            name: "Joint Stock Commercial Bank for Foreign Trade of Vietnam",
            lookupSupported: 1
          }
        ]
      })
    });

    const banksService = require("./banks.service");
    const banks = await banksService.listBanks();

    expect(banks).toEqual([
      {
        bank_id: "970436",
        bank_code: "VCB",
        bank_name: "Vietcombank",
        full_name: "Joint Stock Commercial Bank for Foreign Trade of Vietnam",
        lookup_supported: true
      }
    ]);
  });

  test("resolveBankAccount keeps QR-only flow nullable for account_name", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        code: "00",
        data: [
          {
            bin: "970436",
            code: "VCB",
            shortName: "Vietcombank",
            name: "Joint Stock Commercial Bank for Foreign Trade of Vietnam",
            lookupSupported: true
          }
        ]
      })
    });

    const banksService = require("./banks.service");
    const bankAccount = await banksService.resolveBankAccount({
      bankId: "VCB",
      accountNumber: "123456789"
    });

    expect(bankAccount).toEqual({
      bank_id: "970436",
      bank_code: "VCB",
      bank_name: "Vietcombank",
      account_number: "123456789",
      account_name: null
    });
  });
});
