const api = require('../../utils/api');

Page({
  data: {
    loading: false,
    exportingUserId: null,
    backfillingUserId: null,
    backfillResult: null,
    error: '',
    users: [],
  },

  onLoad() {
    this.loadUsers();
  },

  onPullDownRefresh() {
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
        page.setData({ users: res.items || [] });
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
    const page = this;

    wx.showActionSheet({
      itemList: ['先试点分析 1 件（推荐）', '常规分析 3 件'],
      success: function (selection) {
        const limit = selection.tapIndex === 0 ? 1 : 3;
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
      completionText: completionLabels[result.completionState] || '本批已结束。',
      failedItems: (result.failedItems || []).map(function (item) {
        return Object.assign({}, item, {
          reasonLabel: failureLabels[item.reason] || '处理失败',
        });
      }),
    });
  },
});
