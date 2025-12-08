import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  const loadUser = useAuthStore((state) => state.loadUser);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return <Component {...pageProps} />;
}

