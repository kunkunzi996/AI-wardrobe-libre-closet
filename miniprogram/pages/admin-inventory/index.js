const api = require('../../utils/api');

Page({
  data: {
    loading: false,
    exportingUserId: null,
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
    if (!userId || this.data.exportingUserId) return;

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
});
