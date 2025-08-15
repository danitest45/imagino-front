import Sidebar from './Sidebar';


export default function ImagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-5rem)]">
      <Sidebar />
      <main className="flex-1 p-0">{children}</main>
    </div>
  );
}
