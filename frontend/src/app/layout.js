import "./globals.css";
import MotionProvider from "@/components/motion/MotionProvider";
import RouteChangeLoader from "@/components/ui/RouteChangeLoader";

export const metadata = {
  title: "EducaLink",
  description: "Plataforma educativa",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body><MotionProvider>{children}<RouteChangeLoader /></MotionProvider></body>
    </html>
  );
}
