/**
 * ToastProvider - Global toast notifications provider
 */

import { Toaster } from 'react-hot-toast';

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          fontSize: '14px',
        },
      }}
    />
  );
}
