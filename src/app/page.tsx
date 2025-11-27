import Link from 'next/link';
import { ArrowRight, Camera, Palette, ShieldCheck, Sparkles, Wand2, Workflow } from 'lucide-react';

import ClientGallery from './_components/ClientGallery';

const featureHighlights = [
  {
    icon: Wand2,
    title: 'Instant concepts',
    description:
      'Launch branded visuals at production quality using tuned diffusion models built for precision and speed.',
  },
  {
    icon: Palette,
    title: 'Art-direction ready',
    description:
      'Dial in styles, aspect ratios, and reference blends with intuitive controls for every iteration.',
  },
  {
    icon: ShieldCheck,
    title: 'Enterprise-grade safety',
    description:
      'Stay compliant with audit trails, granular permissions, and private deployment options for global teams.',
  },
];

const workflowSteps = [
  {
    icon: Sparkles,
    title: 'Describe your vision',
    description:
      'Start with natural language prompts or upload brand references to guide the system from the very first render.',
  },
  {
    icon: Workflow,
    title: 'Fine-tune in context',
    description:
      'Adjust presets, apply saved styles, and collaborate on feedback in real time—without leaving the canvas.',
  },
  {
    icon: Camera,
    title: 'Deliver with confidence',
    description:
      'Publish to the imagino.AI showcase or download ready-to-share files the moment inspiration strikes.',
  },
];

const stats = [
  { label: 'Active creators', value: '18k+' },
  { label: 'Images generated', value: '4.2M' },
  { label: 'Customer satisfaction', value: '4.9/5' },
];

export default function Home() {
  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-16 px-4 pb-24 pt-32 sm:px-6 lg:px-8">
      <div className="absolute left-0 right-0 top-20 mx-auto hidden h-[520px] max-w-4xl rounded-full bg-gradient-to-br from-fuchsia-500/20 via-purple-600/10 to-cyan-400/20 blur-3xl lg:block" />

      <section className="relative grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6">
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300">
            Creative intelligence for teams
          </span>
          <h1 className="text-balance text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Imagine, refine, and publish extraordinary visuals in minutes.
          </h1>
          <p className="max-w-xl text-pretty text-lg text-gray-300 sm:text-xl">
            imagino.AI combines next-generation generative models with an intuitive workflow so your ideas move from prompt to polished campaign assets without friction.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition hover:shadow-purple-500/50"
            >
              Start for free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/images/replicate"
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-gray-100 transition hover:bg-white/10"
            >
              Explore gallery
            </Link>
          </div>

          <div className="grid gap-6 pt-6 sm:grid-cols-3">
            {stats.map(stat => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 shadow-inner shadow-white/5"
              >
                <p className="text-2xl font-semibold text-white sm:text-3xl">{stat.value}</p>
                <p className="text-sm text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="glow-accent -right-12 top-0 hidden lg:block" />
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-6 backdrop-blur-xl shadow-2xl">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
              <h2 className="text-lg font-semibold text-white">A streamlined creation flow</h2>
              <p className="mt-2 text-sm text-gray-400">
                Build moodboards, upload brand references, and manage feedback from one collaborative workspace.
              </p>
              <div className="mt-6 grid gap-4">
                {workflowSteps.map(step => (
                  <div key={step.title} className="flex items-start gap-4 rounded-xl border border-white/5 bg-white/5 p-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500/40 via-purple-500/40 to-cyan-400/40 text-white">
                      <step.icon className="h-5 w-5" />
                    </span>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-white">{step.title}</p>
                      <p className="text-sm text-gray-400">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <ClientGallery />

      <section className="grid gap-8 md:grid-cols-3">
        {featureHighlights.map(feature => (
          <div
            key={feature.title}
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl transition hover:border-fuchsia-400/40 hover:bg-white/10"
          >
            <div className="absolute inset-0 opacity-0 transition group-hover:opacity-100" aria-hidden>
              <div className="absolute -right-12 top-16 h-40 w-40 rounded-full bg-fuchsia-500/30 blur-3xl" />
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500/40 via-purple-500/40 to-cyan-400/40 text-white">
              <feature.icon className="h-6 w-6" />
            </span>
            <h3 className="mt-6 text-xl font-semibold text-white">{feature.title}</h3>
            <p className="mt-3 text-sm text-gray-300">{feature.description}</p>
          </div>
        ))}
      </section>

      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-purple-900/50 via-purple-900/30 to-cyan-900/40 p-10 shadow-2xl">
        <div className="absolute -left-10 top-10 h-32 w-32 rounded-full bg-fuchsia-500/40 blur-3xl" aria-hidden />
        <div className="absolute -right-14 bottom-0 h-40 w-40 rounded-full bg-cyan-400/40 blur-3xl" aria-hidden />
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-fuchsia-200">Built for creative teams</p>
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">
              Collaborate in real time, manage versions, and deliver full campaigns in hours—not weeks.
            </h2>
            <p className="text-sm text-gray-200">
              Connect imagino.AI to your existing tools, unlock detailed usage analytics, and access dedicated success engineers.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-100"
            >
              Compare plans
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Access my account
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
