Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/wardrobe/index', text: '衣橱', icon: 'wardrobe' },
      { pagePath: '/pages/outfit/index', text: '搭配', icon: 'outfit' },
      { pagePath: '/pages/daily-outfit/index', text: '今日', icon: 'daily' },
      { pagePath: '/pages/profile/index', text: '我的', icon: 'profile' },
    ],
  },
  methods: {
    onTap(event) {
      const path = event.currentTarget.dataset.path;
      wx.switchTab({ url: path });
    },
  },
});
