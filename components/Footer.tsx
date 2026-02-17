import { connection } from "next/server";

export default async function Footer() {
  await connection();
  return (
    <footer className="bg-black pt-[3.33vw] pb-[15vw] relative overflow-hidden">
      <p className="w-screen text-center absolute left-1/2 -translate-x-1/2 translate-y-1/2 font-pixel-circle text-[6.66vw] md:text-[3.33vw] uppercase bottom-[8.88vw] md:bottom-[4.44vw]">
        &copy; {new Date().getFullYear()} Thomas Lekanger
      </p>
      <p className="w-screen text-center absolute left-1/2 -translate-x-1/2 translate-y-1/2 font-light uppercase bottom-[3.34vw] md:bottom-[1.67vw] text-[2.66vw] md:text-[1.33vw]">
        <a
          href="https://github.com/datagutt/datagutt.no"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-gray-200 duration-300"
        >
          Peek at the source code
        </a>
      </p>
    </footer>
  );
}
