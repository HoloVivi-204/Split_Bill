function normalizeTransferContent(content) {
  return String(content || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function extractTransferCode(content) {
  const normalized = normalizeTransferContent(content);

  if (!normalized.includes("QUY")) {
    return null;
  }

  const hyphenLikeMatch = normalized.match(/QUY\s+([A-Z0-9]{6})\s+([A-Z0-9]{3})/);
  if (hyphenLikeMatch) {
    return `QUY-${hyphenLikeMatch[1]}-${hyphenLikeMatch[2]}`;
  }

  const compactContent = normalized.replace(/\s+/g, "");
  const compactMatch = compactContent.match(/QUY([A-Z0-9]{6})([A-Z0-9]{3})/);

  if (compactMatch) {
    return `QUY-${compactMatch[1]}-${compactMatch[2]}`;
  }

  return null;
}

module.exports = {
  normalizeTransferContent,
  extractTransferCode
};
