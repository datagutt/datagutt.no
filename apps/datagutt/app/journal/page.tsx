import type { Metadata } from "next";
import Link from "next/link";
import { LiveSections } from "@/components/journal/LiveSections";
import { PassportProgress } from "@/components/journal/PassportProgress";
import { Section } from "@/components/journal/Section";
import { credits } from "@/content/credits";
import { experience } from "@/content/experience";
import { placePresenting } from "@/content/places";
import { profile } from "@/content/profile";
import { projects } from "@/content/projects";
import { skillCategories } from "@/content/skills";
import { socials } from "@/content/socials";
import { OG_IMAGE } from "@/lib/site";

const description = `Everything in Fjord Town written down: ${profile.name}'s projects, work, skills and contact details, as a normal web page.`;

export const metadata: Metadata = {
	title: "Journal",
	description,
	alternates: { canonical: "/journal" },
	openGraph: { title: "Journal · datagutt", description, url: "/journal", images: [OG_IMAGE] },
};

const CONTENTS = [
	["about", "About"],
	["projects", "Projects"],
	["work", "Work"],
	["skills", "Skills"],
	["open-source", "Open source"],
	["stats", "Stats"],
	["contact", "Contact"],
] as const;

/**
 * The Journal (docs/PLAN.md M6.1): the whole site as a plain page, for anyone who
 * would rather read than play, and for screen readers and search engines. Everything
 * comes from content/ and the same live data as the game, so the two never disagree.
 */
export default function Journal() {
	return (
		<div className="min-h-screen bg-[#f7efdc] text-[#1b2440]">
			<a href="#about" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:bg-[#1b2440] focus:px-3 focus:py-2 focus:text-[#f7efdc]">
				Skip to the Journal
			</a>
			<div className="mx-auto max-w-3xl px-5 py-12 text-[17px] font-normal leading-relaxed sm:px-8 sm:py-16">
				<header>
					<p className="font-pixel text-sm uppercase tracking-[0.3em] text-[#8a2f2d]">Fjord Town</p>
					<h1 className="mt-2 font-pixel text-4xl uppercase tracking-wider sm:text-5xl">datagutt&apos;s Journal</h1>
					<p className="mt-4 max-w-2xl">
						Everything in the game, written down. This is {profile.name}&apos;s portfolio as a normal web page. The{" "}
						<Link href="/" className="underline decoration-2 underline-offset-4">
							game version
						</Link>{" "}
						has the same things to find, spread around a small town on a fjord.
					</p>
					<nav aria-label="Contents" className="mt-6">
						<ul className="flex flex-wrap gap-x-5 gap-y-2 font-pixel text-sm uppercase tracking-wider">
							{CONTENTS.map(([id, label]) => (
								<li key={id}>
									<a href={`#${id}`} className="underline decoration-2 underline-offset-4">
										{label}
									</a>
								</li>
							))}
						</ul>
					</nav>
					<PassportProgress />
				</header>

				<main className="mt-12 flex flex-col gap-12">
					<Section id="about" title="About" place={placePresenting("profile")}>
						<div className="flex flex-col gap-6 sm:flex-row sm:items-start">
							{/* eslint-disable-next-line @next/next/no-img-element -- a small pixel avatar, served as is */}
							<img src={profile.avatar} alt={`${profile.name}'s avatar`} width={96} height={96} className="border-2 border-[#1b2440] [image-rendering:pixelated]" />
							<div>
								<p className="text-xl font-semibold">
									{profile.name}, {profile.role.toLowerCase()} in {profile.location}.
								</p>
								<p className="mt-1">{profile.tagline}</p>
							</div>
						</div>
						{profile.about.map((paragraph) => (
							<p key={paragraph.slice(0, 20)} className="mt-4">
								{paragraph}
							</p>
						))}
						<dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
							{profile.quickFacts.map((fact) => (
								<div key={fact.label}>
									<dt className="text-sm text-[#1b2440]/80">{fact.label}</dt>
									<dd className="font-semibold">{fact.value}</dd>
								</div>
							))}
						</dl>
					</Section>

					<Section id="projects" title="Projects">
						<ul className="flex flex-col gap-8">
							{projects.map((project) => {
								const where = placePresenting("project", project.id);
								return (
									<li key={project.id} id={`project-${project.id}`} className="flex flex-row items-start gap-4">
										{project.width && project.height && (
											// eslint-disable-next-line @next/next/no-img-element -- screenshots at their own size
											<img
												src={project.image}
												alt={`Screenshot of ${project.name}`}
												width={project.width}
												height={project.height}
												loading="lazy"
												className="aspect-square h-auto w-20 shrink-0 border-2 border-[#1b2440] object-cover sm:w-44"
											/>
										)}
										<div>
											<h3 className="text-xl font-semibold">
												{project.link ? (
													<a href={project.link} className="underline decoration-2 underline-offset-4">
														{project.name}
													</a>
												) : (
													project.name
												)}
											</h3>
											{project.description && <p className="mt-1">{project.description}</p>}
											{project.poweredBy && <p className="mt-2 text-sm text-[#1b2440]/80">Built with {project.poweredBy.map((t) => t.name).join(", ")}.</p>}
											<p className="mt-2 text-sm">
												In the game:{" "}
												<Link href={`/?at=${where.id}`} className="underline">
													{where.name}
												</Link>
												.
											</p>
										</div>
									</li>
								);
							})}
						</ul>
					</Section>

					<Section id="work" title="Work">
						<ol className="flex flex-col gap-6">
							{experience.map((job) => {
								const where = placePresenting("experience", job.id);
								return (
									<li key={job.id} id={`work-${job.id}`}>
										<h3 className="text-xl font-semibold">
											{job.role}, {job.company}
										</h3>
										<p className="text-sm text-[#1b2440]/80">{job.period}</p>
										<p className="mt-1">{job.description}</p>
										<p className="mt-2 text-sm text-[#1b2440]/80">{job.tech.join(", ")}.</p>
										<p className="mt-2 text-sm">
											In the game:{" "}
											<Link href={`/?at=${where.id}`} className="underline">
												{where.name}
											</Link>
											.
										</p>
									</li>
								);
							})}
						</ol>
					</Section>

					<Section id="skills" title="Skills" place={placePresenting("skills")}>
						<dl className="grid gap-4 sm:grid-cols-2">
							{skillCategories.map((category) => (
								<div key={category.name}>
									<dt className="font-semibold">{category.name}</dt>
									<dd>{category.skills.join(", ")}</dd>
								</div>
							))}
						</dl>
					</Section>

					{/* Cached data, rendered in place: behind a Suspense boundary it would stream in
					    a hidden chunk that only JavaScript reveals, and the Journal must read without it. */}
					<LiveSections />

					<Section id="contact" title="Contact" place={placePresenting("contact")}>
						<p>{profile.contactPitch}</p>
						<p className="mt-4 text-xl font-semibold">
							<a href={`mailto:${profile.email}`} className="underline decoration-2 underline-offset-4">
								{profile.email}
							</a>
						</p>
						<ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
							{socials.map((s) => (
								<li key={s.id}>
									<a href={s.url} rel="me" className="underline">
										{s.label}
									</a>
								</li>
							))}
						</ul>
					</Section>
				</main>

				<footer className="mt-16 border-t-2 border-[#1b2440] pt-6 text-sm">
					<h2 className="font-pixel uppercase tracking-wider">Credits</h2>
					<dl className="mt-3 grid gap-3 sm:grid-cols-2">
						{credits.sections.map((section) => (
							<div key={section.heading}>
								<dt className="font-semibold">{section.heading}</dt>
								<dd>{section.lines.join(" ")}</dd>
							</div>
						))}
					</dl>
					<p className="mt-6">
						<Link href="/" className="font-pixel uppercase tracking-wider underline decoration-2 underline-offset-4">
							Back to the game
						</Link>
					</p>
				</footer>
			</div>
		</div>
	);
}
