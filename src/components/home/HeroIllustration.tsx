import { motion } from 'framer-motion';

const HERO_SCENE_SRC = '/uploads/hero-vizag-scene.png';

export function HeroIllustration() {
  return (
    <motion.div
      className="hero-scene relative mx-auto w-full max-w-[520px]"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className="hero-scene-frame relative overflow-hidden rounded-[24px]"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="hero-scene-shimmer pointer-events-none absolute inset-0 z-10" aria-hidden />
        <img
          src={HERO_SCENE_SRC}
          alt="Toyota Innova Crysta on Beach Road with RK Beach, Dolphin's Nose and Vizag coastline at golden hour"
          className="hero-scene-image block h-auto w-full object-cover object-center"
          width={1160}
          height={725}
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
        <div
          className="pointer-events-none absolute inset-0 rounded-[24px] ring-1 ring-inset ring-black/[0.06]"
          aria-hidden
        />
      </motion.div>
    </motion.div>
  );
}
