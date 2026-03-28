/**
 * Declares camera / GPS hardware as optional in the merged AndroidManifest.
 *
 * Without this, CAMERA (and sometimes location) permissions can cause the manifest
 * merger to imply required hardware — Play then excludes tablets without a back camera,
 * many Chromebooks, Android Automotive / "Car" profiles, etc.
 *
 * Permissions are unchanged; features are optional so installs are allowed, and you
 * still request camera/location at runtime where needed.
 */
const { withAndroidManifest } = require('@expo/config-plugins');

const TOOLS_URI = 'http://schemas.android.com/tools';

/**
 * @param {import('@expo/config-plugins').ExportedConfig} config
 */
module.exports = function withOptionalAndroidHardware(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    if (!manifest.$) {
      manifest.$ = {};
    }
    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = TOOLS_URI;
    }

    if (!manifest['uses-feature']) {
      manifest['uses-feature'] = [];
    }

    const features = manifest['uses-feature'];
    const names = [
      'android.hardware.camera',
      'android.hardware.camera.any',
      'android.hardware.camera.autofocus',
      'android.hardware.camera.front',
      'android.hardware.location.gps',
      // expo-image-picker can merge RECORD_AUDIO → implicit mic requirement
      'android.hardware.microphone',
    ];

    for (const name of names) {
      const existing = features.find((f) => f?.$?.['android:name'] === name);
      if (existing) {
        existing.$['android:required'] = 'false';
        existing.$['tools:replace'] = 'android:required';
      } else {
        features.push({
          $: {
            'android:name': name,
            'android:required': 'false',
          },
        });
      }
    }

    return config;
  });
};
