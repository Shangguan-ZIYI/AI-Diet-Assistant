export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-primary-50 to-white">
      {children}
    </div>
  );
}
