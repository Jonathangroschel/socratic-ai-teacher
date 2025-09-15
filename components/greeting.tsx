import { motion } from 'framer-motion';

export const Greeting = ({ isReturningVisitor }: { isReturningVisitor?: boolean }) => {
  return (
    <div
      key="overview"
      className="max-w-3xl mx-auto mt-4 md:mt-16 px-4 md:px-8 size-full flex flex-col justify-center"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.5 }}
        className="text-xl md:text-2xl font-semibold"
      >
        {isReturningVisitor ? 'Welcome back to Polymatic!' : 'Welcome to Polymatic!'}
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.6 }}
        className="text-xl md:text-2xl text-zinc-500"
      >
        What would you like to explore today?
      </motion.div>
    </div>
  );
};
