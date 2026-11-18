import localFont from "next/font/local";
import "./globals.css";
import siteData from "@/data/siteData";
import { CustomerAuthProvider } from "@/context/CustomerAuthContext";
import { CartProvider } from "@/context/CartContext";
import AuthModal from "@/components/AuthModal";
import CartDrawer from "@/components/CartDrawer";
import FloatingCartBar from "@/components/FloatingCartBar";

const atures = localFont({
  src: [
    {
      path: "./fonts/Atures-700_PERSONAL_USE.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/Atures-900_PERSONAL_USE.ttf",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-atures",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL(siteData.siteUrl),
  title: `${siteData.brand.name} | Fresh Protein Meals & Shakes in Mangalore`,
  description:
    "Fresh protein meals, protein shakes and milk at our stall opposite the gym in Mangalore. Call to pre-order and pick up in minutes.",
  openGraph: {
    title: `${siteData.brand.name} | Fresh Protein Meals & Shakes in Mangalore`,
    description: "Fresh protein meals, shakes and milk. Call to pre-order, pick up in minutes.",
    type: "website",
    locale: "en_IN",
    siteName: siteData.brand.name,
  },
};

export const viewport = { themeColor: "#71BC75" };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${atures.variable}`}>
      <body>
        <CustomerAuthProvider>
          <CartProvider>
            {children}
            <AuthModal />
            <CartDrawer />
            <FloatingCartBar />
          </CartProvider>
        </CustomerAuthProvider>
      </body>
    </html>
  );
}
