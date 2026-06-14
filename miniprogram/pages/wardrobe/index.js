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
