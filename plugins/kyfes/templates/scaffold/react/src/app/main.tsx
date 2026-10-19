import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { env } from '@/shared/config';
import { initI18n } from '@/shared/i18n';
import { App } from './App';
import './styles.css';

async function enableMocking(): Promise<void> {
  // `import.meta.env.DEV` is a compile-time constant: in production builds the whole branch,
  // MSW included, is removed from the bundle. The flag itself comes from validated env.
  if (!import.meta.env.DEV || !env.API_MOCKS) return;
  const { startMockWorker } = await import('@/mocks/browser');
  await startMockWorker();
}

async function bootstrap(): Promise<void> {
  await enableMocking();
  await initI18n();
  const root = document.getElementById('root');
  if (!root) throw new Error('#root not found');
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
