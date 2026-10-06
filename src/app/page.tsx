import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  Frame,
  SlidersHorizontal,
  CornerDownRight,
} from "lucide-react";
import StudioLink from "../components/StudioLink";
import "./landing.css";

export default function HomePage() {
  return (
    <main className="landing">
      <section className="hero page-width" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="edition-mark" /> A little reference. A new
            direction.
          </p>
          <h1 id="hero-title">
            Explore campaign visuals from your <span>references.</span>
          </h1>
          <p className="hero-description">
            Bring your idea into focus. Create visual variations, choose an
            image, and make it the starting point for what comes next.
          </p>
          <div className="hero-actions">
            <StudioLink />
            <Link href="#how-it-works" className="text-link">
              See how it works <ArrowDown size={16} />
            </Link>
          </div>
          <p className="hero-note">
            AI Creative Workspace <span aria-hidden>·</span> Model and cost,
            always in view.
          </p>
        </div>
        <div className="hero-art">
          <div className="art-topline">
            <span>
              <Frame size={14} /> A study in blue
            </span>
            <span className="tabular">STUDIO STUDY / 03</span>
          </div>
          <figure className="hero-result">
            <Image
              src="/brand/campaign.webp"
              alt="Generated blue bottle on a stone pedestal among green leaves and small white flowers"
              width={1024}
              height={1024}
              sizes="(max-width: 800px) 94vw, 48vw"
              priority
            />
            <figcaption>
              <span>Generated visual</span>
              <span>
                FLUX.2 Pro <ArrowUpRight size={14} />
              </span>
            </figcaption>
          </figure>
          <figure className="hero-reference">
            <div className="reference-image">
              <Image
                src="/brand/reference.png"
                alt="Controlled synthetic reference: a simple blue bottle with gold neck and three gold dots"
                width={160}
                height={160}
              />
            </div>
            <figcaption>
              <span className="reference-number">01</span> Controlled reference{" "}
              <CornerDownRight size={14} />
            </figcaption>
          </figure>
          <p className="asset-disclosure">
            Synthetic staging demonstration. Real model output; not a customer
            campaign.
          </p>
        </div>
      </section>
      <div className="studio-strip page-width">
        <span>A place for your next idea.</span>
        <p>
          Reference <ArrowRight size={14} /> Create <ArrowRight size={14} />{" "}
          Choose <ArrowRight size={14} /> Continue
        </p>
        <span>Made to keep you in control.</span>
      </div>
      <section className="workflow-section page-width" id="how-it-works">
        <div className="section-heading">
          <p className="eyebrow">01 / Your creative rhythm</p>
          <h2>
            One idea.
            <br />
            Room to explore.
          </h2>
          <p>
            Start with something you have.
            <br />
            Or something you can imagine.
          </p>
        </div>
        <div className="workflow-steps">
          {[
            {
              n: "01",
              title: "Bring a starting point",
              text: "Upload a reference on a compatible model, or describe an idea from scratch.",
            },
            {
              n: "02",
              title: "Make the choices yours",
              text: "Choose your model and settings. Review the current credit quote before creating.",
            },
            {
              n: "03",
              title: "Find the next direction",
              text: "Inspect the result. Reuse its prompt, or prepare your chosen image as a new reference.",
            },
          ].map((step) => (
            <article key={step.n}>
              <span className="step-number">{step.n}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
              <ArrowUpRight size={20} aria-hidden />
            </article>
          ))}
        </div>
      </section>
      <section className="control-section page-width">
        <div className="control-visual">
          <div className="control-image">
            <Image
              src="/brand/bottle.webp"
              alt="Independent text-to-image study of a translucent blue glass bottle"
              width={768}
              height={768}
              sizes="(max-width:800px) 90vw, 40vw"
            />
            <span className="photo-caption">
              Independent prompt study · FLUX.2 klein 4B
            </span>
          </div>
          <div className="control-caption">
            <SlidersHorizontal size={19} />
            <div>
              <strong>Your brief. Your settings.</strong>
              <span>Choose the model. Review the quote.</span>
            </div>
            <Check size={20} />
          </div>
        </div>
        <div className="control-copy">
          <p className="eyebrow">02 / Clear before you create</p>
          <h2>
            Keep the idea open.
            <br />
            Keep the details clear.
          </h2>
          <p>
            The creative part can be exploratory. The next action should be easy
            to understand.
          </p>
          <ul>
            <li>
              <Check size={18} />A visible model for every creation.
            </li>
            <li>
              <Check size={18} />
              Controls that follow its actual capabilities.
            </li>
            <li>
              <Check size={18} />A current credit quote before you commit.
            </li>
          </ul>
          <Link href="/pricing" className="text-link">
            Understand credits <ArrowRight size={17} />
          </Link>
        </div>
      </section>
      <section className="continuation page-width">
        <div>
          <p className="eyebrow">03 / From one choice to the next</p>
          <h2>
            A result can be
            <br />a beginning.
          </h2>
          <p>
            Your Library brings recent creations together. Open an image,
            revisit its prompt and settings, or prepare it as a new reference.
            You decide when to create again.
          </p>
          <Link href="/library" className="text-link">
            Explore the Library <ArrowUpRight size={17} />
          </Link>
        </div>
        <figure>
          <Image
            src="/brand/freeform.webp"
            alt="Independent freeform generation of a red sports car in front of a modern house"
            width={768}
            height={768}
            sizes="(max-width:800px) 90vw, 44vw"
          />
          <figcaption>
            <span>Beyond product studies</span>
            <span>Freeform generation · FLUX.2 Pro</span>
          </figcaption>
        </figure>
      </section>
      <section className="models-section page-width" id="models">
        <div className="models-heading">
          <p className="eyebrow">Different models. One workspace.</p>
          <h2>
            Choose the tool
            <br />
            for the idea.
          </h2>
          <p>
            Imagino connects your workflow to models from other makers. Each
            model brings its own capabilities and limitations.
          </p>
        </div>
        <div className="model-list">
          <article>
            <div>
              <span className="model-initial">F</span>
              <h3>
                FLUX.2 klein 4B<small>Black Forest Labs</small>
              </h3>
            </div>
            <p>Prompt-based image exploration.</p>
            <span className="status-badge">Evaluated in staging</span>
          </article>
          <article>
            <div>
              <span className="model-initial">F</span>
              <h3>
                FLUX.2 Pro<small>Black Forest Labs</small>
              </h3>
            </div>
            <p>Image creation with reference support.</p>
            <span className="status-badge">Evaluated in staging</span>
          </article>
          <p className="model-note">
            Generation is gated in this Preview. Live availability is shown in
            the studio. Outputs may change product details; always review the
            result.
          </p>
        </div>
      </section>
      <section className="faq-section page-width">
        <div>
          <p className="eyebrow">A few useful details</p>
          <h2>Before you begin.</h2>
        </div>
        <div className="faq-list">
          <details>
            <summary>How do credits work?</summary>
            <p>
              The studio requests a quote for your current prompt, model,
              references and settings. The server reports whether credits are
              Reserved, Charged or Refunded.{" "}
              <Link href="/pricing">Read about costs.</Link>
            </p>
          </details>
          <details>
            <summary>Will a product stay exactly the same?</summary>
            <p>
              Models can change details, proportions, text and labels. Use
              references to guide exploration, then inspect every result. This
              Preview does not promise product fidelity.
            </p>
          </details>
          <details>
            <summary>Can I start without a reference?</summary>
            <p>
              Yes. Describe your idea and choose a model that supports creation
              from a prompt. Product visuals are one starting point; freeform
              ideas belong here too.
            </p>
          </details>
          <details>
            <summary>What can I do in this Preview?</summary>
            <p>
              Explore the studio and its controls. Paid generation and credit
              purchases remain disabled. Sign-in availability depends on the
              staging environment. No subscription offer is being sold here.
            </p>
          </details>
        </div>
      </section>
      <section className="final-cta page-width">
        <p className="eyebrow">Your next direction starts here</p>
        <h2>
          Give your idea
          <br />
          some room.
        </h2>
        <StudioLink />
        <span>Explore the Working Studio Preview.</span>
      </section>
      <footer className="landing-footer page-width">
        <Link href="/" aria-label="Imagino home">
          <Image
            src="/brand/wordmark.svg"
            width={120}
            height={31}
            alt="Imagino"
          />
        </Link>
        <span>AI Creative Workspace</span>
        <nav aria-label="Footer">
          <Link href="/create/image">Create</Link>
          <Link href="/library">Library</Link>
          <Link href="/pricing">Costs</Link>
        </nav>
        <small>Imagino · 2026</small>
      </footer>
    </main>
  );
}
