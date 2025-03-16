"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";

export default function ScrollText() {
  const containerRef = useRef(null);
  const firstLineRef = useRef(null);
  const secondLineRef = useRef(null);

  gsap.registerPlugin(ScrollTrigger);

  useEffect(() => {
    let ctx = gsap.context((self) => {
      gsap.set(firstLineRef.current, {
        xPercent: 75,
      });

      gsap.set(secondLineRef.current, {
        xPercent: -75,
      });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.5,
        },
      });

      tl.to(firstLineRef.current, {
        xPercent: 0,
      });
      tl.to(
        secondLineRef.current,
        {
          xPercent: 0,
        },
        "<",
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="relative h-screen" id="scroll-text">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[170vw] font-bit text-[16vw] leading-[0.8] uppercase z-40">
        <div
          ref={firstLineRef}
          className="span"
          style={{ willChange: "transform" }}
        >
          CHECK OUT MY PORTFOLIO
        </div>
        <div
          ref={secondLineRef}
          className="span"
          style={{ willChange: "transform" }}
        >
          CHECK OUT MY PORTFOLIO
        </div>
      </div>
    </section>
  );
}
