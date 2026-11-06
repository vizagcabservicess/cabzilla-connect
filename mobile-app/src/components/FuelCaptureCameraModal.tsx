/**
 * Guided full-screen camera for fuel pump / receipt / odometer with overlay and stability auto-capture.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  type GestureResponderEvent,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Accelerometer } from 'expo-sensors';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import type { FuelCapturePhase } from '../services/fuelGeminiVisionUnified';
import { cropPumpStencilForGemini, type StencilLayout } from '../utils/fuelPumpStencilCrop';

/** Phone must be still this long before the lens is given time to lock. */
const STABLE_MS = 700;
/** Extra hold after the phone is still so autofocus finishes. Capturing earlier saves a soft frame. */
const FOCUS_SETTLE_MS = 600;
/** Ignore auto-capture right after open; the lens is still hunting. */
const MIN_OPEN_MS = 900;
const ACCEL_SAMPLE_MS = 100;
const MAX_ACCEL_DEV = 0.18;
const TILT_X = 0.4;
const TILT_Y = 0.42;
const ZOOM_STEP = 0.08;
/** ~2x. Past this, phone digital zoom turns LCD and odometer digits to mush. */
const MAX_ZOOM = 0.34;
const SHUTTER_SETTLE_MS = 280;

type FocusLock = 'idle' | 'hold' | 'focus';

/** Expo Go often captures a preview-sized frame. Digits then vanish before Gemini sees them. */
function pickSharpPictureSize(sizes: string[]): string | undefined {
  let best: { label: string; pixels: number } | null = null;
  for (const label of sizes) {
    const match = /(\d+)\s*x\s*(\d+)/i.exec(label);
    if (!match) continue;
    const width = Number(match[1]);
    const height = Number(match[2]);
    if (!Number.isFinite(width) || !Number.isFinite(height)) continue;
    const longEdge = Math.max(width, height);
    if (longEdge < 1280 || longEdge > 4000) continue;
    const pixels = width * height;
    if (best == null || pixels > best.pixels) best = { label, pixels };
  }
  return best?.label;
}

function clampZoom(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_ZOOM, Math.max(0, value));
}

function pinchDistance(event: GestureResponderEvent): number | null {
  const touches = event.nativeEvent.touches;
  if (!touches || touches.length < 2) return null;
  const first = touches[0];
  const second = touches[1];
  if (!first || !second) return null;
  return Math.hypot(first.pageX - second.pageX, first.pageY - second.pageY);
}

type Props = {
  visible: boolean;
  phase: FuelCapturePhase;
  onDismiss: () => void;
  onCaptured: (localUri: string) => void;
};

function instructionForPhase(phase: FuelCapturePhase): string {
  switch (phase) {
    case 'pump':
      return 'Fill the box with the LCD. Move back until the numbers look sharp, then hold still.';
    case 'receipt':
      return 'Fill the box with the receipt. Hold still once the print looks sharp.';
    case 'odometer':
      return 'Keep the km total inside the box, including the smaller km line under the big trip number.';
    default:
      return 'Align the subject inside the box';
  }
}

/** Must match the focus box on screen so crop ↔ Gemini sees the same framing as the overlay. */
function stencilLayoutForPhase(phase: FuelCapturePhase, screenW: number, screenH: number): StencilLayout {
  const boxW = phase === 'pump' ? Math.min(screenW * 0.92, 380) : Math.min(screenW * 0.88, 340);
  const boxH =
    phase === 'receipt' ? boxW * 1.15 : phase === 'odometer' ? boxW * 0.95 : boxW * 0.78;
  const topOffset = screenH * 0.14;
  return { screenW, screenH, boxW, boxH, topOffset };
}

export function FuelCaptureCameraModal({ visible, phase, onDismiss, onCaptured }: Props) {
  const { width: w, height: h } = useWindowDimensions();
  const camRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);
  const [hint, setHint] = useState<string>('');
  const [secondaryHint, setSecondaryHint] = useState('');
  const [zoom, setZoom] = useState(0);
  const [torch, setTorch] = useState(false);
  const [focusLock, setFocusLock] = useState<FocusLock>('idle');
  const [cameraReady, setCameraReady] = useState(false);
  const [pictureSize, setPictureSize] = useState<string | undefined>(undefined);
  const capturingRef = useRef(false);
  const stableSinceRef = useRef<number | null>(null);
  const openedAtRef = useRef(0);
  const cameraReadyRef = useRef(false);
  const pinchingRef = useRef(false);
  const magBuf = useRef<number[]>([]);
  const zoomRef = useRef(0);
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartZoom = useRef(0);

  const applyZoom = useCallback((value: number) => {
    const next = clampZoom(value);
    zoomRef.current = next;
    setZoom(next);
  }, []);

  const takePicture = useCallback(async (fromShutter = false) => {
    if (!camRef.current || capturingRef.current) return;
    if (!cameraReadyRef.current) {
      setHint('Camera is still focusing');
      return;
    }
    capturingRef.current = true;
    stableSinceRef.current = null;
    magBuf.current = [];
    setFocusLock('focus');
    setCapturing(true);
    try {
      if (fromShutter) {
        await new Promise((resolve) => setTimeout(resolve, SHUTTER_SETTLE_MS));
      }
      if (!camRef.current) return;
      const photo = await camRef.current.takePictureAsync({
        quality: 1,
        skipProcessing: false,
        shutterSound: false,
      });
      if (!photo?.uri) return;
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[FuelCamera] captured', photo.width, photo.height, 'pictureSize', pictureSize ?? '(default)');
      }

      const outUri =
        photo.width > 0 && photo.height > 0
          ? await cropPumpStencilForGemini(
              photo.uri,
              photo.width,
              photo.height,
              stencilLayoutForPhase(phase, w, h),
              phase === 'odometer' ? 0.35 : 0.06,
            )
          : photo.uri;
      onCaptured(outUri);
    } finally {
      capturingRef.current = false;
      setCapturing(false);
    }
  }, [onCaptured, phase, pictureSize, w, h]);

  useEffect(() => {
    if (!visible) {
      stableSinceRef.current = null;
      magBuf.current = [];
      pinchStartDist.current = null;
      pinchingRef.current = false;
      cameraReadyRef.current = false;
      zoomRef.current = 0;
      setZoom(0);
      setTorch(false);
      setFocusLock('idle');
      setCameraReady(false);
      setHint('');
      setSecondaryHint('');
      return;
    }
    openedAtRef.current = Date.now();
    const readyFallback = setTimeout(() => {
      cameraReadyRef.current = true;
      setCameraReady(true);
    }, 2500);

    let rot = 0;
    const id = setInterval(() => {
      rot = (rot + 1) % 4;
      const tips = [
        'Reduce reflection (tilt slightly)',
        'Tap shutter if auto-capture is slow',
        'Keep subject steady for auto-capture',
        'Ensure even lighting on the display',
      ];
      setSecondaryHint(tips[rot] ?? '');
    }, 4500);
    return () => {
      clearTimeout(readyFallback);
      clearInterval(id);
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    Accelerometer.setUpdateInterval(ACCEL_SAMPLE_MS);
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      if (capturingRef.current || pinchingRef.current) return;
      const mark = (lock: FocusLock, text: string) => {
        setFocusLock((prev) => (prev === lock ? prev : lock));
        setHint((prev) => (prev === text ? prev : text));
      };
      if (!cameraReadyRef.current || Date.now() - openedAtRef.current < MIN_OPEN_MS) {
        stableSinceRef.current = null;
        mark('idle', 'Let the camera focus');
        return;
      }
      const tilted = Math.abs(x) > TILT_X || Math.abs(y) > TILT_Y;
      if (tilted) {
        stableSinceRef.current = null;
        magBuf.current = [];
        mark('idle', 'Hold phone straight');
        return;
      }
      const mag = Math.sqrt(x * x + y * y + z * z);
      const buf = magBuf.current;
      buf.push(mag);
      if (buf.length > 18) buf.shift();
      if (buf.length < 8) {
        stableSinceRef.current = null;
        mark('idle', '');
        return;
      }
      const mean = buf.reduce((a, b) => a + b, 0) / buf.length;
      const dev = Math.sqrt(buf.reduce((s, m) => s + (m - mean) ** 2, 0) / buf.length);
      if (dev > MAX_ACCEL_DEV) {
        stableSinceRef.current = null;
        mark('hold', 'Hold steady — photo is still soft');
        return;
      }
      const now = Date.now();
      if (stableSinceRef.current == null) stableSinceRef.current = now;
      const held = now - stableSinceRef.current;
      if (held < STABLE_MS) {
        mark('hold', 'Hold steady');
        return;
      }
      if (held < STABLE_MS + FOCUS_SETTLE_MS) {
        mark('focus', 'Focusing… keep still');
        return;
      }
      stableSinceRef.current = null;
      mark('focus', 'Focusing… keep still');
      void takePicture(false);
    });

    return () => sub.remove();
  }, [visible, takePicture]);

  if (!visible) return null;

  const { boxW, boxH, topOffset } = stencilLayoutForPhase(phase, w, h);
  const focusLeft = (w - boxW) / 2;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.root}>
        {!permission?.granted ? (
          <View style={styles.permBox}>
            <Text style={styles.permText}>Camera access is needed to capture fuel photos.</Text>
            <TouchableOpacity style={styles.permBtn} onPress={() => void requestPermission()}>
              <Text style={styles.permBtnText}>Allow camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeGhost} onPress={onDismiss}>
              <Text style={styles.closeGhostText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <CameraView
              ref={camRef}
              style={StyleSheet.absoluteFill}
              facing="back"
              mode="picture"
              zoom={zoom}
              enableTorch={torch}
              animateShutter={false}
              autofocus="off"
              pictureSize={pictureSize}
              onCameraReady={() => {
                cameraReadyRef.current = true;
                setCameraReady(true);
                void camRef.current?.getAvailablePictureSizesAsync().then((sizes) => {
                  const picked = pickSharpPictureSize(sizes);
                  if (picked) setPictureSize(picked);
                  if (__DEV__) {
                    // eslint-disable-next-line no-console
                    console.log('[FuelCamera] sizes', sizes, 'picked', picked ?? '(default)');
                  }
                });
              }}
            />
            <View style={styles.overlay} pointerEvents="box-none">
              <View
                style={styles.pinchLayer}
                onStartShouldSetResponder={() => false}
                onMoveShouldSetResponder={(event) => (event.nativeEvent.touches?.length ?? 0) >= 2}
                onResponderGrant={(event) => {
                  pinchingRef.current = true;
                  stableSinceRef.current = null;
                  pinchStartDist.current = pinchDistance(event);
                  pinchStartZoom.current = zoomRef.current;
                }}
                onResponderMove={(event) => {
                  const dist = pinchDistance(event);
                  const start = pinchStartDist.current;
                  if (dist == null || start == null || start < 8) {
                    if (dist != null) {
                      pinchStartDist.current = dist;
                      pinchStartZoom.current = zoomRef.current;
                    }
                    return;
                  }
                  applyZoom(pinchStartZoom.current + (dist / start - 1) * 0.7);
                }}
                onResponderRelease={() => {
                  pinchStartDist.current = null;
                  pinchingRef.current = false;
                  stableSinceRef.current = null;
                }}
                onResponderTerminate={() => {
                  pinchStartDist.current = null;
                  pinchingRef.current = false;
                  stableSinceRef.current = null;
                }}
              />
              <View pointerEvents="none" style={[styles.stencilDim, { top: 0, height: topOffset, left: 0, right: 0 }]} />
              <View
                pointerEvents="none"
                style={[
                  styles.stencilDim,
                  { top: topOffset, left: 0, width: focusLeft, height: boxH },
                ]}
              />
              <View
                pointerEvents="none"
                style={[
                  styles.stencilDim,
                  { top: topOffset, right: 0, width: focusLeft, height: boxH },
                ]}
              />
              <View
                pointerEvents="none"
                style={[
                  styles.stencilDim,
                  { top: topOffset + boxH, left: 0, right: 0, bottom: 0 },
                ]}
              />
              <View pointerEvents="none" style={styles.gridV1} />
              <View pointerEvents="none" style={styles.gridV2} />
              <View pointerEvents="none" style={styles.gridH1} />
              <View pointerEvents="none" style={styles.gridH2} />

              <View
                pointerEvents="none"
                style={[
                  styles.focusBox,
                  focusLock === 'focus' ? styles.focusBoxLocked : focusLock === 'hold' ? styles.focusBoxHold : null,
                  {
                    width: boxW,
                    height: boxH,
                    top: topOffset,
                    marginLeft: -boxW / 2,
                    left: '50%',
                  },
                ]}
              />

              <View style={[styles.topBar, { paddingTop: topOffset * 0.2 }]}>
                <TouchableOpacity onPress={onDismiss} style={styles.iconBtn} accessibilityLabel="Close camera">
                  <Ionicons name="close" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.phaseLabel}>
                  {phase === 'pump' ? 'Pump' : phase === 'receipt' ? 'Receipt' : 'Odometer'}
                </Text>
                <TouchableOpacity
                  onPress={() => setTorch((on) => !on)}
                  style={[styles.iconBtn, torch ? styles.torchOn : null]}
                  accessibilityLabel={torch ? 'Turn light off' : 'Turn light on'}
                >
                  <Ionicons name={torch ? 'flash' : 'flash-outline'} size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              <Text pointerEvents="none" style={[styles.instruction, { top: topOffset - 36 }]}>{instructionForPhase(phase)}</Text>

              {(hint || secondaryHint) ? (
                <View pointerEvents="none" style={[styles.hintBar, { top: topOffset + boxH + 16 }]}>
                  {hint ? <Text style={styles.hintPrimary}>{hint}</Text> : null}
                  {secondaryHint ? (
                    <Text style={styles.hintSecondary}>{secondaryHint}</Text>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.zoomCol}>
                <TouchableOpacity
                  style={styles.zoomBtn}
                  onPress={() => applyZoom(zoomRef.current + ZOOM_STEP)}
                  accessibilityLabel="Zoom in"
                >
                  <Ionicons name="add" size={26} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.zoomLabel}>{(1 + zoom * 3).toFixed(1)}x</Text>
                <TouchableOpacity
                  style={styles.zoomBtn}
                  onPress={() => applyZoom(zoomRef.current - ZOOM_STEP)}
                  accessibilityLabel="Zoom out"
                >
                  <Ionicons name="remove" size={26} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={styles.bottomBar}>
                <Text style={styles.autoCapHint}>
                  {cameraReady
                    ? 'Green frame means focused. Hold still, or tap once the numbers are sharp.'
                    : 'Starting camera…'}
                </Text>
                <TouchableOpacity
                  style={styles.shutter}
                  onPress={() => void takePicture(true)}
                  disabled={capturing || !cameraReady}
                  accessibilityLabel="Capture photo"
                >
                  {capturing ? <ActivityIndicator color="#111" /> : <View style={styles.shutterInner} />}
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
  pinchLayer: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
  zoomCol: {
    position: 'absolute',
    right: 16,
    bottom: 150,
    alignItems: 'center',
    gap: 8,
  },
  zoomBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  stencilDim: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  permBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#111',
  },
  permText: { color: '#fff', textAlign: 'center', fontSize: 16, marginBottom: 20 },
  permBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  permBtnText: { color: '#fff', fontWeight: '600' },
  closeGhost: { marginTop: 20 },
  closeGhostText: { color: '#9ca3af' },
  gridV1: {
    position: 'absolute',
    left: '33%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  gridV2: {
    position: 'absolute',
    left: '66%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  gridH1: {
    position: 'absolute',
    top: '33%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  gridH2: {
    position: 'absolute',
    top: '66%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  focusBox: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.92)',
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  focusBoxHold: {
    borderColor: '#fde047',
  },
  focusBoxLocked: {
    borderColor: '#4ade80',
  },
  torchOn: {
    backgroundColor: 'rgba(250,204,21,0.35)',
    borderRadius: 20,
  },
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  iconBtn: { padding: 8 },
  phaseLabel: { color: '#fff', fontSize: 17, fontWeight: '700' },
  instruction: {
    position: 'absolute',
    left: 16,
    right: 16,
    textAlign: 'center',
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  hintBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  hintPrimary: { color: '#fde047', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  hintSecondary: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4, textAlign: 'center' },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 36,
    alignItems: 'center',
  },
  autoCapHint: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginBottom: 14 },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#fff',
  },
});
