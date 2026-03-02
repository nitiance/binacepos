import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import appIcon from "@/assets/binancexi-app-icon-square.svg";
import { BRAND } from "@/lib/brand";

type AppLaunchSplashProps = {
  open: boolean;
  onSkip: () => void;
};

export function AppLaunchSplash({ open, onSkip }: AppLaunchSplashProps) {
  const reducedMotion = useReducedMotion();
  const fadeDuration = reducedMotion ? 0 : 0.2;
  const cardDuration = reducedMotion ? 0 : 0.45;
  const iconDuration = reducedMotion ? 0 : 0.35;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: fadeDuration }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-background/96 backdrop-blur-sm"
          onClick={onSkip}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onSkip();
          }}
          aria-label="Skip launch animation"
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: cardDuration, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none flex flex-col items-center gap-3 text-center"
          >
            <motion.img
              src={appIcon}
              alt="BinanceXI"
              className="h-16 w-16 rounded-2xl shadow-[0_16px_40px_-20px_hsl(var(--primary)/0.65)]"
              initial={{ rotate: -8, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ duration: iconDuration }}
            />
            <div className="text-2xl font-extrabold tracking-tight text-foreground">
              {BRAND.shortName}
            </div>
            <div className="text-xs tracking-[0.16em] text-muted-foreground">
              {BRAND.splashTagline || "by naishe labs"}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
