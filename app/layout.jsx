import './globals.css';

export const metadata = {
  title: 'Dugout Turf Arena · Book your slot',
  description: 'Open 24×7 — Open Arena & Box Arena. Book a 1-hour slot, pay by UPI.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
