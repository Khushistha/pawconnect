import { useCallback } from 'react';
import { toast as sonnerToast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';

/** Centered confirmation (Sonner custom) before logging out. */
export function useLogoutConfirmToast(logout: () => void) {
  return useCallback(() => {
    sonnerToast.custom(
      (id) => (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="logout-confirm-title"
          aria-describedby="logout-confirm-desc"
          onClick={() => sonnerToast.dismiss(id)}
        >
          <div
            className="w-full max-w-sm rounded-lg border bg-card p-6 text-card-foreground shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="logout-confirm-title" className="text-lg font-semibold">
              Log out?
            </h2>
            <p id="logout-confirm-desc" className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to log out?
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => sonnerToast.dismiss(id)}
              >
                No
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  sonnerToast.dismiss(id);
                  logout();
                }}
              >
                Yes
              </Button>
            </div>
          </div>
        </div>
      ),
      { duration: Infinity }
    );
  }, [logout]);
}
