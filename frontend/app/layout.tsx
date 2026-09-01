import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata={title:"GRABZONE — Grab What's Trending.",description:"Trending gadgets, fashion finds, home essentials and more.",metadataBase:new URL("https://grabzone.store")};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
