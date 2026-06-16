const api = require('./utils/api');

App({
  onLaunch() {
    api.loginMiniapp().catch(function (error) {
      console.warn('miniapp login failed', error);
    });
  },
});
