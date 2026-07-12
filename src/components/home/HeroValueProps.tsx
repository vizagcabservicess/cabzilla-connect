import { motion, useReducedMotion } from 'framer-motion';
import { MapPin, Sparkles, UserCheck, BadgePercent } from 'lucide-react';

const VALUE_PROPS = [
  {
    icon: MapPin,
    title: 'Local & Outstation',
    description: 'Reliable rides near and far',
    iconBg: 'bg-blue-50',
    iconClass: 'text-[#0066FF]',
    accent: 'blue',
  },
  {
    icon: Sparkles,
    title: 'Clean & Safe Cabs',
    description: 'Hygienic and well maintained',
    iconBg: 'bg-slate-50',
    iconClass: 'text-slate-600',
    accent: 'emerald',
  },
  {
    icon: UserCheck,
    title: 'Professional Drivers',
    description: 'Trained, verified & courteous',
    iconBg: 'bg-slate-50',
    iconClass: 'text-slate-600',
    accent: 'amber',
  },
  {
    icon: BadgePercent,
    title: 'Best Price Guarantee',
    description: 'No hidden charges',
    iconBg: 'bg-slate-50',
    iconClass: 'text-slate-600',
    accent: 'rose',
  },
] as const;

const container = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.09, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.48, ease: [0.22, 1, 0.36, 1] },
  },
};

export function HeroValueProps() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="premium-value-props grid w-full grid-cols-2 gap-3 sm:gap-3.5 lg:grid-cols-4 lg:gap-4"
      initial={reduceMotion ? false : 'hidden'}
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={container}
    >
      {VALUE_PROPS.map(({ icon: Icon, title, description, iconBg, iconClass, accent }) => (
        <motion.div
          key={title}
          variants={item}
          whileHover={reduceMotion ? undefined : { y: -5 }}
          transition={{ type: 'spring', stiffness: 360, damping: 26 }}
          className={`premium-value-prop-card premium-value-prop-card--${accent}`}
        >
          <div className={`premium-value-prop-icon ${iconBg}`}>
            <Icon className={`h-[1.05rem] w-[1.05rem] ${iconClass}`} strokeWidth={2.25} aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="premium-value-prop-title">{title}</p>
            <p className="premium-value-prop-desc">{description}</p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
