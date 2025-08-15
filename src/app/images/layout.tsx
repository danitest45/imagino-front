import Sidebar from './Sidebar';


export default function ImagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="-mt-20 pt-20 flex min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-950">
      <Sidebar />
      <main className="flex-1 p-0">{children}</main>
    </div>
  );
}
