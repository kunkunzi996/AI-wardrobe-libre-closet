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

const maxAnalyzePhotoEdge = 900;
const bulkImportStorageKey = 'wardrobeBulkImportQueue';

function optionIndex(options, value) {
  const index = options.findIndex((option) => option.value === value);
  return index >= 0 ? index : -1;
}

function listText(value) {
  return Array.isArray(value) ? value.filter(Boolean).join('、') : '';
}

function defaultVisionFields() {
  return {
    pocketPresence: 'unknown',
    pocketPosition: 'unknown',
    chestMarkPresence: 'unknown',
    chestMarkType: 'unknown',
    chestMarkPosition: 'unknown',
    chestMarkText: '',
  };
}

function duplicateSummary(candidates) {
  return (candidates || [])
    .slice(0, 3)
    .map(function (item) {
      const name =
        item.name || item.subcategory || item.categoryLabel || '相似衣物';
      const reason = item.matchReason ? '（' + item.matchReason + '）' : '';
      return name + reason;
    })
    .join('\n');
}

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
    id: '',
    isEdit: false,
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
      subcategory: '',
      styleTags: '',
      sceneTags: '',
      material: '',
      thickness: '',
      ...defaultVisionFields(),
    },
    recognizing: false,
    aiDraft: null,
    aiError: '',
    duplicateCandidates: [],
    duplicateWarningAcknowledged: false,
    submitting: false,
    error: '',
    isBulkImport: false,
    bulkIndex: 0,
    bulkTotal: 0,
  },

  onLoad(options) {
    const id = options.id || '';
    const photoPath = options.photoPath
      ? decodeURIComponent(options.photoPath)
      : '';
    if (options.bulk === '1') {
      const bulkIndex = Number(options.bulkIndex || 0);
      const bulkTotal = Number(options.bulkTotal || 0);
      this.setData({
        isBulkImport: true,
        bulkIndex: bulkIndex,
        bulkTotal: bulkTotal,
      });
      wx.setNavigationBarTitle({
        title: '确认导入 ' + (bulkIndex + 1) + '/' + bulkTotal,
      });
    }
    if (photoPath && !id) {
      this.compressPhoto(photoPath);
      return;
    }
    if (!id) return;
    this.setData({ id, isEdit: true });
    wx.setNavigationBarTitle({ title: '编辑衣物' });
    this.loadGarmentForEdit(id);
  },

  choosePhoto() {
    if (this.data.isEdit) {
      wx.showToast({ title: '暂不支持换图', icon: 'none' });
      return;
    }
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
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
      this.analyzePhoto(filePath);
      return;
    }

    const page = this;
    const compressWithSize = function (size) {
      wx.compressImage({
        src: filePath,
        quality: 60,
        compressedWidth: size.width,
        compressedHeight: size.height,
        success: (res) => {
          const nextPath = res.tempFilePath || filePath;
          page.setData({ photoPath: nextPath });
          page.analyzePhoto(nextPath);
        },
        fail: () => {
          page.setData({ photoPath: filePath });
          page.analyzePhoto(filePath);
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
  },

  analyzePhoto(filePath) {
    if (this.data.isEdit) return;
    if (this.data.isBulkImport && this.applyBulkAiDraftIfReady()) return;
    const page = this;
    this.setData({ recognizing: true, aiDraft: null, aiError: '', error: '' });
    if (this.data.isBulkImport && this.waitForBulkAiDraft(filePath, 0)) return;
    api
      .analyzeGarmentPhoto(filePath)
      .then(function (data) {
        if (page.data.photoPath !== filePath) return;
        page.applyAiDraft(data.draft || {}, data.duplicateCandidates || []);
      })
      .catch(function (error) {
        if (page.data.photoPath !== filePath) return;
        page.setData({ aiError: error.message || 'AI识别失败，请手动填写' });
      })
      .finally(function () {
        if (page.data.photoPath === filePath) {
          page.setData({ recognizing: false });
        }
      });
  },

  loadGarmentForEdit(id) {
    const page = this;
    this.setData({ submitting: true, error: '' });
    api
      .getGarment(id)
      .then(function (data) {
        page.applyGarment(data.item || {});
      })
      .catch(function (error) {
        page.setData({ error: error.message || '衣物加载失败，请稍后重试' });
      })
      .finally(function () {
        page.setData({ submitting: false });
      });
  },

  applyGarment(garment) {
    const categoryIndex = optionIndex(categoryOptions, garment.category);
    const colorIndex = optionIndex(colorOptions, garment.color);
    const seasonValue = seasonValueMap[garment.season] || garment.season || '';
    const seasonIndex = optionIndex(seasonOptions, seasonValue);
    const nextForm = {
      ...defaultVisionFields(),
      name: garment.name || '',
      category: garment.category || categoryOptions[0].value,
      color: garment.color || colorOptions[0].value,
      season: seasonValue,
      brand: garment.brand || '',
      size: garment.size || '',
      notes: garment.notes || '',
      subcategory: garment.subcategory || '',
      styleTags: listText(garment.styleTags),
      sceneTags: listText(garment.sceneTags),
      material: garment.material || '',
      thickness: garment.thickness || '',
      pocketPresence: garment.pocketPresence || 'unknown',
      pocketPosition: garment.pocketPosition || 'unknown',
      chestMarkPresence: garment.chestMarkPresence || 'unknown',
      chestMarkType: garment.chestMarkType || 'unknown',
      chestMarkPosition: garment.chestMarkPosition || 'unknown',
      chestMarkText: garment.chestMarkText || '',
    };

    this.setData({
      photoPath: garment.photoUrl || '',
      form: nextForm,
      categoryIndex:
        categoryIndex >= 0 ? categoryIndex : this.data.categoryIndex,
      categoryLabel:
        categoryIndex >= 0
          ? categoryOptions[categoryIndex].label
          : this.data.categoryLabel,
      colorIndex: colorIndex >= 0 ? colorIndex : this.data.colorIndex,
      colorLabel:
        colorIndex >= 0 ? colorOptions[colorIndex].label : this.data.colorLabel,
      seasonIndex: seasonIndex >= 0 ? seasonIndex : this.data.seasonIndex,
      seasonLabel:
        seasonIndex >= 0
          ? seasonOptions[seasonIndex].label
          : this.data.seasonLabel,
    });
  },

  applyAiDraft(draft, duplicateCandidates) {
    const categoryIndex = optionIndex(categoryOptions, draft.category);
    const colorIndex = optionIndex(colorOptions, draft.color);
    const seasonValue = seasonValueMap[(draft.seasons || [])[0]] || '';
    const seasonIndex = optionIndex(seasonOptions, seasonValue);
    const nextForm = Object.assign({}, this.data.form, {
      name: this.data.form.name || draft.subcategory || '',
      subcategory: draft.subcategory || '',
      styleTags: listText(draft.styleTags),
      sceneTags: listText(draft.sceneTags),
      material: draft.material || '',
      thickness: draft.thickness || '',
      pocketPresence: draft.pocketPresence || 'unknown',
      pocketPosition: draft.pocketPosition || 'unknown',
      chestMarkPresence: draft.chestMarkPresence || 'unknown',
      chestMarkType: draft.chestMarkType || 'unknown',
      chestMarkPosition: draft.chestMarkPosition || 'unknown',
      chestMarkText: draft.chestMarkText || '',
      notes: this.data.form.notes || draft.notes || '',
    });

    if (categoryIndex >= 0)
      nextForm.category = categoryOptions[categoryIndex].value;
    if (colorIndex >= 0) nextForm.color = colorOptions[colorIndex].value;
    if (seasonIndex >= 0) nextForm.season = seasonOptions[seasonIndex].value;

    this.setData({
      aiDraft: draft,
      duplicateCandidates: duplicateCandidates || [],
      duplicateWarningAcknowledged: false,
      form: nextForm,
      categoryIndex:
        categoryIndex >= 0 ? categoryIndex : this.data.categoryIndex,
      categoryLabel:
        categoryIndex >= 0
          ? categoryOptions[categoryIndex].label
          : this.data.categoryLabel,
      colorIndex: colorIndex >= 0 ? colorIndex : this.data.colorIndex,
      colorLabel:
        colorIndex >= 0 ? colorOptions[colorIndex].label : this.data.colorLabel,
      seasonIndex: seasonIndex >= 0 ? seasonIndex : this.data.seasonIndex,
      seasonLabel:
        seasonIndex >= 0
          ? seasonOptions[seasonIndex].label
          : this.data.seasonLabel,
    });
    this.showDuplicateWarningIfNeeded();
  },

  showDuplicateWarningIfNeeded() {
    const candidates = this.data.duplicateCandidates || [];
    if (!candidates.length || this.data.duplicateWarningAcknowledged) return;
    const page = this;
    wx.showModal({
      title: '可能已经入库',
      content:
        '这张照片识别出来的衣物，和库存里这些衣物比较相似：\n' +
        duplicateSummary(candidates) +
        '\n\n请确认不是重复衣物后再保存。',
      cancelText: '先看看',
      confirmText: '继续录入',
      success: function (res) {
        if (res.confirm) {
          page.setData({ duplicateWarningAcknowledged: true });
        }
      },
    });
  },

  onInput(event) {
    const field = event.currentTarget.dataset.field;
    const nextData = {};
    nextData['form.' + field] = event.detail.value;
    this.setData(nextData);
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

  submitGarment() {
    if (!this.data.isEdit && !this.data.photoPath) {
      this.setData({ error: '请先选择衣物图片' });
      return;
    }
    if (!this.data.form.category) {
      this.setData({ error: '请选择分类' });
      return;
    }
    if (
      !this.data.isEdit &&
      (this.data.duplicateCandidates || []).length &&
      !this.data.duplicateWarningAcknowledged
    ) {
      this.showDuplicateWarningIfNeeded();
      return;
    }

    const page = this;
    const saveTask = this.data.isEdit
      ? api.updateGarment(this.data.id, this.data.form)
      : api.uploadGarment(this.data.photoPath, this.data.form);

    this.setData({ submitting: true, error: '' });
    saveTask
      .then(function () {
        wx.showToast({ title: '已保存' });
        if (page.data.isBulkImport) {
          page.openNextBulkImportItem();
          return;
        }
        wx.navigateBack();
      })
      .catch(function (error) {
        page.setData({ error: error.message || '上传失败，请重新选择图片' });
      })
      .finally(function () {
        page.setData({ submitting: false });
      });
  },

  applyBulkAiDraftIfReady() {
    const queue = wx.getStorageSync(bulkImportStorageKey) || {};
    const status =
      queue.analyzeStatus && queue.analyzeStatus[this.data.bulkIndex];
    const draft = queue.drafts && queue.drafts[this.data.bulkIndex];
    const duplicateCandidates =
      queue.duplicateCandidates &&
      queue.duplicateCandidates[this.data.bulkIndex];

    if (status === 'done' && draft) {
      this.setData({ recognizing: false, aiError: '', error: '' });
      this.applyAiDraft(draft, duplicateCandidates || []);
      return true;
    }
    if (status === 'failed') return false;
    return false;
  },

  waitForBulkAiDraft(filePath, attempt) {
    const queue = wx.getStorageSync(bulkImportStorageKey) || {};
    const status =
      queue.analyzeStatus && queue.analyzeStatus[this.data.bulkIndex];
    if (status !== 'running' && status !== 'queued') return false;

    const page = this;
    this.setData({
      recognizing: true,
      aiDraft: null,
      aiError: '',
      error: '',
    });
    setTimeout(function () {
      if (page.data.photoPath !== filePath) return;
      if (page.applyBulkAiDraftIfReady()) return;
      if (attempt >= 90) {
        page.analyzePhotoWithoutBulkCache(filePath);
        return;
      }
      page.waitForBulkAiDraft(filePath, attempt + 1);
    }, 500);
    return true;
  },

  analyzePhotoWithoutBulkCache(filePath) {
    const page = this;
    this.setData({ recognizing: true, aiDraft: null, aiError: '', error: '' });
    api
      .analyzeGarmentPhoto(filePath)
      .then(function (data) {
        if (page.data.photoPath !== filePath) return;
        page.applyAiDraft(data.draft || {}, data.duplicateCandidates || []);
      })
      .catch(function (error) {
        if (page.data.photoPath !== filePath) return;
        page.setData({ aiError: error.message || 'AI识别失败，请手动填写' });
      })
      .finally(function () {
        if (page.data.photoPath === filePath) {
          page.setData({ recognizing: false });
        }
      });
  },

  openNextBulkImportItem() {
    const queue = wx.getStorageSync(bulkImportStorageKey) || {};
    const files = queue.files || [];
    const nextIndex = this.data.bulkIndex + 1;
    const nextQueue = Object.assign({}, queue, {
      index: nextIndex,
      success: (queue.success || 0) + 1,
    });
    this.goToBulkImportIndex(nextQueue);
  },

  skipBulkImportItem() {
    const queue = wx.getStorageSync(bulkImportStorageKey) || {};
    const nextQueue = Object.assign({}, queue, {
      index: this.data.bulkIndex + 1,
      skipped: (queue.skipped || 0) + 1,
    });
    this.goToBulkImportIndex(nextQueue);
  },

  goToBulkImportIndex(nextQueue) {
    const files = nextQueue.files || [];
    const nextIndex = nextQueue.index || 0;
    wx.setStorageSync(bulkImportStorageKey, nextQueue);

    if (nextIndex >= files.length) {
      wx.removeStorageSync(bulkImportStorageKey);
      wx.showModal({
        title: '批量导入完成',
        content:
          '已保存 ' +
          (nextQueue.success || 0) +
          ' 张，跳过 ' +
          (nextQueue.skipped || 0) +
          ' 张。',
        showCancel: false,
        complete: function () {
          wx.navigateBack();
        },
      });
      return;
    }

    wx.redirectTo({
      url:
        '/pages/garment-form/index?bulk=1&bulkIndex=' +
        nextIndex +
        '&bulkTotal=' +
        files.length +
        '&photoPath=' +
        encodeURIComponent(files[nextIndex]),
    });
  },
});
