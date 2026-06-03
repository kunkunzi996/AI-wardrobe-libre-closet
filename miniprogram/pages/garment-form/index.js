const api = require('../../utils/api');

Page({
  data: {
    photoPath: '',
    form: {
      name: '',
      category: 'tops',
      color: 'black',
      season: '',
      brand: '',
      size: '',
      notes: '',
    },
    submitting: false,
    error: '',
  },

  choosePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0];
        this.setData({ photoPath: file ? file.tempFilePath : '' });
      },
    });
  },

  onInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: event.detail.value });
  },

  async submitGarment() {
    if (!this.data.photoPath) {
      this.setData({ error: '请先选择图片' });
      return;
    }
    if (!this.data.form.category) {
      this.setData({ error: '请填写分类' });
      return;
    }

    this.setData({ submitting: true, error: '' });
    try {
      await api.uploadGarment(this.data.photoPath, this.data.form);
      wx.showToast({ title: '已保存' });
      wx.navigateBack();
    } catch (error) {
      this.setData({ error: error.message || '上传失败，请重新选择图片' });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
