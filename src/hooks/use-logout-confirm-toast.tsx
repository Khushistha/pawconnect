import { useCallback } from 'react';
import * as ToastPrimitives from '@radix-ui/react-toast';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Shows a toast asking to confirm logout (Yes / No). */
export function useLogoutConfirmToast(logout: () => void) {
  const { toast } = useToast();

  return useCallback(() => {
    toast({
      title: 'Log out?',
      description: 'Are you sure you want to log out?',
      action: (
        <div className="flex flex-wrap gap-2 shrink-0 items-center">
          <ToastAction altText="Yes, log out" onClick={() => logout()}>
            Yes
          </ToastAction>
          <ToastPrimitives.Close asChild>
            <button
              type="button"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'shrink-0'
              )}
            >
              No
            </button>
          </ToastPrimitives.Close>
        </div>
      ),
    });
  }, [toast, logout]);
}
