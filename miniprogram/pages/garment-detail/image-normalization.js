const api = require('../../utils/api');

// 只管理详情的整理预览，不拥有衣物资料或模型请求。
function createImageNormalization(page) {
  let sequence = 0;
  let stopped = false;
  let timer;
  function cancelTimer() {
    if (timer) clearTimeout(timer);
    timer = undefined;
  }
  function schedule(view, current) {
    cancelTimer();
    if (
      stopped ||
      sequence !== current ||
      !['queued', 'processing', 'uncertain'].includes(view.status)
    )
      return;
    timer = setTimeout(function () {
      timer = undefined;
      if (!stopped && sequence === current) load();
    }, 3000);
  }
  async function apply(view, current) {
    if (stopped || sequence !== current) return;
    page.setData({
      normalization: Object.assign({}, view, { candidatePhotoUrl: '' }),
      normalizationError: '',
    });
    try {
      const resolved = await api.resolvePrivateImageUrls(view);
      if (stopped || sequence !== current) return;
      page.setData({
        normalization: resolved,
        normalizationPreviewVisible: view.status === 'ready',
      });
    } catch (error) {
      if (!stopped && sequence === current)
        page.setData({
          normalizationError:
            error.message || '整理图片暂时无法加载，请重新查看',
        });
    } finally {
      schedule(view, current);
    }
  }
  async function load() {
    if (stopped) return;
    cancelTimer();
    const current = ++sequence;
    try {
      const result = await api.getGarmentNormalization(page.data.id);
      await apply(result.item, current);
    } catch (error) {
      if (!stopped && sequence === current)
        page.setData({
          normalizationError: error.message || '整理状态暂时无法加载',
        });
    }
  }
  async function start() {
    if (
      stopped ||
      page.data.normalizationStarting ||
      !page.data.normalization?.canStart
    )
      return;
    cancelTimer();
    const current = ++sequence;
    const previous =
      Number.parseInt(
        (page.data.normalization.attemptKey || '').split('_')[0],
        36,
      ) || 0;
    const attemptKey =
      Math.max(Date.now(), previous + 1).toString(36) +
      '_' +
      Math.random().toString(36).slice(2, 14);
    page.setData({ normalizationStarting: true, normalizationError: '' });
    try {
      const result = await api.startGarmentNormalization(
        page.data.id,
        attemptKey,
      );
      await apply(result.item, current);
    } catch (error) {
      if (!stopped && sequence === current) {
        page.setData({
          normalizationStarting: false,
          normalizationError: error.message || '开始请求失败，请查看处理状态',
        });
        // 超时不代表未受理：只查询本次，不自动再 POST。
        await load();
      }
    } finally {
      if (!stopped && sequence === current)
        page.setData({ normalizationStarting: false });
    }
  }
  async function adopt() {
    if (
      stopped ||
      page.data.normalizationAdopting ||
      !page.data.normalization?.canAdopt
    )
      return;
    cancelTimer();
    const current = ++sequence;
    page.setData({ normalizationAdopting: true, normalizationError: '' });
    try {
      const result = await api.adoptGarmentNormalization(
        page.data.id,
        page.data.normalization.attemptKey,
      );
      if (stopped || sequence !== current) return;
      const resolved = await api.resolvePrivateImageUrls({
        photoUrl:
          result.item.photoUrl || page.data.normalization.candidatePhotoUrl,
      });
      if (stopped || sequence !== current) return;
      page.setData({
        'garment.photoUrl': resolved.photoUrl,
        normalization: Object.assign({}, page.data.normalization, {
          adopted: true,
          canAdopt: false,
          message: '已采用整理图',
        }),
      });
    } catch (error) {
      if (!stopped && sequence === current)
        page.setData({
          normalizationError: error.message || '采用失败，当前展示图未改变',
        });
    } finally {
      if (!stopped && sequence === current)
        page.setData({ normalizationAdopting: false });
    }
  }
  return {
    load: load,
    start: start,
    adopt: adopt,
    resume: function () {
      stopped = false;
      page.setData({
        normalizationStarting: false,
        normalizationAdopting: false,
      });
      return load();
    },
    dismiss: function () {
      page.setData({ normalizationPreviewVisible: false });
    },
    stop: function () {
      stopped = true;
      sequence++;
      cancelTimer();
    },
  };
}
module.exports = { createImageNormalization: createImageNormalization };
