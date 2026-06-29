const api = require('../../utils/api');

Page({
  data: {
    loading: false,
    saving: false,
    nickname: '',
    bio: '',
    avatarUrl: '',
    avatarPath: '',
  },

  onLoad() {
    this.loadProfile();
  },

  loadProfile() {
    const page = this;
    this.setData({ loading: true });
    api
      .getUserProfile()
      .then(function (res) {
        const profile = (res && res.item) || {};
        page.setData({
          nickname: profile.nickname || '',
          bio: profile.bio || '',
          avatarUrl: profile.avatarUrl || '',
          avatarPath: '',
        });
      })
      .catch(function (error) {
        wx.showToast({
          title: error.message || '资料加载失败',
          icon: 'none',
        });
      })
      .finally(function () {
        page.setData({ loading: false });
      });
  },

  chooseAvatar() {
    const page = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        const file = res.tempFiles && res.tempFiles[0];
        if (!file || !file.tempFilePath) return;
        page.setData({ avatarPath: file.tempFilePath });
      },
    });
  },

  onNicknameInput(event) {
    this.setData({ nickname: event.detail.value });
  },

  onBioInput(event) {
    this.setData({ bio: event.detail.value });
  },

  save() {
    if (this.data.saving) return;
    const page = this;
    this.setData({ saving: true });
    api
      .updateUserProfile({
        nickname: this.data.nickname,
        bio: this.data.bio,
        avatarPath: this.data.avatarPath,
      })
      .then(function () {
        wx.showToast({ title: '已保存', icon: 'success' });
        setTimeout(function () {
          wx.navigateBack();
        }, 500);
      })
      .catch(function (error) {
        wx.showToast({
          title: error.message || '保存失败，请重试',
          icon: 'none',
        });
      })
      .finally(function () {
        page.setData({ saving: false });
      });
  },
});
