import Image from "next/image";
import { connection } from "next/server";
import FlowField from "./FlowField";
import Socials from "./Socials";

export default async function Hero() {
	await connection();
	return (
		<section className="w-screen h-screen flex items-center justify-center relative mb-[15vw] bg-black">
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
						className="stack font-pixel-line text-[7vw] transform-gpu"
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
			<FlowField className="absolute z-10 w-full h-full" />
			<div className="absolute bottom-0 left-0 right-0 top-0 z-20 bg-gradient-to-b from-transparent pointer-events-none to-black via-transparent"></div>
		</section>
	);
}
