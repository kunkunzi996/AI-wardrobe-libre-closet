const api = require('../../utils/api');

const categoryOptions = [
  { label: '全部分类', value: '' },
  { label: '上衣', value: 'tops' },
  { label: '下装', value: 'bottoms' },
  { label: '外套', value: 'outerwear' },
  { label: '连衣裙', value: 'dresses' },
  { label: '鞋子', value: 'footwear' },
  { label: '包包', value: 'bags' },
  { label: '配饰', value: 'accessories' },
  { label: '其他', value: 'other' },
];

const seasonOptions = [
  { label: '全部季节', value: '' },
  { label: '春天', value: 'spring' },
  { label: '夏天', value: 'summer' },
  { label: '秋天', value: 'autumn' },
  { label: '冬天', value: 'winter' },
  { label: '四季', value: 'all-season' },
];

const seasonValueMap = {
  春: 'spring',
  春天: 'spring',
  spring: 'spring',
  夏: 'summer',
  夏天: 'summer',
  summer: 'summer',
  秋: 'autumn',
  秋天: 'autumn',
  autumn: 'autumn',
  fall: 'autumn',
  冬: 'winter',
  冬天: 'winter',
  winter: 'winter',
  四季: 'all-season',
  'all-season': 'all-season',
};

function normalizeSeason(value) {
  return seasonValueMap[value] || value || '';
}

function garmentMatchesSeason(garment, season) {
  if (!season) return true;
  const seasons = garment.seasons && garment.seasons.length ? garment.seasons : [garment.season];
  return seasons.some(function (item) {
    return normalizeSeason(item) === season;
  });
}

function listFormValue(value) {
  return Array.isArray(value) ? value.filter(Boolean).join('、') : '';
}

function formFromDraft(draft) {
  draft = draft || {};
  return {
    name: draft.subcategory || '',
    category: draft.category || 'tops',
    color: draft.color || '',
    season: (draft.seasons && draft.seasons[0]) || '',
    subcategory: draft.subcategory || '',
    styleTags: listFormValue(draft.styleTags),
    sceneTags: listFormValue(draft.sceneTags),
    material: draft.material || '',
    thickness: draft.thickness || '',
    notes: draft.notes || '',
  };
}

Page({
  data: {
    allGarments: [],
    garments: [],
    filteredGarments: [],
    categoryOptions: categoryOptions,
    seasonOptions: seasonOptions,
    categoryIndex: 0,
    seasonIndex: 0,
    activeFilterCount: 0,
    loading: false,
    importing: false,
    importProgress: '',
    exporting: false,
    error: '',
  },

  onLoad() {
    this.loadGarments();
  },

  onShow() {
    if (this.data.loadedOnce) {
      this.loadGarments();
    }
  },

  onPullDownRefresh() {
    this.loadGarments().finally(function () {
      wx.stopPullDownRefresh();
    });
  },

  retryLoad() {
    this.loadGarments();
  },

  loadGarments() {
    const page = this;
    this.setData({ loading: true, error: '' });
    return api
      .listGarments()
      .then(function (data) {
        const garments = data.items || [];
        page.setData({
          allGarments: garments,
          garments: garments,
          loadedOnce: true,
        });
        page.applyFilters();
      })
      .catch(function (error) {
        page.setData({ error: error.message || '服务器连接失败，请稍后重试' });
      })
      .finally(function () {
        page.setData({ loading: false });
      });
  },

  goToAdd() {
    wx.navigateTo({ url: '/pages/garment-form/index' });
  },

  chooseBulkImport() {
    if (this.data.importing) return;
    const page = this;
    wx.chooseMedia({
      count: 20,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album'],
      success: function (res) {
        const files = (res.tempFiles || [])
          .map(function (file) {
            return file.tempFilePath;
          })
          .filter(Boolean);
        if (!files.length) return;
        page.uploadBulkPhotos(files);
      },
    });
  },

  uploadBulkPhotos(files) {
    const page = this;
    const result = { success: 0, failed: 0 };
    let chain = Promise.resolve();
    this.setData({ importing: true, importProgress: '准备导入 ' + files.length + ' 张照片' });

    files.forEach(function (filePath, index) {
      chain = chain
        .then(function () {
          page.setData({
            importProgress: '正在导入第 ' + (index + 1) + ' / ' + files.length + ' 张',
          });
          return page.uploadOneBulkPhoto(filePath);
        })
        .then(function () {
          result.success += 1;
        })
        .catch(function () {
          result.failed += 1;
        });
    });

    chain
      .then(function () {
        wx.showModal({
          title: '批量导入完成',
          content: '成功 ' + result.success + ' 张，失败 ' + result.failed + ' 张。',
          showCancel: false,
        });
        return page.loadGarments();
      })
      .finally(function () {
        page.setData({ importing: false, importProgress: '' });
      });
  },

  uploadOneBulkPhoto(filePath) {
    return api
      .analyzeGarmentPhoto(filePath)
      .catch(function () {
        return { draft: { category: 'tops', notes: 'AI识别失败，请稍后手动编辑。' } };
      })
      .then(function (data) {
        return api.uploadGarment(filePath, formFromDraft(data.draft));
      });
  },

  exportWardrobeBackup() {
    if (this.data.exporting) return;
    const page = this;
    this.setData({ exporting: true });
    wx.downloadFile({
      url: api.wardrobeBackupUrl(),
      success: function (res) {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          wx.showToast({ title: '导出失败', icon: 'none' });
          return;
        }
        wx.saveFile({
          tempFilePath: res.tempFilePath,
          success: function (saveRes) {
            wx.showModal({
              title: '导出完成',
              content: '备份包已保存：' + saveRes.savedFilePath,
              showCancel: false,
            });
          },
          fail: function () {
            wx.showModal({
              title: '导出完成',
              content: '备份包已下载到临时文件，可在本次会话中使用。',
              showCancel: false,
            });
          },
        });
      },
      fail: function () {
        wx.showToast({ title: '导出失败', icon: 'none' });
      },
      complete: function () {
        page.setData({ exporting: false });
      },
    });
  },

  goToOutfit() {
    wx.navigateTo({ url: '/pages/outfit/index' });
  },

  goToDaily() {
    wx.navigateTo({ url: '/pages/daily-outfit/index' });
  },

  onCategoryChange(event) {
    this.setData({ categoryIndex: Number(event.detail.value) });
    this.applyFilters();
  },

  onSeasonChange(event) {
    this.setData({ seasonIndex: Number(event.detail.value) });
    this.applyFilters();
  },

  clearFilters() {
    this.setData({
      categoryIndex: 0,
      seasonIndex: 0,
    });
    this.applyFilters();
  },

  applyFilters() {
    const category = categoryOptions[this.data.categoryIndex].value;
    const season = seasonOptions[this.data.seasonIndex].value;
    const activeFilterCount = (category ? 1 : 0) + (season ? 1 : 0);
    const filteredGarments = this.data.allGarments.filter(function (garment) {
      const categoryMatched = !category || garment.category === category;
      return categoryMatched && garmentMatchesSeason(garment, season);
    });

    this.setData({
      filteredGarments: filteredGarments,
      activeFilterCount: activeFilterCount,
    });
  },

  goToDetail(event) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/garment-detail/index?id=' + id });
  },
});
