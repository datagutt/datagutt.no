"use client";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import Image from "next/image";
import { useRef, useEffect } from "react";
import Socials from "./Socials";

export default function Hero() {
  const containerRef = useRef(null);
  const elementRef = useRef(null);
  const comp = useRef(); // create a ref for the root level element (for scoping)

  gsap.registerPlugin(ScrollTrigger);

  useEffect(() => {
    let ctx = gsap.context((self) => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1.5,
        },
      });

      tl.to(elementRef.current, {
        yPercent: 4,
        ease: "none",
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="w-screen h-screen flex items-center justify-center relative mb-[15vw] bg-black"
    >
      <div className="z-40 flex flex-col items-center row">
        <Image
          src="/images/avatar.png"
          width={150}
          height={150}
          alt="Avatar"
          className="rounded-full mb-[1.67vw]"
        />
        <h1 className="leading-[0.9] flex flex-col mb-[1.11vw]">
          <div className="text-[6vw]">Hello, I&apos;m</div>
          <div
            className="stack font-bit text-[10vw] transform-gpu"
            style={
              {
                "--stacks": 3,
              } as React.CSSProperties
            }
          >
            <span
              style={
                {
                  "--index": 0,
                } as React.CSSProperties
              }
            >
              Thomas
            </span>
            <span
              style={
                {
                  "--index": 1,
                } as React.CSSProperties
              }
            >
              Thomas
            </span>
            <span
              style={
                {
                  "--index": 2,
                } as React.CSSProperties
              }
            >
              Thomas
            </span>
          </div>
        </h1>
        <p className="md:w-1/2 font-light text-center mb-[1.67vw]">
          A full-stack web developer from Norway.
        </p>
        <Socials />
      </div>
      <div className="absolute inset-0 z-20 mix-blend-overlay fade-out-div">
        <div className="w-full h-full bg-pattern"></div>
      </div>
      <div
        ref={elementRef}
        className="absolute h-full w-full md:w-[135vw] md:h-[135vw] bottom-0 md:translate-y-[20vw] z-10 left-1/2 -translate-x-1/2"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black to-primary-600"></div>
      </div>
    </section>
  );
}
