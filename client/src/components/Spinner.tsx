/** Small inline loading spinner; inherits the text colour */
export default function Spinner() {
  return (
    <span
      className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    />
  )
}
