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
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Accelerometer } from 'expo-sensors';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import type { FuelCapturePhase } from '../services/fuelGeminiVisionUnified';
import { cropPumpStencilForGemini, type StencilLayout } from '../utils/fuelPumpStencilCrop';

const STABLE_MS = 1600;
const ACCEL_SAMPLE_MS = 100;
const MAX_ACCEL_DEV = 0.32;
const TILT_X = 0.4;
const TILT_Y = 0.42;

type Props = {
  visible: boolean;
  phase: FuelCapturePhase;
  onDismiss: () => void;
  onCaptured: (localUri: string) => void;
};

function instructionForPhase(phase: FuelCapturePhase): string {
  switch (phase) {
    case 'pump':
      return 'Fill the box with the LCD (Amount → Volume → Rate). Move closer to reduce glare.';
    case 'receipt':
      return 'Align the receipt total inside the box';
    case 'odometer':
      return 'Align the odometer inside the box';
    default:
      return 'Align the subject inside the box';
  }
}

/** Must match the focus box on screen so crop ↔ Gemini sees the same framing as the overlay. */
function stencilLayoutForPhase(phase: FuelCapturePhase, screenW: number, screenH: number): StencilLayout {
  const boxW = phase === 'pump' ? Math.min(screenW * 0.92, 380) : Math.min(screenW * 0.88, 340);
  const boxH =
    phase === 'receipt' ? boxW * 1.15 : phase === 'odometer' ? boxW * 0.68 : boxW * 0.78;
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
  const capturingRef = useRef(false);
  const stableSinceRef = useRef<number | null>(null);
  const magBuf = useRef<number[]>([]);

  const takePicture = useCallback(async () => {
    if (!camRef.current || capturingRef.current) return;
    capturingRef.current = true;
    setCapturing(true);
    try {
      const photo = await camRef.current.takePictureAsync({
        quality: 0.92,
        skipProcessing: Platform.OS === 'ios',
      });
      if (!photo?.uri) return;

      let outUri = photo.uri;
      if ((phase === 'pump' || phase === 'odometer') && photo.width > 0 && photo.height > 0) {
        outUri = await cropPumpStencilForGemini(
          photo.uri,
          photo.width,
          photo.height,
          stencilLayoutForPhase(phase, w, h),
        );
      }
      onCaptured(outUri);
    } finally {
      capturingRef.current = false;
      setCapturing(false);
    }
  }, [onCaptured, phase, w, h]);

  useEffect(() => {
    if (!visible) {
      stableSinceRef.current = null;
      magBuf.current = [];
      setHint('');
      setSecondaryHint('');
      return;
    }

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
    return () => clearInterval(id);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    Accelerometer.setUpdateInterval(ACCEL_SAMPLE_MS);
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const tilted = Math.abs(x) > TILT_X || Math.abs(y) > TILT_Y;
      if (tilted) {
        setHint('Hold phone straight');
        stableSinceRef.current = null;
        magBuf.current = [];
        return;
      }
      setHint('');
      const mag = Math.sqrt(x * x + y * y + z * z);
      const buf = magBuf.current;
      buf.push(mag);
      if (buf.length > 18) buf.shift();
      if (buf.length < 10) {
        stableSinceRef.current = null;
        return;
      }
      const mean = buf.reduce((a, b) => a + b, 0) / buf.length;
      const dev = Math.sqrt(buf.reduce((s, m) => s + (m - mean) ** 2, 0) / buf.length);
      if (dev > MAX_ACCEL_DEV) {
        stableSinceRef.current = null;
        setHint((prev) => (prev ? prev : 'Hold steady for auto-capture'));
        return;
      }
      const now = Date.now();
      if (stableSinceRef.current == null) stableSinceRef.current = now;
      else if (now - stableSinceRef.current >= STABLE_MS) {
        stableSinceRef.current = now;
        void takePicture();
      }
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
            <CameraView ref={camRef} style={StyleSheet.absoluteFill} facing="back" mode="picture" />
            <View style={styles.overlay} pointerEvents="box-none">
              <View style={[styles.stencilDim, { top: 0, height: topOffset, left: 0, right: 0 }]} />
              <View
                style={[
                  styles.stencilDim,
                  { top: topOffset, left: 0, width: focusLeft, height: boxH },
                ]}
              />
              <View
                style={[
                  styles.stencilDim,
                  { top: topOffset, right: 0, width: focusLeft, height: boxH },
                ]}
              />
              <View
                style={[
                  styles.stencilDim,
                  { top: topOffset + boxH, left: 0, right: 0, bottom: 0 },
                ]}
              />
              <View style={styles.gridV1} />
              <View style={styles.gridV2} />
              <View style={styles.gridH1} />
              <View style={styles.gridH2} />

              <View
                style={[
                  styles.focusBox,
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
                <View style={{ width: 40 }} />
              </View>

              <Text style={[styles.instruction, { top: topOffset - 36 }]}>{instructionForPhase(phase)}</Text>

              {(hint || secondaryHint) ? (
                <View style={[styles.hintBar, { top: topOffset + boxH + 16 }]}>
                  {hint ? <Text style={styles.hintPrimary}>{hint}</Text> : null}
                  {secondaryHint ? (
                    <Text style={styles.hintSecondary}>{secondaryHint}</Text>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.bottomBar}>
                <Text style={styles.autoCapHint}>Still for ~1.5s to auto-capture, or tap below</Text>
                <TouchableOpacity
                  style={styles.shutter}
                  onPress={() => void takePicture()}
                  disabled={capturing}
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
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.92)',
    borderRadius: 10,
    backgroundColor: 'transparent',
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
