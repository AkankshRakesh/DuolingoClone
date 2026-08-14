import AuthRoute from '../components/AuthRoute'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AuthRoute>{children}</AuthRoute>
}