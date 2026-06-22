import { createBrowserRouter, Navigate } from 'react-router-dom';

import App from '../App';
import { AuthLayout } from '../components/layout/AuthLayout';
import { AppShell } from '../components/layout/AppShell';
import { DisplayNameRoute } from '../components/layout/DisplayNameRoute';
import { PublicOnlyRoute } from '../components/layout/PublicOnlyRoute';
import { DisplayNamePage } from '../pages/auth/DisplayNamePage';
import { LoginPage } from '../pages/auth/LoginPage';
import { ProfilePage } from '../pages/auth/ProfilePage';
import { AccountSettingsPage } from '../pages/auth/AccountSettingsPage';
import { GroupDetailPage } from '../pages/groups/GroupDetailPage';
import { GroupMembersPage } from '../pages/groups/GroupMembersPage';
import { GroupStatsPage } from '../pages/stats/GroupStatsPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { GroupsPage } from '../pages/groups/GroupsPage';
import { NotificationsPage } from '../pages/notifications/NotificationsPage';
import { ExpensesHubPage } from '../pages/expenses/ExpensesHubPage';
import { GroupFinancePage } from '../pages/expenses/GroupFinancePage';
import { FundHubPage } from '../pages/fund/FundHubPage';
import {
  GroupFundManagePage,
  GroupFundOverviewPage,
  GroupFundSePayGuidePage,
} from '../pages/fund/GroupFundPage';
import { InvitePage } from '../pages/invite/InvitePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ChatPage } from '../pages/chat/ChatPage';
import { routerFuture } from './future';

export const appRoutes = [
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <Navigate to="/groups" replace />,
      },
      {
        element: <PublicOnlyRoute />,
        children: [
          {
            element: <AuthLayout />,
            children: [
              {
                path: 'login',
                element: <LoginPage />,
              },
              {
                path: 'register',
                element: <RegisterPage />,
              },
            ],
          },
        ],
      },
      {
        element: <DisplayNameRoute />,
        children: [
          {
            element: <AuthLayout />,
            children: [
              {
                path: 'onboarding/display-name',
                element: <DisplayNamePage />,
              },
            ],
          },
        ],
      },
      {
        path: 'invite/:token',
        element: <InvitePage />,
      },
      {
        element: <AppShell />,
        children: [
          {
            path: 'groups',
            element: <GroupsPage />,
          },
          {
            path: 'groups/:id',
            element: <GroupDetailPage />,
          },
          {
            path: 'groups/:id/members',
            element: <GroupMembersPage />,
          },
          {
            path: 'groups/:id/stats',
            element: <GroupStatsPage />,
          },
          {
            path: 'expenses',
            element: <ExpensesHubPage />,
          },
          {
            path: 'groups/:id/expenses',
            element: <GroupFinancePage />,
          },
          {
            path: 'groups/:id/fund',
            element: <GroupFundOverviewPage />,
          },
          {
            path: 'groups/:id/fund/manage',
            element: <GroupFundManagePage />,
          },
          {
            path: 'groups/:id/fund/sepay-guide',
            element: <GroupFundSePayGuidePage />,
          },
          {
            path: 'fund',
            element: <FundHubPage />,
          },
          {
            path: 'chat',
            element: <ChatPage />,
          },
          {
            path: 'notifications',
            element: <NotificationsPage />,
          },
          {
            path: 'profile',
            element: <ProfilePage />,
          },
          {
            path: 'account-settings',
            element: <AccountSettingsPage />,
          },
        ],
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
];

export const router = createBrowserRouter(appRoutes, {
  future: routerFuture,
});
