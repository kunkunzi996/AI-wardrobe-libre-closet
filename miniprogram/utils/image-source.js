// 私有图片只允许同源角色 URL；令牌只放请求头，不拼进 URL 或日志。
function createPrivateImageResolver(options) {
  const baseUrl = options.baseUrl.replace(/\/$/, '');
  const cache = new Map();
  let activeIdentity = '';
  let identityVersion = 0;

  function identity() {
    const nextIdentity = options.getIdentity() || '';
    if (nextIdentity !== activeIdentity) {
      activeIdentity = nextIdentity;
      identityVersion += 1;
      cache.clear();
    }
    return { token: activeIdentity, version: identityVersion };
  }

  function isPrivateUrl(url) {
    if (typeof url !== 'string' || !url.startsWith(baseUrl + '/')) return false;
    return /^\/api\/miniapp\/garments\/[1-9]\d*\/photos\/(original|display|candidate)\?v=[1-9]\d*$/.test(
      url.slice(baseUrl.length),
    );
  }

  function resolveUrl(url) {
    const current = identity();
    if (!isPrivateUrl(url)) return Promise.resolve(url);
    if (!current.token) return Promise.reject(new Error('请登录后查看图片'));
    if (cache.has(url)) return cache.get(url);

    const pending = new Promise(function (resolve, reject) {
      options.download({
        url: url,
        header: { Authorization: 'Bearer ' + current.token },
        success(response) {
          const latest = identity();
          if (latest.version !== current.version) {
            reject(new Error('登录身份已变化，请重新查看图片'));
            return;
          }
          const contentType =
            response.header &&
            (response.header['content-type'] ||
              response.header['Content-Type']);
          if (
            response.statusCode !== 200 ||
            !response.tempFilePath ||
            (contentType && !/^image\//i.test(contentType))
          ) {
            reject(new Error('图片暂时无法加载，请稍后重试'));
            return;
          }
          resolve(response.tempFilePath);
        },
        fail() {
          reject(new Error('图片暂时无法加载，请稍后重试'));
        },
      });
    });
    cache.set(url, pending);
    pending.catch(function () {
      if (cache.get(url) === pending) cache.delete(url);
    });
    return pending;
  }

  function resolvePrivateImageUrls(value, tolerateImageErrors) {
    if (Array.isArray(value)) {
      return Promise.all(
        value.map(function (item) {
          return resolvePrivateImageUrls(item, tolerateImageErrors);
        }),
      );
    }
    if (!value || typeof value !== 'object') return Promise.resolve(value);
    const result = Object.assign({}, value);
    return Promise.all(
      Object.keys(result).map(function (key) {
        const isImage = /^(photoUrl|originalPhotoUrl|candidatePhotoUrl)$/.test(
          key,
        );
        let next = isImage
          ? resolveUrl(result[key])
          : resolvePrivateImageUrls(result[key], tolerateImageErrors);
        if (isImage && tolerateImageErrors)
          next = next.catch(function (error) {
            if (/身份/.test(error.message)) throw error;
            result.imageError = error.message;
            return '';
          });
        return next.then(function (resolved) {
          result[key] = resolved;
        });
      }),
    ).then(function () {
      return result;
    });
  }

  return { resolvePrivateImageUrls: resolvePrivateImageUrls };
}

module.exports = { createPrivateImageResolver: createPrivateImageResolver };
