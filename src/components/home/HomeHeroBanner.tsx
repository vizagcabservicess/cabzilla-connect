import { useEffect, useRef } from 'react';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion';
import { HeroMeshBackground } from './HeroMeshBackground';

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: 0.05 + i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
};

export function HomeHeroBanner() {
  const bannerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const springX = useSpring(rawX, { stiffness: 55, damping: 24, mass: 0.55 });
  const springY = useSpring(rawY, { stiffness: 55, damping: 24, mass: 0.55 });

  const meshX = useTransform(springX, [-0.5, 0.5], reduceMotion ? [0, 0] : [-18, 18]);
  const meshY = useTransform(springY, [-0.5, 0.5], reduceMotion ? [0, 0] : [-14, 14]);
  const auroraX = useTransform(springX, [-0.5, 0.5], reduceMotion ? [0, 0] : [22, -22]);
  const auroraY = useTransform(springY, [-0.5, 0.5], reduceMotion ? [0, 0] : [12, -12]);
  const orbX = useTransform(springX, [-0.5, 0.5], reduceMotion ? [0, 0] : [-28, 28]);
  const orbY = useTransform(springY, [-0.5, 0.5], reduceMotion ? [0, 0] : [-16, 16]);
  const spotX = useTransform(springX, [-0.5, 0.5], ['16%', '84%']);
  const spotY = useTransform(springY, [-0.5, 0.5], ['22%', '78%']);
  const spotlight = useMotionTemplate`radial-gradient(760px circle at ${spotX} ${spotY}, rgba(255, 255, 255, 0.55), rgba(0, 102, 255, 0.12) 36%, transparent 70%)`;

  useEffect(() => {
    if (reduceMotion) return;

    const el = bannerRef.current;
    if (!el) return;

    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      rawX.set((event.clientX - rect.left) / rect.width - 0.5);
      rawY.set((event.clientY - rect.top) / rect.height - 0.5);
    };

    const onLeave = () => {
      rawX.set(0);
      rawY.set(0);
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [rawX, rawY, reduceMotion]);

  return (
    <div ref={bannerRef} className="premium-hero-banner">
      <div className="premium-hero-color-field absolute inset-0" aria-hidden />
      <div className="premium-hero-noise absolute inset-0" aria-hidden />
      <div className="premium-hero-grid absolute inset-0" aria-hidden />

      <motion.div
        className="premium-hero-orb premium-hero-orb--primary pointer-events-none absolute z-[1]"
        style={{ x: orbX, y: orbY }}
        aria-hidden
      />
      <div className="premium-hero-orb premium-hero-orb--secondary pointer-events-none absolute z-[1]" aria-hidden />

      <motion.div
        className="premium-hero-aurora pointer-events-none absolute inset-0 z-[1]"
        style={{ x: auroraX, y: auroraY }}
        aria-hidden
      />

      <motion.div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{ x: meshX, y: meshY }}
        aria-hidden
      >
        <HeroMeshBackground />
      </motion.div>

      {!reduceMotion && (
        <motion.div
          className="premium-hero-spotlight pointer-events-none absolute inset-0"
          style={{ background: spotlight }}
          aria-hidden
        />
      )}

      <div className="premium-hero-color-overlay absolute inset-0" aria-hidden />

      <div className="premium-hero-inner relative z-10 home-page-container">
        <div className="premium-hero-copy">
          <motion.div
            custom={0}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="premium-hero-badge mb-3 inline-flex w-fit items-center gap-2 lg:mb-3.5"
          >
            <span className="premium-hero-badge-dot" aria-hidden />
            <span>Trusted by 20,000+ Happy Travellers</span>
          </motion.div>

          <motion.h1
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="premium-hero-heading"
          >
            Your Journey,{' '}
            <span className="premium-hero-accent">Our Priority.</span>
          </motion.h1>

          <motion.p
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="premium-hero-subtitle"
          >
            Safe, reliable and affordable taxi services across Visakhapatnam and Andhra Pradesh.
          </motion.p>
        </div>
      </div>

      <div className="premium-hero-overlap-spacer" aria-hidden />
    </div>
  );
}
