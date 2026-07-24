// Centralised OneSignal wrapper — all SDK calls go through this module
const ONESIGNAL_APP_ID = '0650da8c-1bca-42ec-8a3c-9274d2a20c70';

const OneSignalManager = {
  init() {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function(OneSignal) {
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        notifyButton: { enable: false },
        serviceWorkerParam: { scope: '/' },
      });
    });
  },

  async requestPermission() {
    return window.OneSignal.Notifications.requestPermission();
  },

  getSubscriptionId() {
    return window.OneSignal?.User?.PushSubscription?.id;
  },

  isRegistered(id) {
    return !!id && id.length > 0 && !id.startsWith('local-');
  },

  addSubscriptionChangeListener(handler) {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(function(OneSignal) {
      OneSignal.User.PushSubscription.addEventListener('change', handler);
    });
  },
};
