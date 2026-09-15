import Image from "next/image";
import type { Project } from "@/lib/site";

export default function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-xl bg-white shadow-[0_4px_24px_rgba(22,38,61,0.08)]">
      <div className="relative h-[240px]">
        <Image
          src={project.image}
          alt={project.title}
          fill
          sizes="(min-width: 1024px) 416px, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
      <div className="flex flex-col gap-1.5 p-6">
        <p className="font-heading text-sm text-brand-dark">{project.category}</p>
        <h3 className="font-heading text-xl font-semibold leading-[1.3] text-ink">{project.title}</h3>
      </div>
    </article>
  );
}
