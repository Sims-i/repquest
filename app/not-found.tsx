import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="not-found">
      <p className="eyebrow">ERROR 404</p>
      <h1>Page not found</h1>
      <p>This rep doesn&apos;t exist. The page you&apos;re looking for was moved or never existed.</p>
      <Link className="primary-button" href="/">
        &larr; Back to your workout
      </Link>
    </main>
  )
}
