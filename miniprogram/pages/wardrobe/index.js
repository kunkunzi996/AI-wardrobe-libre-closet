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

const bulkImportStorageKey = 'wardrobeBulkImportQueue';
const bulkImportConcurrency = 2;
const maxAnalyzePhotoEdge = 900;

function limitedPhotoSize(width, height) {
  if (!width || !height) {
    return {
      width: maxAnalyzePhotoEdge,
      height: maxAnalyzePhotoEdge,
    };
  }
  const maxEdge = Math.max(width, height);
  if (maxEdge <= maxAnalyzePhotoEdge) {
    return { width: width, height: height };
  }
  const ratio = maxAnalyzePhotoEdge / maxEdge;
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
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
    importingBackup: false,
    importProgress: '',
    exporting: false,
    bulkDeleting: false,
    deleteMode: false,
    selectedGarmentIds: [],
    selectedGarmentMap: {},
    error: '',
  },

  onLoad() {
    this.loadGarments();
  },

  onShow() {
    const queue = wx.getStorageSync(bulkImportStorageKey);
    if (!queue || !queue.files || !queue.files.length) {
      this.setData({ importProgress: '' });
    }
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
    if (this.data.deleteMode) return;
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
        page.startBulkImport(files);
      },
    });
  },

  startBulkImport(files) {
    const analyzeStatus = {};
    files.forEach(function (_file, index) {
      analyzeStatus[index] = 'queued';
    });
    const queue = {
      files: files,
      index: 0,
      success: 0,
      skipped: 0,
      drafts: {},
      analyzeStatus: analyzeStatus,
      createdAt: Date.now(),
    };
    wx.setStorageSync(bulkImportStorageKey, queue);
    this.setData({
      importProgress: '已选择 ' + files.length + ' 张照片，AI 正在后台识别。',
    });
    this.preAnalyzeBulkPhotos(files);
    this.openBulkImportItem(queue);
  },

  openBulkImportItem(queue) {
    const filePath = queue.files[queue.index];
    if (!filePath) return;
    wx.navigateTo({
      url:
        '/pages/garment-form/index?bulk=1&bulkIndex=' +
        queue.index +
        '&bulkTotal=' +
        queue.files.length +
        '&photoPath=' +
        encodeURIComponent(filePath),
    });
  },

  preAnalyzeBulkPhotos(files) {
    const page = this;
    let nextIndex = 0;
    let running = 0;

    const runNext = function () {
      while (running < bulkImportConcurrency && nextIndex < files.length) {
        const index = nextIndex;
        nextIndex += 1;
        running += 1;
        page.markBulkAnalyzeStatus(index, 'running');
        page
          .analyzeBulkPhoto(index, files[index])
          .then(function (data) {
            page.saveBulkDraft(index, data.draft || {});
          })
          .catch(function (error) {
            page.saveBulkAnalyzeError(index, error.message || 'AI识别失败，请手动填写');
          })
          .finally(function () {
            running -= 1;
            const latestQueue = wx.getStorageSync(bulkImportStorageKey) || {};
            const status = latestQueue.analyzeStatus || {};
            const doneCount = Object.keys(status).filter(function (key) {
              return status[key] === 'done' || status[key] === 'failed';
            }).length;
            page.setData({
              importProgress:
                'AI 后台识别 ' + doneCount + ' / ' + files.length + '，请逐张确认保存。',
            });
            runNext();
          });
      }
    };

    runNext();
  },

  analyzeBulkPhoto(index, filePath) {
    const page = this;
    return this.compressBulkAnalyzePhoto(filePath).then(function (analyzePath) {
      page.saveBulkAnalyzePath(index, analyzePath);
      return api.analyzeGarmentPhoto(analyzePath).catch(function (error) {
        return new Promise(function (resolve, reject) {
          setTimeout(function () {
            api.analyzeGarmentPhoto(analyzePath).then(resolve).catch(function () {
              reject(error);
            });
          }, 800);
        });
      });
    });
  },

  compressBulkAnalyzePhoto(filePath) {
    return new Promise(function (resolve) {
      if (!wx.compressImage) {
        resolve(filePath);
        return;
      }

      const compressWithSize = function (size) {
        wx.compressImage({
          src: filePath,
          quality: 60,
          compressedWidth: size.width,
          compressedHeight: size.height,
          success: function (res) {
            resolve(res.tempFilePath || filePath);
          },
          fail: function () {
            resolve(filePath);
          },
        });
      };

      if (!wx.getImageInfo) {
        compressWithSize(limitedPhotoSize(0, 0));
        return;
      }

      wx.getImageInfo({
        src: filePath,
        success: function (info) {
          compressWithSize(limitedPhotoSize(info.width, info.height));
        },
        fail: function () {
          compressWithSize(limitedPhotoSize(0, 0));
        },
      });
    });
  },

  updateBulkQueue(updater) {
    const queue = wx.getStorageSync(bulkImportStorageKey);
    if (!queue || !queue.files || !queue.files.length) return;
    wx.setStorageSync(bulkImportStorageKey, updater(queue));
  },

  markBulkAnalyzeStatus(index, status) {
    this.updateBulkQueue(function (queue) {
      const analyzeStatus = Object.assign({}, queue.analyzeStatus || {});
      analyzeStatus[index] = status;
      return Object.assign({}, queue, { analyzeStatus: analyzeStatus });
    });
  },

  saveBulkDraft(index, draft) {
    this.updateBulkQueue(function (queue) {
      const drafts = Object.assign({}, queue.drafts || {});
      const analyzeStatus = Object.assign({}, queue.analyzeStatus || {});
      drafts[index] = draft;
      analyzeStatus[index] = 'done';
      return Object.assign({}, queue, {
        drafts: drafts,
        analyzeStatus: analyzeStatus,
      });
    });
  },

  saveBulkAnalyzePath(index, filePath) {
    this.updateBulkQueue(function (queue) {
      const analyzeFiles = Object.assign({}, queue.analyzeFiles || {});
      analyzeFiles[index] = filePath;
      return Object.assign({}, queue, { analyzeFiles: analyzeFiles });
    });
  },

  saveBulkAnalyzeError(index, message) {
    this.updateBulkQueue(function (queue) {
      const analyzeErrors = Object.assign({}, queue.analyzeErrors || {});
      const analyzeStatus = Object.assign({}, queue.analyzeStatus || {});
      analyzeErrors[index] = message;
      analyzeStatus[index] = 'failed';
      return Object.assign({}, queue, {
        analyzeErrors: analyzeErrors,
        analyzeStatus: analyzeStatus,
      });
    });
  },

  chooseBackupImport() {
    if (this.data.importingBackup) return;
    const page = this;
    if (!wx.chooseMessageFile) {
      wx.showToast({ title: '当前微信版本不支持选择文件', icon: 'none' });
      return;
    }
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['zip'],
      success: function (res) {
        const file = res.tempFiles && res.tempFiles[0];
        if (!file || !file.path) return;
        page.importBackupFile(file.path);
      },
    });
  },

  importBackupFile(filePath) {
    const page = this;
    this.setData({
      importingBackup: true,
      importProgress: '正在导入备份包，请稍候。',
    });
    api
      .importWardrobeBackup(filePath)
      .then(function (data) {
        wx.showModal({
          title: '导入完成',
          content:
            '已恢复 ' +
            (data.imported || 0) +
            ' 件衣物，跳过 ' +
            (data.skipped || 0) +
            ' 件。',
          showCancel: false,
        });
        return page.loadGarments();
      })
      .catch(function (error) {
        wx.showModal({
          title: '导入失败',
          content: error.message || '备份导入失败，请确认文件是否正确。',
          showCancel: false,
        });
      })
      .finally(function () {
        page.setData({ importingBackup: false, importProgress: '' });
      });
  },

  exportWardrobeBackup() {
    if (this.data.exporting) return;
    const page = this;
    const backupUrl = api.wardrobeBackupUrl();
    this.setData({ exporting: true });
    wx.setClipboardData({
      data: backupUrl,
      success: function () {
        wx.showToast({ title: '下载链接已复制', icon: 'none' });
      },
    });
    wx.downloadFile({
      url: backupUrl,
      success: function (res) {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          wx.showToast({ title: '导出失败', icon: 'none' });
          return;
        }
        wx.openDocument({
          filePath: res.tempFilePath,
          showMenu: true,
          success: function () {
            wx.showModal({
              title: '导出完成',
              content: '备份包已打开，可用右上角菜单转发或保存。下载链接也已复制，可粘贴到浏览器下载。',
              showCancel: false,
            });
          },
          fail: function () {
            wx.showModal({
              title: '导出完成',
              content: '下载链接已复制，可粘贴到浏览器下载备份包。',
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

  enterDeleteMode(event) {
    const id = Number(event.currentTarget.dataset.id);
    if (!id || this.data.bulkDeleting) return;
    const selectedGarmentMap = {};
    selectedGarmentMap[id] = true;
    this.setData({
      deleteMode: true,
      selectedGarmentIds: [id],
      selectedGarmentMap: selectedGarmentMap,
    });
    wx.vibrateShort({ type: 'light' });
  },

  toggleDeleteSelection(event) {
    const id = Number(event.currentTarget.dataset.id);
    if (!id || this.data.bulkDeleting) return;
    const selectedGarmentMap = Object.assign({}, this.data.selectedGarmentMap);
    if (selectedGarmentMap[id]) {
      delete selectedGarmentMap[id];
    } else {
      selectedGarmentMap[id] = true;
    }
    const selectedGarmentIds = Object.keys(selectedGarmentMap).map(function (key) {
      return Number(key);
    });
    this.setData({
      selectedGarmentIds: selectedGarmentIds,
      selectedGarmentMap: selectedGarmentMap,
      deleteMode: selectedGarmentIds.length > 0,
    });
  },

  cancelDeleteMode() {
    if (this.data.bulkDeleting) return;
    this.setData({
      deleteMode: false,
      selectedGarmentIds: [],
      selectedGarmentMap: {},
    });
  },

  confirmBulkDelete() {
    const page = this;
    const ids = this.data.selectedGarmentIds;
    if (!ids.length || this.data.bulkDeleting) return;
    wx.showModal({
      title: '删除衣物',
      content: '确定删除选中的 ' + ids.length + ' 件衣物吗？删除后无法在衣橱中恢复。',
      confirmText: '删除',
      confirmColor: '#9d3f22',
      success: function (res) {
        if (!res.confirm) return;
        page.deleteSelectedGarments(ids);
      },
    });
  },

  deleteSelectedGarments(ids) {
    const page = this;
    let chain = Promise.resolve();
    let success = 0;
    let failed = 0;
    this.setData({ bulkDeleting: true });

    ids.forEach(function (id) {
      chain = chain
        .then(function () {
          return api.deleteGarment(id);
        })
        .then(function () {
          success += 1;
        })
        .catch(function () {
          failed += 1;
        });
    });

    chain
      .then(function () {
        wx.showToast({
          title: failed ? '部分删除失败' : '已删除',
          icon: failed ? 'none' : 'success',
        });
        page.setData({
          deleteMode: false,
          selectedGarmentIds: [],
          selectedGarmentMap: {},
        });
        return page.loadGarments();
      })
      .finally(function () {
        page.setData({ bulkDeleting: false });
        if (failed) {
          wx.showModal({
            title: '删除完成',
            content: '成功 ' + success + ' 件，失败 ' + failed + ' 件。',
            showCancel: false,
          });
        }
      });
  },

  goToDetail(event) {
    const id = event.currentTarget.dataset.id;
    if (this.data.deleteMode) {
      this.toggleDeleteSelection(event);
      return;
    }
    wx.navigateTo({ url: '/pages/garment-detail/index?id=' + id });
  },
});
