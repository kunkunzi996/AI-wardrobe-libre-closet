const api = require('../../utils/api');

const categoryOptions = [
  { label: '上衣', value: 'tops' },
  { label: '下装', value: 'bottoms' },
  { label: '外套', value: 'outerwear' },
  { label: '连衣裙', value: 'dresses' },
  { label: '鞋子', value: 'footwear' },
  { label: '包包', value: 'bags' },
  { label: '配饰', value: 'accessories' },
  { label: '其他', value: 'other' },
];

const colorOptions = [
  { label: '黑色', value: 'black' },
  { label: '白色', value: 'white' },
  { label: '灰色', value: 'grey' },
  { label: '米色', value: 'beige' },
  { label: '棕色', value: 'brown' },
  { label: '红色', value: 'red' },
  { label: '粉色', value: 'pink' },
  { label: '橙色', value: 'orange' },
  { label: '黄色', value: 'yellow' },
  { label: '绿色', value: 'green' },
  { label: '蓝色', value: 'blue' },
  { label: '紫色', value: 'purple' },
  { label: '金色', value: 'gold' },
  { label: '银色', value: 'silver' },
  { label: '图案', value: 'pattern' },
  { label: '其他', value: 'other' },
];

const seasonOptions = [
  { label: '不限定', value: '' },
  { label: '春天', value: 'spring' },
  { label: '夏天', value: 'summer' },
  { label: '秋天', value: 'autumn' },
  { label: '冬天', value: 'winter' },
  { label: '四季', value: 'all-season' },
];

Page({
  data: {
    photoPath: '',
    categoryOptions,
    colorOptions,
    seasonOptions,
    categoryIndex: 0,
    colorIndex: 0,
    seasonIndex: 0,
    categoryLabel: categoryOptions[0].label,
    colorLabel: colorOptions[0].label,
    seasonLabel: seasonOptions[0].label,
    form: {
      name: '',
      category: categoryOptions[0].value,
      color: colorOptions[0].value,
      season: seasonOptions[0].value,
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
        if (!file || !file.tempFilePath) {
          this.setData({ photoPath: '' });
          return;
        }
        this.compressPhoto(file.tempFilePath);
      },
    });
  },

  compressPhoto(filePath) {
    if (!wx.compressImage) {
      this.setData({ photoPath: filePath });
      return;
    }

    wx.compressImage({
      src: filePath,
      quality: 70,
      success: (res) => {
        this.setData({ photoPath: res.tempFilePath || filePath });
      },
      fail: () => {
        this.setData({ photoPath: filePath });
      },
    });
  },

  onInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: event.detail.value });
  },

  onCategoryChange(event) {
    const index = Number(event.detail.value);
    this.setData({
      categoryIndex: index,
      categoryLabel: categoryOptions[index].label,
      'form.category': categoryOptions[index].value,
    });
  },

  onColorChange(event) {
    const index = Number(event.detail.value);
    this.setData({
      colorIndex: index,
      colorLabel: colorOptions[index].label,
      'form.color': colorOptions[index].value,
    });
  },

  onSeasonChange(event) {
    const index = Number(event.detail.value);
    this.setData({
      seasonIndex: index,
      seasonLabel: seasonOptions[index].label,
      'form.season': seasonOptions[index].value,
    });
  },

  async submitGarment() {
    if (!this.data.photoPath) {
      this.setData({ error: '请先选择衣物图片' });
      return;
    }
    if (!this.data.form.category) {
      this.setData({ error: '请选择分类' });
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
