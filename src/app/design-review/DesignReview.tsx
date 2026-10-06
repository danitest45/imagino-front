"use client";
import { useState } from "react";
import { ArrowRight, Info } from "lucide-react";
import GenerationWorkspace, {
  type StudioPreview,
} from "../../components/generation/GenerationWorkspace";
import GenerationLibrary from "../../components/generation/GenerationLibrary";
import { AccountSummary } from "../../components/account/AccountSummary";
import { CostsContent } from "../../components/account/CostsContent";
import {
  Button,
  Dialog,
  Input,
  Select,
  Skeleton,
  StatusBadge,
  Textarea,
  Tooltip,
  IconButton,
} from "../../components/ui/StudioUI";
import type { GenerationJob, GenerationModel } from "../../types/generation";
import catalog from "../../data/generation-catalog-preview.json";
import { toast } from "../../lib/toast";
import "./review.css";

const models = catalog.models
  .filter((m) => m.mediaType === "image")
  .slice(0, 2)
  .map((m) => ({ ...m, availability: "ready" })) as GenerationModel[];
const prompt =
  "A blue bottle on a stone pedestal, surrounded by botanical leaves and delicate white flowers. Soft natural light, a quiet editorial composition.";
const jobs: GenerationJob[] = [
  {
    id: "sample-reference-study",
    modelId: models[1].id,
    displayName: "Studio Image",
    mediaType: "image",
    status: "Completed",
    creditState: "Charged",
    credits: 15,
    prompt,
    settings: { aspectRatio: "1:1", resolution: "1MP" },
    outputUrl: "/brand/campaign.webp",
    errorCode: null,
    createdAt: "2026-10-05T12:00:00Z",
  },
  {
    id: "sample-freeform-study",
    modelId: models[1].id,
    displayName: "Studio Image",
    mediaType: "image",
    status: "Completed",
    creditState: "Charged",
    credits: 10,
    prompt:
      "A red sports car in front of a modern house. An independent freeform exploration.",
    settings: { aspectRatio: "1:1", resolution: "1MP" },
    outputUrl: "/brand/freeform.webp",
    errorCode: null,
    createdAt: "2026-10-04T12:00:00Z",
  },
  {
    id: "sample-bottle-study",
    modelId: models[0].id,
    displayName: "Fast Image",
    mediaType: "image",
    status: "Completed",
    creditState: "Charged",
    credits: 5,
    prompt:
      "A translucent blue glass bottle on a quiet tabletop. Independent text-to-image study.",
    settings: { aspectRatio: "1:1", resolution: "1MP" },
    outputUrl: "/brand/bottle.webp",
    errorCode: null,
    createdAt: "2026-10-03T12:00:00Z",
  },
];
const screens = [
  "Create",
  "Library",
  "Account",
  "Costs",
  "Components",
] as const;
const states = [
  "Result",
  "Empty",
  "Reference",
  "Queued",
  "Starting",
  "Processing",
  "Refunded",
  "Failed",
  "Cancelled",
  "No balance",
  "Unavailable",
  "Loading",
  "Signed out",
  "Error",
] as const;
export default function DesignReview() {
  const [screen, setScreen] = useState<(typeof screens)[number]>("Create");
  const [state, setState] = useState<(typeof states)[number]>("Result");
  const [dialog, setDialog] = useState(false);
  const hasResult = ![
    "Empty",
    "Reference",
    "Unavailable",
    "Loading",
    "Signed out",
    "Error",
  ].includes(state);
  const status = [
    "Queued",
    "Starting",
    "Processing",
    "Cancelled",
    "Failed",
  ].includes(state)
    ? (state as GenerationJob["status"])
    : state === "Refunded"
      ? "Failed"
      : "Completed";
  const resultJobs = hasResult
    ? [
        {
          ...jobs[0],
          status,
          creditState:
            state === "Refunded"
              ? ("Refunded" as const)
              : ["Queued", "Starting", "Processing", "Failed"].includes(state)
                ? ("Reserved" as const)
                : ("Charged" as const),
          errorCode: ["Refunded", "Failed"].includes(state)
            ? "provider_error"
            : null,
          outputUrl: status === "Completed" ? jobs[0].outputUrl : null,
        },
      ]
    : [];
  const fixture: StudioPreview = {
    models:
      state === "Unavailable"
        ? models.map((m) => ({ ...m, availability: "approval_required" }))
        : models,
    modelId: models[1].id,
    authenticated: state !== "Signed out",
    prompt: state === "Empty" ? "" : prompt,
    inputs: ["Result", "Reference"].includes(state)
      ? [{ role: "reference", data: "/brand/reference.png" }]
      : [],
    jobs: resultJobs,
    loading: state === "Loading",
    error:
      state === "No balance"
        ? "Insufficient credits. Your balance is 0. No credits have been reserved."
        : state === "Error"
          ? "The API could not be reached. No generation was confirmed; review your history before trying again."
          : undefined,
    quote: ["Reference", "Result"].includes(state)
      ? {
          quoteId: "sample-quote",
          credits: 15,
          expiresAt: "2099-01-01T00:00:00Z",
          providerCostEstimateUsd: 0,
        }
      : undefined,
  };
  return (
    <>
      <section className="review-controls" aria-label="Design review controls">
        <div>
          <span className="status-badge warning">
            Design preview — sample data
          </span>
          <p>
            Production components. Local fixtures. No generation or account
            requests.
          </p>
        </div>
        <div className="review-selectors">
          <label>
            Surface
            <Select
              aria-label="Surface"
              value={screen}
              onChange={(e) => setScreen(e.target.value as typeof screen)}
            >
              {screens.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </Select>
          </label>
          <label>
            State
            <Select
              aria-label="State"
              value={state}
              onChange={(e) => setState(e.target.value as typeof state)}
            >
              {states.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </Select>
          </label>
        </div>
      </section>
      {screen === "Create" && (
        <GenerationWorkspace
          key={`create-${state}`}
          kind="image"
          preview={fixture}
        />
      )}
      {screen === "Library" && (
        <GenerationLibrary
          key={`library-${state}`}
          preview={{
            jobs:
              state === "Empty"
                ? []
                : state === "Refunded"
                  ? [...jobs, ...resultJobs]
                  : jobs,
            authenticated: state !== "Signed out",
            loading: state === "Loading",
            error:
              state === "Error"
                ? "History could not be loaded. Try again when the connection is restored."
                : undefined,
          }}
        />
      )}
      {screen === "Account" && (
        <main className="review-component-page">
          <p className="eyebrow">Your workspace</p>
          <h1>Account</h1>
          <AccountSummary
            credits={state === "No balance" ? 0 : 80}
            sample
            loading={state === "Loading"}
            error={state === "Error" ? "Balance unavailable." : undefined}
          />
        </main>
      )}
      {screen === "Costs" && <CostsContent preview />}
      {screen === "Components" && (
        <main className="review-component-page">
          <p className="eyebrow">Working Studio / System</p>
          <h1>Made for the work.</h1>
          <section className="review-component-grid">
            <div className="surface">
              <h2>Actions</h2>
              <div className="review-row">
                <Button
                  onClick={() =>
                    toast("A sample notification. No action was submitted.")
                  }
                >
                  Primary
                  <ArrowRight size={16} />
                </Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Quiet action</Button>
                <Button disabled>Unavailable</Button>
                <Button loading>Loading</Button>
              </div>
            </div>
            <div className="surface">
              <h2>Inputs</h2>
              <label>
                Prompt
                <Textarea placeholder="Describe a new direction…" />
              </label>
              <label>
                Model
                <Select>
                  <option>Studio Image</option>
                </Select>
              </label>
              <label>
                Error state
                <Input
                  aria-invalid="true"
                  aria-describedby="sample-error"
                  value="Example"
                  readOnly
                />
              </label>
              <p id="sample-error" className="review-error">
                Sample validation message.
              </p>
            </div>
            <div className="surface">
              <h2>States</h2>
              <div className="review-row">
                {(
                  ["neutral", "success", "warning", "error", "info"] as const
                ).map((tone) => (
                  <StatusBadge key={tone} tone={tone}>
                    {tone}
                  </StatusBadge>
                ))}
              </div>
              <Skeleton className="review-skeleton" />
              <p className="muted">
                Loading is expressed without an invented progress percentage.
              </p>
            </div>
            <div className="surface">
              <h2>Overlays & focus</h2>
              <Button variant="secondary" onClick={() => setDialog(true)}>
                Open sample dialog
              </Button>
              <Tooltip label="Helpful context">
                <IconButton label="Sample information">
                  <Info size={18} />
                </IconButton>
              </Tooltip>
              <p className="muted">
                Tab to navigate. Escape to close. Focus returns to the trigger.
              </p>
            </div>
          </section>
          <Dialog
            open={dialog}
            onClose={() => setDialog(false)}
            title="A clear next step"
          >
            <p>
              This sample dialog uses the same focus and dismissal behavior as
              the studio.
            </p>
            <Button onClick={() => setDialog(false)}>Done</Button>
          </Dialog>
        </main>
      )}
    </>
  );
}
