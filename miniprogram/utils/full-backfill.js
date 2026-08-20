function emptySummary() {
  return {
    analyzedCount: 0,
    filledGarmentCount: 0,
    filledFieldCount: 0,
    unchangedCount: 0,
    unreadableCount: 0,
    failedCount: 0,
    mirrorConflictCount: 0,
    remainingUnattempted: 0,
    noPhotoCount: 0,
    noPhotoItems: [],
    noPhotoItemsTruncated: false,
    failedItems: [],
    completionState: '',
    deadlineReached: false,
    batches: 0,
    stopped: false,
    stopReason: '',
  };
}

function shouldContinue(result, stopRequested) {
  if (stopRequested) {
    return { continue: false, reason: 'stopped' };
  }
  if (!result) {
    return { continue: false, reason: 'empty' };
  }
  if (Number(result.remainingUnattempted) <= 0) {
    return { continue: false, reason: 'complete' };
  }
  if (
    result.completionState === 'photo-complete' ||
    result.completionState === 'photo-complete-with-no-photo'
  ) {
    return { continue: false, reason: 'complete' };
  }
  // 失败件不会打补标时间，重复请求会一直打同一批，所以本批 0 件落标就停。
  if (!(Number(result.analyzedThisRun) > 0)) {
    return { continue: false, reason: 'no-progress' };
  }
  return { continue: true, reason: '' };
}

function uniqueFailedItems(items) {
  const seen = {};
  const unique = [];
  (items || []).forEach(function (item) {
    if (!item || item.id == null || seen[item.id]) return;
    seen[item.id] = true;
    unique.push(item);
  });
  return unique;
}

function mergeBatch(summary, result) {
  const next = Object.assign({}, summary);
  next.analyzedCount += Number(result.analyzedThisRun) || 0;
  next.filledGarmentCount += Number(result.filledGarmentCount) || 0;
  next.filledFieldCount += Number(result.filledFieldCount) || 0;
  next.unchangedCount += Number(result.unchangedCount) || 0;
  next.unreadableCount += Number(result.unreadableCount) || 0;
  next.failedCount += Number(result.failedCount) || 0;
  next.mirrorConflictCount += Number(result.mirrorConflictCount) || 0;
  next.remainingUnattempted = Number(result.remainingUnattempted) || 0;
  next.noPhotoCount = Number(result.noPhotoCount) || 0;
  next.noPhotoItems = result.noPhotoItems || [];
  next.noPhotoItemsTruncated = Boolean(result.noPhotoItemsTruncated);
  next.failedItems = uniqueFailedItems(
    (summary.failedItems || []).concat(result.failedItems || []),
  );
  next.completionState = result.completionState || '';
  next.deadlineReached = Boolean(result.deadlineReached);
  next.batches += 1;
  return next;
}

function runFullBackfill(options) {
  const requestBatch = options.requestBatch;
  const onProgress = options.onProgress || function () {};
  const shouldStop = options.shouldStop || function () {
    return false;
  };
  const batchLimit = options.batchLimit || 3;
  let summary = emptySummary();

  function next() {
    if (shouldStop()) {
      summary.stopped = true;
      summary.stopReason = 'stopped';
      onProgress(summary);
      return Promise.resolve(summary);
    }

    return requestBatch(batchLimit).then(function (result) {
      summary = mergeBatch(summary, result);
      const decision = shouldContinue(result, shouldStop());
      summary.stopped = decision.reason === 'stopped';
      summary.stopReason = decision.reason;
      onProgress(summary);
      if (!decision.continue) {
        return summary;
      }
      return next();
    });
  }

  return next();
}

module.exports = {
  emptySummary: emptySummary,
  shouldContinue: shouldContinue,
  mergeBatch: mergeBatch,
  runFullBackfill: runFullBackfill,
};
