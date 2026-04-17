import "./globals.css";

export const metadata = {
  title: "Velo — AI-Powered Customer Support Platform",
  description:
    "Real-time chat, AI-drafted replies from your knowledge base, and skill-based routing — all shipped via a single script tag.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
