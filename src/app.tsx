import { lazy } from 'react';
import { createHashRouter, Navigate, RouterProvider } from 'react-router-dom';
import { ConvexProvider } from 'convex/react';
import { convex } from '@/lib/convex';
import { StoreProvider } from '@/lib/store';
import { RequireAuth } from '@/components/require-auth';
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
      <RequireAuth>
        <AppShell>
          <DashboardPage />
        </AppShell>
      </RequireAuth>
    ),
  },
  {
    path: '/app/posts',
    element: (
      <RequireAuth>
        <AppShell>
          {withSuspense(<PostsPage />)}
        </AppShell>
      </RequireAuth>
    ),
  },
  {
    path: '/app/posts/:id',
    element: (
      <RequireAuth>
        <AppShell>
          {withSuspense(<PostDetailPage />)}
        </AppShell>
      </RequireAuth>
    ),
  },
  {
    path: '/app/clients',
    element: (
      <RequireAuth>
        <AppShell>
          {withSuspense(<ClientsPage />)}
        </AppShell>
      </RequireAuth>
    ),
  },
  {
    path: '/app/clients/:id',
    element: (
      <RequireAuth>
        <AppShell>
          {withSuspense(<ClientDetailPage />)}
        </AppShell>
      </RequireAuth>
    ),
  },
  {
    path: '/app/calendar',
    element: (
      <RequireAuth>
        <AppShell>
          {withSuspense(<CalendarPage />)}
        </AppShell>
      </RequireAuth>
    ),
  },
  {
    path: '/app/settings',
    element: (
      <RequireAuth>
        <AppShell>
          {withSuspense(<SettingsPage />)}
        </AppShell>
      </RequireAuth>
    ),
  },
  { path: '/review/:token', element: withSuspense(<ReviewPortalPage />) },
  { path: '/review/:token/post/:postId', element: withSuspense(<ReviewPortalPage />) },
  { path: '*', element: withSuspense(<NotFoundPage />) },
]);

export function App() {
  return (
    <ConvexProvider client={convex}>
      <StoreProvider>
        <TooltipProvider delayDuration={200}>
          <RouterProvider router={router} />
          <Toaster />
        </TooltipProvider>
      </StoreProvider>
    </ConvexProvider>
  );
}
