const api = require('../../utils/api');
const fullBackfill = require('../../utils/full-backfill');

Page({
  data: {
    loading: false,
    exportingUserId: null,
    backfillingUserId: null,
    markingUserId: null,
    backfillResult: null,
    copyResult: null,
    copying: false,
    fullBackfillRunning: false,
    fullBackfillStopping: false,
    fullBackfillProgress: null,
    error: '',
    users: [],
    sandboxUsers: [],
    sourceUserId: '',
    targetUserId: '',
    sourceIndex: 0,
    targetIndex: 0,
    preview: null,
  },

  onLoad() {
    this.loadUsers();
  },

  onHide() {
    this.stopFullBackfill();
  },

  onUnload() {
    this.stopFullBackfill();
  },

  onPullDownRefresh() {
    if (this.data.fullBackfillRunning) {
      wx.stopPullDownRefresh();
      return;
    }
    this.loadUsers().finally(function () {
      wx.stopPullDownRefresh();
    });
  },

  loadUsers() {
    const page = this;
    this.setData({ loading: true, error: '' });
    return api
      .getAdminUsers()
      .then(function (res) {
        const users = res.items || [];
        const sandboxUsers = users.filter(function (item) {
          return item.acceptanceSandbox;
        });
        page.setData({
          users: users,
          sandboxUsers: sandboxUsers,
        });
      })
      .catch(function (error) {
        page.setData({
          error: error.message || '管理员数据加载失败',
        });
      })
      .finally(function () {
        page.setData({ loading: false });
      });
  },

  retryLoad() {
    this.loadUsers();
  },

  markAcceptanceSandbox(event) {
    const userId = Number(event.currentTarget.dataset.id);
    if (!userId || this.data.markingUserId || this.data.copying) return;
    const page = this;
    this.setData({ markingUserId: userId });
    api
      .setAdminAcceptanceSandbox(userId, true)
      .then(function () {
        wx.showToast({ title: '已标为验收沙盒', icon: 'success' });
        return page.loadUsers();
      })
      .catch(function (error) {
        wx.showModal({
          title: '无法标为验收沙盒',
          content: error.message || '已有衣橱数据的用户不能标成沙盒',
          showCancel: false,
        });
      })
      .finally(function () {
        page.setData({ markingUserId: null });
      });
  },

  onSourceChange(event) {
    const index = Number(event.detail.value);
    const user = (this.data.users || [])[index];
    this.setData({
      sourceIndex: index,
      sourceUserId: user ? user.id : '',
      preview: null,
    });
  },

  onTargetChange(event) {
    const index = Number(event.detail.value);
    const user = (this.data.sandboxUsers || [])[index];
    this.setData({
      targetIndex: index,
      targetUserId: user ? user.id : '',
      preview: null,
    });
  },

  previewAndCopy() {
    const sourceUserId = Number(this.data.sourceUserId);
    const targetUserId = Number(this.data.targetUserId);
    if (
      !sourceUserId ||
      !targetUserId ||
      this.data.copying ||
      this.data.backfillingUserId
    ) {
      return;
    }
    const page = this;
    this.setData({ copying: true, error: '' });
    api
      .previewAdminWardrobeCopy(sourceUserId, targetUserId)
      .then(function (preview) {
        page.setData({ preview: preview });
        const source = preview.source || {};
        const target = preview.target || {};
        const overwrite =
          Number(target.garmentCount || 0) +
            Number(target.outfitCount || 0) +
            Number(target.calendarCount || 0) +
            Number(target.feedbackCount || 0) >
          0;
        const lines = [
          '源：' + (source.displayName || sourceUserId),
          '目标：' + (target.displayName || targetUserId),
          '衣物 ' + (source.garmentCount || 0) + ' / 照片 ' + (source.photoCount || 0),
          '搭配 ' +
            (source.outfitCount || 0) +
            ' / 今日穿搭 ' +
            (source.calendarCount || 0) +
            ' / 反馈 ' +
            (source.feedbackCount || 0),
        ];
        if (overwrite) {
          lines.push('目标已有副本，确认后将整橱覆盖。');
        }
        wx.showModal({
          title: '确认复制衣橱',
          content: lines.join('\n'),
          confirmText: overwrite ? '确认覆盖' : '开始复制',
          success: function (modal) {
            if (!modal.confirm) return;
            page.runCopy(sourceUserId, targetUserId, source, overwrite);
          },
        });
      })
      .catch(function (error) {
        wx.showModal({
          title: '无法预览',
          content: error.message || '请稍后重试',
          showCancel: false,
        });
      })
      .finally(function () {
        if (!page.data.copyResult) page.setData({ copying: false });
      });
  },

  runCopy(sourceUserId, targetUserId, source, overwrite) {
    const page = this;
    this.setData({ copying: true });
    api
      .copyAdminWardrobe({
        sourceUserId: sourceUserId,
        targetUserId: targetUserId,
        sourceGarmentCount: source.garmentCount || 0,
        sourcePhotoCount: source.photoCount || 0,
        sourceOutfitCount: source.outfitCount || 0,
        sourceCalendarCount: source.calendarCount || 0,
        sourceFeedbackCount: source.feedbackCount || 0,
        overwrite: overwrite === true,
      })
      .then(function (result) {
        page.setData({
          copyResult: result,
          copying: false,
        });
        return page.loadUsers();
      })
      .catch(function (error) {
        page.setData({ copying: false });
        wx.showModal({
          title: '复制未完成',
          content: error.message || '源衣橱未被改动，请稍后重试',
          showCancel: false,
        });
      });
  },

  closeCopyResult() {
    this.setData({ copyResult: null });
  },

  exportUserInventory(event) {
    const userId = Number(event.currentTarget.dataset.id);
    if (
      !userId ||
      this.data.exportingUserId ||
      this.data.backfillingUserId === userId
    ) {
      return;
    }

    const page = this;
    this.setData({ exportingUserId: userId });
    api
      .adminExcelHeaders()
      .then(function (headers) {
        wx.downloadFile({
          url: api.adminInventoryExcelUrl(userId),
          header: headers,
          success: function (res) {
            if (res.statusCode < 200 || res.statusCode >= 300) {
              wx.showToast({ title: '导出失败', icon: 'none' });
              return;
            }
            wx.openDocument({
              filePath: res.tempFilePath,
              fileType: 'xlsx',
              showMenu: true,
              success: function () {
                wx.showModal({
                  title: '导出完成',
                  content: '库存表格已打开，可用右上角菜单转发或保存。',
                  showCancel: false,
                });
              },
              fail: function () {
                wx.showModal({
                  title: '导出完成',
                  content: '库存表格已下载，可从微信文件里转发或保存。',
                  showCancel: false,
                });
              },
            });
          },
          fail: function () {
            wx.showToast({ title: '导出失败', icon: 'none' });
          },
          complete: function () {
            page.setData({ exportingUserId: null });
          },
        });
      })
      .catch(function () {
        page.setData({ exportingUserId: null });
        wx.showToast({ title: '导出失败', icon: 'none' });
      });
  },

  backfillUserTags(event) {
    const userId = Number(event.currentTarget.dataset.id);
    if (!userId || this.data.backfillingUserId !== null) return;

    const user = (this.data.users || []).find(function (item) {
      return item.id === userId;
    });
    const displayName = user && user.displayName ? user.displayName : '该用户';
    const garmentCount = user && Number(user.garmentCount) ? user.garmentCount : 0;
    const sandbox = Boolean(user && user.acceptanceSandbox);
    const page = this;
    const itemList = ['先试点分析 1 件（推荐）', '常规分析 3 件'];
    if (sandbox) {
      itemList.push('全量补标（自动连跑）');
    }

    wx.showActionSheet({
      itemList: itemList,
      success: function (selection) {
        const tapIndex = Number(selection && selection.tapIndex);
        if (tapIndex === 2) {
          if (!sandbox) {
            page.confirmBackfill(userId, displayName, garmentCount, 1);
            return;
          }
          page.confirmFullBackfill(userId, displayName, garmentCount);
          return;
        }
        // 只有明确选择第二项才允许扩大到 3 件，异常回调默认保留试点边界。
        const limit = tapIndex === 1 ? 3 : 1;
        page.confirmBackfill(userId, displayName, garmentCount, limit);
      },
    });
  },

  confirmBackfill(userId, displayName, garmentCount, limit) {
    const page = this;
    wx.showModal({
      title: '确认 AI 补标签',
      content: [
        '用户：' + displayName + '（ID：' + userId + '）',
        '当前衣物：' + garmentCount + ' 件',
        '只追加空缺，不覆盖原值。',
        '本次分析 ' + limit + ' 件，可能产生 AI 调用费用。',
      ].join('\n'),
      confirmText: '开始分析',
      success: function (modal) {
        if (modal.confirm) page.runBackfill(userId, limit);
      },
    });
  },

  confirmFullBackfill(userId, displayName, garmentCount) {
    const user = (this.data.users || []).find(function (item) {
      return item.id === userId;
    });
    if (!user || !user.acceptanceSandbox) {
      wx.showToast({ title: '全量只用于验收沙盒', icon: 'none' });
      return;
    }

    const page = this;
    wx.showModal({
      title: '确认全量补标',
      content: [
        '只对验收沙盒生效。',
        '用户：' + displayName + '（ID：' + userId + '）',
        '当前衣物：' + garmentCount + ' 件',
        '将按每批 3 件自动连跑，直到补完或你点停止。',
        '请不要离开本页。可能需要几十分钟，并产生 AI 费用。',
        '只追加空缺，不覆盖原值。',
      ].join('\n'),
      confirmText: '开始全量',
      success: function (modal) {
        if (modal.confirm) page.runFullBackfill(userId, garmentCount);
      },
    });
  },

  runBackfill(userId, limit) {
    const page = this;
    this.setData({ backfillingUserId: userId, error: '' });
    api
      .backfillAdminUserGarmentTags(userId, limit)
      .then(function (result) {
        page.setData({ backfillResult: page.formatBackfillResult(result) });
        wx.showToast({ title: '本批完成', icon: 'success' });
        page.loadUsers();
      })
      .catch(function (error) {
        wx.showModal({
          title: '补标签未完成',
          content: error.message || '请稍后重试',
          showCancel: false,
        });
      })
      .finally(function () {
        page.setData({ backfillingUserId: null });
      });
  },

  runFullBackfill(userId, garmentCount) {
    const user = (this.data.users || []).find(function (item) {
      return item.id === userId;
    });
    if (!user || !user.acceptanceSandbox || this.data.backfillingUserId) {
      return;
    }

    const page = this;
    this._fullBackfillStopRequested = false;
    this.setData({
      backfillingUserId: userId,
      fullBackfillRunning: true,
      fullBackfillStopping: false,
      fullBackfillProgress: {
        analyzedCount: 0,
        filledGarmentCount: 0,
        filledFieldCount: 0,
        remainingUnattempted: Number(garmentCount) || 0,
        failedCount: 0,
        batches: 0,
      },
      error: '',
      backfillResult: null,
    });

    fullBackfill
      .runFullBackfill({
        batchLimit: 3,
        shouldStop: function () {
          return page._fullBackfillStopRequested === true;
        },
        requestBatch: function (limit) {
          return api.backfillAdminUserGarmentTags(userId, limit);
        },
        onProgress: function (summary) {
          page.setData({
            fullBackfillProgress: {
              analyzedCount: summary.analyzedCount,
              filledGarmentCount: summary.filledGarmentCount,
              filledFieldCount: summary.filledFieldCount,
              remainingUnattempted: summary.remainingUnattempted,
              failedCount: summary.failedCount,
              batches: summary.batches,
            },
          });
        },
      })
      .then(function (summary) {
        page.setData({
          backfillResult: page.formatFullBackfillResult(summary),
          fullBackfillRunning: false,
          fullBackfillStopping: false,
          backfillingUserId: null,
        });
        wx.showToast({
          title: summary.stopReason === 'stopped' ? '已停止' : '全量结束',
          icon: 'success',
        });
        page.loadUsers();
      })
      .catch(function (error) {
        page.setData({
          fullBackfillRunning: false,
          fullBackfillStopping: false,
          backfillingUserId: null,
        });
        wx.showModal({
          title: '全量补标签未完成',
          content: error.message || '请稍后重试。已经补上的标签会保留。',
          showCancel: false,
        });
        page.loadUsers();
      });
  },

  stopFullBackfill() {
    if (!this.data.fullBackfillRunning || this._fullBackfillStopRequested) {
      return;
    }
    this._fullBackfillStopRequested = true;
    this.setData({ fullBackfillStopping: true });
  },

  closeBackfillResult() {
    this.setData({ backfillResult: null });
  },

  formatBackfillResult(result) {
    const failureLabels = {
      'image-unreadable': '图片无法识别',
      'storage-error': '图片读取失败',
      'database-error': '保存失败',
    };
    const completionLabels = {
      'needs-retry': '本批结束，仍有衣物待重试。',
      'has-more': '本批结束，仍有衣物待处理。',
      'photo-complete': '所有有照片衣物均已分析。',
      'photo-complete-with-no-photo': '有照片衣物已分析，无照片衣物需手动处理。',
    };
    return Object.assign({}, result, {
      fullRun: false,
      analyzedThisRun: result.analyzedThisRun,
      completionText: completionLabels[result.completionState] || '本批已结束。',
      failedItems: (result.failedItems || []).map(function (item) {
        return Object.assign({}, item, {
          reasonLabel: failureLabels[item.reason] || '处理失败',
        });
      }),
    });
  },

  formatFullBackfillResult(summary) {
    const formatted = this.formatBackfillResult({
      analyzedThisRun: summary.analyzedCount,
      filledFieldCount: summary.filledFieldCount,
      remainingUnattempted: summary.remainingUnattempted,
      unreadableCount: summary.unreadableCount,
      failedCount: summary.failedCount,
      noPhotoCount: summary.noPhotoCount,
      mirrorConflictCount: summary.mirrorConflictCount,
      deadlineReached: summary.deadlineReached,
      completionState: summary.completionState,
      noPhotoItems: summary.noPhotoItems,
      noPhotoItemsTruncated: summary.noPhotoItemsTruncated,
      failedItems: summary.failedItems,
    });
    const stopTexts = {
      stopped: '已停止，剩余衣物可再次全量或分批处理。',
      'no-progress': '全量结束，仍有衣物待重试。',
      complete: formatted.completionText,
    };
    formatted.fullRun = true;
    formatted.completionText =
      stopTexts[summary.stopReason] || formatted.completionText;
    return formatted;
  },
});
