"use client";
import Link from 'next/link';
export default function WorkspaceError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="studio-page" role="alert"><h1>Your workspace could not load.</h1>
    <p>Your saved assets and job status can be checked when the connection returns.</p>
    <button className="ui-button" onClick={reset}>Reload workspace</button>{' '}<Link href="/library">Open Assets</Link></main>;
}
