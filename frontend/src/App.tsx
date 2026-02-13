import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AppShell } from "./components/AppShell";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { HomePage } from "./pages/HomePage";
import { TherapistDetailPage } from "./pages/TherapistDetailPage";
import { LoginPage } from "./pages/LoginPage";
import { AppDashboard } from "./pages/AppDashboard";
import { ReferralsPage } from "./pages/ReferralsPage";
import { ReferralCreatePage } from "./pages/ReferralCreatePage";
import { ReferralDetailPage } from "./pages/ReferralDetailPage";
import { PatientsPage } from "./pages/PatientsPage";
import { PatientDetailPage } from "./pages/PatientDetailPage";
import { AppointmentsPage } from "./pages/AppointmentsPage";
import { AppointmentDetailPage } from "./pages/AppointmentDetailPage";
import { AuditPage } from "./pages/AuditPage";

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="therapists/:id" element={<TherapistDetailPage />} />
        <Route path="login" element={<LoginPage />} />
      </Route>

      {/* Authenticated app shell */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<AppDashboard />} />
        <Route path="referrals" element={<ReferralsPage />} />
        <Route path="referrals/new" element={<ReferralCreatePage />} />
        <Route path="referrals/:id" element={<ReferralDetailPage />} />
        <Route path="patients" element={<PatientsPage />} />
        <Route path="patients/:id" element={<PatientDetailPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="appointments/:id" element={<AppointmentDetailPage />} />
        <Route
          path="audit"
          element={
            <ProtectedRoute roles={["support", "clinic_admin"]}>
              <AuditPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
