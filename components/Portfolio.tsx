"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import Image from "next/image";
import { projects } from "../data/projects";
import Link from "next/link";

export default function Portfolio() {
  const containerRef = useRef(null);
  const showcaseRef = useRef(null);

  gsap.registerPlugin(ScrollTrigger);

  useEffect(() => {
    let ctx = gsap.context((self) => {
      gsap.set(showcaseRef.current, {
        xPercent: 50,
      });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.5,
        },
      });

      tl.to(
        showcaseRef.current,
        {
          xPercent: -50,
        },
        "<",
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="mb-[40vw]">
      <div
        ref={showcaseRef}
        className="relative mb-[5vw] z-40 md:w-[125.6vw] md:h-[34.6vw] h-[100vw]"
      >
        <span className="sr-only">Portfolio coming soon</span>
        <div className="flex flex-row w-full h-full gap-4 md:gap-8">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={project.link ?? "#"}
              target="_blank"
              passHref
              className="relative w-full h-full"
            >
              <div className="relative w-full h-[50vw] md:h-[17.3vw]">
                <Image
                  src={project.image}
                  alt={project.name}
                  layout="fill"
                  objectFit="contain"
                  className="rounded-lg h-full w-full"
                />
              </div>
              <div className="absolute bottom-0 left-0 w-full h-1/2 bg-black bg-opacity-50 p-4">
                <h2 className="text-white text-3xl md:text-4xl font-bit mb-2">
                  {project.name}
                </h2>
                <p className="text-white text-sm md:text-base font-light">
                  {project.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
