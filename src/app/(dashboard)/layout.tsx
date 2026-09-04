import Nav from '@/components/nav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-950">
      <Nav />
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}