import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <section>
      <h1 className="text-4xl">Page not found</h1>
      <p className="mt-3 text-muted">
        That link doesn't match anything here.{' '}
        <Link to="/" className="text-accent underline underline-offset-4">
          Browse all fragrances
        </Link>
      </p>
    </section>
  )
}
