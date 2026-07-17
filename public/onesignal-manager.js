// Centralised OneSignal wrapper — all SDK calls go through this module
const ONESIGNAL_APP_ID = '0650da8c-1bca-42ec-8a3c-9274d2a20c70';

const OneSignalManager = {
  async init() {
    await window.OneSignalDeferred.push(async (os) => {
      await os.init({
        appId: ONESIGNAL_APP_ID,
        serviceWorkerPath: '/OneSignalSDKWorker.js',
        notifyButton: { enable: false },
      });
    });
  },

  async requestPermission() {
    return OneSignal.Notifications.requestPermission();
  },

  getSubscriptionId() {
    return OneSignal.User.PushSubscription.id;
  },

  isRegistered(id) {
    return !!id && id.length > 0 && !id.startsWith('local-');
  },

  addSubscriptionChangeListener(handler) {
    OneSignal.User.PushSubscription.addEventListener('change', handler);
  },
};
