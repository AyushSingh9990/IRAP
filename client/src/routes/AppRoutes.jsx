import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Loader from '../components/common/Loader/Loader.jsx';
import PublicLayout from '../components/layout/PublicLayout/PublicLayout.jsx';
import { legalPages } from '../config/publicContent.js';
import PermissionRoute from './PermissionRoute.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import PublicOnlyRoute from './PublicOnlyRoute.jsx';
import PersonalWorkspaceRoute from './PersonalWorkspaceRoute.jsx';

const HomePage = lazy(() => import('../pages/public/HomePage.jsx'));
const AboutPage = lazy(() => import('../pages/public/AboutPage.jsx'));
const ContactPage = lazy(() => import('../pages/public/ContactPage.jsx'));
const MembershipPage = lazy(() => import('../pages/public/MembershipPage.jsx'));
const TrainingProvidersPage = lazy(() => import('../pages/public/TrainingProvidersPage.jsx'));
const OrganizationsPage = lazy(() => import('../pages/public/OrganizationsPage.jsx'));
const ApprovedModalitiesPage = lazy(() => import('../pages/public/ApprovedModalitiesPage.jsx'));
const DirectoryLandingPage = lazy(() => import('../pages/public/DirectoryLandingPage.jsx'));
const PublicProfileSettingsPage = lazy(() => import('../pages/dashboard/PublicProfileSettingsPage.jsx'));
const PublicProfilePage = lazy(() => import('../pages/public/PublicProfilePage.jsx'));
const DirectoryPage = lazy(() => import('../pages/public/DirectoryPage.jsx'));
const CertificateVerificationPage = lazy(() => import('../pages/public/CertificateVerificationPage.jsx'));
const CourseCertificateVerificationPage = lazy(() => import('../pages/public/CourseCertificateVerificationPage.jsx'));
const ArticlesPage = lazy(() => import('../pages/public/ArticlesPage.jsx'));
const ArticleDetailPage = lazy(() => import('../pages/public/ArticleDetailPage.jsx'));
const ArticleAuthorPage = lazy(() => import('../pages/public/ArticleAuthorPage.jsx'));
const ProviderCoursesPage = lazy(() => import('../pages/course/ProviderCoursesPage.jsx'));
const ArticlesDashboardPage = lazy(() => import('../pages/article/ArticlesDashboardPage.jsx'));
const ArticleEditorPage = lazy(() => import('../pages/article/ArticleEditorPage.jsx'));
const CourseEditorPage = lazy(() => import('../pages/course/CourseEditorPage.jsx'));
const AdminCoursesPage = lazy(() => import('../pages/admin/AdminCoursesPage.jsx'));
const AdminCourseReviewPage = lazy(() => import('../pages/admin/AdminCourseReviewPage.jsx'));
const AdminArticlesPage = lazy(() => import('../pages/admin/AdminArticlesPage.jsx'));
const AdminArticleReviewPage = lazy(() => import('../pages/admin/AdminArticleReviewPage.jsx'));
const AdminArticleTaxonomyPage = lazy(() => import('../pages/admin/AdminArticleTaxonomyPage.jsx'));
const FaqPage = lazy(() => import('../pages/public/FaqPage.jsx'));
const LegalPage = lazy(() => import('../pages/public/LegalPage.jsx'));
const LoginPage = lazy(() => import('../pages/auth/LoginPage.jsx'));
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage.jsx'));
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage.jsx'));
const ResendVerificationPage = lazy(() => import('../pages/auth/ResendVerificationPage.jsx'));
const ResetPasswordPage = lazy(() => import('../pages/auth/ResetPasswordPage.jsx'));
const VerifyEmailPage = lazy(() => import('../pages/auth/VerifyEmailPage.jsx'));
const VerifyEmailChangePage = lazy(() => import('../pages/auth/VerifyEmailChangePage.jsx'));
const DashboardLayout = lazy(() => import('../components/layout/DashboardLayout/DashboardLayout.jsx'));
const AdminLayout = lazy(() => import('../components/layout/AdminLayout/AdminLayout.jsx'));
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage.jsx'));
const RoleDashboardPage = lazy(() => import('../pages/dashboard/RoleDashboardPage.jsx'));
const NotificationsPage = lazy(() => import('../pages/dashboard/NotificationsPage.jsx'));
const AccountSettingsPage = lazy(() => import('../pages/dashboard/AccountSettingsPage.jsx'));
const ApplicationsPage = lazy(() => import('../pages/application/ApplicationsPage.jsx'));
const ApplicationWizardPage = lazy(() => import('../pages/application/ApplicationWizardPage.jsx'));
const DocumentsPage = lazy(() => import('../pages/document/DocumentsPage.jsx'));
const AdminDocumentsPage = lazy(() => import('../pages/admin/AdminDocumentsPage.jsx'));
const PaymentsPage = lazy(() => import('../pages/payment/PaymentsPage.jsx'));
const MembershipsPage = lazy(() => import('../pages/membership/MembershipsPage.jsx'));
const AdminPaymentsPage = lazy(() => import('../pages/admin/AdminPaymentsPage.jsx'));
const AdminBillingPage = lazy(() => import('../pages/admin/AdminBillingPage.jsx'));
const AdminReviewDashboardPage = lazy(() => import('../pages/admin/AdminReviewDashboardPage.jsx'));
const AdminApplicationQueuePage = lazy(() => import('../pages/admin/AdminApplicationQueuePage.jsx'));
const AdminReviewWorkspacePage = lazy(() => import('../pages/admin/AdminReviewWorkspacePage.jsx'));
const AdminAuditPage = lazy(() => import('../pages/admin/AdminAuditPage.jsx'));
const AdminMembershipsPage = lazy(() => import('../pages/admin/AdminMembershipsPage.jsx'));
const NotFoundPage = lazy(() => import('../pages/errors/NotFoundPage.jsx'));
const AdminSiteSettingsPage = lazy(() => import('../pages/admin/AdminSiteSettingsPage.jsx'));
const AdminContentPagesPage = lazy(() => import('../pages/admin/AdminContentPagesPage.jsx'));
const AdminTemplatesPage = lazy(() => import('../pages/admin/AdminTemplatesPage.jsx'));
const AdminSupportPage = lazy(() => import('../pages/admin/AdminSupportPage.jsx'));
const AdminUsersPage = lazy(() => import('../pages/admin/AdminUsersPage.jsx'));
const AdminRolesPage = lazy(() => import('../pages/admin/AdminRolesPage.jsx'));
const AdminSystemHealthPage = lazy(() => import('../pages/admin/AdminSystemHealthPage.jsx'));
const ComplaintPage = lazy(() => import('../pages/public/ComplaintPage.jsx'));

function RouteFallback() {
  return (
    <div className="route-loader" aria-busy="true">
      <Loader label="Loading page" size="large" />
    </div>
  );
}

function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="membership" element={<MembershipPage />} />
          <Route path="membership/apply" element={<Navigate to="/register?journey=member" replace />} />
          <Route path="training-providers" element={<TrainingProvidersPage />} />
          <Route path="training-providers/apply" element={<Navigate to="/register?journey=training_provider" replace />} />
          <Route path="organizations" element={<OrganizationsPage />} />
          <Route path="organizations/apply" element={<Navigate to="/register?journey=organization" replace />} />
          <Route path="approved-modalities" element={<ApprovedModalitiesPage />} />
          <Route path="directory" element={<DirectoryLandingPage />} />
          <Route path="directory/members" element={<DirectoryPage directoryType="members" />} />
          <Route path="directory/training-providers" element={<DirectoryPage directoryType="training-providers" />} />
          <Route path="directory/organizations" element={<DirectoryPage directoryType="organizations" />} />
          <Route path="directory/courses" element={<DirectoryPage directoryType="courses" />} />
          <Route path="directory/:directoryType/:slug" element={<PublicProfilePage />} />
          <Route path="verify-certificate" element={<CertificateVerificationPage />} />
          <Route path="verify/certificate/:verificationCode" element={<CertificateVerificationPage />} />
          <Route path="verify-course-certificate" element={<CourseCertificateVerificationPage />} />
          <Route path="verify/course/:verificationCode" element={<CourseCertificateVerificationPage />} />
          <Route path="articles" element={<ArticlesPage />} />
          <Route path="articles/author/:authorSlug" element={<ArticleAuthorPage />} />
          <Route path="articles/:slug" element={<ArticleDetailPage />} />
          <Route path="faq" element={<FaqPage />} />
          <Route path="code-of-ethics" element={<LegalPage content={legalPages.codeOfEthics} />} />
          <Route path="complaints" element={<ComplaintPage />} />
          <Route path="privacy-policy" element={<LegalPage content={legalPages.privacy} />} />
          <Route path="cookie-policy" element={<LegalPage content={legalPages.cookies} />} />
          <Route path="terms-and-conditions" element={<LegalPage content={legalPages.terms} />} />
          <Route path="accessibility" element={<LegalPage content={legalPages.accessibility} />} />
          <Route path="legal-disclaimer" element={<LegalPage content={legalPages.disclaimer} />} />

          <Route element={<PublicOnlyRoute />}>
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="resend-verification" element={<ResendVerificationPage />} />
            <Route path="reset-password/:token" element={<ResetPasswordPage />} />
          </Route>

          <Route path="verify-email/:token" element={<VerifyEmailPage />} />
          <Route path="verify-email-change/:token" element={<VerifyEmailChangePage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="dashboard" element={<DashboardLayout />}>
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="account" element={<AccountSettingsPage />} />

              <Route element={<PersonalWorkspaceRoute />}>
                <Route index element={<DashboardPage />} />
                <Route path="member" element={<RoleDashboardPage type="member" />} />
                <Route path="training-provider" element={<RoleDashboardPage type="training_provider" />} />
                <Route path="organization" element={<RoleDashboardPage type="organization" />} />
                <Route path="applications" element={<ApplicationsPage />} />
                <Route path="applications/:applicationId" element={<ApplicationWizardPage />} />
                <Route path="documents" element={<DocumentsPage />} />
                <Route element={<PermissionRoute permissions={['payment:read:self']} />}>
                  <Route path="payments" element={<PaymentsPage />} />
                </Route>
                <Route element={<PermissionRoute permissions={['membership:read:self']} />}>
                  <Route path="memberships" element={<MembershipsPage />} />
                  <Route path="public-profile" element={<PublicProfileSettingsPage />} />
                </Route>
                <Route element={<PermissionRoute permissions={['course:read:self']} />}>
                  <Route path="courses" element={<ProviderCoursesPage />} />
                  <Route path="courses/:courseId" element={<CourseEditorPage />} />
                </Route>
                <Route element={<PermissionRoute permissions={['article:read:self']} />}>
                  <Route path="articles" element={<ArticlesDashboardPage />} />
                  <Route path="articles/:articleId" element={<ArticleEditorPage />} />
                </Route>
              </Route>
            </Route>

          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="admin" element={<AdminLayout />}>
            <Route element={<PermissionRoute permissions={['application:review']} />}>
              <Route index element={<AdminReviewDashboardPage />} />
              <Route path="applications" element={<AdminApplicationQueuePage />} />
              <Route path="applications/:applicationId" element={<AdminReviewWorkspacePage />} />
            </Route>
            <Route element={<PermissionRoute permissions={['document:review']} />}>
              <Route path="documents" element={<AdminDocumentsPage />} />
            </Route>
            <Route element={<PermissionRoute permissions={['payment:manage']} />}>
              <Route path="payments" element={<AdminPaymentsPage />} />
              <Route path="billing" element={<AdminBillingPage />} />
            </Route>
            <Route element={<PermissionRoute permissions={['membership:manage']} />}>
              <Route path="memberships" element={<AdminMembershipsPage />} />
            </Route>
            <Route element={<PermissionRoute permissions={['course:review']} />}>
              <Route path="courses" element={<AdminCoursesPage />} />
              <Route path="courses/:courseId" element={<AdminCourseReviewPage />} />
            </Route>
            <Route element={<PermissionRoute permissions={['article:moderate']} />}>
              <Route path="articles" element={<AdminArticlesPage />} />
              <Route path="articles/:articleId" element={<AdminArticleReviewPage />} />
            </Route>
            <Route element={<PermissionRoute permissions={['article:taxonomy:manage']} />}>
              <Route path="article-taxonomy" element={<AdminArticleTaxonomyPage />} />
            </Route>
            <Route element={<PermissionRoute permissions={['audit:read']} />}>
              <Route path="audit" element={<AdminAuditPage />} />
            </Route>
            <Route element={<PermissionRoute permissions={['site:settings:manage']} />}>
              <Route path="site-settings" element={<AdminSiteSettingsPage />} />
            </Route>
            <Route element={<PermissionRoute permissions={['content:manage']} />}>
              <Route path="content-pages" element={<AdminContentPagesPage />} />
            </Route>
            <Route element={<PermissionRoute permissions={['template:manage']} />}>
              <Route path="templates" element={<AdminTemplatesPage />} />
            </Route>
            <Route element={<PermissionRoute permissions={['support:manage']} />}>
              <Route path="support" element={<AdminSupportPage />} />
            </Route>
            <Route element={<PermissionRoute permissions={['user:manage']} />}>
              <Route path="users" element={<AdminUsersPage />} />
            </Route>
            <Route element={<PermissionRoute permissions={['role:manage']} />}>
              <Route path="roles" element={<AdminRolesPage />} />
            </Route>
            <Route element={<PermissionRoute permissions={['system:manage']} />}>
              <Route path="system-health" element={<AdminSystemHealthPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}

export default AppRoutes;
