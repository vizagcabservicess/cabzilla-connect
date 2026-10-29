/**
 * Play Console flags a locked orientation and a non-resizable activity on large screens.
 * iOS still follows the portrait setting in app.json. This only relaxes the Android manifest.
 */
const { withAndroidManifest } = require('@expo/config-plugins');

const RESTRICTION_ATTRS = ['android:screenOrientation', 'android:maxAspectRatio', 'android:minAspectRatio'];

function relax(nodes) {
  if (!nodes) return;
  const list = Array.isArray(nodes) ? nodes : [nodes];
  for (const node of list) {
    if (!node?.$) continue;
    for (const attr of RESTRICTION_ATTRS) {
      delete node.$[attr];
    }
    node.$['android:resizeableActivity'] = 'true';
  }
}

module.exports = function withPlayLargeScreens(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    if (!application) return config;
    if (!application.$) application.$ = {};
    application.$['android:resizeableActivity'] = 'true';
    relax(application.activity);
    relax(application['activity-alias']);
    return config;
  });
};
