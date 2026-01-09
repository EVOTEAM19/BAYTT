export default function WatchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {children}
    </div>
  );
}
