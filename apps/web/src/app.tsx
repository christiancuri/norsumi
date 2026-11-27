import { QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'motion/react';
import { RouterProvider } from 'react-router/dom';
import { Toaster } from 'src/components/ui/sonner';
import { TooltipProvider } from 'src/components/ui/tooltip';
import { queryClient } from 'src/lib/query-client';
import { router } from 'src/routes';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <TooltipProvider delayDuration={300}>
          <RouterProvider router={router} />
          <Toaster position="bottom-center" />
        </TooltipProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}
