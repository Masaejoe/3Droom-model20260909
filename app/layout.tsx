import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'住まいを歩く | 3D Apartment Explorer',description:'参考画像から再現した1LDKの住空間を、ブラウザで自由に歩いて体験できます。'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="ja"><body>{children}</body></html>}

