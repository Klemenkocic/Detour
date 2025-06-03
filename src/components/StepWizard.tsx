// src/components/StepWizard.tsx
import { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface Props {
  step : number;
  children: ReactNode[];
}

export default function StepWizard({ step, children }: Props) {
  return (
    <div className="relative overflow-hidden">
      <AnimatePresence initial={false}>
        {children.map((child, i) =>
          i === step && (
            <motion.div
              key={i}
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0,  opacity: 1 }}
              exit   ={{ x:-40, opacity: 0 }}
              transition={{ duration: .25 }}
              className="w-full"
            >
              {child}
            </motion.div>
          )
        )}
      </AnimatePresence>
    </div>
  );
}