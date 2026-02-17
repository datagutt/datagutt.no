import { connection } from "next/server";

export default async function Footer() {
  await connection();
  return (
    <footer className="bg-black pt-12 pb-12 relative overflow-hidden">
      <div className="pixel-divider mb-8" />

      <div className="flex flex-col items-center gap-3">
        <p className="font-pixel-circle text-sm md:text-base uppercase text-gray-500">
          &copy; {new Date().getFullYear()} Thomas Lekanger
        </p>
        <p className="text-sm">
          <span className="font-pixel text-primary-800 mr-2">&gt;_</span>
          <a
            href="https://github.com/datagutt/datagutt.no"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-200 duration-300 font-light"
          >
            Peek at the source code
          </a>
        </p>
      </div>
    </footer>
  );
}
