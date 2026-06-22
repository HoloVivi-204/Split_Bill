function generateVietQRUrl(bankId, accountNumber, accountName, transferContent) {
  const template = 'compact2';
  const params = [];

  if (transferContent) {
    params.push(`addInfo=${encodeURIComponent(transferContent)}`);
  }

  if (accountName) {
    params.push(`accountName=${encodeURIComponent(accountName)}`);
  }

  const queryString = params.length > 0 ? `?${params.join('&')}` : '';

  return `https://img.vietqr.io/image/${bankId}-${accountNumber}-${template}.png${queryString}`;
}

module.exports = {
  generateVietQRUrl
};
