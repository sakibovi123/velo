import "./globals.css";

export const metadata = {
  title: "Velo — Agent Dashboard",
  description: "AI Customer Support — Agent Dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-white text-zinc-900 antialiased">{children}</body>
    </html>
  );
}
