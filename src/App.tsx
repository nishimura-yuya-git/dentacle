import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { ClinicProvider } from '@/features/clinic/ClinicProvider'
import { PlatformAdminRoute } from '@/components/common/PlatformAdminRoute'
import { ProtectedRoute } from '@/components/common/ProtectedRoute'
import { MfaGateRoute } from '@/features/auth/MfaGateRoute'
import { LoginPage } from '@/pages/Login/LoginPage'
import { MembersPage } from '@/pages/Members/MembersPage'
import { SettingsPage } from '@/pages/Settings/SettingsPage'
import { PatientsPage } from '@/pages/Patients/PatientsPage'
import { PatientDetailPage } from '@/pages/Patients/PatientDetailPage'
import { CalendarPage } from '@/pages/Calendar/CalendarPage'
import { ProposalsPage } from '@/pages/Proposals/ProposalsPage'
import { ContactsPage } from '@/pages/Contacts/ContactsPage'
import { OperationsTracesPage } from '@/pages/Operations/OperationsTracesPage'
import { AuthAuditPage } from '@/pages/AuthAudit/AuthAuditPage'
import { PatientImportPage } from '@/pages/Import/PatientImportPage'
import { AiUsagePage } from '@/pages/Admin/AiUsagePage'
import { FeedbackPage } from '@/pages/Feedback/FeedbackPage'
import { ProgressPage } from '@/pages/Progress/ProgressPage'
import {
  ContractInfoPage,
  ContractorInfoPage,
  MyPage,
  PaymentHistoryPage,
} from '@/pages/Account'
import { AnnouncementsPage } from '@/pages/Announcements/AnnouncementsPage'
import { SecurityNetworkPage } from '@/pages/Security/SecurityNetworkPage'
import { SecurityPage } from '@/pages/Security/SecurityPage'

function ClinicShell() {
  return (
    <ClinicProvider>
      <Outlet />
    </ClinicProvider>
  )
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            {import.meta.env.DEV ? (
              <>
                <Route path="/__preview__/security" element={<SecurityPage />} />
                <Route path="/__preview__/security/network" element={<SecurityNetworkPage />} />
              </>
            ) : null}
            <Route element={<ProtectedRoute />}>
              <Route element={<MfaGateRoute />}>
                <Route element={<ClinicShell />}>
                  <Route path="/" element={<Navigate to="/calendar" replace />} />
                  <Route path="/members" element={<Navigate to="/users" replace />} />
                  <Route path="/users" element={<MembersPage />} />
                  <Route path="/mypage" element={<MyPage />} />
                  <Route path="/announcements" element={<AnnouncementsPage />} />
                  <Route path="/security" element={<SecurityPage />} />
                  <Route path="/security/network" element={<SecurityNetworkPage />} />
                  <Route path="/account/contractor" element={<ContractorInfoPage />} />
                  <Route path="/account/payments" element={<PaymentHistoryPage />} />
                  <Route path="/account/contract" element={<ContractInfoPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/patients" element={<PatientsPage />} />
                  <Route path="/patients/:id" element={<PatientDetailPage />} />
                  <Route path="/import" element={<PatientImportPage />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route element={<PlatformAdminRoute />}>
                    <Route path="/proposals" element={<ProposalsPage />} />
                    <Route path="/admin/ai-usage" element={<AiUsagePage />} />
                    <Route path="/auth-audit" element={<AuthAuditPage />} />
                    <Route path="/progress" element={<ProgressPage />} />
                  </Route>
                  <Route path="/contacts" element={<ContactsPage />} />
                  <Route path="/operations" element={<OperationsTracesPage />} />
                  <Route path="/feedback" element={<FeedbackPage />} />
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/calendar" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}

export default App
