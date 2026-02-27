import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 h-14 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto max-w-5xl h-full px-4 sm:px-6 flex items-center">
        <Link href="/" className="text-white font-semibold text-sm tracking-tight">
          Ashxcribe
        </Link>
      </div>
    </nav>
  );
}
