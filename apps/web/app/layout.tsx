import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "AI Video Director",
  description: "From creative brief to a production-ready video plan."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="it"><body>{children}</body></html>;
}
