import Link from "next/link";
import { BoltMark } from "@/components/brand/logo";

// Rendered inside the [locale] root layout; bilingual since params aren't available here.
export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <BoltMark className="mx-auto h-16 w-auto" />
        <p className="mt-6 text-6xl font-extrabold text-gradient-blue">404</p>
        <h1 className="mt-4 text-xl font-semibold">Page not found · الصفحة غير موجودة</h1>
        <Link href="/" className="mt-8 inline-block text-sm font-medium text-blue-300 hover:text-white">← POWER MEDIA</Link>
      </div>
    </main>
  );
}
