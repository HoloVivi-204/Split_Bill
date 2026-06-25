require('../../test/env');

const router = require('./groups.routes');

function getRegisteredRoutes(expressRouter) {
  return expressRouter.stack
    .filter((layer) => layer.route)
    .flatMap((layer) => {
      const methods = Object.keys(layer.route.methods).map((method) => method.toUpperCase());

      return methods.map((method) => `${method} ${layer.route.path}`);
    });
}

describe('groups routes', () => {
  test('keeps the public route contract and registration order stable', () => {
    expect(getRegisteredRoutes(router)).toEqual([
      'POST /',
      'GET /',
      'GET /conversations',
      'GET /:id',
      'GET /:id/members',
      'PATCH /:id',
      'DELETE /:id',
      'POST /:id/leave',
      'GET /:id/leave-requests',
      'PATCH /:id/leader',
      'PATCH /:id/leave-requests/:requestId',
      'POST /:id/invitations',
      'POST /:id/expenses',
      'GET /:id/expenses',
      'GET /:id/expenses/:expId',
      'GET /:id/balances',
      'GET /:id/settlements/suggest',
      'GET /:id/settlements/bank-info/me',
      'PATCH /:id/settlements/bank-info/me',
      'DELETE /:id/settlements/bank-info/me',
      'POST /:id/settlements',
      'GET /:id/settlements',
      'POST /:id/fund/campaigns',
      'GET /:id/fund/campaigns',
      'GET /:id/fund/campaigns/:cId',
      'PATCH /:id/fund/campaigns/:cId',
      'DELETE /:id/fund/campaigns/:cId',
      'GET /:id/fund/campaigns/:cId/contributions',
      'GET /:id/fund/campaigns/:cId/contributions/me',
      'PATCH /:id/fund/campaigns/:cId/contributions/:userId',
      'GET /:id/fund/campaigns/:cId/contributions/history',
      'POST /:id/fund/qr',
      'GET /:id/fund/qr',
      'DELETE /:id/fund/qr/:qrId',
      'POST /:id/fund/spendings',
      'GET /:id/fund/spendings',
      'PATCH /:id/fund/spendings/:sId',
      'DELETE /:id/fund/spendings/:sId',
      'PATCH /:id/chat/me',
      'DELETE /:id/chat/me',
      'GET /:id/chat/participants/available',
      'POST /:id/chat/participants',
      'GET /:id/messages/pinned',
      'GET /:id/messages',
      'POST /:id/messages',
      'DELETE /:id/messages/:msgId',
      'PATCH /:id/messages/:msgId/pin',
      'GET /:id/fund/balance',
      'GET /:id/stats',
      'GET /:id/stats/by-category',
      'GET /:id/stats/by-member',
      'GET /:id/stats/timeline',
      'PATCH /:id/expenses/:expId',
      'DELETE /:id/expenses/:expId',
      'GET /:id/invitations',
      'DELETE /:id/invitations/:invId',
      'PATCH /:id/members/:userId',
      'DELETE /:id/members/:userId',
    ]);
  });
});
