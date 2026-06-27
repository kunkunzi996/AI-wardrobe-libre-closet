const api = require('./utils/api');

App({
  // 用于 tab 页之间传递“围绕这件搭配”的核心衣物 id（switchTab 不能带参数）
  globalData: {
    pendingCoreGarmentId: '',
  },

  onLaunch() {
    api.loginMiniapp().catch(function (error) {
      console.warn('miniapp login failed', error);
    });
  },
});
