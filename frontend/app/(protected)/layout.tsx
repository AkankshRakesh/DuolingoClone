import ProtectedRoute from '../components/ProtectedRoute'
import { AppShell } from '../app-shell'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ProtectedRoute><AppShell>{children}</AppShell></ProtectedRoute>
}