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

// 8 个老字段的折叠选择框配置。source: 'local' 用本页常量，'taxonomy' 用标签库接口对应组。
const fieldSelectorConfigs = [
  { key: 'category', label: '分类', formField: 'category', required: true, multi: false, source: 'local', options: categoryOptions },
  { key: 'color', label: '颜色', formField: 'color', required: false, multi: false, source: 'local', options: colorOptions },
  { key: 'season', label: '季节', formField: 'season', required: false, multi: true, source: 'local', options: seasonOptions.filter(function (option) { return option.value !== ''; }) },
  { key: 'subcategory', label: '细分', formField: 'subcategory', required: false, multi: false, source: 'taxonomy', taxonomyKey: 'category' },
  { key: 'material', label: '材质', formField: 'material', required: false, multi: false, source: 'taxonomy', taxonomyKey: 'material' },
  { key: 'thickness', label: '厚薄', formField: 'thickness', required: false, multi: false, source: 'taxonomy', taxonomyKey: 'thickness' },
  { key: 'styleTags', label: '风格标签', formField: 'styleTags', required: false, multi: true, source: 'taxonomy', taxonomyKey: 'style' },
  { key: 'sceneTags', label: '场景标签', formField: 'sceneTags', required: false, multi: true, source: 'taxonomy', taxonomyKey: 'occasion' },
];

// 把 "商务、简约" 这样的拼接串拆回数组；和后端 normalizeTags 的分隔符保持一致
function splitListText(value) {
  if (typeof value !== 'string') return [];
  return value
    .split(/[,，、]/)
    .map(function (item) {
      return item.trim();
    })
    .filter(Boolean);
}

// 根据当前表单值 + 标签库原始组，构建 8 个字段的选择框视图模型；expanded 从上一份视图模型继承
function buildFieldGroups(form, taxonomyGroups, prevGroups) {
  const prevByKey = {};
  (prevGroups || []).forEach(function (group) {
    prevByKey[group.key] = group;
  });
  const taxonomyByKey = {};
  (taxonomyGroups || []).forEach(function (group) {
    taxonomyByKey[group.key] = Array.isArray(group.tags) ? group.tags : [];
  });
  return fieldSelectorConfigs.map(function (config) {
    const baseOptions =
      config.source === 'local'
        ? config.options.map(function (option) {
            return { label: option.label, value: option.value };
          })
        : (taxonomyByKey[config.taxonomyKey] || []).map(function (tag) {
            return { label: tag, value: tag };
          });
    const raw = form[config.formField];
    const selectedValues = config.multi ? splitListText(raw) : raw ? [raw] : [];
    // 当前值不在选项里（AI 识别的库外值 / 旧数据）时追加，保证能显示、能取消
    selectedValues.forEach(function (value) {
      const exists = baseOptions.some(function (option) {
        return option.value === value;
      });
      if (!exists) baseOptions.push({ label: value, value: value });
    });
    const options = baseOptions.map(function (option) {
      return {
        label: option.label,
        value: option.value,
        selected: selectedValues.includes(option.value),
      };
    });
    return {
      key: config.key,
      label: config.label,
      required: config.required,
      multi: config.multi,
      expanded: prevByKey[config.key] ? prevByKey[config.key].expanded === true : false,
      selectedText: options
        .filter(function (option) {
          return option.selected;
        })
        .map(function (option) {
          return option.label;
        })
        .join('、'),
      options: options,
    };
  });
}

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

const taxonomyGroupLabels = {
  season: '季节',
  weather: '天气',
  thickness: '厚薄',
  color: '颜色',
  colorFeeling: '色彩感觉',
  occasion: '场合',
  style: '风格',
  wearingFeel: '穿着感',
  material: '材质',
  category: '品类',
  length: '长度',
  fit: '版型',
};

const editableTaxonomyGroupKeys = [
  'weather',
  'colorFeeling',
  'wearingFeel',
  'length',
  'fit',
];

function parseTaxonomySelection(selection) {
  if (typeof selection === 'string') {
    try {
      return parseTaxonomySelection(JSON.parse(selection));
    } catch (error) {
      return {};
    }
  }
  if (!selection || typeof selection !== 'object' || Array.isArray(selection)) {
    return {};
  }
  return Object.keys(selection).reduce(function (result, key) {
    if (Array.isArray(selection[key])) {
      result[key] = selection[key].filter(Boolean);
    }
    return result;
  }, {});
}

function selectableTaxonomyGroups(groups, selection) {
  const selected = parseTaxonomySelection(selection);
  return (groups || [])
    .filter(function (group) {
      return editableTaxonomyGroupKeys.includes(group.key);
    })
    .map(function (group) {
      const tags = Array.isArray(group.tags)
        ? group.tags
        : (group.options || []).map(function (option) {
            return option.label;
          });
      const selectedTags = selected[group.key] || [];
      return {
        key: group.key,
        label: group.label || taxonomyGroupLabels[group.key] || group.key,
        expanded: group.expanded === true,
        selectedText: tags
          .filter(function (tag) {
            return selectedTags.includes(tag);
          })
          .join('、'),
        tags: tags,
        options: tags.map(function (tag) {
          return {
            label: tag,
            selected: selectedTags.includes(tag),
          };
        }),
      };
    });
}

function taxonomyGroups(selection) {
  if (!selection || typeof selection !== 'object') return [];
  return Object.keys(taxonomyGroupLabels)
    .map(function (key) {
      const tags = Array.isArray(selection[key])
        ? selection[key].filter(Boolean)
        : [];
      return {
        key: key,
        label: taxonomyGroupLabels[key],
        tags: tags,
      };
    })
    .filter(function (group) {
      return group.tags.length > 0;
    });
}

function taxonomyJson(selection) {
  try {
    return JSON.stringify(
      selection && typeof selection === 'object' ? selection : {},
    );
  } catch (error) {
    return '{}';
  }
}

const maxAnalyzePhotoEdge = 900;
const bulkImportStorageKey = 'wardrobeBulkImportQueue';

function optionIndex(options, value) {
  const index = options.findIndex((option) => option.value === value);
  return index >= 0 ? index : -1;
}

function optionLabel(options, value, fallback) {
  const option = options.find(function (item) {
    return item.value === value;
  });
  return option ? option.label : fallback || value || '';
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
    categoryLabel: categoryOptions[0].label,
    colorLabel: colorOptions[0].label,
    seasonLabel: '',
    fieldGroups: [],
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
      taxonomyTags: '{}',
      ...defaultVisionFields(),
    },
    recognizing: false,
    aiDraft: null,
    aiTaxonomyGroups: [],
    editableTaxonomyGroups: [],
    taxonomyError: '',
    aiError: '',
    duplicateCandidates: [],
    duplicateWarningAcknowledged: false,
    duplicateCompareVisible: false,
    duplicateCompareSubmitOnConfirm: false,
    duplicateCurrentItem: null,
    submitting: false,
    error: '',
    isBulkImport: false,
    bulkIndex: 0,
    bulkTotal: 0,
  },

  onLoad(options) {
    this.taxonomyGroupsRaw = [];
    this.setData({
      fieldGroups: buildFieldGroups(this.data.form, [], []),
    });
    this.loadTaxonomy();
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

  loadTaxonomy() {
    const page = this;
    api
      .getGarmentTaxonomy()
      .then(function (data) {
        page.taxonomyGroupsRaw = data.groups || [];
        page.setData({
          editableTaxonomyGroups: selectableTaxonomyGroups(
            data.groups || [],
            page.data.form.taxonomyTags,
          ),
          fieldGroups: buildFieldGroups(
            page.data.form,
            page.taxonomyGroupsRaw,
            page.data.fieldGroups,
          ),
          taxonomyError: '',
        });
      })
      .catch(function () {
        page.setData({ taxonomyError: '标签加载失败，请稍后重试' });
      });
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
    const seasonValues = (Array.isArray(garment.seasons) ? garment.seasons : [])
      .map(function (item) {
        return seasonValueMap[item] || item;
      })
      .filter(Boolean);
    const nextForm = {
      ...defaultVisionFields(),
      name: garment.name || '',
      category: garment.category || categoryOptions[0].value,
      color: garment.color || colorOptions[0].value,
      season: seasonValues.join('、'),
      brand: garment.brand || '',
      size: garment.size || '',
      notes: garment.notes || '',
      subcategory: garment.subcategory || '',
      styleTags: listText(garment.styleTags),
      sceneTags: listText(garment.sceneTags),
      material: garment.material || '',
      thickness: garment.thickness || '',
      taxonomyTags: taxonomyJson(garment.taxonomyTags),
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
      categoryLabel: optionLabel(categoryOptions, nextForm.category, this.data.categoryLabel),
      colorLabel: optionLabel(colorOptions, nextForm.color, ''),
      seasonLabel: seasonValues
        .map(function (value) {
          return optionLabel(seasonOptions, value, value);
        })
        .join('、'),
      editableTaxonomyGroups: selectableTaxonomyGroups(
        this.data.editableTaxonomyGroups,
        garment.taxonomyTags,
      ),
      fieldGroups: buildFieldGroups(
        nextForm,
        this.taxonomyGroupsRaw || [],
        this.data.fieldGroups,
      ),
    });
  },

  applyAiDraft(draft, duplicateCandidates) {
    const categoryIndex = optionIndex(categoryOptions, draft.category);
    const colorIndex = optionIndex(colorOptions, draft.color);
    const seasonValues = (draft.seasons || [])
      .map(function (item) {
        return seasonValueMap[item] || item;
      })
      .filter(Boolean);
    const nextForm = Object.assign({}, this.data.form, {
      name: this.data.form.name || draft.subcategory || '',
      subcategory: draft.subcategory || '',
      styleTags: listText(draft.styleTags),
      sceneTags: listText(draft.sceneTags),
      material: draft.material || '',
      thickness: draft.thickness || '',
      taxonomyTags: taxonomyJson(draft.taxonomyTags),
      pocketPresence: draft.pocketPresence || 'unknown',
      pocketPosition: draft.pocketPosition || 'unknown',
      chestMarkPresence: draft.chestMarkPresence || 'unknown',
      chestMarkType: draft.chestMarkType || 'unknown',
      chestMarkPosition: draft.chestMarkPosition || 'unknown',
      chestMarkText: draft.chestMarkText || '',
      notes: this.data.form.notes || draft.notes || '',
      season: seasonValues.join('、'),
    });

    if (categoryIndex >= 0)
      nextForm.category = categoryOptions[categoryIndex].value;
    if (colorIndex >= 0) nextForm.color = colorOptions[colorIndex].value;
    this.setData({
      aiDraft: draft,
      aiTaxonomyGroups: taxonomyGroups(draft.taxonomyTags),
      duplicateCandidates: duplicateCandidates || [],
      duplicateWarningAcknowledged: false,
      duplicateCompareVisible: false,
      duplicateCompareSubmitOnConfirm: false,
      duplicateCurrentItem: null,
      form: nextForm,
      categoryLabel: optionLabel(categoryOptions, nextForm.category, this.data.categoryLabel),
      colorLabel: optionLabel(colorOptions, nextForm.color, ''),
      seasonLabel: seasonValues
        .map(function (value) {
          return optionLabel(seasonOptions, value, value);
        })
        .join('、'),
      editableTaxonomyGroups: selectableTaxonomyGroups(
        this.data.editableTaxonomyGroups,
        draft.taxonomyTags,
      ),
      fieldGroups: buildFieldGroups(
        nextForm,
        this.taxonomyGroupsRaw || [],
        this.data.fieldGroups,
      ),
    });
  },

  buildCurrentCompareItem() {
    const form = this.data.form || {};
    const categoryLabel =
      this.data.categoryLabel ||
      optionLabel(categoryOptions, form.category, '本次新增衣物');
    const colorLabel =
      this.data.colorLabel || optionLabel(colorOptions, form.color, '');
    const seasonLabel =
      this.data.seasonLabel || optionLabel(seasonOptions, form.season, '');
    const detailText = [form.material, form.thickness]
      .concat(
        seasonLabel ? ['适合' + seasonLabel] : [],
      )
      .filter(Boolean)
      .join(' · ');

    return {
      name: form.name || form.subcategory || categoryLabel || '本次新增衣物',
      subcategory: form.subcategory || '',
      categoryLabel: categoryLabel,
      colorLabel: colorLabel,
      detailText: detailText,
      notes: form.notes || '',
      photoUrl: this.data.photoPath || '',
    };
  },

  openDuplicateCompare(submitOnConfirm) {
    const candidates = this.data.duplicateCandidates || [];
    if (!candidates.length) return;
    this.setData({
      duplicateCompareVisible: true,
      duplicateCompareSubmitOnConfirm: !!submitOnConfirm,
      duplicateCurrentItem: this.buildCurrentCompareItem(),
    });
  },

  onViewDuplicateCandidates() {
    this.openDuplicateCompare(false);
  },

  closeDuplicateCompare() {
    this.setData({
      duplicateCompareVisible: false,
      duplicateCompareSubmitOnConfirm: false,
    });
  },

  confirmDuplicateDifference() {
    const shouldSubmit = this.data.duplicateCompareSubmitOnConfirm;
    this.setData(
      {
        duplicateWarningAcknowledged: true,
        duplicateCompareVisible: false,
        duplicateCompareSubmitOnConfirm: false,
      },
      () => {
        if (shouldSubmit) {
          this.submitGarment();
        }
      },
    );
  },

  noop() {},

  onInput(event) {
    const field = event.currentTarget.dataset.field;
    const nextData = {};
    nextData['form.' + field] = event.detail.value;
    this.setData(nextData);
  },

  toggleFieldGroup(event) {
    const groupKey = event.currentTarget.dataset.group;
    const groups = this.data.fieldGroups || [];
    const index = groups.findIndex(function (item) {
      return item.key === groupKey;
    });
    if (index < 0) return;
    const nextData = {};
    nextData['fieldGroups[' + index + '].expanded'] = !groups[index].expanded;
    this.setData(nextData);
  },

  toggleFieldOption(event) {
    const groupKey = event.currentTarget.dataset.group;
    const value = event.currentTarget.dataset.value;
    const config = fieldSelectorConfigs.find(function (item) {
      return item.key === groupKey;
    });
    if (!config || value == null || value === undefined) return;

    const currentRaw = this.data.form[config.formField];
    let nextValue;
    if (config.multi) {
      const values = splitListText(currentRaw);
      nextValue = (values.includes(value)
        ? values.filter(function (item) {
            return item !== value;
          })
        : values.concat(value)
      ).join('、');
    } else if (currentRaw === value) {
      // 必填字段（分类）不允许取消成空；其它单选字段再点一次 = 清空
      nextValue = config.required ? value : '';
    } else {
      nextValue = value;
    }

    const nextForm = Object.assign({}, this.data.form);
    nextForm[config.formField] = nextValue;
    const rebuilt = buildFieldGroups(
      nextForm,
      this.taxonomyGroupsRaw || [],
      this.data.fieldGroups,
    );
    if (!config.multi) {
      // 单选选完自动收起
      rebuilt.forEach(function (group) {
        if (group.key === groupKey) group.expanded = false;
      });
    }

    const nextData = { fieldGroups: rebuilt };
    nextData['form.' + config.formField] = nextValue;
    // 相似衣物对比面板还在读这三个 label，跟着同步
    if (groupKey === 'category') {
      nextData.categoryLabel = optionLabel(categoryOptions, nextValue, this.data.categoryLabel);
    }
    if (groupKey === 'color') {
      nextData.colorLabel = optionLabel(colorOptions, nextValue, '');
    }
    if (groupKey === 'season') {
      nextData.seasonLabel = rebuilt.find(function (group) {
        return group.key === 'season';
      }).selectedText;
    }
    this.setData(nextData);
  },

  toggleTaxonomyGroup(event) {
    const groupKey = event.currentTarget.dataset.group;
    const groups = this.data.editableTaxonomyGroups || [];
    const index = groups.findIndex(function (item) {
      return item.key === groupKey;
    });
    if (index < 0) return;
    const nextData = {};
    nextData['editableTaxonomyGroups[' + index + '].expanded'] =
      !groups[index].expanded;
    this.setData(nextData);
  },

  toggleTaxonomyTag(event) {
    const groupKey = event.currentTarget.dataset.group;
    const tag = event.currentTarget.dataset.tag;
    const groups = this.data.editableTaxonomyGroups || [];
    const group = groups.find(function (item) {
      return item.key === groupKey;
    });
    if (!group || !group.tags.includes(tag)) return;

    const selection = parseTaxonomySelection(this.data.form.taxonomyTags);
    const selectedTags = selection[groupKey] || [];
    selection[groupKey] = selectedTags.includes(tag)
      ? selectedTags.filter(function (item) {
          return item !== tag;
        })
      : selectedTags.concat(tag);
    if (!selection[groupKey].length) delete selection[groupKey];

    this.setData({
      'form.taxonomyTags': taxonomyJson(selection),
      editableTaxonomyGroups: selectableTaxonomyGroups(groups, selection),
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
      this.openDuplicateCompare(true);
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
