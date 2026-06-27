Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/wardrobe/index', text: '衣橱', icon: 'wardrobe' },
      { pagePath: '/pages/outfit/index', text: '搭配', icon: 'outfit' },
      { pagePath: '/pages/daily-outfit/index', text: '今日', icon: 'daily' },
    ],
  },
  methods: {
    onTap(event) {
      const path = event.currentTarget.dataset.path;
      wx.switchTab({ url: path });
    },
  },
});
