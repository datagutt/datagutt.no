import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import Portfolio from "@/components/Portfolio";
import ScrollText from "@/components/ScrollText";

export default function Home() {
  return (
    <>
      <main className="relative z-[10]">
        <Hero />
        <ScrollText />
        <Portfolio />
      </main>
      <Footer />
    </>
  );
}
