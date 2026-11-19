import { lazy } from 'react';
import { createHashRouter, Navigate, RouterProvider } from 'react-router-dom';
import { StoreProvider } from '@/lib/store';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/toaster';
import { AppShell } from '@/components/layout/app-shell';
import { withSuspense } from '@/components/route-fallback';
import { DashboardPage } from '@/pages/dashboard';

const PostsPage = lazy(() => import('@/pages/posts').then((m) => ({ default: m.PostsPage })));
const PostDetailPage = lazy(() => import('@/pages/post-detail').then((m) => ({ default: m.PostDetailPage })));
const ClientsPage = lazy(() => import('@/pages/clients').then((m) => ({ default: m.ClientsPage })));
const ClientDetailPage = lazy(() => import('@/pages/clients').then((m) => ({ default: m.ClientDetailPage })));
const CalendarPage = lazy(() => import('@/pages/calendar').then((m) => ({ default: m.CalendarPage })));
const SettingsPage = lazy(() => import('@/pages/settings').then((m) => ({ default: m.SettingsPage })));
const ReviewPortalPage = lazy(() => import('@/pages/review-portal').then((m) => ({ default: m.ReviewPortalPage })));
const LoginPage = lazy(() => import('@/pages/auth').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('@/pages/auth').then((m) => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('@/pages/auth').then((m) => ({ default: m.ForgotPasswordPage })));
const NotFoundPage = lazy(() => import('@/pages/not-found').then((m) => ({ default: m.NotFoundPage })));

const router = createHashRouter([
  { path: '/', element: <Navigate to="/app" replace /> },
  { path: '/login', element: withSuspense(<LoginPage />) },
  { path: '/register', element: withSuspense(<RegisterPage />) },
  { path: '/forgot-password', element: withSuspense(<ForgotPasswordPage />) },
  {
    path: '/app',
    element: (
      <AppShell>
        <DashboardPage />
      </AppShell>
    ),
  },
  {
    path: '/app/posts',
    element: (
      <AppShell>
        {withSuspense(<PostsPage />)}
      </AppShell>
    ),
  },
  {
    path: '/app/posts/:id',
    element: (
      <AppShell>
        {withSuspense(<PostDetailPage />)}
      </AppShell>
    ),
  },
  {
    path: '/app/clients',
    element: (
      <AppShell>
        {withSuspense(<ClientsPage />)}
      </AppShell>
    ),
  },
  {
    path: '/app/clients/:id',
    element: (
      <AppShell>
        {withSuspense(<ClientDetailPage />)}
      </AppShell>
    ),
  },
  {
    path: '/app/calendar',
    element: (
      <AppShell>
        {withSuspense(<CalendarPage />)}
      </AppShell>
    ),
  },
  {
    path: '/app/settings',
    element: (
      <AppShell>
        {withSuspense(<SettingsPage />)}
      </AppShell>
    ),
  },
  { path: '/review/:token', element: withSuspense(<ReviewPortalPage />) },
  { path: '/review/:token/post/:postId', element: withSuspense(<ReviewPortalPage />) },
  { path: '*', element: withSuspense(<NotFoundPage />) },
]);

export function App() {
  return (
    <StoreProvider>
      <TooltipProvider delayDuration={200}>
        <RouterProvider router={router} />
        <Toaster />
      </TooltipProvider>
    </StoreProvider>
  );
}
