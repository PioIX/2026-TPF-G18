import "./globals.css";
import MotionProvider from "@/components/motion/MotionProvider";

export const metadata = {
  title: "EducaLink",
  description: "Plataforma educativa",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body><MotionProvider>{children}</MotionProvider></body>
    </html>
  );
}
