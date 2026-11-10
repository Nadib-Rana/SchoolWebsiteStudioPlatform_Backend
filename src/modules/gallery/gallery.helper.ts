export function extractStorageKey(urlOrKey: string): string | null {
  if (!urlOrKey) return null;
  if (urlOrKey.startsWith("tenants/")) return urlOrKey;
  const match = urlOrKey.match(/tenants\/[^?#]+/);
  if (match) return match[0];
  if (urlOrKey.startsWith("uploads/")) return urlOrKey;
  return null;
}

export function calculateStorageStats(
  mediaAssets: Array<{ sizeBytes?: bigint | number | null }>,
  planLimit?: bigint | number | null,
) {
  const totalBytesUsed = mediaAssets.reduce(
    (acc, item) => acc + Number(item.sizeBytes || 0),
    0,
  );
  const totalLimitBytes = Number(planLimit || 10737418240);
  const usedMb = (totalBytesUsed / (1024 * 1024)).toFixed(1);
  const limitGb = (totalLimitBytes / (1024 * 1024 * 1024)).toFixed(0);
  const usagePercent = Math.min(
    100,
    Math.round((totalBytesUsed / totalLimitBytes) * 100),
  );

  return {
    usedBytes: totalBytesUsed,
    limitBytes: totalLimitBytes,
    usedFormatted: `${usedMb} MB`,
    limitFormatted: `${limitGb} GB`,
    percentage: `${usagePercent}%`,
  };
}
