import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}

export function AnimatedCounter({
  value,
  suffix = '',
  decimals = 0,
  duration = 1.8,
  className,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;

    let frame = 0;
    const totalFrames = Math.round(duration * 60);
    const increment = value / totalFrames;

    const tick = () => {
      frame += 1;
      const next = Math.min(value, increment * frame);
      setDisplay(next);
      if (frame < totalFrames) {
        requestAnimationFrame(tick);
      } else {
        setDisplay(value);
      }
    };

    requestAnimationFrame(tick);
  }, [inView, value, duration]);

  const formatted =
    decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString('en-IN');

  return (
    <motion.span ref={ref} className={className}>
      {formatted}
      {suffix}
    </motion.span>
  );
}
