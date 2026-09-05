import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: { default: 'Kaki Finder | Kampung Connect', template: '%s | Kaki Finder' },
  description: 'Share skills, build bonds, and connect with neighbours across generations at Pek Kio Community Centre.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
