import "./globals.css";

export const metadata = {
  title: "EducaLink",
  description: "Plataforma educativa",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}