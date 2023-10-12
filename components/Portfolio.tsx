'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger'
import Image from 'next/image'

export default function Portfolio() {
	const containerRef = useRef(null)
    const showcaseRef = useRef(null)

    gsap.registerPlugin(ScrollTrigger)

    useEffect(() => {
        let ctx = gsap.context((self) => {
            gsap.set(showcaseRef.current, {
                xPercent: 50,
            })

            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: 'top center',
                    end: 'bottom top',
                    scrub: 0.5,
                },
            })

            tl.to(
                showcaseRef.current,
                {
                    xPercent: -50,
                },
                '<'
            )
        }, containerRef)

        return () => ctx.revert()
    }, [])


    return (
        <section ref={containerRef} className="mb-[55vw]">
               <div
                ref={showcaseRef}
                className="relative mb-[5vw] z-40 md:w-[125.6vw] md:h-[34.6vw] h-[100vw]"
            >
				<span className="sr-only">Portfolio coming soon</span>
                <Image
                    src="/images/coming-soon.gif"
					width={480}
					height={288}
                    alt="Portfolio coming soon"
                />
            </div>
        </section>
    )
}